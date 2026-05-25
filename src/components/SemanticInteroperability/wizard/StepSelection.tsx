// ============================================================================
// WIZARD STEP 1: REFERENCE LEGEND SELECTION
// ============================================================================

import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { RadioButton } from 'primereact/radiobutton';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { useSemanticStore } from '../SemanticStore';
import { ReferenceLegendPlugin } from '../semantic-types';

export const StepSelection: React.FC = () => {
  const { state, setReference } = useSemanticStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    state.selectedReference?.metadata.id || null
  );
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewPlugin, setPreviewPlugin] = useState<ReferenceLegendPlugin | null>(null);
  
  const handleSelect = (plugin: ReferenceLegendPlugin) => {
    setSelectedId(plugin.metadata.id);
    setReference(plugin);
  };
  
  const handlePreview = (plugin: ReferenceLegendPlugin) => {
    setPreviewPlugin(plugin);
    setPreviewDialog(true);
  };
  
  return (
    <div className="step-selection">
      <Card>
        <h3>Select Reference Legend</h3>
        <p style={{ color: 'var(--text-color-secondary)', marginBottom: '1.5rem' }}>
          Choose a reference classification system to map your appointed legend against.
        </p>
        
        {state.availableReferences.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-secondary)' }}>
            <i className="pi pi-info-circle" style={{ fontSize: '3rem', marginBottom: '1rem' }} />
            <p>No reference legends available. Please load reference legend plugins.</p>
            <Button 
              label="Load Plugins" 
              icon="pi pi-download" 
              className="p-button-outlined"
              style={{ marginTop: '1rem' }}
            />
          </div>
        ) : (
          <div className="reference-list" style={{ display: 'grid',  gridTemplateColumns: 'auto auto auto', flexDirection: 'column', gap: '1rem' }}>
            {state.availableReferences.map((plugin) => (
              <Card 
                key={plugin.metadata.id}
                className={selectedId === plugin.metadata.id ? 'selected-card' : ''}
                style={{ 
                  border: selectedId === plugin.metadata.id 
                    ? '2px solid var(--primary-color)' 
                    : '1px solid var(--surface-border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleSelect(plugin)}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                  <RadioButton 
                    checked={selectedId === plugin.metadata.id}
                    onChange={() => handleSelect(plugin)}
                  />
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0 }}>{plugin.metadata.name}</h4>
                      <Tag value={`v${plugin.metadata.version}`} severity="info" />
                    </div>
                    
                    <p style={{ margin: '0.5rem 0', color: 'var(--text-color-secondary)' }}>
                      {plugin.metadata.description}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                      <span>
                        <i className="pi pi-list" style={{ marginRight: '0.25rem' }} />
                        {plugin.ruleSet.rules.length} rules
                      </span>
                      <span>
                        <i className="pi pi-tags" style={{ marginRight: '0.25rem' }} />
                        {plugin.ruleSet.classes.length} classes
                      </span>
                      {plugin.metadata.organization && (
                        <span>
                          <i className="pi pi-building" style={{ marginRight: '0.25rem' }} />
                          {plugin.metadata.organization}
                        </span>
                      )}
                    </div>
                    
                    {plugin.metadata.url && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <a 
                          href={plugin.metadata.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: '0.875rem' }}
                        >
                          <i className="pi pi-external-link" style={{ marginRight: '0.25rem' }} />
                          Official Documentation
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    icon="pi pi-eye" 
                    className="p-button-text p-button-rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(plugin);
                    }}
                    tooltip="Preview"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
      
      {/* Preview Dialog */}
      <Dialog
        header={previewPlugin?.metadata.name}
        visible={previewDialog}
        style={{ width: '70vw' }}
        onHide={() => setPreviewDialog(false)}
      >
        {previewPlugin && (
          <div>
            <h4>Metadata</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <strong>Version:</strong>
              <span>{previewPlugin.metadata.version}</span>
              
              <strong>Author:</strong>
              <span>{previewPlugin.metadata.author}</span>
              
              {previewPlugin.metadata.organization && (
                <>
                  <strong>Organization:</strong>
                  <span>{previewPlugin.metadata.organization}</span>
                </>
              )}
              
              <strong>Created:</strong>
              <span>{new Date(previewPlugin.metadata.created).toLocaleDateString()}</span>
              
              <strong>Updated:</strong>
              <span>{new Date(previewPlugin.metadata.updated).toLocaleDateString()}</span>
            </div>
            
            <Divider />
            
            <h4>Reference Classes ({previewPlugin.ruleSet.classes.length})</h4>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-ground)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                      Code
                    </th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                      Class Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewPlugin.ruleSet.classes.map((cls) => (
                    <tr key={cls.class_id}>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                        <Tag value={cls.class_map_code} />
                      </td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                        {cls.class_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Dialog>
      
      <style>{`
        .selected-card {
          box-shadow: 0 0 10px rgba(var(--primary-color-rgb), 0.3);
        }
      `}</style>
    </div>
  );
};
