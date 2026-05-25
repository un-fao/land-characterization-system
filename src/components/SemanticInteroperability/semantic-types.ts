// ============================================================================
// TYPE DEFINITIONS FOR SEMANTIC INTEROPERABILITY SYSTEM
// ============================================================================

// ----------------------------------------------------------------------------
// Legend Data Types
// ----------------------------------------------------------------------------

export interface Legend {
  id: string;
  legend_name: string;
  legend_description: string;
  legend_author: string;
  version?: string;
  created_date?: string;
  LCT_Class: LegendClass[];
  LCT_ClassCharacteristics?: any[]; // Class characteristics
  LCT_HorizontalPatterns: HorizontalPattern[];
  LCT_Strata: Stratum[];
  LCT_Properties: StratumProperty[];
  LCT_Characteristics: Characteristic[];
}

export interface LegendClass {
  class_id: number;
  class_name: string;
  class_map_code: string;
  class_description?: string;
  color_code?: string;
}

export interface HorizontalPattern {
  horizontal_pattern_id: number;
  class_id: number;
  horizontal_pattern_name?: string;
  HPID?: number; // Legacy compatibility
}

export interface Stratum {
  stratumID: number;
  HPID: number;
  horizontal_pattern_id?: number;
  stratum_name?: string;
}

export interface StratumProperty {
  property_id: number;
  StratumID: number;
  BlockID: number;
  cover?: number;
  elementPresenceType?: string;
  [key: string]: any; // Allow dynamic properties
}

export interface Characteristic {
  characteristic_id: number;
  StratumID: number;
  BlockID: number;
  CharacteristicID: number;
  [key: string]: any; // Dynamic characteristic values
}

// ----------------------------------------------------------------------------
// Rule System Types
// ----------------------------------------------------------------------------

export interface RuleSet {
  metadata: RuleSetMetadata;
  rules: LegendRule[];
  classes: ReferenceClass[];
  validation?: ValidationSchema;
}

export interface RuleSetMetadata {
  id: string;
  name: string;
  fullName: string;
  version: string;
  author: string;
  organization?: string;
  description: string;
  url?: string;
  citation?: string;
  created: string;
  updated: string;
  tags?: string[];
}

export interface LegendRule {
  id: number;
  name: string;
  priority: number;
  syntax: string;
  description?: string;
  assignment: ClassAssignment;
  inclusive: RuleConditions;
  exclusive: RuleConditions;
  metadata?: {
    created?: string;
    updated?: string;
    author?: string;
    notes?: string;
  };
}

export interface ClassAssignment {
  class_id: number;
  class_name: string;
  class_map_code: string;
  class_code?: string;
  class_description?: string;
}

export interface RuleConditions {
  classes: StructuralRule;
  classCharacteristics: StructuralRule;
  horizontalPatterns: StructuralRule;
  strata: StructuralRule;
  elements: ElementRule[];
}

export interface StructuralRule {
  id: number;
  priority: number;
  name: string;
  rules: {
    properties: PropertyRuleGroup;
    characteristics: CharacteristicRuleGroup;
  };
}

export interface PropertyRuleGroup {
  and: RuleCondition[];
  or: RuleConditionSet[];
}

export interface CharacteristicRuleGroup {
  and: RuleCondition[];
  or: RuleConditionSet[];
}

export interface RuleCondition {
  object: string;
  lower_bound: string | number;
  lower_tolerance: string | number;
  upper_bound: string | number;
  upper_tolerance: string | number;
  mode: ComparisonMode;
}

export type RuleConditionSet = Record<string, RuleCondition[]>;

export type ComparisonMode = 
  | "=" 
  | "Contains" 
  | ">" 
  | ">=" 
  | "<" 
  | "<=" 
  | "><" 
  | "<>" 
  | ">=<=" 
  | "<=>=";

export interface ElementRule {
  id: number;
  priority: number;
  element: number; // BlockID
  ruleDefinition: {
    properties: PropertyRuleDef[];
    characteristics: CharacteristicRuleDef[];
  };
}

export interface PropertyRuleDef {
  id: number;
  name: string;
  priority: number;
  rules: {
    properties: PropertyRuleGroup;
    characteristics: CharacteristicRuleGroup;
  };
}

export interface CharacteristicRuleDef {
  id: number;
  name: string;
  priority: number;
  characteristicID: number;
  rules: {
    properties: PropertyRuleGroup;
    characteristics: CharacteristicRuleGroup;
  };
}

export interface ReferenceClass {
  class_id: number;
  class_name: string;
  class_map_code: string;
  class_description?: string;
  parent_class?: number;
}

// ----------------------------------------------------------------------------
// Matching & Results Types
// ----------------------------------------------------------------------------

export interface MatchResult {
  appointedClass: LegendClass;
  matches: ClassMatch[];
  selectedMatch?: ClassMatch;
  userOverride?: ClassMatch;
  timestamp: string;
}

export interface ClassMatch {
  ruleId: number;
  ruleName: string;
  priority: number;
  assignment: ClassAssignment;
  confidence: number;
  details: MatchDetails;
  explanation: MatchExplanation;
  trace: RuleTrace;
}

