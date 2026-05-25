// ============================================================================
// SEMANTIC INTEROPERABILITY STATE MANAGEMENT
// ============================================================================

import React, { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import {
  Legend,
  MatchResult,
  ProcessingProgress,
  ProcessingOptions,
  ReferenceLegendPlugin,
  ClassMatch,
  ProcessingStatistics
} from './semantic-types';
import { RuleEngine } from './RuleEngine';
import { LegendRegistry } from './LegendRegistry';

// ----------------------------------------------------------------------------
// State Definition
// ----------------------------------------------------------------------------

interface SemanticState {
  // Reference Legend
  selectedReference: ReferenceLegendPlugin | null;
  availableReferences: ReferenceLegendPlugin[];
  
  // Appointed Legend
  appointedLegend: Legend | null;
  uploadedFiles: File[];
  
  // Processing
  isProcessing: boolean;
  progress: ProcessingProgress | null;
  processingOptions: ProcessingOptions;
  
  // Results
  results: MatchResult[];
  statistics: ProcessingStatistics | null;
  matchingLog: string; // Detailed log from RuleEngine
  
  // UI State
  currentStep: number;
  errors: string[];
  warnings: string[];
}

// ----------------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------------

type SemanticAction =
  | { type: 'SET_AVAILABLE_REFERENCES'; payload: ReferenceLegendPlugin[] }
  | { type: 'SELECT_REFERENCE'; payload: ReferenceLegendPlugin }
  | { type: 'SET_APPOINTED_LEGEND'; payload: Legend }
  | { type: 'SET_UPLOADED_FILES'; payload: File[] }
  | { type: 'START_PROCESSING' }
  | { type: 'UPDATE_PROGRESS'; payload: ProcessingProgress }
  | { type: 'UPDATE_OPTIONS'; payload: ProcessingOptions }
  | { type: 'SET_RESULTS'; payload: MatchResult[] }
  | { type: 'SET_STATISTICS'; payload: ProcessingStatistics }
  | { type: 'SET_MATCHING_LOG'; payload: string }
  | { type: 'UPDATE_MATCH_SELECTION'; payload: { resultIndex: number; match: ClassMatch } }
  | { type: 'COMPLETE_PROCESSING' }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'ADD_ERROR'; payload: string }
  | { type: 'ADD_WARNING'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'RESET' };

// ----------------------------------------------------------------------------
// Reducer
// ----------------------------------------------------------------------------

const initialState: SemanticState = {
  selectedReference: null,
  availableReferences: [],
  appointedLegend: null,
  uploadedFiles: [],
  isProcessing: false,
  progress: null,
  processingOptions: {
    showProgress: true,
    includePartialMatches: true,
    minConfidence: 0,
    maxMatches: 5,
    useCache: true,
    async: true,
    toleranceConfidence: 0.7,
    characteristicConfidence: 0.5
  },
  results: [],
  statistics: null,
  matchingLog: '',
  currentStep: 0,
  errors: [],
  warnings: []
};

