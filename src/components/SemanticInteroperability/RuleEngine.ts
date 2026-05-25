// ============================================================================
// RULE ENGINE - CORRECTED VERSION WITH PROPER THRESHOLD HANDLING
// ============================================================================

import {
  Legend,
  LegendRule,
  MatchResult,
  ClassMatch,
  MatchDetails,
  RuleTrace,
  ProcessingOptions,
  ElementMatchDetail,
  RuleCondition,
  ComparisonMode
} from './semantic-types';

interface ComparisonResult {
  passed: boolean;
  confidence: number;  // 1.0 = perfect, 0.7 = within threshold, 0 = failed
  message?: string;
}

export class RuleEngine {
  private cache: Map<string, any> = new Map();
  private blockLookUpData: any = null;
  private processingOptions: ProcessingOptions | null = null;
  private logEntries: string[] = [];

  /**
   * Log a message and capture it for later retrieval
   */
  private log(message: string): void {
    console.log(message);
    this.logEntries.push(message);
  }

  /**
   * Get all captured log entries
   */
  public getLogEntries(): string[] {
    return [...this.logEntries];
  }

  /**
   * Get formatted log as a single string
   */
  public getFormattedLog(): string {
    return this.logEntries.join('\n');
  }

  /**
   * Clear captured log entries
   */
  public clearLog(): void {
    this.logEntries = [];
  }
  
  /**
   * Main entry point: match an appointed legend against reference rules
   */
  public async matchLegend(
    appointedLegend: Legend,
    referenceRules: LegendRule[],
    options: ProcessingOptions,
    blockLookUp?: any
  ): Promise<MatchResult[]> {
    
    // Clear previous logs and start fresh
    this.clearLog();
    
    // CRITICAL: Clear cache to prevent stale data from previous legend evaluations
    this.cache.clear();
    this.log("🗑️ Cache cleared for new legend evaluation");
    
    // Store blockLookUp for this matching session
    this.processingOptions = options;
    this.blockLookUpData = blockLookUp;
    
    const results: MatchResult[] = [];
    
    this.log("\n🏯 Starting legend matching...");
    this.log(`📋 ${appointedLegend.LCT_Class.length} classes to match`);
    this.log(`📜 ${referenceRules.length} reference rules`);
    
    if (blockLookUp) {
      this.log(`✅ Block hierarchy provided`);
    } else {
      this.log("⚠️ No block hierarchy - hierarchical matching disabled");
    }
    
    // DEBUG: Show full legend structure
    this.log(`\n📦 Full appointed legend structure:`);
    this.log(`   Classes: ${appointedLegend.LCT_Class.length}`);
    appointedLegend.LCT_Class.forEach(c => this.log(`      - Class ${c.class_id}: ${c.class_name}`));
    this.log(`   HorizontalPatterns: ${appointedLegend.LCT_HorizontalPatterns.length}`);
    appointedLegend.LCT_HorizontalPatterns.forEach(hp => this.log(`      - HP ${hp.horizontal_pattern_id || hp.HPID} -> Class ${hp.class_id}`));
    this.log(`   Strata: ${appointedLegend.LCT_Strata.length}`);
    appointedLegend.LCT_Strata.forEach(s => this.log(`      - Stratum ${s.stratumID} -> HP ${s.HPID || s.horizontal_pattern_id}`));
    this.log(`   Properties: ${appointedLegend.LCT_Properties.length}`);
    appointedLegend.LCT_Properties.forEach(p => this.log(`      - Prop: StratumID ${p.StratumID}, BlockID ${p.BlockID}`));
    this.log(`   Characteristics: ${appointedLegend.LCT_Characteristics.length}`);
    appointedLegend.LCT_Characteristics.forEach(c => this.log(`      - Char: StratumID ${c.StratumID}, BlockID ${c.BlockID}, CharID ${c.CharacteristicID}`));
    
    for (const appointedClass of appointedLegend.LCT_Class) {
      this.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.log(`┏ MATCHING CLASS: ${appointedClass.class_name} (ID: ${appointedClass.class_id})`);
      this.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const classLegend = this.filterLegendByClass(appointedLegend, appointedClass.class_id);
      const matches = await this.matchClassAgainstRules(classLegend, referenceRules, options);
      
      matches.sort((a, b) => b.confidence - a.confidence);
      
      this.log(`\n📋 Match summary for ${appointedClass.class_name}:`);
      matches.forEach((m, i) => {
        this.log(`  ${i + 1}. ${m.assignment.class_name}: ${m.confidence}%`);
      });
      
      const filteredMatches = matches.filter(m => m.confidence >= options.minConfidence);
      const limitedMatches = filteredMatches.slice(0, options.maxMatches);

      // Only auto-select if there's a match with reasonable confidence (> 0%)
      // For 0% matches, leave selectedMatch as undefined so user must manually assign
      const autoSelectedMatch = limitedMatches.length > 0 && limitedMatches[0].confidence > 0
        ? limitedMatches[0]
        : undefined;

      results.push({
        appointedClass,
        matches: limitedMatches,
        selectedMatch: autoSelectedMatch,  // Only assigns if confidence > 0%
        timestamp: new Date().toISOString()
      });
    }
    
    return results;
  }
  
  /**
   * Hierarchical matching - check if legendBlock is descendant of ruleBlock
   * Now recursively traverses the ENTIRE tree depth to find ancestor matches
   */
  private blockSatisfiesRule(legendBlockId: number, ruleBlockId: number): boolean {
    const numLegendBlockId = Number(legendBlockId);
    const numRuleBlockId = Number(ruleBlockId);
    
    this.log(`      🔍 Checking: Block ${numLegendBlockId} vs Rule Block ${numRuleBlockId}`);
    
    // Direct match
    if (numLegendBlockId === numRuleBlockId) {
      this.log(`      ✅ Direct match: Block ${numLegendBlockId} === ${numRuleBlockId}`);
      return true;
    }
    
    // Check hierarchy
    if (!this.blockLookUpData) {
      this.log(`      ⚠️  No blockLookUpData available`);
      return false;
    }
    
    if (!this.blockLookUpData['LC_Block-LC_Block']) {
      this.log(`      ⚠️ No LC_Block-LC_Block in blockLookUpData`);
      return false;
    }
    
    const blocks = this.blockLookUpData['LC_Block-LC_Block'];
    this.log(`      📊 Searching in ${blocks.length} blocks`);
    
    // Recursive function to check all ancestors
    const isDescendantOf = (childBlockId: number, targetAncestorId: number, level: number = 0, visited: Set<number> = new Set()): boolean => {
      // Prevent infinite loops
      if (visited.has(childBlockId)) {
        this.log(`      ⚠️ Circular reference detected at block ${childBlockId}`);
        return false;
      }
      visited.add(childBlockId);
      
      // Find the child block
      const childBlock = blocks.find((b: any) => Number(b.block_id) === childBlockId);
      
      if (!childBlock) {
        this.log(`      ❌ Block ${childBlockId} not found in hierarchy`);
        return false;
      }
      
      // Check if parent exists
      if (!childBlock.parent_id) {
        this.log(`      📋 Block ${childBlockId} has no parent (reached root at level ${level})`);
        return false;
      }
      
      const parentId = Number(childBlock.parent_id);
      this.log(`      📋 Level ${level}: Block ${childBlockId} <=> Parent ${parentId}`);
      
      // Check if parent matches target
      if (parentId === targetAncestorId) {
        this.log(`      ✅ Hierarchical match found at level ${level + 1}: Block ${numLegendBlockId} is descendant of ${numRuleBlockId}`);
        return true;
      }
      
      // Recursively check parent's ancestors
      return isDescendantOf(parentId, targetAncestorId, level + 1, visited);
    };
    
    // Start recursive search
    const result = isDescendantOf(numLegendBlockId, numRuleBlockId);
    
    if (!result) {
      this.log(`      ❌ No hierarchical match found after traversing entire tree`);
    }
    
    return result;
  }
  
