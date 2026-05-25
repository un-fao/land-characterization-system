import { searchObjKeyVal } from "../App";

export type ValidationRuleId =
  | "legendMetadata"
  | "classNameDescription"
  | "hpStratumClassLinks"
  | "stratumProperties"
  | "elementPresenceSemantic"
  | "stratumPortioningTotal";

export type ValidationSeverity = "success" | "error" | "warn";

export interface ValidationResult {
  ruleId: ValidationRuleId;
  severity: ValidationSeverity;
  summary: string;
  detail: string;
}

export interface LegendInfo {
  id?: number;
  legend_name?: string;
  legend_description?: string;
  legend_author?: string;
}

export interface LCClass {
  class_id: number;
  class_name?: string;
  class_description?: string;
  class_map_code?: string | number;
  legend_id?: number;
}

export interface HorizontalPattern {
  class_id: number;
  horizontal_pattern_id: number;
  name: string;
  description?: string;
}

export interface Stratum {
  HPID: number;
  stratumID: number;
  name: string;
  description?: string;
  presenceType?: string;
  portioning?: [number, number] | number;
  onTop?: string | null;
  onTopID?: number | null;
  onTopType?: string | null;
}

export interface PropertyRow {
  StratumID: number;
  BlockID: number;
  BlockReference: string;
  elementPresenceType?: string;
  [key: string]: any;
}

export interface CharacteristicRow {
  StratumID: number;
  BlockID: number;
  [key: string]: any;
}

export interface LegendValidationContext {
  legend: LegendInfo;
  classes: LCClass[];
  horizontalPatterns: HorizontalPattern[];
  strata: Stratum[];
  properties: PropertyRow[];
  characteristics: CharacteristicRow[];
}

/**
 * Labels for each rule (used in toast summaries).
 */
export const VALIDATION_RULE_LABELS: Record<ValidationRuleId, string> = {
  legendMetadata: "Legend Metadata",
  classNameDescription: "Class Name & Description",
  hpStratumClassLinks: "Class, Horizontal Pattern & Stratum Structure",
  stratumProperties: "Stratum Properties & Characteristics",
  elementPresenceSemantic: "Element Presence Semantic Rule",
  stratumPortioningTotal: "Stratum Portioning Total per Horizontal Pattern"
};

/**
 * Message templates, separate from the rule logic.
 */
export const VALIDATION_MESSAGES = {
  legendMetadata: {
    success: "Legend Name, Description & Author Validated",
    error: "Missing Metadata: Legend Name, Description or Author missing"
  },
  classNameDescription: {
    success: "Class Name & Description Validated"
  },
  hpStratumClassLinks: {
    success: (hpCount: number, stratumCount: number) =>
      `Class, Horizontal Pattern & Stratum links validated (Horizontal Patterns: ${hpCount}, Strata: ${stratumCount})`,
    missingHpAndStratum:
      "There are no Horizontal Patterns and/or Strata. At least 1 Horizontal Pattern and 1 Stratum are required.",
    missingStrataForHp: (names: string[]) =>
      `Missing Strata on Horizontal Pattern(s): ${names.join(", ")}.`,
    missingHpForClasses: (names: string[]) =>
      `Missing Horizontal Pattern(s) for Class(es): ${names.join(", ")}.`
  },
  stratumProperties: {
    success: (sp: number, chr: number) =>
      `Stratum Elements Validated. Properties: ${sp} Characteristics: ${chr}`,
    missingAny: (sp: number, chr: number) =>
      `Missing Elements - Element Properties: ${sp} Characteristics: ${chr}`,
    noStratumElements:
      "There are no Stratum Elements. At least 1 Element is required per Stratum.",
    missingForStrata: (names: string[]) =>
      `Missing Element Properties on Stratum: ${names.join(", ")}.`
  },
  elementPresenceSemantic: {
    success:
      "Element presence types validated: every Stratum with Optional elements also has at least one Fixed element.",
    error: (contexts: string[]) =>
      "Semantic presence rule violated. The following Strata have Optional elements but no Fixed element: " +
      contexts.join("; ")
  },
  stratumPortioningTotal: {
    success:
      "Stratum portioning totals validated for all Horizontal Patterns (sum = 100%).",
    error: (contexts: string[]) =>
      "Stratum portioning totals do not sum to 100% for the following Horizontal Patterns: " +
      contexts.join("; ")
  }
};

/**
 * Utility: group array items by a key.
 */