function semanticReducer(state: SemanticState, action: SemanticAction): SemanticState {
  switch (action.type) {
    case 'SET_AVAILABLE_REFERENCES':
      return { ...state, availableReferences: action.payload };
    
    case 'SELECT_REFERENCE':
      return { ...state, selectedReference: action.payload };
    
    case 'SET_APPOINTED_LEGEND':
      return { ...state, appointedLegend: action.payload };
    
    case 'SET_UPLOADED_FILES':
      return { ...state, uploadedFiles: action.payload };
    
    case 'START_PROCESSING':
      return {
        ...state,
        isProcessing: true,
        progress: {
          current: 0,
          total: state.appointedLegend?.LCT_Class.length || 0,
          status: 'Initializing...',
          percentage: 0,
          startTime: Date.now()
        },
        errors: [],
        warnings: []
      };
    
    case 'UPDATE_PROGRESS':
      return { ...state, progress: action.payload };
    
    case 'UPDATE_OPTIONS':
      return { ...state, processingOptions: action.payload };
    
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    
    case 'SET_STATISTICS':
      return { ...state, statistics: action.payload };
    
    case 'SET_MATCHING_LOG':
      return { ...state, matchingLog: action.payload };
    
    case 'UPDATE_MATCH_SELECTION': {
      const newResults = state.results.map((result, index) => {
        if (index === action.payload.resultIndex) {
          // If this is a manual assignment (ruleId === -1), add it to the matches array
          // This ensures the UI updates correctly even for 0% match cases
          const updatedMatches = action.payload.match.ruleId === -1
            ? [...result.matches.filter(m => m.ruleId !== -1), action.payload.match] // Remove old manual assignments, add new one
            : result.matches;
          
          return {
            ...result,
            matches: updatedMatches,
            selectedMatch: action.payload.match
          };
        }
        return result;
      });
      return { ...state, results: newResults };
    }
    
    case 'COMPLETE_PROCESSING':
      return { ...state, isProcessing: false, progress: null };
    
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'ADD_ERROR':
      return { ...state, errors: [...state.errors, action.payload] };
    
    case 'ADD_WARNING':
      return { ...state, warnings: [...state.warnings, action.payload] };
    
    case 'CLEAR_ERRORS':
      return { ...state, errors: [], warnings: [] };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

// ----------------------------------------------------------------------------
// Context
// ----------------------------------------------------------------------------

interface SemanticContextValue {
  state: SemanticState;
  dispatch: React.Dispatch<SemanticAction>;
  
  // Helper functions
  setReference: (reference: ReferenceLegendPlugin) => void;
  setAppointedLegend: (legend: Legend, files: File[]) => void;
  processLegend: () => Promise<void>;
  selectMatch: (resultIndex: number, match: ClassMatch) => void;
  nextStep: () => void;
  previousStep: () => void;
  reset: () => void;
}

const SemanticContext = createContext<SemanticContextValue | undefined>(undefined);

// ----------------------------------------------------------------------------
// Provider Component
// ----------------------------------------------------------------------------

interface SemanticProviderProps {
  children: ReactNode;
  registry: LegendRegistry;
  ruleEngine: RuleEngine;
  blockLookUp?: any;
}

export function SemanticProvider({ children, registry, ruleEngine, blockLookUp }: SemanticProviderProps) {
  const [state, dispatch] = useReducer(semanticReducer, initialState);
  
  // Load available references on mount
  React.useEffect(() => {
    const references = registry.getAll();
    dispatch({ type: 'SET_AVAILABLE_REFERENCES', payload: references });
  }, [registry]);
  
  // Helper: Set reference legend
  const setReference = useCallback((reference: ReferenceLegendPlugin) => {
    dispatch({ type: 'SELECT_REFERENCE', payload: reference });
  }, []);
  
  // Helper: Set appointed legend
  const setAppointedLegend = useCallback((legend: Legend, files: File[]) => {
    dispatch({ type: 'SET_APPOINTED_LEGEND', payload: legend });
    dispatch({ type: 'SET_UPLOADED_FILES', payload: files });
  }, []);
  
  // Helper: Process legend
  const processLegend = useCallback(async () => {
    console.log('ðŸ”§ SemanticStore.processLegend: blockLookUp available?', !!blockLookUp);
    if (!state.selectedReference || !state.appointedLegend) {
      dispatch({ type: 'ADD_ERROR', payload: 'Reference legend and appointed legend required' });
      return;
    }
    
    dispatch({ type: 'START_PROCESSING' });
    
    try {
      const totalClasses = state.appointedLegend.LCT_Class.length;
      const startTime = Date.now();
      
      // Update initial progress
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          current: 0,
          total: totalClasses,
          status: 'Starting matching process...',
          percentage: 0,
          startTime
        }
      });
      
      // Use the RuleEngine's matchLegend method which captures logs
      const results = await ruleEngine.matchLegend(
        state.appointedLegend,
        state.selectedReference.ruleSet.rules,
        state.processingOptions,
        blockLookUp
      );
      
      // Capture the detailed log from RuleEngine
      const detailedLog = ruleEngine.getFormattedLog();
      console.log('ðŸ“ Captured log entries:', ruleEngine.getLogEntries().length);
      
      // Calculate statistics
      const statistics: ProcessingStatistics = {
        totalClasses,
        matchedClasses: results.filter(r => r.matches.length > 0).length,
        unmatchedClasses: results.filter(r => r.matches.length === 0).length,
        partialMatches: results.filter(r => 
          r.matches.length > 0 && r.matches[0].confidence < 100
        ).length,
        highConfidence: results.filter(r => 
          r.matches.length > 0 && r.matches[0].confidence >= 80
        ).length,
        mediumConfidence: results.filter(r => 
          r.matches.length > 0 && r.matches[0].confidence >= 50 && r.matches[0].confidence < 80
        ).length,
        lowConfidence: results.filter(r => 
          r.matches.length > 0 && r.matches[0].confidence < 50
        ).length,
        averageConfidence: results.reduce((sum, r) => 
          sum + (r.matches[0]?.confidence || 0), 0
        ) / totalClasses
      };
      
      dispatch({ type: 'SET_RESULTS', payload: results });
      dispatch({ type: 'SET_STATISTICS', payload: statistics });
      dispatch({ type: 'SET_MATCHING_LOG', payload: detailedLog });
      dispatch({ type: 'COMPLETE_PROCESSING' });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dispatch({ type: 'ADD_ERROR', payload: message });
      dispatch({ type: 'COMPLETE_PROCESSING' });
    }
  }, [state.selectedReference, state.appointedLegend, state.processingOptions, ruleEngine, blockLookUp]);
  
  // Helper: Select a match
  const selectMatch = useCallback((resultIndex: number, match: ClassMatch) => {
    dispatch({ type: 'UPDATE_MATCH_SELECTION', payload: { resultIndex, match } });
  }, []);
  
  // Helper: Navigate steps
  const nextStep = useCallback(() => {
    dispatch({ type: 'SET_STEP', payload: state.currentStep + 1 });
  }, [state.currentStep]);
  
  const previousStep = useCallback(() => {
    dispatch({ type: 'SET_STEP', payload: Math.max(0, state.currentStep - 1) });
  }, [state.currentStep]);
  
  // Helper: Reset
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    ruleEngine.clearCache();
  }, [ruleEngine]);
  
  const value: SemanticContextValue = {
    state,
    dispatch,
    setReference,
    setAppointedLegend,
    processLegend,
    selectMatch,
    nextStep,
    previousStep,
    reset
  };
  
  return (
    <SemanticContext.Provider value={value}>
      {children}
    </SemanticContext.Provider>
  );
}

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

export function useSemanticStore(): SemanticContextValue {
  const context = useContext(SemanticContext);
  if (!context) {
    throw new Error('useSemanticStore must be used within SemanticProvider');
  }
  return context;
}