export interface MatchDetails {
  classMatch: boolean;
  horizontalPatternMatch: boolean;
  strataMatch: boolean;
  elementMatches: ElementMatchDetail[];
  totalElements: number;
  matchedElements: number;
  ruleCount?: { // NEW: Rule count breakdown
    totalAndRules: number;
    totalOrGroups: number;
    totalRules: number;
    matchedAndRules: number;
    matchedOrGroups: number;
  };
}

export interface ElementMatchDetail {
  blockId: number;
  blockName: string;
  blockLabel?: string; // NEW: Human-readable label
  matched: boolean;
  propertyMatch: boolean;
  characteristicMatch: boolean;
  coverage?: number;
  presence?: string;
  elementScore?: number; // Score for this element (0-100)
  ruleMatches?: Array<{ // NEW: Detailed rule tracking
    ruleType: 'property' | 'characteristic';
    logicType: 'AND' | 'OR';
    ruleName: string;
    passed: boolean;
    conditions?: Array<{
      property: string;
      operator: ComparisonMode;
      expectedValue: string;
      actualValue: string;
      passed: boolean;
    }>;
  }>;
}

export interface MatchExplanation {
  summary: string;
  reasons: string[];
  warnings: string[];
  suggestions: string[];
}

export interface RuleTrace {
  class: boolean | null;
  classCharacteristics?: boolean | null;
  horizontalPattern: boolean | null;
  strata: boolean | null;
  elements: boolean | null;
  details: {
    properties: { and: boolean | null; or: boolean | null };
    characteristics: { and: boolean | null; or: boolean | null };
  };
}

// ----------------------------------------------------------------------------
// Processing Types
// ----------------------------------------------------------------------------

export interface ProcessingOptions {
  showProgress: boolean;
  includePartialMatches: boolean;
  minConfidence: number;
  maxMatches: number;
  useCache: boolean;
  async: boolean;
  blocksData?: any; // NEW: Blocks data for label lookup
  blockLookup?: any; // NEW: Block hierarchy lookup
  // Confidence multipliers (0-1 range)
  toleranceConfidence?: number; // Default 0.7 - confidence when within tolerance bounds
  characteristicConfidence?: number; // Default 0.5 - confidence when characteristics fail/missing
}

export interface ProcessingProgress {
  current: number;
  total: number;
  status: string;
  percentage: number;
  currentClass?: string;
  startTime: number;
  estimatedTimeRemaining?: number;
}

export interface ProcessingResult {
  success: boolean;
  matches: MatchResult[];
  errors: ProcessingError[];
  warnings: string[];
  statistics: ProcessingStatistics;
  processingTime: number;
}

export interface ProcessingError {
  classId: number;
  className: string;
  error: string;
  details?: any;
}

export interface ProcessingStatistics {
  totalClasses: number;
  matchedClasses: number;
  unmatchedClasses: number;
  partialMatches: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  averageConfidence: number;
}

// ----------------------------------------------------------------------------
// Plugin System Types
// ----------------------------------------------------------------------------

export interface ReferenceLegendPlugin {
  metadata: RuleSetMetadata;
  ruleSet: RuleSet;
  customProcessor?: (legend: Legend, options: ProcessingOptions) => Promise<MatchResult[]>;
  validator?: (rule: LegendRule) => ValidationResult;
}

export interface PluginRegistry {
  plugins: Map<string, ReferenceLegendPlugin>;
  register: (plugin: ReferenceLegendPlugin) => void;
  unregister: (id: string) => void;
  get: (id: string) => ReferenceLegendPlugin | undefined;
  getAll: () => ReferenceLegendPlugin[];
  load: (url: string) => Promise<void>;
}

// ----------------------------------------------------------------------------
// Validation Types
// ----------------------------------------------------------------------------

export interface ValidationSchema {
  version: string;
  requiredElements: number[];
  requiredCharacteristics: number[];
  validPresenceTypes: string[];
  coverageRules: {
    min: number;
    max: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  ruleId: number;
  field: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  ruleId: number;
  field: string;
  message: string;
  suggestion?: string;
}

// ----------------------------------------------------------------------------
// Cache Types
// ----------------------------------------------------------------------------

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  strategy: 'lru' | 'lfu' | 'fifo';
}

// ----------------------------------------------------------------------------
// Export Types
// ----------------------------------------------------------------------------

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'xml' | 'pdf';
  includeConfidence: boolean;
  includeExplanations: boolean;
  includeAlternatives: boolean;
  filename?: string;
}

export interface ExportData {
  metadata: {
    referenceLegend: string;
    appointedLegend: string;
    exportDate: string;
    totalClasses: number;
  };
  results: MatchResult[];
  statistics: ProcessingStatistics;
}

// ----------------------------------------------------------------------------
// UI Component Props Types
// ----------------------------------------------------------------------------

export interface WizardProps {
  onComplete: (results: ProcessingResult) => void;
  onCancel: () => void;
}

export interface RuleBuilderProps {
  existingRule?: LegendRule;
  blocks: any[];
  characteristics: any[];
  onSave: (rule: LegendRule) => void;
  onCancel: () => void;
}

export interface ResultsTableProps {
  results: MatchResult[];
  onMatchSelect: (result: MatchResult, match: ClassMatch) => void;
  onExport: (format: ExportOptions) => void;
}

export interface ConfidenceMeterProps {
  confidence: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export interface MatchExplanationProps {
  match: ClassMatch;
  appointedClass: LegendClass;
  onShowDetails: () => void;
}