// ============================================================================
// SEMANTIC INTEROPERABILITY WIZARD
// ============================================================================

import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { Steps } from 'primereact/steps';
import { Button } from 'primereact/button';
import { useSemanticStore } from './SemanticStore';
import { StepSelection } from './wizard/StepSelection';
import { StepUpload } from './wizard/StepUpload';
import { StepProcess } from './wizard/StepProcess';
import { StepResults } from './wizard/StepResults';
import { PluginManager } from './PluginManager';

export interface SemanticWizardProps {
  legend?: any;
  blocks?: any;
  blockLookUp?: any;
  characteristics?: any;
  characteristicLookUp?: any;
  legendRegistry?: any;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const SemanticWizard: React.FC<SemanticWizardProps> = ({ legend, blocks, blockLookUp, characteristics, characteristicLookUp, legendRegistry, onComplete, onCancel }) => {
  const { state, nextStep, previousStep, reset } = useSemanticStore();
  
  const wizardSteps = [
    { label: 'Select Reference', icon: 'pi pi-book' },
    { label: 'Upload Legend', icon: 'pi pi-upload' },
    { label: 'Process', icon: 'pi pi-cog' },
    { label: 'Results', icon: 'pi pi-check-circle' }
  ];
  
  const handleCancel = () => {
    reset();
    if (onCancel) onCancel();
  };
  
  const handleComplete = () => {
    if (onComplete) onComplete();
  };
  
  const canProceed = () => {
    switch (state.currentStep) {
      case 0:
        return state.selectedReference !== null;
      case 1:
        return state.appointedLegend !== null;
      case 2:
        return state.results.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const [showPluginManager, setShowPluginManager] = useState(false);

  return (
    <div>
      {showPluginManager && (
        <PluginManager
          registry={legendRegistry}
          legend={legend}
          blocks={blocks}
          blockLookUp={blockLookUp}
          characteristics={characteristics}
          characteristicLookUp={characteristicLookUp}
          onClose={() => setShowPluginManager(false)}
        />
      )}
      {!showPluginManager && (
      <div className="semantic-wizard" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="wizard-header" style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>Semantic Interoperability</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-color-secondary)' }}>
                Legend Connector & Classification Mapping
              </p>
            </div>
            <Button 
              label="Manage Plugins & Rules" 
              icon="pi pi-cog"
              className="p-button-text"
              onClick={() => setShowPluginManager(true)}
            />
            <Button 
              label="Cancel" 
              icon="pi pi-times" 
              className="p-button-text" 
              onClick={handleCancel}
            />
          </div>
          
          <Steps 
            model={wizardSteps} 
            activeIndex={state.currentStep}
            readOnly={false}
            style={{ marginTop: '1rem' }}
          />
        </div>
        
        {/* Content */}
        <div className="wizard-content" style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {state.currentStep === 0 && <StepSelection />}
          {state.currentStep === 1 && <StepUpload />}
          {state.currentStep === 2 && <StepProcess blockLookUp={blockLookUp} />}
          {state.currentStep === 3 && <StepResults blocks={blocks} />}
        </div>
        
        {/* Footer */}
        <div className="wizard-footer" style={{ 
          padding: '1rem', 
          borderTop: '1px solid var(--surface-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {state.errors.length > 0 && (
              <small style={{ color: 'var(--red-500)' }}>
                <i className="pi pi-exclamation-triangle" style={{ marginRight: '0.5rem' }} />
                {state.errors[state.errors.length - 1]}
              </small>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {state.currentStep > 0 && state.currentStep < 3 && (
              <Button 
                label="Previous" 
                icon="pi pi-arrow-left" 
                className="p-button-secondary"
                onClick={previousStep}
                disabled={state.isProcessing}
              />
            )}
            
            {state.currentStep < 3 && (
              <Button 
                label={state.currentStep === 2 ? "View Results" : "Next"} 
                icon="pi pi-arrow-right" 
                iconPos="right"
                onClick={nextStep}
                disabled={!canProceed() || state.isProcessing}
              />
            )}
            
            {state.currentStep === 3 && (
              <Button 
                label="Complete" 
                icon="pi pi-check" 
                onClick={handleComplete}
              />
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
