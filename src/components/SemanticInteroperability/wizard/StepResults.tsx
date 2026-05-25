// ============================================================================
// WIZARD STEP 4: RESULTS DISPLAY
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Tooltip } from 'primereact/tooltip';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Panel } from 'primereact/panel';
import { useSemanticStore } from '../SemanticStore';
import type { MatchResult, ClassMatch, ElementMatchDetail, ClassAssignment } from '../semantic-types';
import * as XLSX from 'xlsx';

export interface StepResultsProps {
  blocks?: any[];
}

export const StepResults: React.FC<StepResultsProps> = ({ blocks = [] }) => {
  const { state, dispatch } = useSemanticStore();
  
  // State for collapsible details panel
  const [detailsCollapsed, setDetailsCollapsed] = useState(true);
  
  // State for manual reassignment dialog
  const [reassignDialog, setReassignDialog] = useState<{
    visible: boolean;
    resultIndex: number | null;
    appointedClass: any | null;
    currentMatch: ClassMatch | null;
  }>({
    visible: false,
    resultIndex: null,
    appointedClass: null,
    currentMatch: null
  });
  
  // State for manual assignment values
  const [manualAssignment, setManualAssignment] = useState<ClassAssignment>({
    class_id: 0,
    class_name: '',
    class_map_code: ''
  });

  // Create block lookup map
  const blockLookup = useMemo(() => {
    const lookup: Record<number, { label: string; name: string }> = {};
    if (blocks && Array.isArray(blocks)) {
      blocks.forEach((block: any) => {
        if (block.block_id) {
          lookup[block.block_id] = {
            label: block.block_label || block.block_name || `Block ${block.block_id}`,
            name: block.block_name || ''
          };
        }
      });
    }
    return lookup;
  }, [blocks]);

  // Recalculate statistics dynamically based on current results
  // This ensures statistics update when users make manual assignments
  const currentStatistics = useMemo(() => {
    if (!state.results || state.results.length === 0) {
      return state.statistics; // Fallback to initial statistics if no results
    }

    const totalClasses = state.results.length;
    
    // Count matched classes (those with a selectedMatch)
    const matchedClasses = state.results.filter(r => r.selectedMatch).length;
    
    // Count unmatched classes (those without a selectedMatch)
    const unmatchedClasses = state.results.filter(r => !r.selectedMatch).length;
    
    // Count partial matches (confidence < 100%)
    const partialMatches = state.results.filter(r => 
      r.selectedMatch && r.selectedMatch.confidence < 100
    ).length;
    
    // Count by confidence ranges
    const highConfidence = state.results.filter(r => 
      r.selectedMatch && r.selectedMatch.confidence >= 80
    ).length;
    
    const mediumConfidence = state.results.filter(r => 
      r.selectedMatch && r.selectedMatch.confidence >= 50 && r.selectedMatch.confidence < 80
    ).length;
    
    const lowConfidence = state.results.filter(r => 
      r.selectedMatch && r.selectedMatch.confidence > 0 && r.selectedMatch.confidence < 50
    ).length;
    
    // Calculate average confidence (only for matched classes)
    const totalConfidence = state.results.reduce((sum, r) => 
      sum + (r.selectedMatch?.confidence || 0), 0
    );
    const averageConfidence = matchedClasses > 0 ? totalConfidence / totalClasses : 0;
    
    return {
      totalClasses,
      matchedClasses,
      unmatchedClasses,
      partialMatches,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      averageConfidence
    };
  }, [state.results, state.statistics]);

  // Get all available reference classes for reassignment dropdown
  // Enhanced to include confidence values when available from matches
  const getAvailableReferenceClassesForResult = (resultIndex: number | null) => {
    if (!state.selectedReference || resultIndex === null) return [];
    
    const currentResult = state.results[resultIndex];
    const matchesByClassId = new Map<number, number>(); // Map class_id to confidence
    
    // Build confidence map from current result's matches
    if (currentResult && currentResult.matches) {
      currentResult.matches.forEach(match => {
        if (match.assignment && match.assignment.class_id) {
          matchesByClassId.set(match.assignment.class_id, match.confidence);
        }
      });
    }
    
    // Create dropdown options with confidence when available
    return state.selectedReference.ruleSet.classes.map(cls => {
      const confidence = matchesByClassId.get(cls.class_id);
      const label = confidence !== undefined 
        ? `${cls.class_name} (${cls.class_map_code}) - ${confidence}% score`
        : `${cls.class_name} (${cls.class_map_code})`;
      
      return {
        label,
        value: cls,
        class_id: cls.class_id,
        class_name: cls.class_name,
        class_map_code: cls.class_map_code,
        confidence: confidence // Store for potential sorting
      };
    }).sort((a, b) => {
      // Sort: items with confidence first (by confidence desc), then alphabetically
      if (a.confidence !== undefined && b.confidence === undefined) return -1;
      if (a.confidence === undefined && b.confidence !== undefined) return 1;
      if (a.confidence !== undefined && b.confidence !== undefined) {
        return b.confidence - a.confidence; // Higher confidence first
      }
      return a.class_name.localeCompare(b.class_name); // Alphabetical
    });
  };

  const getBlockLabel = (blockId: number): string => {
    return blockLookup[blockId]?.label || `Block ${blockId}`;
  };

  // Generate downloadable matching log - now uses the detailed RuleEngine log
  const generateMatchingLog = (): string => {
    // Header section with metadata
    const header: string[] = [];
    header.push('='.repeat(80));
    header.push('SEMANTIC INTEROPERABILITY MATCHING LOG');
    header.push('='.repeat(80));
    header.push('');
    header.push(`Reference Legend: ${state.selectedReference?.metadata.name || 'Unknown'}`);
    header.push(`Appointed Legend: ${state.appointedLegend?.legend_name || 'Unknown'}`);
    header.push(`Generated: ${new Date().toISOString()}`);
    header.push('');
    header.push(`Minimum Score Threshold: ${state.processingOptions.minConfidence}%`);
    header.push(`Maximum Matches per Class: ${state.processingOptions.maxMatches}`);
    header.push(`Include Partial Matches: ${state.processingOptions.includePartialMatches ? 'Yes' : 'No'}`);
    header.push('');
    header.push('='.repeat(80));
    header.push('SUMMARY STATISTICS');
    header.push('='.repeat(80));
    header.push(`Total Appointed Classes: ${currentStatistics?.totalClasses || 0}`);
    header.push(`Total Reference Classes: ${state.selectedReference?.ruleSet.classes.length || 0}`);
    header.push(`Matched Classes: ${currentStatistics?.matchedClasses || 0}`);
    header.push(`Unmatched Classes: ${currentStatistics?.unmatchedClasses || 0}`);
    header.push(`Partial Matches: ${currentStatistics?.partialMatches || 0}`);
    header.push(`Average Score: ${Math.round(currentStatistics?.averageConfidence || 0)}%`);
    header.push('');
    header.push('='.repeat(80));
    header.push('DETAILED MATCHING LOG FROM RULE ENGINE');
    header.push('='.repeat(80));
    header.push('');
    
    // Use the detailed log from RuleEngine
    const detailedLog = state.matchingLog || 'No detailed log available';
    
    // Footer
    const footer: string[] = [];
    footer.push('');
    footer.push('='.repeat(80));
    footer.push('END OF MATCHING LOG');
    footer.push('='.repeat(80));
    
    return header.join('\n') + detailedLog + '\n' + footer.join('\n');
  };
  
  // Download matching log
  const downloadMatchingLog = () => {
    const logContent = generateMatchingLog();
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matching-log-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Open reassignment dialog
  const openReassignDialog = (resultIndex: number, result: MatchResult) => {
    const currentMatch = result.selectedMatch;  // Don't fallback to matches[0]
    console.log('Opening reassignment dialog:', { resultIndex, result, currentMatch });
    setReassignDialog({
      visible: true,
      resultIndex,
      appointedClass: result.appointedClass,
      currentMatch
    });
    
    // Always reset manual assignment state, even if there's no current match (0% confidence)
    if (currentMatch) {
      setManualAssignment({
        class_id: currentMatch.assignment.class_id,
        class_name: currentMatch.assignment.class_name,
        class_map_code: currentMatch.assignment.class_map_code
      });
    } else {
      // Reset to empty values for 0% matches
      setManualAssignment({
        class_id: 0,
        class_name: '',
        class_map_code: ''
      });
    }
  };

  // Close reassignment dialog
  const closeReassignDialog = () => {
    setReassignDialog({
      visible: false,
      resultIndex: null,
      appointedClass: null,
      currentMatch: null
    });
  };

  // Handle selection of a predefined alternative match
  const handleAlternativeSelect = (resultIndex: number, match: ClassMatch) => {
    console.log('Selecting alternative:', { resultIndex, match });
    dispatch({
      type: 'UPDATE_MATCH_SELECTION',
      payload: { resultIndex, match }
    });
  };

  // Handle manual reassignment from dropdown
  const handleReassignFromDropdown = (selectedClass: any) => {
    if (!selectedClass || reassignDialog.resultIndex === null) return;
    
    console.log('Reassigning from dropdown:', { selectedClass, resultIndex: reassignDialog.resultIndex });
    
    // Create a custom match object for manual assignment
    const customMatch: ClassMatch = {
      ruleId: -1, // Indicate manual assignment
      ruleName: 'Manual Assignment',
      priority: 999,
      assignment: {
        class_id: selectedClass.class_id,
        class_name: selectedClass.class_name,
        class_map_code: selectedClass.class_map_code
      },
      confidence: 100, // Manual assignment = 100% confidence in user's choice
      details: {
        classMatch: true,
        horizontalPatternMatch: true,
        strataMatch: true,
        elementMatches: [],
        totalElements: 0,
        matchedElements: 0
      },
      explanation: {
        summary: 'Manually assigned by user',
        reasons: ['User override'],
        warnings: [],
        suggestions: []
      },
      trace: {
        class: null,
        horizontalPattern: null,
        strata: null,
        elements: null,
        details: {
          properties: { and: null, or: null },
          characteristics: { and: null, or: null }
        }
      }
    };

    dispatch({
      type: 'UPDATE_MATCH_SELECTION',
      payload: { resultIndex: reassignDialog.resultIndex, match: customMatch }
    });
    
    closeReassignDialog();
  };

  // Handle manual text input reassignment
  const handleManualReassignment = () => {
    if (reassignDialog.resultIndex === null) return;
    
    if (!manualAssignment.class_name || !manualAssignment.class_map_code) {
      alert('Please provide both class name and map code');
      return;
    }

    console.log('Applying manual reassignment:', { 
      resultIndex: reassignDialog.resultIndex, 
      manualAssignment 
    });

    const customMatch: ClassMatch = {
      ruleId: -1,
      ruleName: 'Manual Assignment',
      priority: 999,
      assignment: manualAssignment,
      confidence: 100,
      details: {
        classMatch: false,
        horizontalPatternMatch: false,
        strataMatch: false,
        elementMatches: [],
        totalElements: 0,
        matchedElements: 0
      },
      explanation: {
        summary: 'Manually assigned by user',
        reasons: ['User override'],
        warnings: [],
        suggestions: []
      },
      trace: {
        class: null,
        horizontalPattern: null,
        strata: null,
        elements: null,
        details: {
          properties: { and: null, or: null },
          characteristics: { and: null, or: null }
        }
      }
    };

    dispatch({
      type: 'UPDATE_MATCH_SELECTION',
      payload: { resultIndex: reassignDialog.resultIndex, match: customMatch }
    });
    
    console.log('Dispatched UPDATE_MATCH_SELECTION, closing dialog');
    closeReassignDialog();
  };

  // Confidence badge styling
  const getConfidenceSeverity = (confidence: number): "success" | "warning" | "danger" | "info" => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'info';
    if (confidence >= 40) return 'warning';
    return 'danger';
  };

  // Appointed Class column
  const appointedClassTemplate = (rowData: MatchResult) => {
    const cls = rowData.appointedClass;
    return (
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
          {cls.class_name}
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
          Code: {cls.class_map_code}
        </div>
      </div>
    );
  };

  // Best Match / Alternatives column
  const matchTemplate = (rowData: MatchResult, options: any) => {
    const selectedMatch = rowData.selectedMatch;  // Only use explicit selection
    
    // If no selectedMatch, show "No match found"
    if (!selectedMatch) {
      return (
        <div style={{ 
          padding: '0.5rem',
          background: 'var(--red-50)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--red-200)'
        }}>
          <div style={{ color: 'var(--red-700)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
            No match found
          </div>
          <Button
            label="Manually Assign"
            icon="pi pi-plus-circle"
            className="p-button-sm p-button-outlined p-button-danger"
            onClick={() => openReassignDialog(options.rowIndex, rowData)}
          />
        </div>
      );
    }
    
    // Filter out nonsensical low-confidence alternatives if threshold is very low
    const minReasonableConfidence = Math.max(state.processingOptions.minConfidence, 1); // Never show matches below 1%
    const reasonableMatches = rowData.matches.filter(m => m.confidence >= minReasonableConfidence);
    const alternatives = reasonableMatches.filter(m => m.ruleId !== selectedMatch.ruleId);

    const isManualAssignment = selectedMatch.ruleId === -1;

    return (
      <div>
        {/* Best Match */}
        <div style={{ 
          padding: '0.5rem',
          background: isManualAssignment ? 'var(--yellow-50)' : 'var(--surface-50)',
          borderRadius: 'var(--border-radius)',
          marginBottom: alternatives.length > 0 ? '0.5rem' : 0,
          border: isManualAssignment ? '1px solid var(--yellow-300)' : 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '0.25rem' }}>
                {selectedMatch.assignment.class_name}
                <Badge 
                  value={`${selectedMatch.confidence}%`} 
                  severity={getConfidenceSeverity(selectedMatch.confidence)}
                  style={{ marginLeft: '0.5rem' }}
                />
                {isManualAssignment && (
                  <Tag 
                    value="Manual" 
                    severity="warning" 
                    style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}
                  />
                )}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                Code: {selectedMatch.assignment.class_map_code}
              </div>
            </div>
            <Button
              icon="pi pi-pencil"
              className="p-button-sm p-button-text"
              tooltip="Reassign class"
              tooltipOptions={{ position: 'top' }}
              onClick={() => openReassignDialog(options.rowIndex, rowData)}
            />
          </div>
        </div>

        {/* Alternatives as comma-separated list */}
        {alternatives.length > 0 && (
          <div style={{ 
            fontSize: '0.75rem',
            color: 'var(--text-color-secondary)',
            paddingLeft: '0.5rem'
          }}>
            <strong>Alternatives:</strong>{' '}
            {alternatives.map((alt, idx) => (
              <span key={`alt-${alt.ruleId}-${idx}`}>
                <span 
                  style={{ 
                    cursor: 'pointer',
                    color: 'var(--primary-color)',
                    textDecoration: 'underline'
                  }}
                  onClick={() => handleAlternativeSelect(options.rowIndex, alt)}
                  title={`Score: ${alt.confidence}% - Click to select`}
                >
                  {alt.assignment.class_name} ({alt.confidence}%)
                </span>
                {idx < alternatives.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Confidence column
  const confidenceTemplate = (rowData: MatchResult) => {
    const selectedMatch = rowData.selectedMatch;  // Don't fallback to matches[0]
    if (!selectedMatch) return <span>-</span>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Badge 
          value={`${selectedMatch.confidence}%`} 
          severity={getConfidenceSeverity(selectedMatch.confidence)}
          style={{ fontSize: '1rem' }}
        />
      </div>
    );
  };

  // Coverage column with explanation
  const coverageTemplate = (rowData: MatchResult) => {
    const selectedMatch = rowData.selectedMatch;  // Don't fallback to matches[0]
    if (!selectedMatch) return <span>-</span>;

    const elementMatches = selectedMatch.details.elementMatches;
    const matchedElements = elementMatches.filter(e => e.matched);
    const coveragePercent = elementMatches.length > 0
      ? Math.round((matchedElements.length / elementMatches.length) * 100)
      : 0;

    return (
      <div>
        <Tooltip target=".coverage-info" />
        <div 
          className="coverage-info"
          data-pr-tooltip="Percentage of required elements that were successfully matched"
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            cursor: 'help'
          }}
        >
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {coveragePercent}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
            {matchedElements.length} of {elementMatches.length} elements
          </div>
        </div>
      </div>
    );
  };

  // Structural Matches column
  const structuralTemplate = (rowData: MatchResult) => {
    const selectedMatch = rowData.selectedMatch;  // Don't fallback to matches[0]
    if (!selectedMatch) return <span>-</span>;

    const { details } = selectedMatch;
    
    const renderIcon = (matched: boolean | null) => {
      if (matched === true) return <i className="pi pi-check" style={{ color: 'var(--green-500)' }} />;
      if (matched === false) return <i className="pi pi-times" style={{ color: 'var(--red-500)' }} />;
      return <i className="pi pi-minus" style={{ color: 'var(--text-color-secondary)' }} />;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          {renderIcon(details.classMatch)}
          <span>Class</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          {renderIcon(details.horizontalPatternMatch)}
          <span>H. Pattern</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          {renderIcon(details.strataMatch)}
          <span>Strata</span>
        </div>
      </div>
    );
  };

  // Element Matches column
  const elementMatchesTemplate = (rowData: MatchResult) => {
    const selectedMatch = rowData.selectedMatch;  // Don't fallback to matches[0]
    if (!selectedMatch) return <span>-</span>;

    const { details } = selectedMatch;
    // FIXED: Partial = passed property requirements but failed characteristic requirements
    const matched = details.elementMatches.filter(e => e.matched && e.characteristicMatch);
    const partial = details.elementMatches.filter(e => e.matched && !e.characteristicMatch);
    const unmatched = details.elementMatches.filter(e => !e.matched);

    return (
      <div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--green-500)' }}>
              {matched.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
              Matched
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--orange-500)' }}>
              {partial.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
              Partial
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--red-500)' }}>
              {unmatched.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
              Missing
            </div>
          </div>
        </div>

        {/* Element details */}
        <div style={{ fontSize: '0.75rem' }}>
          {matched.length > 0 && (
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--green-500)', fontWeight: 'bold' }}>✓ </span>
              {matched.map(e => getBlockLabel(e.blockId)).join(', ')}
            </div>
          )}
          {partial.length > 0 && (
            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--orange-500)', fontWeight: 'bold' }}>◐ </span>
              {partial.map(e => getBlockLabel(e.blockId)).join(', ')}
            </div>
          )}
          {unmatched.length > 0 && (
            <div>
              <span style={{ color: 'var(--red-500)', fontWeight: 'bold' }}>✗ </span>
              {unmatched.map(e => getBlockLabel(e.blockId)).join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Rule Details column
  const ruleDetailsTemplate = (rowData: MatchResult) => {
    const selectedMatch = rowData.selectedMatch;  // Don't fallback to matches[0]
    if (!selectedMatch) return <span>-</span>;

    const { details } = selectedMatch;
    
    return (
      <div style={{ fontSize: '0.875rem' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {selectedMatch.ruleName}
          </div>
          <div style={{ color: 'var(--text-color-secondary)' }}>
            Priority: {selectedMatch.priority}
          </div>
        </div>

        {/* Match Summary */}
        <div style={{ 
          padding: '0.5rem',
          background: 'var(--surface-ground)',
          borderRadius: 'var(--border-radius)',
          fontSize: '0.75rem'
        }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <strong>Elements:</strong> {details.matchedElements}/{details.totalElements} matched
          </div>
          {selectedMatch.explanation && (
            <div style={{ color: 'var(--text-color-secondary)', fontStyle: 'italic' }}>
              {selectedMatch.explanation.summary}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Export functionality
  const handleExport = (format: 'csv' | 'excel' | 'json') => {
    console.log(`Exporting results as ${format}`);
    
    if (format === 'json') {
      exportJSON();
    } else if (format === 'csv') {
      exportCSV();
    } else if (format === 'excel') {
      exportExcel();
    }
  };

  const exportJSON = () => {
    const exportData = {
      metadata: {
        referenceLegend: state.selectedReference?.metadata.name || 'Unknown',
        appointedLegend: state.appointedLegend?.legend_name || 'Unknown',
        exportDate: new Date().toISOString(),
        totalClasses: state.results.length
      },
      results: state.results.map(result => ({
        appointedClass: result.appointedClass,
        selectedMatch: result.selectedMatch || null,  // Don't fallback to matches[0]
        alternatives: result.matches.filter(m => m.ruleId !== result.selectedMatch?.ruleId),
        timestamp: result.timestamp
      })),
      statistics: currentStatistics
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `semantic-mapping-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = [
      'Appointed Class ID',
      'Appointed Class Name',
      'Appointed Class Code',
      'Matched Class ID',
      'Matched Class Name',
      'Matched Class Code',
      'Score',
      'Is Manual',
      'Rule Name',
      'Alternatives'
    ];

    const rows = state.results.map(result => {
      const selectedMatch = result.selectedMatch;  // Don't fallback to matches[0]
      const alternatives = result.matches
        .filter(m => m.ruleId !== selectedMatch?.ruleId)
        .map(alt => `${alt.assignment.class_name} (${alt.confidence}%)`)
        .join('; ');

      return [
        result.appointedClass.class_id,
        `"${result.appointedClass.class_name}"`,
        result.appointedClass.class_map_code,
        selectedMatch?.assignment.class_id || '',
        `"${selectedMatch?.assignment.class_name || ''}"`,
        selectedMatch?.assignment.class_map_code || '',
        selectedMatch?.confidence || '',
        selectedMatch?.ruleId === -1 ? 'Yes' : 'No',
        `"${selectedMatch?.ruleName || ''}"`,
        `"${alternatives}"`
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `semantic-mapping-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // ========================================================================
    // SHEET 1: METADATA
    // ========================================================================
    const metadataData = [
      ['SEMANTIC MATCHING METADATA'],
      [''],
      ['Report Information'],
      ['Generated On', new Date().toISOString()],
      ['Generated By', 'Land Characterization System (LChS)'],
      [''],
      ['Legend Information'],
      ['Appointed Legend', state.appointedLegend?.legend_name || 'Unknown'],
      ['Reference Legend', state.selectedReference?.metadata.name || 'Unknown'],
      ['Reference Legend Version', state.selectedReference?.metadata.version || 'N/A'],
      ['Reference Legend Description', state.selectedReference?.metadata.description || 'N/A'],
      [''],
      ['Processing Options'],
      ['Minimum Score Threshold (%)', state.processingOptions.minConfidence],
      ['Maximum Matches per Class', state.processingOptions.maxMatches],
      ['Include Partial Matches', state.processingOptions.includePartialMatches ? 'Yes' : 'No'],
      [''],
      ['Summary Statistics'],
      ['Total Appointed Classes', currentStatistics.totalClasses],
      ['Total Reference Classes', state.selectedReference?.ruleSet.classes.length || 0],
      ['Matched Classes', currentStatistics.matchedClasses],
      ['Unmatched Classes', currentStatistics.unmatchedClasses],
      ['Partial Matches', currentStatistics.partialMatches],
      ['Average Score (%)', Math.round(currentStatistics.averageConfidence * 10) / 10],
      [''],
      ['Score Distribution'],
      ['High Score (⩾80%)', state.results.filter(r => {
        const match = r.selectedMatch;  // Don't fallback to matches[0]
        return match && match.confidence >= 80;
      }).length],
      ['Medium Score (60-79%)', state.results.filter(r => {
        const match = r.selectedMatch;  // Don't fallback to matches[0]
        return match && match.confidence >= 60 && match.confidence < 80;
      }).length],
      ['Low Score (40-59%)', state.results.filter(r => {
        const match = r.selectedMatch;  // Don't fallback to matches[0]
        return match && match.confidence >= 40 && match.confidence < 60;
      }).length],
      ['Very Low Score (<40%)', state.results.filter(r => {
        const match = r.selectedMatch;  // Don't fallback to matches[0]
        return match && match.confidence > 0 && match.confidence < 40;
      }).length],
      ['No Match', state.results.filter(r => !r.selectedMatch).length],
      [''],
      ['Match Type Distribution'],
      ['Automatic Matches', state.results.filter(r => {
        const match = r.selectedMatch;  // Don't fallback to matches[0]
        return match && match.ruleId !== -1;
      }).length],
      ['Manual Assignments', state.results.filter(r => {
        const match = r.selectedMatch;  // Don't fallback to matches[0]
        return match && match.ruleId === -1;
      }).length],
      [''],
      ['Structural Match Analysis'],
      ['Class Structure Matches', state.results.filter(r => {
        const match = r.selectedMatch;  // Don't fallback to matches[0]
        return match && match.details.classMatch;
      }).length],
      ['Horizontal Pattern Matches', state.results.filter(r => {
        const match = r.selectedMatch;  // Don't fallback to matches[0]
        return match && match.details.horizontalPatternMatch;
      }).length],
      ['Strata Matches', state.results.filter(r => {
        const match = r.selectedMatch;  // Don't fallback to matches[0]
        return match && match.details.strataMatch;
      }).length]
    ];

    const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData);
    
    // Set column widths for metadata sheet
    metadataSheet['!cols'] = [
      { wch: 35 },  // Column A - Labels
      { wch: 50 }   // Column B - Values
    ];

    // Add metadata sheet to workbook
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    // ========================================================================
    // SHEET 2: MATCHING RESULTS
    // ========================================================================
    const headers = [
      'Appointed Class ID',
      'Appointed Class Name',
      'Appointed Class Code',
      'Matched Class ID',
      'Matched Class Name',
      'Matched Class Code',
      'Score (%)',
      'Is Manual',
      'Rule Name',
      'Class Match',
      'HP Match',
      'Strata Match',
      'Elements Matched',
      'Total Elements',
      'Coverage (%)',
      'Alternatives'
    ];

    const rows = state.results.map(result => {
      const selectedMatch = result.selectedMatch;  // Don't fallback to matches[0]
      const alternatives = result.matches
        .filter(m => m.ruleId !== selectedMatch?.ruleId)
        .map(alt => `${alt.assignment.class_name} (${alt.confidence}%)`)
        .join('; ');

      const elementMatches = selectedMatch?.details.elementMatches || [];
      const matchedElements = elementMatches.filter(e => e.matched);
      const coveragePercent = elementMatches.length > 0
        ? Math.round((matchedElements.length / elementMatches.length) * 100)
        : 0;

      return [
        result.appointedClass.class_id,
        result.appointedClass.class_name,
        result.appointedClass.class_map_code,
        selectedMatch?.assignment.class_id || '',
        selectedMatch?.assignment.class_name || '',
        selectedMatch?.assignment.class_map_code || '',
        selectedMatch?.confidence || '',
        selectedMatch?.ruleId === -1 ? 'Yes' : 'No',
        selectedMatch?.ruleName || '',
        selectedMatch?.details.classMatch ? 'Yes' : 'No',
        selectedMatch?.details.horizontalPatternMatch ? 'Yes' : 'No',
        selectedMatch?.details.strataMatch ? 'Yes' : 'No',
        selectedMatch?.details.matchedElements || 0,
        selectedMatch?.details.totalElements || 0,
        coveragePercent,
        alternatives
      ];
    });

    const resultsData = [headers, ...rows];
    const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);
    
    // Set column widths for results sheet
    resultsSheet['!cols'] = [
      { wch: 12 },  // Appointed Class ID
      { wch: 30 },  // Appointed Class Name
      { wch: 15 },  // Appointed Class Code
      { wch: 12 },  // Matched Class ID
      { wch: 30 },  // Matched Class Name
      { wch: 15 },  // Matched Class Code
      { wch: 10 },  // Score
      { wch: 10 },  // Is Manual
      { wch: 20 },  // Rule Name
      { wch: 10 },  // Class Match
      { wch: 10 },  // HP Match
      { wch: 10 },  // Strata Match
      { wch: 12 },  // Elements Matched
      { wch: 12 },  // Total Elements
      { wch: 10 },  // Coverage
      { wch: 40 }   // Alternatives
    ];

    // Add results sheet to workbook
    XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Matching Results');

    // ========================================================================
    // EXPORT THE WORKBOOK
    // ========================================================================
    const fileName = `semantic-mapping-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="step-results">
      <Card>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h3 style={{ margin: 0 }}>Matching Results</h3>
            <p style={{ 
              margin: '0.5rem 0 0 0', 
              color: 'var(--text-color-secondary)',
              fontSize: '0.875rem'
            }}>
              Review and adjust the semantic mapping results for each class
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>            
            <Button
              label="Export CSV"
              icon="pi pi-file"
              className="p-button-outlined"
              onClick={() => handleExport('csv')}
            />
            <Button
              label="Export Excel"
              icon="pi pi-file-excel"
              className="p-button-outlined"
              onClick={() => handleExport('excel')}
            />
            <Button
              label="Export JSON"
              icon="pi pi-file"
              className="p-button-outlined"
              onClick={() => handleExport('json')}
            />
            <Button
              label="Log"
              icon="pi pi-book"
              className="p-button-outlined p-button-help"
              onClick={downloadMatchingLog}
              tooltip="Download detailed matching process log"
            />
          </div>
        </div>

        {/* Legend Names Display */}
        {state.selectedReference && state.appointedLegend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            padding: '1rem 1.5rem',
            background: 'var(--surface-card)',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--surface-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--text-color)',
              textAlign: 'right'
            }}>
              {state.appointedLegend.legend_name}
            </div>
            <i className="pi pi-arrow-right" style={{
              fontSize: '1.5rem',
              color: 'var(--primary-color)',
              fontWeight: 'bold'
            }}></i>
            <div style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--text-color)',
              textAlign: 'left'
            }}>
              {state.selectedReference.metadata.name}
            </div>
          </div>
        )}

        {/* Simplified Statistics Summary - Top Level */}
        {currentStatistics && state.selectedReference && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
            padding: '1.5rem',
            background: 'var(--surface-ground)',
            borderRadius: 'var(--border-radius)',
            border: '2px solid var(--primary-color)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {currentStatistics.totalClasses}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', fontWeight: '500' }}>
                Total Appointed Classes
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--blue-500)' }}>
                {state.selectedReference.ruleSet.classes.length}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', fontWeight: '500' }}>
                Total Reference Classes
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--green-500)' }}>
                {currentStatistics.matchedClasses}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', fontWeight: '500' }}>
                Matched Classes
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--red-500)' }}>
                {currentStatistics.unmatchedClasses}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', fontWeight: '500' }}>
                Unmatched Classes
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Detailed Matching & Class Reassignment Section */}
        <Panel 
          header="Matching Details & Class Reassignment" 
          toggleable 
          collapsed={detailsCollapsed}
          onToggle={(e) => setDetailsCollapsed(e.value)}
          style={{ marginBottom: '1rem' }}
        >
          {/* Additional Statistics Inside Panel */}
          {currentStatistics && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'var(--surface-50)',
              borderRadius: 'var(--border-radius)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--orange-500)' }}>
                  {currentStatistics.partialMatches}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                  Partial Matches
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--green-600)' }}>
                  {currentStatistics.highConfidence}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                  High Score (⩾80%)
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--blue-500)' }}>
                  {currentStatistics.mediumConfidence}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                  Medium Score (50-79%)
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--orange-600)' }}>
                  {currentStatistics.lowConfidence}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                  Low Score(&lt;50%)
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {Math.round(currentStatistics.averageConfidence)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                  Average Score
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          <DataTable
            value={state.results}
            scrollable
            scrollHeight="600px"
            emptyMessage="No results to display"
            stripedRows
          >
            <Column
              field="appointedClass.class_name"
              header="Appointed Class"
              body={appointedClassTemplate}
              style={{ minWidth: '180px' }}
            />
            <Column
              header="Best Match / Alternatives"
              body={matchTemplate}
              style={{ minWidth: '250px' }}
            />
            <Column
              header="Score"
              body={confidenceTemplate}
              style={{ minWidth: '100px', textAlign: 'center' }}
            />
            <Column
              header="Coverage"
              body={coverageTemplate}
              style={{ minWidth: '120px', textAlign: 'center' }}
            />
            <Column
              header="Structural"
              body={structuralTemplate}
              style={{ minWidth: '130px' }}
            />
            <Column
              header="Element Matches"
              body={elementMatchesTemplate}
              style={{ minWidth: '300px' }}
            />
            <Column
              header="Rule Details"
              body={ruleDetailsTemplate}
              style={{ minWidth: '250px' }}
            />
          </DataTable>
        </Panel>
      </Card>

      {/* Reassignment Dialog */}
      <Dialog
        header={`Reassign Class: ${reassignDialog.appointedClass?.class_name || ''}`}
        visible={reassignDialog.visible}
        style={{ width: '600px' }}
        onHide={closeReassignDialog}
        footer={
          <div>
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
              onClick={closeReassignDialog}
            />
            <Button
              label="Apply Manual Assignment"
              icon="pi pi-check"
              onClick={handleManualReassignment}
              disabled={!manualAssignment.class_name || !manualAssignment.class_map_code}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Current Assignment */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>Current Assignment</h4>
            {reassignDialog.currentMatch ? (
              <div style={{ 
                padding: '1rem', 
                background: 'var(--surface-50)', 
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--surface-border)'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  {reassignDialog.currentMatch.assignment.class_name}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                  Code: {reassignDialog.currentMatch.assignment.class_map_code}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', marginTop: '0.25rem' }}>
                  Score: {reassignDialog.currentMatch.confidence}%
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '1rem', 
                background: 'var(--red-50)', 
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--red-200)'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--red-700)' }}>
                  No match found (0% confidence)
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                  Please select or enter a class assignment below
                </div>
              </div>
            )}
          </div>

          {/* Select from Available Classes */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>
              Select from Reference Legend Classes
            </h4>
            <Dropdown
              value={null}
              options={getAvailableReferenceClassesForResult(reassignDialog.resultIndex)}
              onChange={(e) => handleReassignFromDropdown(e.value)}
              placeholder="Select a reference class..."
              filter
              showClear
              style={{ width: '100%' }}
              optionLabel="label"
            />
            <small style={{ color: 'var(--text-color-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Classes with scores are from alternative matches (sorted by score)
            </small>
          </div>

          {/* Manual Entry */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>
              Or Enter Custom Assignment
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label htmlFor="manual-class-id" style={{ 
                  display: 'block', 
                  marginBottom: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  Class ID (optional)
                </label>
                <InputNumber
                  id="manual-class-id"
                  value={manualAssignment.class_id}
                  onValueChange={(e) => setManualAssignment({
                    ...manualAssignment,
                    class_id: e.value || 0
                  })}
                  style={{ width: '100%' }}
                />
              </div>
              
              <div>
                <label htmlFor="manual-class-name" style={{ 
                  display: 'block', 
                  marginBottom: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  Class Name *
                </label>
                <InputText
                  id="manual-class-name"
                  value={manualAssignment.class_name}
                  onChange={(e) => setManualAssignment({
                    ...manualAssignment,
                    class_name: e.target.value
                  })}
                  placeholder="Enter class name..."
                  style={{ width: '100%' }}
                />
              </div>
              
              <div>
                <label htmlFor="manual-map-code" style={{ 
                  display: 'block', 
                  marginBottom: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  Map Code *
                </label>
                <InputText
                  id="manual-map-code"
                  value={manualAssignment.class_map_code}
                  onChange={(e) => setManualAssignment({
                    ...manualAssignment,
                    class_map_code: e.target.value
                  })}
                  placeholder="Enter map code..."
                  style={{ width: '100%' }}
                />
              </div>
              
              <small style={{ color: 'var(--text-color-secondary)' }}>
                * Required fields
              </small>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};