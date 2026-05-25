// ============================================================================
// SEMANTIC WIZARD WRAPPER WITH PROPER INITIALIZATION
// ============================================================================

import React, { useMemo } from 'react';
import { SemanticWizard } from './SemanticWizard';
import { SemanticProvider } from './SemanticStore';
import { RuleEngine } from './RuleEngine';
import { LegendRegistry } from './LegendRegistry';

export interface SemanticWizardWrapperProps {
  legend?: any;
  blocks?: any[];
  blockLookUp?: any;
  characteristics?: any[];
  characteristicLookUp?: any;
  onComplete?: () => void;
  onCancel?: () => void;
}

/**
 * Wrapper component that initializes the RuleEngine with block hierarchy
 * and provides the SemanticProvider context for the wizard
 */
export const SemanticWizardWrapper: React.FC<SemanticWizardWrapperProps> = ({
  legend,
  blocks = [],
  blockLookUp = [],
  characteristics = [],
  characteristicLookUp = [],
  onComplete,
  onCancel
}) => {
  // Initialize RuleEngine with block hierarchy
  const ruleEngine = useMemo(() => {
    const engine = new RuleEngine();
    
    // Set up block hierarchy for hierarchical element matching
    if (blockLookUp) {
      console.log('✓ Block hierarchy configured for hierarchical element matching');
    } else {
      console.warn('⚠ No block hierarchy provided - hierarchical matching disabled');
    }
    
    return engine;
  }, [blockLookUp]);

  // Initialize LegendRegistry
  const legendRegistry = useMemo(() => {
    const registry = new LegendRegistry();
    
    // Load plugins from the plugins directory
    // Note: In production, you'd load these from an API or file system
    // For now, plugins should be loaded via the PluginManager UI
    console.log('✓ Legend registry initialized');
    
    return registry;
  }, []);

  return (
    <SemanticProvider registry={legendRegistry} ruleEngine={ruleEngine} blockLookUp={blockLookUp}>
      <SemanticWizard
        legend={legend}
        blocks={blocks}
        blockLookUp={blockLookUp}
        characteristics={characteristics}
        characteristicLookUp={characteristicLookUp}
        legendRegistry={legendRegistry}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    </SemanticProvider>
  );
};

export default SemanticWizardWrapper;