  /**
   * Filter legend by class
   */
  private filterLegendByClass(legend: Legend, classId: number): Legend {
    const cacheKey = `filtered-${legend.id}-${classId}`;
    
    this.log(`\n🔍 filterLegendByClass called for classId=${classId}, legend.id=${legend.id}`);
    this.log(`   Cache key: "${cacheKey}"`);
    
    if (this.cache.has(cacheKey)) {
      this.log(`   ⚠️ Returning CACHED result for class ${classId}`);
      const cached = this.cache.get(cacheKey);
      this.log(`   Cached data: strata=${cached.LCT_Strata.length}, properties=${cached.LCT_Properties.length}`);
      if (cached.LCT_Strata.length > 0) {
        this.log(`   Cached strataIDs: ${cached.LCT_Strata.map((s: any) => s.stratumID).join(', ')}`);
      }
      return cached;
    }
    
    this.log(`   ✅ Cache MISS - filtering fresh data`);
    
    const filteredClasses = legend.LCT_Class.filter(c => c.class_id === classId);
    const filteredHPs = legend.LCT_HorizontalPatterns.filter(hp => hp.class_id === classId);
    const hpIds = filteredHPs.map(hp => hp.horizontal_pattern_id || hp.HPID).filter(id => id !== undefined);
    
    this.log(`   Filtered HPs: ${filteredHPs.length}, HP IDs: [${hpIds.join(', ')}]`);
    
    const filteredStrata = legend.LCT_Strata.filter(s => 
      hpIds.includes(s.HPID) || hpIds.includes(s.horizontal_pattern_id as any)
    );
    
    this.log(`   Filtered Strata: ${filteredStrata.length}, Stratum IDs: [${filteredStrata.map(s => s.stratumID).join(', ')}]`);
    
    const strataIds = filteredStrata.map(s => s.stratumID);
    const filteredProperties = legend.LCT_Properties.filter(p => strataIds.includes(p.StratumID));
    
    this.log(`   Filtered Properties: ${filteredProperties.length}, Property StratumIDs: [${filteredProperties.map(p => p.StratumID).join(', ')}]`);
    
    const blockIds = [...new Set(filteredProperties.map(p => p.BlockID))];
    const filteredCharacteristics = legend.LCT_Characteristics.filter(c =>
      strataIds.includes(c.StratumID) && blockIds.includes(c.BlockID)
    );
    
    const filtered: Legend = {
      ...legend,
      LCT_Class: filteredClasses,
      LCT_HorizontalPatterns: filteredHPs,
      LCT_Strata: filteredStrata,
      LCT_Properties: filteredProperties,
      LCT_Characteristics: filteredCharacteristics
    };
    
    this.log(`\n🧐 Filtered legend for class ${classId}: classes=${filtered.LCT_Class.length}, horizontalPatterns=${filtered.LCT_HorizontalPatterns.length}, strata=${filtered.LCT_Strata.length}, properties=${filtered.LCT_Properties.length}, characteristics=${filtered.LCT_Characteristics.length}`);
    
    this.cache.set(cacheKey, filtered);
    return filtered;
  }
  
  /**
   * Match class against ALL rules
   */
  private async matchClassAgainstRules(
    classLegend: Legend,
    rules: LegendRule[],
    options: ProcessingOptions,
    blockLookUp?: any
  ): Promise<ClassMatch[]> {
    // Store blockLookUp when provided
    this.log(`🧐 RuleEngine.matchClassAgainstRules: blockLookUp received? ${!!blockLookUp}`);
    if (blockLookUp) {
      this.blockLookUpData = blockLookUp;
      this.log(`🧐 Stored blockLookUp with ${blockLookUp['LC_Block-LC_Block'].length} blocks`);
    } else {
      this.log('⚠️ RuleEngine: blockLookUp NOT received - hierarchical matching will fail');
    }
    const matches: ClassMatch[] = [];
    
    // CRITICAL: Evaluate ALL rules
    for (const rule of rules) {
      this.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.log(`🏯 Evaluating Rule: ${rule.name}`);
      this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const match = await this.evaluateRule(classLegend, rule, options);
      
      this.log(`\n✅ Rule "${rule.name}" result: ${match.confidence}%`);
      
      if (match.confidence > 0 || options.includePartialMatches) {
        matches.push(match);
      }
    }
    
    return matches;
  }
  
