// ============================================================================
// SEMANTIC INTEROPERABILITY SYSTEM - MAIN ENTRY
// ============================================================================

import React, { useState, useEffect } from 'react';
import { SemanticWizard } from './SemanticWizard';
import { SemanticProvider } from './SemanticStore';
import { LegendRegistry, loadBuiltInPlugins } from './LegendRegistry';
import { RuleEngine } from './RuleEngine';

// Initialize core systems
const legendRegistry = new LegendRegistry();
const ruleEngine = new RuleEngine();

/**
 * Main Semantic Interoperability Component
 * 
 * This is the entry point for the new semantic interoperability system.
 * It provides a complete wizard-based interface for:
 * - Selecting reference classification systems
 * - Uploading appointed legends
 * - Processing and matching classes
 * - Reviewing and exporting results
 */
export interface SemanticInteroperabilityProps {
  // Props from parent system
  UUID?: string;
  translator?: any;
  legend?: any;
  options?: any;
  blocks?: any;
  blockLookUp?: any;
  characteristics?: any;
  characteristicLookUp?: any;
  
  // Callbacks
  onComplete?: () => void;
  onCancel?: () => void;
}

export const SemanticInteroperability: React.FC<SemanticInteroperabilityProps> = (props) => {
  const { legend,blocks,characteristics,blockLookUp,characteristicLookUp,onComplete, onCancel } = props;

  const [ready, setReady] = useState(false);
  
  // Load plugins on mount
    useEffect(() => {
    (async () => {
      try {
        await loadBuiltInPlugins(legendRegistry);
        setReady(true);
      } catch (e) {
        console.error('Failed to initialize semantic system:', e);
        setReady(true); // still render to allow manual plugin load
      }
    })();
  }, []);

  // Gate rendering until plugins are loaded
  if (!ready) {
    return <div style={{ padding: 16 }}>Loading reference legends…</div>;
  }

  return (
    <div className="semantic-interoperability-system" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>      
      <SemanticProvider registry={legendRegistry} ruleEngine={ruleEngine} blockLookUp={blockLookUp}>
        <SemanticWizard onComplete={onComplete} legendRegistry={legendRegistry} blocks={blocks['LC_Block']} blockLookUp={blockLookUp} characteristics={characteristics['LC_Characteristics']} characteristicLookUp={characteristicLookUp} legend={legend} />
      </SemanticProvider>
    </div>
  );
};

// Export components for standalone use
export { SemanticWizard } from './SemanticWizard';
export { SemanticProvider, useSemanticStore } from './SemanticStore';
export { LegendRegistry, globalLegendRegistry } from './LegendRegistry';
export { RuleEngine } from './RuleEngine';
export * from './semantic-types';

// Default export
export default SemanticInteroperability;