function groupBy<T, K extends string | number>(
  items: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    if (!acc[key]) {
      (acc as any)[key] = [];
    }
    (acc as any)[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/**
 * Main validation entry point.
 * Returns one ValidationResult per rule.
 */
export function validateLegend(
  ctx: LegendValidationContext
): ValidationResult[] {
  const results: ValidationResult[] = [];

  const { legend, classes, horizontalPatterns, strata, properties, characteristics } = ctx;

  // Restrict to active legend if id is present
  const legendId = legend.id;
  const classesForLegend = legendId
    ? classes.filter((c) => c.legend_id === legendId)
    : classes;

  // ---------------------------------------------------------------------------
  // Rule 1: Legend metadata
  // ---------------------------------------------------------------------------
  const hasName = !!legend.legend_name && legend.legend_name.trim().length > 0;
  const hasDescription =
    !!legend.legend_description && legend.legend_description.trim().length > 0;
  const hasAuthor =
    !!legend.legend_author && legend.legend_author.trim().length > 0;

  if (hasName && hasDescription && hasAuthor) {
    results.push({
      ruleId: "legendMetadata",
      severity: "success",
      summary: VALIDATION_RULE_LABELS.legendMetadata,
      detail: VALIDATION_MESSAGES.legendMetadata.success
    });
  } else {
    results.push({
      ruleId: "legendMetadata",
      severity: "error",
      summary: VALIDATION_RULE_LABELS.legendMetadata + " Fail",
      detail: VALIDATION_MESSAGES.legendMetadata.error
    });
  }

  // ---------------------------------------------------------------------------
  // Rule 2: Class name & description
  // (preserves existing searchObjKeyVal logic)
  // ---------------------------------------------------------------------------

  const emptyClassNames = searchObjKeyVal(
    classesForLegend,
    "class_name",
    ""
  ) as LCClass[];
  const emptyClassDescriptions = searchObjKeyVal(
    classesForLegend,
    "class_description",
    ""
  ) as LCClass[];

  if (emptyClassNames.length > 0 || emptyClassDescriptions.length > 0) {
    let displayNames = "";
    if (emptyClassNames.length > 0) {
      emptyClassNames.forEach((clss) => {
        displayNames =
          displayNames +
          `ID ${clss.class_id} (Code: ${clss.class_map_code}) `;
      });
      displayNames = `Missing Class Name on Class: ${displayNames}`;
    }

    let displayDescription = "";
    if (emptyClassDescriptions.length > 0) {
      emptyClassDescriptions.forEach((clss) => {
        displayDescription =
          displayDescription +
          `${clss.class_name} (Code: ${clss.class_map_code}) `;
      });
      displayDescription =
        "Missing Class Description on Class: " + displayDescription;
    }

    results.push({
      ruleId: "classNameDescription",
      severity: "error",
      summary: VALIDATION_RULE_LABELS.classNameDescription + " Fail",
      detail: `${displayNames} ${displayDescription}`.trim()
    });
  } else {
    results.push({
      ruleId: "classNameDescription",
      severity: "success",
      summary: VALIDATION_RULE_LABELS.classNameDescription,
      detail: VALIDATION_MESSAGES.classNameDescription.success
    });
  }

  // ---------------------------------------------------------------------------
  // Rule 3: Class / HP / Stratum structural links
  // ---------------------------------------------------------------------------

  const hpsForLegend = legendId
    ? horizontalPatterns.filter((hp) =>
        classesForLegend.some((c) => c.class_id === hp.class_id)
      )
    : horizontalPatterns;

  const strataForLegend = legendId
    ? strata.filter((s) =>
        hpsForLegend.some((hp) => hp.horizontal_pattern_id === s.HPID)
      )
    : strata;

  const classesWithoutHp = classesForLegend.filter(
    (cls) => !hpsForLegend.some((hp) => hp.class_id === cls.class_id)
  );

  const hpsWithoutStrata = hpsForLegend.filter(
    (hp) => !strataForLegend.some((s) => s.HPID === hp.horizontal_pattern_id)
  );

  const hpCount = hpsForLegend.length;
  const stratumCount = strataForLegend.length;

  if (
    hpCount > 0 &&
    classesWithoutHp.length === 0 &&
    hpsWithoutStrata.length === 0
  ) {
    results.push({
      ruleId: "hpStratumClassLinks",
      severity: "success",
      summary: VALIDATION_RULE_LABELS.hpStratumClassLinks,
      detail: VALIDATION_MESSAGES.hpStratumClassLinks.success(
        hpCount,
        stratumCount
      )
    });
  } else {
    const detailParts: string[] = [];

    if (hpCount === 0 || stratumCount === 0) {
      detailParts.push(
        VALIDATION_MESSAGES.hpStratumClassLinks.missingHpAndStratum
      );
    }

    if (hpsWithoutStrata.length > 0) {
      const names = hpsWithoutStrata.map(
        (hp) => hp.name || String(hp.horizontal_pattern_id)
      );
      detailParts.push(
        VALIDATION_MESSAGES.hpStratumClassLinks.missingStrataForHp(names)
      );
    }

    if (classesWithoutHp.length > 0) {
      const classNames = classesWithoutHp.map(
        (c) => c.class_name || String(c.class_id)
      );
      detailParts.push(
        VALIDATION_MESSAGES.hpStratumClassLinks.missingHpForClasses(classNames)
      );
    }

    results.push({
      ruleId: "hpStratumClassLinks",
      severity: "error",
      summary: VALIDATION_RULE_LABELS.hpStratumClassLinks + " Fail",
      detail: detailParts.join(" ")
    });
  }

  // ---------------------------------------------------------------------------
  // Rule 4: Stratum properties & characteristics
  // (same checks, but one consolidated message)
  // ---------------------------------------------------------------------------

  const strataWithoutProperties = strataForLegend.filter(
    (s) => !properties.some((p) => p.StratumID === s.stratumID)
  );

  const SP = properties.length;
  const chr = characteristics.length;

  if (SP > 0 && strataWithoutProperties.length === 0) {
    results.push({
      ruleId: "stratumProperties",
      severity: "success",
      summary: VALIDATION_RULE_LABELS.stratumProperties,
      detail: VALIDATION_MESSAGES.stratumProperties.success(SP, chr)
    });
  } else {
    const detailParts: string[] = [
      VALIDATION_MESSAGES.stratumProperties.missingAny(SP, chr)
    ];

    if (SP === 0) {
      detailParts.push(VALIDATION_MESSAGES.stratumProperties.noStratumElements);
    } else if (strataWithoutProperties.length > 0) {
      const names = strataWithoutProperties.map(
        (s) => s.name || String(s.stratumID)
      );
      detailParts.push(
        VALIDATION_MESSAGES.stratumProperties.missingForStrata(names)
      );
    }

    results.push({
      ruleId: "stratumProperties",
      severity: "error",
      summary: VALIDATION_RULE_LABELS.stratumProperties + " Fail",
      detail: detailParts.join(" ")
    });
  }

  /*// ---------------------------------------------------------------------------
  // Rule 5 (semantic): element presence types per Stratum
  //
  // If a Stratum has any element with presence "Optional",
  // it must also have at least one element with presence "Fixed".
  //
  // Uses LC_Properties.current rows keyed by StratumID and field
  // `elementPresenceType` created from the "Element Presence Type" block element.
  // ---------------------------------------------------------------------------

  const strataById: Record<number, Stratum> = {};
  strataForLegend.forEach((s) => {
    strataById[s.stratumID] = s;
  });

  const propsByStratum = groupBy(properties, (p) => p.StratumID);
  const presenceIssues: string[] = [];

  Object.entries(propsByStratum).forEach(([stratumIdStr, props]) => {
    const stratumId = Number(stratumIdStr);
    const hasOptional = props.some(
      (p) => (p.elementPresenceType || "").toLowerCase() === "optional"
    );
    if (!hasOptional) return;
    const hasFixed = props.some(
      (p) => (p.elementPresenceType || "").toLowerCase() === "fixed"
    );
    if (!hasFixed) {
      const stratum = strataById[stratumId];
      presenceIssues.push(stratum?.name || `Stratum ${stratumId}`);
    }
  });

  if (presenceIssues.length === 0) {
    results.push({
      ruleId: "elementPresenceSemantic",
      severity: "success",
      summary: VALIDATION_RULE_LABELS.elementPresenceSemantic,
      detail: VALIDATION_MESSAGES.elementPresenceSemantic.success
    });
  } else {
    results.push({
      ruleId: "elementPresenceSemantic",
      severity: "error",
      summary: VALIDATION_RULE_LABELS.elementPresenceSemantic + " Fail",
      detail: VALIDATION_MESSAGES.elementPresenceSemantic.error(presenceIssues)
    });
  }

  // ---------------------------------------------------------------------------
  // Rule 6 (semantic): Stratum portioning totals per HP must sum to 100%.
  //
  // For each Horizontal Pattern, we sum the "upper bound" of the
  // Stratum.portioning range (portioning[1]). If portioning is a single
  // number, that value is used directly. This gives you a strict
  // "total must be 100%" structural check per HP.
  // ---------------------------------------------------------------------------

  const strataForLegendByHP = groupBy(strataForLegend, (s) => s.HPID);
  const portioningIssues: string[] = [];

  Object.entries(strataForLegendByHP).forEach(([hpIdStr, hpStrata]) => {
    const hpId = Number(hpIdStr);
    const hp = hpsForLegend.find((h) => h.horizontal_pattern_id === hpId);

    const total = hpStrata.reduce((sum, stratum) => {
      const p = stratum.portioning;
      let value = 0;
      if (Array.isArray(p)) {
        value = Number(p[1] ?? 0);
      } else if (typeof p === "number") {
        value = p;
      }
      if (!isFinite(value)) value = 0;
      return sum + value;
    }, 0);

    if (Math.round(total) !== 100) {
      const label = hp?.name || `Horizontal Pattern ${hpId}`;
      portioningIssues.push(`${label} (total: ${total}%)`);
    }
  });

  if (portioningIssues.length === 0) {
    results.push({
      ruleId: "stratumPortioningTotal",
      severity: "success",
      summary: VALIDATION_RULE_LABELS.stratumPortioningTotal,
      detail: VALIDATION_MESSAGES.stratumPortioningTotal.success
    });
  } else {
    results.push({
      ruleId: "stratumPortioningTotal",
      severity: "error",
      summary: VALIDATION_RULE_LABELS.stratumPortioningTotal + " Fail",
      detail: VALIDATION_MESSAGES.stratumPortioningTotal.error(portioningIssues)
    });
  }*/

  return results;
}