  /**
   * Evaluate a single rule
   */
  private async evaluateRule(
    legend: Legend,
    rule: LegendRule,
    options: ProcessingOptions
  ): Promise<ClassMatch> {
    
    this.log('\n🔍 STEP 1: Evaluating Structural Rules...');
    
    const structuralPassed = this.evaluateStructuralGates(legend, rule);
    
    if (!structuralPassed) {
      this.log('❌ STRUCTURAL RULES FAILED - Returning 0% confidence');
      return this.createFailedMatch(rule, 'Structural rules failed');
    }
    
    this.log('✅ Structural rules PASSED');
    
    this.log('\n🔩 STEP 2: Evaluating Element Rules...');
    
    if (rule.inclusive.elements.length === 0) {
      this.log('ℹ️ No element rules defined - structural match only');
      return this.createStructuralOnlyMatch(rule, legend);
    }
    
    const elementResults = this.evaluateElements(
      legend.LCT_Properties,
      legend.LCT_Characteristics,
      rule.inclusive.elements,
      options
    );
    
    this.log('\n📊 STEP 3: Calculating Confidence...');
    
    const confidence = this.calculateConfidence(elementResults.matchDetails);
    
    this.log(`\n🏯 FINAL CONFIDENCE: ${confidence}%`);
    
    const details: MatchDetails = {
      classMatch: true,
      horizontalPatternMatch: true,
      strataMatch: true,
      elementMatches: elementResults.matchDetails,
      totalElements: rule.inclusive.elements.length,
      matchedElements: elementResults.matchDetails.filter(e => e.matched).length
    };
    
    const explanation = this.generateExplanation(rule, elementResults.matchDetails, confidence);
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      assignment: rule.assignment,
      confidence,
      details,
      explanation,
      trace: {
        class: true,
        horizontalPattern: true,
        strata: true,
        elements: elementResults.allMatched,
        details: { 
          properties: { and: null, or: null }, 
          characteristics: { and: null, or: null } 
        }
      }
    };
  }
  
  /**
   * Calculate confidence from element matches
   */
  private calculateConfidence(matchDetails: ElementMatchDetail[]): number {
    if (matchDetails.length === 0) {
      return 0;
    }
    
    const scores = matchDetails.map(e => e.elementScore || 0);
    this.log(`  📊 Element scores: ${matchDetails.map(e => `Block ${e.blockId}: ${e.elementScore}%`).join(', ')}`);
    
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const avgScore = totalScore / scores.length;
    
    this.log(`  📊 Average score: ${avgScore.toFixed(0)}%`);
    
    return Math.round(avgScore);
  }
  
  /**
   * Evaluate structural gates
   * 
   * IMPORTANT - HIERARCHICAL SCOPING:
   * 1. Class level: Checks properties of the current class (legend is already filtered to one class)
   * 2. HP level: Checks properties across ALL horizontal patterns in this class
   *    - Example: "sum:horizontal_pattern_id >= 2" counts HPs in this class
   * 3. Strata level: Checks properties across ALL strata in ALL HPs of this class
   *    - Example: "sum:stratumID >= 5" counts total strata in all HPs
   * 
   * NOTE: If you need per-HP checks (e.g., "each HP must have >= 2 strata"),
   * use element-level rules, not structural rules.
   */
  private evaluateStructuralGates(legend: Legend, rule: LegendRule): boolean {
    this.log('  📋 Checking Classes...');
    this.log(`     Found ${legend.LCT_Class.length} class(es) in filtered legend`);
    if (!this.evaluateStructuralLevel(
      legend.LCT_Class,
      rule.inclusive.classes,
      rule.exclusive.classes
    )) {
      return false;
    }
    this.log('  ✅ Class requirements met');
    
    this.log('  📋 Checking Horizontal Patterns...');
    this.log(`     Found ${legend.LCT_HorizontalPatterns.length} horizontal pattern(s) in this class`);
    if (!this.evaluateStructuralLevel(
      legend.LCT_HorizontalPatterns,
      rule.inclusive.horizontalPatterns,
      rule.exclusive.horizontalPatterns
    )) {
      return false;
    }
    this.log('  ✅ Horizontal Pattern requirements met');
    
    this.log('  📋 Checking Strata...');
    this.log(`     Found ${legend.LCT_Strata.length} strata in all horizontal patterns`);
    if (!this.evaluateStructuralLevel(
      legend.LCT_Strata,
      rule.inclusive.strata,
      rule.exclusive.strata
    )) {
      return false;
    }
    this.log('  ✅ Strata requirements met');
    
    return true;
  }
  
  /**
   * Evaluate structural level
   */
  private evaluateStructuralLevel(subjects: any[], inclusiveRule: any, exclusiveRule: any): boolean {
    if (inclusiveRule?.rules) {
      const inclusiveResult = this.evaluateRuleGroup(subjects, inclusiveRule.rules);
      const inclusivePass = (inclusiveResult.and === true || inclusiveResult.and === null) &&
                           (inclusiveResult.or === true || inclusiveResult.or === null);
      if (!inclusivePass) {
        return false;
      }
    }
    
    if (exclusiveRule?.rules) {
      const exclusiveResult = this.evaluateRuleGroup(subjects, exclusiveRule.rules);
      const exclusiveFail = exclusiveResult.and === false || exclusiveResult.and === null;
      if (!exclusiveFail) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Evaluate elements
   */
  private evaluateElements(
    properties: any[],
    characteristics: any[],
    inclusiveElements: any[],
    options: ProcessingOptions
  ): { allMatched: boolean; matchDetails: ElementMatchDetail[] } {
    
    const matchDetails: ElementMatchDetail[] = [];
    let allMatched = true;
    
    for (const elementRule of inclusiveElements) {
      this.log(`\n  🔍 Evaluating Element: Block ${elementRule.element}`);
      
      // DEBUG: Show ALL properties available before filtering
      this.log(`    📊 BEFORE FILTER: Total properties available: ${properties.length}`);
      properties.forEach((p, idx) => {
        this.log(`      [${idx}] StratumID: ${p.StratumID}, BlockID: ${p.BlockID}, cover: ${p.cover}`);
      });
      
      // DEBUG: Show ALL characteristics available before filtering  
      this.log(`    📊 BEFORE FILTER: Total characteristics available: ${characteristics.length}`);
      characteristics.forEach((c, idx) => {
        const allKeys = Object.keys(c).join(", ");
        this.log(`      [${idx}] StratumID: ${c.StratumID}, BlockID: ${c.BlockID}, Keys: ${allKeys}`);
      });
      
      
      const elementProps = properties.filter(p => 
        this.blockSatisfiesRule(p.BlockID, elementRule.element)
      );
      
      const elementChars = characteristics.filter(c => 
        this.blockSatisfiesRule(c.BlockID, elementRule.element)
      );
      
      this.log(`    📋 AFTER FILTER: Found ${elementProps.length} properties, ${elementChars.length} characteristics`);
      
      if (elementProps.length > 0) {
        elementProps.forEach((prop, idx) => {
          this.log(`      Property ${idx + 1}: BlockID ${prop.BlockID}, cover ${prop.cover}`);
        });
      }
      
      let elementScore = 0;
      let propertyPass = false;
      let characteristicPass = true;
      let matched = false;
      let propertyConfidence = 1.0;
      
      // Evaluate CARDINAL property rules
      if (elementRule.ruleDefinition.properties.length > 0 && elementProps.length > 0) {
        this.log(`    🔧 Evaluating CARDINAL property rules...`);
        
        for (const propRuleDef of elementRule.ruleDefinition.properties) {
          const propResult = this.evaluateRuleGroupWithConfidence(elementProps, propRuleDef.rules);
          
          if (propResult.passed) {
            propertyPass = true;
            propertyConfidence = propResult.confidence;
            this.log(`    ✅ Property rules PASSED - confidence: ${(propResult.confidence * 100).toFixed(0)}%`);
            if (propResult.message) {
              this.log(`    ℹ️ ${propResult.message}`);
            }
            break;
          }
        }
        
        if (!propertyPass) {
          this.log(`    ❌ Property rules FAILED - element fails`);
          matchDetails.push({
            blockId: elementRule.element,
            blockName: `Block ${elementRule.element}`,
            matched: false,
            propertyMatch: false,
            characteristicMatch: false,
            coverage: elementProps[0]?.cover,
            presence: elementProps[0]?.elementPresenceType,
            elementScore: 0
          });
          allMatched = false;
          continue;
        }
      } else if (elementRule.ruleDefinition.properties.length > 0) {
        this.log(`    ❌ Property rules exist but no properties found - element fails`);
        matchDetails.push({
          blockId: elementRule.element,
          blockName: `Block ${elementRule.element}`,
          matched: false,
          propertyMatch: false,
          characteristicMatch: false,
          elementScore: 0
        });
        allMatched = false;
        continue;
      } else {
        propertyPass = true;
        this.log(`    ✅ No property rules - PASS`);
      }
      
      // Evaluate SECONDARY characteristic rules
      let characteristicConfidence = 1.0;
      
      if (elementRule.ruleDefinition.characteristics.length > 0 && elementChars.length > 0) {
        this.log(`    🔬 Evaluating SECONDARY characteristic rules...`);
        let charRulePassed = false;
        
        for (const charRuleDef of elementRule.ruleDefinition.characteristics) {
          const charResult = this.evaluateRuleGroupWithConfidence(elementChars, charRuleDef.rules);
          
          if (charResult.passed) {
            charRulePassed = true;
            characteristicConfidence = charResult.confidence;
            this.log(`    ✅ Characteristic rules PASSED - confidence: ${(charResult.confidence * 100).toFixed(0)}%`);
            if (charResult.message) {
              this.log(`    ℹ️ ${charResult.message}`);
            }
            break;
          }
        }
        
        if (!charRulePassed) {
          characteristicConfidence = this.processingOptions?.characteristicConfidence ?? 0.5;
          characteristicPass = false;
          this.log(`    ⚠️  Characteristic rules FAILED - confidence reduced to 50%`);
        }
      } else if (elementRule.ruleDefinition.characteristics.length > 0 && elementChars.length === 0) {
        characteristicConfidence = this.processingOptions?.characteristicConfidence ?? 0.5;
        characteristicPass = false;
        this.log(`    ⚠️  No characteristics found but rules exist - confidence reduced to 50%`);
      } else {
        this.log(`    ✅ No characteristic rules - PASS at 100%`);
      }
      
      matched = propertyPass;
      elementScore = matched ? Math.round(100 * propertyConfidence * characteristicConfidence) : 0;
      
      this.log(`    📋 Element result: matched=${matched}, score=${elementScore}%`);
      
      matchDetails.push({
        blockId: elementRule.element,
        blockName: `Block ${elementRule.element}`,
        matched,
        propertyMatch: propertyPass,
        characteristicMatch: characteristicPass,
        coverage: elementProps[0]?.cover,
        presence: elementProps[0]?.elementPresenceType,
        elementScore
      });
      
      if (!matched) {
        allMatched = false;
      }
    }
    
    return { allMatched, matchDetails };
  }
  
  /**
   * Evaluate rule group with confidence tracking
   */
  private evaluateRuleGroupWithConfidence(
    subjects: any[], 
    rules: any
  ): ComparisonResult {
    let andResult: boolean | null = null;
    let orResult: boolean | null = null;
    let minConfidence = 1.0;
    let messages: string[] = [];
    
    // AND conditions
    if (rules.properties?.and && rules.properties.and.length > 0) {
      this.log(`      📋 Processing ${rules.properties.and.length} AND condition(s)...`);
      for (const condition of rules.properties.and) {
        this.log(`      🔍 Evaluating condition: ${condition.object} ${condition.mode}...`);
        const result = this.evaluateConditionForSubjects(subjects, condition);
        const conditionMet = result.passed;
        
        if (andResult === null) andResult = conditionMet;
        else andResult = andResult && conditionMet;
        
        if (conditionMet) {
          minConfidence = Math.min(minConfidence, result.confidence);
          if (result.message) messages.push(result.message);
        }
      }
    }
    
    if (rules.characteristics?.and && rules.characteristics.and.length > 0) {
      for (const condition of rules.characteristics.and) {
        const result = this.evaluateConditionForSubjects(subjects, condition);
        const conditionMet = result.passed;
        
        if (andResult === null) andResult = conditionMet;
        else andResult = andResult && conditionMet;
        
        if (conditionMet) {
          minConfidence = Math.min(minConfidence, result.confidence);
          if (result.message) messages.push(result.message);
        }
      }
    }
    
    // OR conditions
    if (rules.properties?.or && rules.properties.or.length > 0) {
      orResult = this.evaluateOrConditionsWithConfidence(subjects, rules.properties.or).passed;
    }
    
    if (rules.characteristics?.or && rules.characteristics.or.length > 0) {
      const charOrResult = this.evaluateOrConditionsWithConfidence(subjects, rules.characteristics.or);
      if (orResult === null) orResult = charOrResult.passed;
      else orResult = orResult || charOrResult.passed;
    }
    
    const passed = (andResult === true || andResult === null) && (orResult === true || orResult === null);
    
    this.log(`      📊 AND result: ${andResult === null ? 'null (no AND conditions)' : andResult}, OR result: ${orResult === null ? 'null (no OR conditions)' : orResult}`);
    this.log(`      🎯 Final evaluation: ${passed ? 'PASS' : 'FAIL'}`);
    
    return {
      passed,
      confidence: passed ? minConfidence : 0,
      message: messages.length > 0 ? messages.join('; ') : undefined
    };
  }
  
  /**
   * Evaluate rule group (for structural checks)
   */
  private evaluateRuleGroup(subjects: any[], rules: any): { and: boolean | null; or: boolean | null } {
    let andResult: boolean | null = null;
    let orResult: boolean | null = null;
    
    if (rules.properties?.and && rules.properties.and.length > 0) {
      for (const condition of rules.properties.and) {
        const propResult = this.evaluateConditionForSubjects(subjects, condition).passed;
        
        if (andResult === null) andResult = propResult;
        else andResult = andResult && propResult;
      }
    }
    
    if (rules.characteristics?.and && rules.characteristics.and.length > 0) {
      for (const condition of rules.characteristics.and) {
        const charResult = this.evaluateConditionForSubjects(subjects, condition).passed;
        
        if (andResult === null) andResult = charResult;
        else andResult = andResult && charResult;
      }
    }
    
    if (rules.properties?.or && rules.properties.or.length > 0) {
      orResult = this.evaluateOrConditions(subjects, rules.properties.or);
    }
    
    if (rules.characteristics?.or && rules.characteristics.or.length > 0) {
      const charOrResult = this.evaluateOrConditions(subjects, rules.characteristics.or);
      if (orResult === null) orResult = charOrResult;
      else orResult = orResult || charOrResult;
    }
    
    return { and: andResult, or: orResult };
  }
  
  /**
   * Evaluate OR conditions with confidence
   * Handles both flat conditions and nested property-grouped conditions
   */
  private evaluateOrConditionsWithConfidence(subjects: any[], conditionSets: any[]): ComparisonResult {
    this.log(`      🔍 Evaluating OR conditions with ${conditionSets.length} condition set(s)`);
    
    for (let i = 0; i < conditionSets.length; i++) {
      const conditionSet = conditionSets[i];
      
      // Check if this is a nested property-grouped structure
      // e.g., { "vegetationArtificiality": [ {...}, {...} ] }
      if (conditionSet && typeof conditionSet === 'object' && !conditionSet.object) {
        this.log(`      📦 Detected nested property-grouped OR condition set ${i + 1}`);
        
        // Extract all property keys (should be characteristic names)
        const propertyKeys = Object.keys(conditionSet);
        
        for (const propKey of propertyKeys) {
          const nestedConditions = conditionSet[propKey];
          
          if (Array.isArray(nestedConditions)) {
            this.log(`      🔑 Property: ${propKey} with ${nestedConditions.length} condition(s)`);
            
            // Try each nested condition
            for (const nestedCondition of nestedConditions) {
              const result = this.evaluateConditionForSubjects(subjects, nestedCondition);
              if (result.passed) {
                this.log(`      ✅ OR condition PASSED on nested condition`);
                return result;
              }
            }
          }
        }
      } else {
        // Standard flat condition structure
        const result = this.evaluateConditionForSubjects(subjects, conditionSet);
        if (result.passed) {
          this.log(`      ✅ OR condition PASSED on flat condition`);
          return result;
        }
      }
    }
    
    this.log(`      ❌ All OR conditions FAILED`);
    return { passed: false, confidence: 0 };
  }
  
  /**
   * Evaluate OR conditions (legacy - for structural checks)
   * Handles both flat conditions and nested property-grouped conditions
   */
  private evaluateOrConditions(subjects: any[], conditionSets: any[]): boolean {
    for (const conditionSet of conditionSets) {
      // Check if this is a nested property-grouped structure
      if (conditionSet && typeof conditionSet === 'object' && !conditionSet.object) {
        // Extract all property keys
        const propertyKeys = Object.keys(conditionSet);
        
        for (const propKey of propertyKeys) {
          const nestedConditions = conditionSet[propKey];
          
          if (Array.isArray(nestedConditions)) {
            // Try each nested condition
            for (const nestedCondition of nestedConditions) {
              if (this.evaluateConditionForSubjects(subjects, nestedCondition).passed) {
                return true;
              }
            }
          }
        }
      } else {
        // Standard flat condition
        if (this.evaluateConditionForSubjects(subjects, conditionSet).passed) {
          return true;
        }
      }
    }
    return false;
  }
  
  /**
   * Evaluate condition with confidence tracking
   * Note: This evaluates a SINGLE subject against a condition
   */
  private evaluateConditionWithConfidence(subject: any, condition: RuleCondition): ComparisonResult {
    const value = subject[condition.object];
    
    if (value === undefined || value === null) {
      this.log(`      Condition: ${condition.object} ${condition.mode} [${condition.lower_bound}, ${condition.upper_bound}] = FAIL (value is ${value === undefined ? 'undefined' : 'null'})`);
      this.log(`      Available properties in subject: ${Object.keys(subject).join(', ')}`);
      return { passed: false, confidence: 0 };
    }
    
    const result = this.compareValue(
      value,
      condition.lower_bound,
      Number(condition.lower_tolerance) || 0,
      condition.upper_bound,
      Number(condition.upper_tolerance) || 0,
      condition.mode
    );
    
    this.log(`      Condition: ${condition.object} ${condition.mode} [${condition.lower_bound}, ${condition.upper_bound}] = ${result.passed ? 'PASS' : 'FAIL'} (value: ${value}, confidence: ${(result.confidence * 100).toFixed(0)}%)`);
    if (result.message) {
      this.log(`      📝 ${result.message}`);
    }
    
    return result;
  }
  
  /**
   * Safely extract property value from subject, handling ranges and special cases
   */
  private getPropertyValue(subject: any, propertyName: string): any {
    const value = subject[propertyName];
    
    // If the value is undefined or null, return null
    if (value === undefined || value === null) {
      return null;
    }
    
    // If the value is an array (like ranges), use the midpoint
    if (Array.isArray(value)) {
      // For ranges, calculate the midpoint
      if (value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
        return (value[0] + value[1]) / 2;
      }
      // For other arrays, return the first element
      return value[0];
    }
    
    return value;
  }
  
  /**
   * ============================================================================
   * AGGREGATION RULE SYSTEM
   * ============================================================================
   * 
   * Special aggregation rules allow counting, averaging, and other operations
   * on collections of structural elements. The format is "aggregationType:propertyName"
   * 
   * AVAILABLE AGGREGATIONS:
   * 
   * 1. sum:propertyName or sum (count instances)
   *    - Counts the total number of instances
   *    - Example: "sum:class_id" counts total classes
   *    - Legacy: "sum" alone also counts instances for backward compatibility
   *    - Use case: "Must have at least 3 horizontal patterns"
   * 
   * 2. average:propertyName
   *    - Calculates the arithmetic mean of a numeric property
   *    - Example: "average:cover" gets average coverage across strata
   *    - Use case: "Average cover must be between 60-80%"
   * 
   * 3. min:propertyName
   *    - Finds the minimum value of a numeric property
   *    - Example: "min:cover" gets lowest coverage value
   *    - Use case: "Minimum cover must be at least 20%"
   * 
   * 4. max:propertyName
   *    - Finds the maximum value of a numeric property
   *    - Example: "max:cover" gets highest coverage value
   *    - Use case: "Maximum cover cannot exceed 90%"
   * 
   * 5. distinct:propertyName
   *    - Counts unique values of a property
   *    - Example: "distinct:class_id" counts unique classes
   *    - Use case: "Must have exactly 2 distinct pattern types"
   * 
   * ADDING NEW AGGREGATIONS:
   * To add a new aggregation type:
   * 1. Add the type to RuleBuilder.tsx aggregationTypes array
   * 2. Add a case in the calculateAggregation() method below
   * 3. Document the calculation method here
   * 4. Test with various data sets
   */
  
  /**
   * Calculate aggregation value from subjects based on rule specification
   * @param subjects - Array of data objects to aggregate
   * @param aggregationSpec - Format: "type:property" or just "type"
   * @returns Calculated aggregation value
   */
  /**
   * Calculate aggregation value for a collection of subjects
   * 
   * IMPORTANT: Aggregations are computed PER CLASS due to legend filtering:
   * 
   * 1. Before this method is called, the legend has been filtered to include only
   *    elements from the current class being matched (see filterLegendByClass).
   * 
   * 2. When matching Class A against a reference rule:
   *    - subjects for horizontal_pattern aggregations = only HPs from Class A
   *    - subjects for stratum aggregations = only strata from Class A's HPs  
   *    - subjects for property/characteristic aggregations = only from Class A's strata
   * 
   * 3. Examples:
   *    - "sum:horizontal_pattern_id" counts horizontal patterns IN THIS CLASS
   *    - "sum:stratumID" counts strata IN THIS CLASS'S HORIZONTAL PATTERNS
   *    - "average:cover" averages cover values IN THIS CLASS'S STRATA
   * 
   * This ensures rules like "Forest must have >= 3 horizontal patterns" check
   * each class individually, not the total across all classes in the legend.
   */
  private calculateAggregation(subjects: any[], aggregationSpec: string): number {
    // Validate aggregationSpec
    if (!aggregationSpec || typeof aggregationSpec !== 'string') {
      this.log('      Invalid aggregation specification');
      return 0;
    }
    
    // Parse aggregation specification
    const parts = aggregationSpec.split(':');
    if (!parts[0]) {
      this.log('      Empty aggregation type');
      return 0;
    }
    
    const aggregationType = parts[0].toLowerCase();
    const propertyName = parts.length > 1 ? parts[1] : null;
    
    this.log(`      📋 AGGREGATION: Calculating ${aggregationType}${propertyName ? ` of ${propertyName}` : ''} for ${subjects.length} subjects`);
    
    // Log the subjects being aggregated for debugging
    if (subjects.length > 0 && subjects.length <= 10) {
      this.log(`      📋 Subjects being counted: ${subjects.map((s, idx) => {
        const id = s.class_id || s.horizontal_pattern_id || s.HPID || s.stratumID || s.BlockID;
        return `[${idx}]: ${propertyName ? propertyName + '=' + (s[propertyName] || 'undefined') : 'id=' + id}`;
      }).join(', ')}`);
    } else if (subjects.length > 10) {
      this.log(`      📋 Subjects: ${subjects.length} items (showing first 3)`);
      this.log(`         ${subjects.slice(0, 3).map((s, idx) => {
        const id = s.class_id || s.horizontal_pattern_id || s.HPID || s.stratumID || s.BlockID;
        return `[${idx}]: id=${id}`;
      }).join(', ')}`);
    }
    
    switch (aggregationType) {
      case 'sum':
        // Count instances (legacy support for "sum" alone, or explicit "sum:property")
        if (!propertyName) {
          const count = subjects.length;
          this.log(`      ✅ SUM result: ${count} instances`);
          return count;
        }
        // Sum of a specific property
        const sumResult = subjects.reduce((total, subject) => {
          const value = this.getPropertyValue(subject, propertyName);
          return total + (typeof value === 'number' ? value : 0);
        }, 0);
        this.log(`      ✅ SUM of ${propertyName}: ${sumResult}`);
        return sumResult;
        
      case 'average':
        // Calculate arithmetic mean
        if (!propertyName) {
          this.log('      ⚠️  Average requires a property name');
          return 0;
        }
        const values = subjects
          .map(s => this.getPropertyValue(s, propertyName))
          .filter(v => typeof v === 'number');
        
        if (values.length === 0) {
          this.log(`      ⚠️  AVERAGE of ${propertyName}: No valid numeric values found`);
          return 0;
        }
        const sum = values.reduce((a: number, b: number) => a + b, 0);
        const avg = sum / values.length;
        this.log(`      ✅ AVERAGE of ${propertyName}: ${avg.toFixed(2)} (from ${values.length} values)`);
        return avg;
        
      case 'min':
        // Find minimum value
        if (!propertyName) {
          this.log('      ⚠️  Min requires a property name');
          return 0;
        }
        const minValues = subjects
          .map(s => this.getPropertyValue(s, propertyName))
          .filter(v => typeof v === 'number');
        
        if (minValues.length === 0) {
          this.log(`      ⚠️  MIN of ${propertyName}: No valid numeric values found`);
          return 0;
        }
        const minResult = Math.min(...minValues);
        this.log(`      ✅ MIN of ${propertyName}: ${minResult} (from ${minValues.length} values)`);
        return minResult;
        
      case 'max':
        // Find maximum value
        if (!propertyName) {
          this.log('      ⚠️  Max requires a property name');
          return 0;
        }
        const maxValues = subjects
          .map(s => this.getPropertyValue(s, propertyName))
          .filter(v => typeof v === 'number');
        
        if (maxValues.length === 0) {
          this.log(`      ⚠️  MAX of ${propertyName}: No valid numeric values found`);
          return 0;
        }
        const maxResult = Math.max(...maxValues);
        this.log(`      ✅ MAX of ${propertyName}: ${maxResult} (from ${maxValues.length} values)`);
        return maxResult;
        
      case 'distinct':
        // Count distinct values
        if (!propertyName) {
          const distinctCount = subjects.length;
          this.log(`      ✅ DISTINCT count: ${distinctCount} subjects`);
          return distinctCount;
        }
        const distinctSet = new Set(
          subjects
            .map(s => this.getPropertyValue(s, propertyName))
            .filter(v => v !== null && v !== undefined)
        );
        this.log(`      ✅ DISTINCT ${propertyName}: ${distinctSet.size} unique values`);
        return distinctSet.size;
        
      default:
        this.log(`      Unknown aggregation type: ${aggregationType}`);
        return 0;
    }
  }
  
  /**
   * Check if a condition uses an aggregation rule
   */
  private isAggregationRule(conditionObject: string): boolean {
    // Check for null/undefined first
    if (!conditionObject || typeof conditionObject !== 'string') {
      return false;
    }
    
    // Check for aggregation patterns: "type:property" or standalone "sum"
    const aggregationTypes = ['sum', 'average', 'min', 'max', 'distinct'];
    
    // Check if it's a standalone aggregation type
    if (aggregationTypes.includes(conditionObject.toLowerCase())) {
      return true;
    }
    
    // Check if it follows "type:property" pattern
    const parts = conditionObject.split(':');
    if (parts.length === 2 && aggregationTypes.includes(parts[0].toLowerCase())) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Evaluate condition for array of subjects (handles aggregation rules)
   */
  private evaluateConditionForSubjects(subjects: any[], condition: RuleCondition): ComparisonResult {
    // Check if this is an aggregation rule
    if (this.isAggregationRule(condition.object)) {
      const aggregatedValue = this.calculateAggregation(subjects, condition.object);
      const result = this.compareValue(
        aggregatedValue,
        condition.lower_bound,
        Number(condition.lower_tolerance) || 0,
        condition.upper_bound,
        Number(condition.upper_tolerance) || 0,
        condition.mode
      );
      
      this.log(`      Aggregation: ${condition.object} ${condition.mode} [${condition.lower_bound}, ${condition.upper_bound}] = ${result.passed ? 'PASS' : 'FAIL'} (value: ${aggregatedValue})`);
      return result;
    }
    
    // Regular property check - at least one subject must pass
    for (const subject of subjects) {
      const result = this.evaluateConditionWithConfidence(subject, condition);
      if (result.passed) {
        return result;
      }
    }
    
    return { passed: false, confidence: 0 };
  }
  
  /**
   * Compare value with threshold handling and confidence adjustment
   * 
   * Mode definitions for ranges [min, max] vs bounds [lower, upper]:
   * > : min > upper (entire range above upper bound)
   * >= : min >= upper (entire range at or above upper bound)  
   * < : max < lower (entire range below lower bound)
   * <= : max <= lower (entire range at or below lower bound)
   * = : exact match
   * >< : ranges overlap (any intersection)
   * >=<= : WITHIN bounds (min >= lower AND max <= upper)
   */
  private compareValue(
    value: any,
    lowerBound: any,
    lowerTolerance: number,
    upperBound: any,
    upperTolerance: number,
    mode: ComparisonMode
  ): ComparisonResult {
    
    // Handle text equality (case-insensitive)
    if (mode === '=' && (typeof value === 'string' || typeof lowerBound === 'string')) {
      const valueStr = String(value).trim();
      const boundStr = String(lowerBound).trim();
      const valueLower = valueStr.toLowerCase();
      const boundLower = boundStr.toLowerCase();
      const match = valueLower === boundLower;
      
      this.log(`      📝 TEXT EQUAL (case-insensitive):`);
      this.log(`         Value: "${value}" → lower: "${valueLower}"`);
      this.log(`         Bound: "${lowerBound}" → lower: "${boundLower}"`);
      this.log(`         Result: ${match ? '✅ PASS' : '❌ FAIL'}`);
      
      return {
        passed: match,
        confidence: match ? 1.0 : 0
      };
    }
    
    // Handle text Contains (case-insensitive substring match)
    if (mode === 'Contains' && (typeof value === 'string' || typeof lowerBound === 'string')) {
      const originalValue = String(value);
      const originalBound = String(lowerBound);
      const valueStr = originalValue.trim().toLowerCase();
      const boundStr = originalBound.trim().toLowerCase();
      const match = valueStr.includes(boundStr);
      
      this.log(`      📝 TEXT CONTAINS (case-insensitive):`)
      this.log(`         Original Value: "${originalValue}"`);
      this.log(`         Processed Value: "${valueStr}"`);
      this.log(`         Search for: "${originalBound}" → "${boundStr}"`);
      this.log(`         Result: ${match ? '✅ YES (substring found)' : '❌ NO (substring not found)'}`);
      this.log(`         Original Value: "${originalValue}"`);
      this.log(`         Processed Value: "${valueStr}"`);
      this.log(`         Search for: "${originalBound}" → "${boundStr}"`);
      this.log(`         Result: ${match ? '✅ YES (substring found)' : '❌ NO (substring not found)'}`);
      
      return {
        passed: match,
        confidence: match ? 1.0 : 0
      };
    }
    
    // Parse numeric values (single value or range)
    let minValue: number, maxValue: number;
    
    // Handle array format [62, 88] or ["62", "88"]
    if (Array.isArray(value) && value.length === 2) {
      minValue = parseFloat(String(value[0]).trim());
      maxValue = parseFloat(String(value[1]).trim());
      this.log(`      📋 Parsed array range: [${minValue}, ${maxValue}]`);
    } 
    // Handle string format "62,88"
    else if (typeof value === 'string' && value.includes(',')) {
      const parts = value.split(',').map(p => p.trim());
      minValue = parseFloat(parts[0]);
      maxValue = parseFloat(parts[1]);
      this.log(`      📋 Parsed string range: [${minValue}, ${maxValue}]`);
    } 
    // Single numeric value
    else {
      const parsed = parseFloat(String(value).trim());
      if (isNaN(parsed)) {
        this.log(`      ⚠️  Non-numeric value "${value}" for numeric comparison mode '${mode}'`);
        return { passed: false, confidence: 0, message: 'Non-numeric value in numeric comparison' };
      }
      minValue = maxValue = parsed;
      this.log(`      📋 Single value: ${minValue}`);
    }
    
    // Validate parsed numbers
    if (isNaN(minValue) || isNaN(maxValue)) {
      this.log(`      ⚠️  Invalid numeric values after parsing`);
      return { passed: false, confidence: 0, message: 'Invalid numeric values' };
    }
    
    const numLower = parseFloat(String(lowerBound).trim());
    const numUpper = parseFloat(String(upperBound).trim());
    
    if (isNaN(numLower) || isNaN(numUpper)) {
      this.log(`      ⚠️  Invalid bounds: lower=${lowerBound}, upper=${upperBound}`);
      return { passed: false, confidence: 0, message: 'Invalid bounds in rule' };
    }
    
    // Calculate effective bounds with tolerances
    const effectiveLower = numLower - lowerTolerance;
    const effectiveUpper = numUpper + upperTolerance;
    
    this.log(`      📝 Bounds: [${numLower}, ${numUpper}], Effective: [${effectiveLower}, ${effectiveUpper}]`);
    
    switch (mode) {
      case '>': {
        // Value must be ABOVE lower bound
        // For range [min, max] and bound [lower, upper]: min > lower
        // Example: [101, 150] > [70, 100] → PASS (min 101 > upper 100)
        // Example: [62, 90] > [70, 100] → FAIL (min 62 not > upper 100)
        
        if (minValue > numLower) {
          this.log(`      ✅ Strict > check: ${minValue} > ${numLower} (min > lower bound)`);
          return { passed: true, confidence: 1.0 };
        }
        
        // With tolerance
        if (lowerTolerance > 0 && minValue > effectiveLower) {
          this.log(`      ⚠️  Tolerance > check: within lower tolerance (${lowerTolerance})`);
          return { 
            passed: true, 
            confidence: this.processingOptions?.toleranceConfidence ?? 0.7,
            message: `Within lower tolerance (${lowerTolerance})`
          };
        }
        
        this.log(`      ❌ Failed > check: ${minValue} not > ${numLower} (min not > lower bound)`);
        return { passed: false, confidence: 0 };
      }
      
      case '>=': {
        // Value must be AT OR ABOVE lower bound
        // For range [min, max]: min >= lower
        
        if (minValue >= numLower) {
          this.log(`      ✅ Strict >= check: ${minValue} >= ${numLower} (min >= lower bound)`);
          return { passed: true, confidence: 1.0 };
        }
        
        if (lowerTolerance > 0 && minValue >= effectiveLower) {
          this.log(`      ⚠️  Tolerance >= check: within lower tolerance (${lowerTolerance})`);
          return { 
            passed: true, 
            confidence: this.processingOptions?.toleranceConfidence ?? 0.7,
            message: `Within lower tolerance (${lowerTolerance})`
          };
        }
        
        this.log(`      ❌ Failed >= check: ${minValue} not >= ${numLower}`);
        return { passed: false, confidence: 0 };
      }
      
      case '<': {
        // Value must be BELOW upper bound
        // For range [min, max]: max < upper
        // Example: [10, 60] < [70, 100] → PASS (max 60 < lower 70)
        // Example: [62, 90] < [70, 100] → FAIL (max 90 not < lower 70)
        
        if (maxValue < numUpper) {
          this.log(`      ✅ Strict < check: ${maxValue} < ${numUpper} (max < upper bound)`);
          return { passed: true, confidence: 1.0 };
        }
        
        if (upperTolerance > 0 && maxValue < effectiveUpper) {
          this.log(`      ⚠️  Tolerance < check: within upper tolerance (${upperTolerance})`);
          return { 
            passed: true, 
            confidence: this.processingOptions?.toleranceConfidence ?? 0.7,
            message: `Within upper tolerance (${upperTolerance})`
          };
        }
        
        this.log(`      ❌ Failed < check: ${maxValue} not < ${numUpper} (max not < upper bound)`);
        return { passed: false, confidence: 0 };
      }
      
      case '<=': {
        // Value must be AT OR BELOW upper bound
        // For range [min, max]: max <= upper
        
        if (maxValue <= numUpper) {
          this.log(`      ✅ Strict <= check: ${maxValue} <= ${numUpper} (max <= upper bound)`);
          return { passed: true, confidence: 1.0 };
        }
        
        if (upperTolerance > 0 && maxValue <= effectiveUpper) {
          this.log(`      ⚠️  Tolerance <= check: within upper tolerance (${upperTolerance})`);
          return { 
            passed: true, 
            confidence: this.processingOptions?.toleranceConfidence ?? 0.7,
            message: `Within upper tolerance (${upperTolerance})`
          };
        }
        
        this.log(`      ❌ Failed <= check: ${maxValue} not <= ${numUpper}`);
        return { passed: false, confidence: 0 };
      }
      
      case '=': {
        // Exact numeric match (for ranges, both min and max must equal the bound)
        
        if (minValue === numLower && maxValue === numLower) {
          this.log(`      ✅ Exact match: ${minValue} = ${numLower}`);
          return { passed: true, confidence: 1.0 };
        }
        
        this.log(`      ❌ Not equal: [${minValue}, ${maxValue}] ≠ ${numLower}`);
        return { passed: false, confidence: 0 };
      }
      
      case '><': {
        // Between/Overlap: ranges must OVERLAP
        // Any intersection between [min, max] and [lower, upper]
        // Example: [18, 29] >< [10, 50] → PASS (overlap: [18, 29])
        // Example: [3, 8] >< [10, 50] → FAIL (no overlap)
        
        const strictOverlap = minValue <= numUpper && maxValue >= numLower;
        const toleranceOverlap = minValue <= effectiveUpper && maxValue >= effectiveLower;
        
        if (strictOverlap) {
          this.log(`      ✅ Overlap check: [${minValue}, ${maxValue}] overlaps [${numLower}, ${numUpper}]`);
          return { passed: true, confidence: 1.0 };
        }
        
        if (toleranceOverlap) {
          this.log(`      ⚠️  Tolerance overlap: overlaps within tolerance zone`);
          return {
            passed: true,
            confidence: this.processingOptions?.toleranceConfidence ?? 0.7,
            message: `Overlaps within tolerance zone`
          };
        }
        
        this.log(`      ❌ No overlap: [${minValue}, ${maxValue}] does not overlap [${numLower}, ${numUpper}]`);
        return { passed: false, confidence: 0 };
      }
      
      case '>=<=': {
        // WITHIN bounds: value must be INSIDE the bounds (inclusive)
        // min >= lower AND max <= upper
        // Example: [75, 85] >=<= [70, 100] → PASS (75 >= 70 AND 85 <= 100)
        // Example: [62, 90] >=<= [70, 100] → FAIL (62 not >= 70)
        // Example: [75, 105] >=<= [70, 100] → FAIL (105 not <= 100)
        
        if (minValue >= numLower && maxValue <= numUpper) {
          this.log(`      ✅ Within bounds: [${minValue}, ${maxValue}] is within [${numLower}, ${numUpper}]`);
          this.log(`          (${minValue} >= ${numLower} AND ${maxValue} <= ${numUpper})`);
          return { passed: true, confidence: 1.0 };
        }
        
        // With tolerance
        if (minValue >= effectiveLower && maxValue <= effectiveUpper) {
          this.log(`      ⚠️  Within bounds (tolerance): within effective bounds [${effectiveLower}, ${effectiveUpper}]`);
          return {
            passed: true,
            confidence: this.processingOptions?.toleranceConfidence ?? 0.7,
            message: `Within bounds including tolerance`
          };
        }
        
        this.log(`      ❌ Not within bounds: [${minValue}, ${maxValue}] not within [${numLower}, ${numUpper}]`);
        if (minValue < numLower) {
          this.log(`          Reason: ${minValue} < ${numLower} (min below lower bound)`);
        }
        if (maxValue > numUpper) {
          this.log(`          Reason: ${maxValue} > ${numUpper} (max above upper bound)`);
        }
        return { passed: false, confidence: 0 };
      }
      
      default:
        this.log(`      ❌ Unknown comparison mode: ${mode}`);
        return { passed: false, confidence: 0, message: `Unknown comparison mode: ${mode}` };
    }
  }
  
  private createFailedMatch(rule: LegendRule, reason: string): ClassMatch {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      assignment: rule.assignment,
      confidence: 0,
      details: {
        classMatch: false,
        horizontalPatternMatch: false,
        strataMatch: false,
        elementMatches: [],
        totalElements: 0,
        matchedElements: 0
      },
      explanation: {
        summary: `No match: ${reason}`,
        reasons: [],
        warnings: [reason],
        suggestions: []
      },
      trace: {
        class: false,
        horizontalPattern: false,
        strata: false,
        elements: false,
        details: { 
          properties: { and: null, or: null }, 
          characteristics: { and: null, or: null } 
        }
      }
    };
  }
  
  private createStructuralOnlyMatch(rule: LegendRule, legend: Legend): ClassMatch {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      assignment: rule.assignment,
      confidence: 100,
      details: {
        classMatch: true,
        horizontalPatternMatch: true,
        strataMatch: true,
        elementMatches: [],
        totalElements: 0,
        matchedElements: 0
      },
      explanation: {
        summary: `Perfect structural match with ${rule.assignment.class_name}`,
        reasons: ['All structural requirements met'],
        warnings: [],
        suggestions: []
      },
      trace: {
        class: true,
        horizontalPattern: true,
        strata: true,
        elements: true,
        details: { 
          properties: { and: null, or: null }, 
          characteristics: { and: null, or: null } 
        }
      }
    };
  }
  
  private generateExplanation(
    rule: LegendRule,
    matchDetails: ElementMatchDetail[],
    confidence: number
  ): any {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    reasons.push("Structural requirements met");
    
    const matchedElements = matchDetails.filter(e => e.matched);
    const partialElements = matchDetails.filter(e => e.matched && !e.characteristicMatch);
    
    if (matchedElements.length > 0) {
      reasons.push(`${matchedElements.length} of ${matchDetails.length} required elements matched`);
      
      if (partialElements.length > 0) {
        warnings.push(`${partialElements.length} element(s) have characteristic mismatches`);
      }
    }
    
    const unmatchedElements = matchDetails.filter(e => !e.matched);
    if (unmatchedElements.length > 0) {
      warnings.push(`${unmatchedElements.length} element(s) failed property requirements`);
    }
    
    let summary = "";
    if (confidence === 100) {
      summary = `Perfect match with ${rule.assignment.class_name}`;
    } else if (confidence >= 50) {
      summary = `Partial match with ${rule.assignment.class_name} (${confidence}%)`;
    } else if (confidence > 0) {
      summary = `Weak match with ${rule.assignment.class_name} (${confidence}%)`;
    } else {
      summary = `No match with ${rule.assignment.class_name}`;
    }
    
    return { summary, reasons, warnings, suggestions };
  }
  
  public clearCache(): void {
    this.cache.clear();
  }
}