// ============================================================================
// WIZARD STEP 3: PROCESSING
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { Divider } from 'primereact/divider';
import { Panel } from 'primereact/panel';
import { useSemanticStore } from '../SemanticStore';
import type * as Semantic from '../semantic-types';

export interface StepProcessProps {
  blockLookUp?: any[];
}

export const StepProcess: React.FC<StepProcessProps> = ({ blockLookUp }) => {
  const { state, processLegend, dispatch } = useSemanticStore();

  // Type annotation added here
  const [options, setOptions] = useState<Semantic.ProcessingOptions>(state.processingOptions);
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);

  useEffect(() => {
    // Update global options when local options change
    dispatch({
      type: 'UPDATE_OPTIONS',
      payload: options
    } as any);
  }, [options, dispatch]);

  const handleProcess = async (): Promise<void> => {
    setHasProcessed(true);
    await processLegend();
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="step-process">
      {!state.isProcessing && state.results.length === 0 ? (
        <div>
          <Card>
            <Panel 
              header="Processing Options" 
              toggleable 
              collapsed
              style={{ marginBottom: '1rem' }}
            >
              <p style={{ color: 'var(--text-color-secondary)', marginBottom: '1.5rem' }}>
                Configure how the matching should be performed.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="field-checkbox">
                  <Checkbox
                    inputId="partialMatches"
                    checked={options.includePartialMatches}
                    onChange={(e) => setOptions({ ...options, includePartialMatches: e.checked! })}
                  />
                  <label htmlFor="partialMatches" style={{ marginLeft: '0.5rem' }}>
                    Include partial matches
                    <small style={{ display: 'block', color: 'var(--text-color-secondary)' }}>
                      Show matches even if score is below 100%
                    </small>
                  </label>
                </div>

                <div className="field">
                  <label htmlFor="minConfidence">
                    Minimum Score Threshold
                    <small style={{ display: 'block', color: 'var(--text-color-secondary)', marginTop: '0.25rem' }}>
                      Only show matches above this score level
                    </small>
                  </label>
                  <InputNumber
                    inputId="minConfidence"
                    value={options.minConfidence}
                    onValueChange={(e) => setOptions({ ...options, minConfidence: e.value ?? 0 })}
                    min={1}
                    max={100}
                    suffix="%"
                    showButtons
                    style={{ marginTop: '0.5rem', width: '200px' }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="maxMatches">
                    Maximum Matches per Class
                    <small style={{ display: 'block', color: 'var(--text-color-secondary)', marginTop: '0.25rem' }}>
                      Show up to this many alternative matches
                    </small>
                  </label>
                  <InputNumber
                    inputId="maxMatches"
                    value={options.maxMatches}
                    onValueChange={(e) => setOptions({ ...options, maxMatches: e.value ?? 1 })}
                    min={1}
                    max={10}
                    showButtons
                    style={{ marginTop: '0.5rem', width: '200px' }}
                  />
                </div>

                <Divider />

                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>Score Multipliers</h4>
                  <small style={{ color: 'var(--text-color-secondary)', display: 'block', marginBottom: '1rem' }}>
                    Adjust how scores are calculated for different rule conditions
                  </small>
                </div>

                <div className="field">
                  <label htmlFor="toleranceConfidence">
                    Tolerance Score
                    <small style={{ display: 'block', color: 'var(--text-color-secondary)', marginTop: '0.25rem' }}>
                      Score when values are within tolerance bounds (default: 70%)
                    </small>
                  </label>
                  <InputNumber
                    inputId="toleranceConfidence"
                    value={(options.toleranceConfidence ?? 0.7) * 100}
                    onValueChange={(e) => setOptions({ ...options, toleranceConfidence: (e.value ?? 70) / 100 })}
                    min={0}
                    max={100}
                    suffix="%"
                    showButtons
                    style={{ marginTop: '0.5rem', width: '200px' }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="characteristicConfidence">
                    Characteristic Score
                    <small style={{ display: 'block', color: 'var(--text-color-secondary)', marginTop: '0.25rem' }}>
                      Score when characteristics fail or are missing (default: 50%)
                    </small>
                  </label>
                  <InputNumber
                    inputId="characteristicConfidence"
                    value={(options.characteristicConfidence ?? 0.5) * 100}
                    onValueChange={(e) => setOptions({ ...options, characteristicConfidence: (e.value ?? 50) / 100 })}
                    min={0}
                    max={100}
                    suffix="%"
                    showButtons
                    style={{ marginTop: '0.5rem', width: '200px' }}
                  />
                </div>

                <div className="field-checkbox">
                  <Checkbox
                    inputId="useCache"
                    checked={options.useCache}
                    onChange={(e) => setOptions({ ...options, useCache: e.checked! })}
                  />
                  <label htmlFor="useCache" style={{ marginLeft: '0.5rem' }}>
                    Use caching for better performance
                    <small style={{ display: 'block', color: 'var(--text-color-secondary)' }}>
                      Recommended for large legends
                    </small>
                  </label>
                </div>
              </div>
            </Panel>

            <Divider />

            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <i className="pi pi-cog" style={{ fontSize: '4rem', color: 'var(--primary-color)', marginBottom: '1rem' }} />
              <h4>Ready to Process</h4>
              <p style={{ color: 'var(--text-color-secondary)', marginBottom: '1.5rem' }}>
                {state.appointedLegend?.LCT_Class.length} classes will be matched against{' '}
                {state.selectedReference?.ruleSet.rules.length} reference rules
              </p>
              <Button
                label="Start Processing"
                icon="pi pi-play"
                size="large"
                onClick={handleProcess}
              />
            </div>
          </Card>
        </div>
      ) : state.isProcessing ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <i
              className="pi pi-spin pi-spinner"
              style={{ fontSize: '4rem', color: 'var(--primary-color)', marginBottom: '1.5rem' }}
            />

            <h3>Processing Legend Mapping...</h3>

            {state.progress && (
              <>
                <p style={{ color: 'var(--text-color-secondary)', marginBottom: '1rem' }}>
                  {state.progress.status}
                </p>

                <ProgressBar
                  value={state.progress.percentage}
                  style={{ height: '1.5rem', marginBottom: '1rem' }}
                />

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  marginTop: '2rem',
                  padding: '1rem',
                  background: 'var(--surface-ground)',
                  borderRadius: 'var(--border-radius)'
                }}>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      {state.progress.current}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                      of {state.progress.total} classes
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      {state.progress.percentage}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                      complete
                    </div>
                  </div>

                  {state.progress.estimatedTimeRemaining && (
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        {formatTime(state.progress.estimatedTimeRemaining)}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                        remaining
                      </div>
                    </div>
                  )}
                </div>

                {state.progress.currentClass && (
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'var(--surface-50)',
                    borderRadius: 'var(--border-radius)',
                    borderLeft: '3px solid var(--primary-color)'
                  }}>
                    <small style={{ color: 'var(--text-color-secondary)' }}>Currently processing:</small>
                    <div style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>
                      {state.progress.currentClass}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <i
              className="pi pi-check-circle"
              style={{ fontSize: '4rem', color: 'var(--green-500)', marginBottom: '1.5rem' }}
            />

            <h3>Processing Complete!</h3>

            {state.statistics && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                marginTop: '2rem',
                textAlign: 'center'
              }}>
                <div style={{ padding: '1rem', background: 'var(--surface-ground)', borderRadius: 'var(--border-radius)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {state.statistics.totalClasses}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                    Total Classes
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--surface-ground)', borderRadius: 'var(--border-radius)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--green-500)' }}>
                    {state.statistics.matchedClasses}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                    Matched
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--surface-ground)', borderRadius: 'var(--border-radius)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--orange-500)' }}>
                    {state.statistics.partialMatches}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                    Partial
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--surface-ground)', borderRadius: 'var(--border-radius)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--red-500)' }}>
                    {state.statistics.unmatchedClasses}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                    Unmatched
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--surface-ground)', borderRadius: 'var(--border-radius)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {Math.round(state.statistics.averageConfidence)}%
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                    Avg. Score
                  </div>
                </div>
              </div>
            )}

            <p style={{ color: 'var(--text-color-secondary)', marginTop: '2rem' }}>
              Click "View Results" to view detailed results and make adjustments
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};