// ============================================================================
// RULE BUILDER COMPONENT - New Legend Connector Version
// ============================================================================

import React, { useState, useEffect } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Panel } from 'primereact/panel';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Checkbox } from 'primereact/checkbox';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';
import { Divider } from 'primereact/divider';
import { Tree } from 'primereact/tree';
import { 
  LegendRule, 
  RuleCondition, 
  ElementRule, 
  PropertyRuleDef,
  CharacteristicRuleDef,
  ComparisonMode,
  StructuralRule,
  ReferenceClass
} from './semantic-types';

interface RuleBuilderProps {
  rule?: LegendRule;
  targetClass?: ReferenceClass;
  availableClasses?: ReferenceClass[];
  blocks?: any[];
  characteristics?: any[];
  characteristicLookUp?: any[];
  legendData?: any;
  onSave: (rule: LegendRule) => void;
  onCancel: () => void;
}

const comparisonModes: ComparisonMode[] = ['=', 'Contains', '>', '>=', '<', '<=', '><', '<>', '>=<=', '<=>='];

export const RuleBuilder: React.FC<RuleBuilderProps> = ({ 
  rule, 
  targetClass,
  availableClasses = [],
  blocks = [], 
  characteristics = [],
  characteristicLookUp = [],
  legendData = null,
  onSave, 
  onCancel 
}) => {

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [ruleData, setRuleData] = useState<LegendRule>(
    rule || createDefaultRule(targetClass)
  );

  const [activeTab, setActiveTab] = useState(0);
  const [rulesetType, setRulesetType] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [showConditionDialog, setShowConditionDialog] = useState(false);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [showCharacteristicSelector, setShowCharacteristicSelector] = useState(false);
  const [currentCondition, setCurrentCondition] = useState<RuleCondition | null>(null);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [editingContext, setEditingContext] = useState<any>(null);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function createDefaultRule(targetClass?: ReferenceClass): LegendRule {
    return {
      id: Date.now(),
      name: targetClass ? `Rule for ${targetClass.class_name}` : '',
      priority: 1,
      syntax: '',
      description: '',
      assignment: {
        class_id: targetClass?.class_id || 0,
        class_name: targetClass?.class_name || '',
        class_map_code: targetClass?.class_map_code || '',
        class_description: targetClass?.class_description || ''
      },
      inclusive: {
        classes: createDefaultStructuralRule('Class Inclusion'),
        classCharacteristics: createDefaultStructuralRule('Class Characteristics Inclusion'),
        horizontalPatterns: createDefaultStructuralRule('Horizontal Pattern Inclusion'),
        strata: createDefaultStructuralRule('Strata Inclusion'),
        elements: []
      },
      exclusive: {
        classes: createDefaultStructuralRule('Class Exclusion'),
        classCharacteristics: createDefaultStructuralRule('Class Characteristics Exclusion'),
        horizontalPatterns: createDefaultStructuralRule('Horizontal Pattern Exclusion'),
        strata: createDefaultStructuralRule('Strata Exclusion'),
        elements: []
      },
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        author: 'System',
        notes: ''
      }
    };
  }

  function createDefaultStructuralRule(name: string): StructuralRule {
    // Create empty structural rule - no auto-included conditions
    return {
      id: Date.now(),
      priority: 1,
      name,
      rules: {
        properties: {
          and: [],
          or: []
        },
        characteristics: {
          and: [],
          or: []
        }
      }
    };
  }

  function createDefaultCondition(): RuleCondition {
    return {
      object: '',
      lower_bound: 0,
      lower_tolerance: 0,
      upper_bound: 0,
      upper_tolerance: 0,
      mode: '='
    };
  }

  function createDefaultElement(blockId?: number): ElementRule {
    return {
      id: Date.now(),
      priority: 1,
      element: blockId || 0,
      ruleDefinition: {
        properties: [],
        characteristics: []
      }
    };
  }

  function createDefaultPropertyRuleDef(blockId: number): PropertyRuleDef {
    const block = blocks.find(b => b.block_id === blockId);
    return {
      id: Date.now(),
      name: block ? `${block.block_label} Element Property Rules` : 'Property Rules',
      priority: 1,
      rules: {
        properties: { 
          and: [],
          or: []
        },
        characteristics: { and: [], or: [] }
      }
    };
  }

  function createDefaultCharacteristicRuleDef(charId: number): CharacteristicRuleDef {
    const char = characteristics.find(c => c.characteristic_id === charId);
    return {
      id: Date.now(),
      name: char ? `${char.characteristic_label} Characteristic Rules` : 'Characteristic Rules',
      priority: 1,
      characteristicID: charId,
      rules: {
        properties: {
          and: [],
          or: []
        },
        characteristics: { and: [], or: [] }
      }
    };
  }

  // ============================================================================
  // BLOCKS & CHARACTERISTICS DATA
  // ============================================================================

  const getBlockOptions = () => {
    if (!blocks || blocks.length === 0) return [];
    return blocks.map(b => ({
      label: `${b.block_label || b.block_name} (${b.block_id})`,
      value: b.block_id,
      block: b
    }));
  };

  const getCharacteristicOptions = (blockId?: number) => {
    if (!characteristics || characteristics.length === 0) return [];
    
    let filteredCharacteristics = characteristics;
    
    // Filter by block if blockId is provided and characteristicLookUp is available
    if (blockId && characteristicLookUp) {
      const lookupData = characteristicLookUp['LC_Block-LC_Characteristic'] || [];
      
      // Get characteristic IDs associated with this block
      const validCharIds = new Set(
        lookupData
          .filter((mapping: any) => mapping.block_id === blockId)
          .map((mapping: any) => mapping.characteristic_id)
      );
      
      // Filter characteristics to only those associated with the block
      if (validCharIds.size > 0) {
        filteredCharacteristics = characteristics.filter(
          c => validCharIds.has(c.characteristic_id)
        );
      }
    }
    
    return filteredCharacteristics.map(c => ({
      label: `${c.characteristic_id} - ${c.characteristic_label || c.characteristic_name}`,
      value: c.characteristic_id,
      characteristic: c
    }));
  };

  const getBlockElements = (blockId: number) => {
    const block = blocks.find(b => b.block_id === blockId);
    return block?.elements || [];
  };

  const getCharacteristicElements = (charId: number) => {
    const char = characteristics.find(c => c.characteristic_id === charId);
    return char?.elements || [];
  };

  const getClassElements = () => {
    if (!legendData || !legendData.LC_Class || legendData.LC_Class.length === 0) return [];
    return legendData.LC_Class[0].elements || [];
  };

  const getHorizontalPatternElements = () => {
    if (!legendData || !legendData.LC_Patterns || legendData.LC_Patterns.length === 0) return [];
    const hpPattern = legendData.LC_Patterns.find((p: any) => p.pattern_name === 'horizontal_pattern');
    return hpPattern?.elements || [];
  };

  const getStrataElements = () => {
    if (!legendData || !legendData.LC_Patterns || legendData.LC_Patterns.length === 0) return [];
    const stratumPattern = legendData.LC_Patterns.find((p: any) => p.pattern_name === 'stratum');
    return stratumPattern?.elements || [];
  };

  const getClassCharacteristicsElements = () => {
    if (!legendData || !legendData.LC_ClassCharacteristics || legendData.LC_ClassCharacteristics.length === 0) return [];
    // Return all unique elements from class characteristics
    const allElements: any[] = [];
    const elementMap = new Map();
    
    legendData.LC_ClassCharacteristics.forEach((cc: any) => {
      if (cc.elements && Array.isArray(cc.elements)) {
        cc.elements.forEach((el: any) => {
          if (!elementMap.has(el.element_name)) {
            elementMap.set(el.element_name, el);
            allElements.push(el);
          }
        });
      }
    });
    
    return allElements;
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const updateRuleField = (field: string, value: any) => {
    setRuleData(prev => ({
      ...prev,
      [field]: value,
      metadata: {
        ...prev.metadata,
        updated: new Date().toISOString()
      }
    }));
  };

  const updateAssignment = (field: string, value: any) => {
    setRuleData(prev => ({
      ...prev,
      assignment: {
        ...prev.assignment,
        [field]: value
      },
      metadata: {
        ...prev.metadata,
        updated: new Date().toISOString()
      }
    }));
  };

  const addElement = (blockId: number, type: 'inclusive' | 'exclusive' = 'inclusive') => {
    const newElement = createDefaultElement(blockId);
    const block = blocks.find(b => b.block_id === blockId);
    
    // Auto-create a property rule for the element
    if (block) {
      newElement.ruleDefinition.properties.push(createDefaultPropertyRuleDef(blockId));
    }
    
    setRuleData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        elements: [...prev[type].elements, newElement]
      },
      metadata: {
        ...prev.metadata,
        updated: new Date().toISOString()
      }
    }));
    
    setShowBlockSelector(false);
  };

  const removeElement = (index: number, type: 'inclusive' | 'exclusive' = 'inclusive') => {
    setRuleData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        elements: prev[type].elements.filter((_, i) => i !== index)
      },
      metadata: {
        ...prev.metadata,
        updated: new Date().toISOString()
      }
    }));
  };

  const updateElement = (index: number, field: string, value: any, type: 'inclusive' | 'exclusive' = 'inclusive') => {
    setRuleData(prev => {
      const elements = [...prev[type].elements];
      elements[index] = { ...elements[index], [field]: value };
      return {
        ...prev,
        [type]: {
          ...prev[type],
          elements
        },
        metadata: {
          ...prev.metadata,
          updated: new Date().toISOString()
        }
      };
    });
  };

  const addPropertyRule = (elementIndex: number, type: 'inclusive' | 'exclusive' = 'inclusive') => {
    const element = ruleData[type].elements[elementIndex];
    const newRule = createDefaultPropertyRuleDef(element.element);
    
    setRuleData(prev => {
      const elements = [...prev[type].elements];
      elements[elementIndex].ruleDefinition.properties.push(newRule);
      return {
        ...prev,
        [type]: {
          ...prev[type],
          elements
        },
        metadata: {
          ...prev.metadata,
          updated: new Date().toISOString()
        }
      };
    });
  };

  const addCharacteristicRule = (elementIndex: number, charId: number, type: 'inclusive' | 'exclusive' = 'inclusive') => {
    const newRule = createDefaultCharacteristicRuleDef(charId);
    
    setRuleData(prev => {
      const elements = [...prev[type].elements];
      elements[elementIndex].ruleDefinition.characteristics.push(newRule);
      return {
        ...prev,
        [type]: {
          ...prev[type],
          elements
        },
        metadata: {
          ...prev.metadata,
          updated: new Date().toISOString()
        }
      };
    });
    
    setShowCharacteristicSelector(false);
  };

  const openConditionDialog = (context: any, condition?: RuleCondition) => {
    setEditingContext(context);
    setCurrentCondition(condition ? { ...condition } : createDefaultCondition());
    setShowConditionDialog(true);
  };

  const saveCondition = () => {
    if (!currentCondition || !editingContext) return;

    const { type, rulesetType, elementIndex, ruleType, ruleIndex, conditionType, logicType, structuralType } = editingContext;
    
    setRuleData(prev => {
      const newData = { ...prev };

      if (type === 'structural') {
        // Handling structural rules (classes, horizontalPatterns, strata, classCharacteristics)
        const structuralRule = newData[rulesetType][structuralType];
        const targetRules = structuralRule.rules[conditionType];
        
        if (logicType === 'or') {
          // OR conditions need to be grouped by field name
          addOrCondition(targetRules.or, currentCondition);
        } else {
          // AND conditions are stored as flat array
          if (!checkDuplicateAndCondition(targetRules.and, currentCondition)) {
            targetRules.and.push(currentCondition);
          } else {
            console.warn('Duplicate AND condition detected and not added:', currentCondition);
          }
        }
      } else {
        // Handling element rules (properties, characteristics)
        const ruleset = newData[rulesetType];
        const element = ruleset.elements[elementIndex];
        const ruleArray = ruleType === 'property' 
          ? element.ruleDefinition.properties 
          : element.ruleDefinition.characteristics;
        const rule = ruleArray[ruleIndex];
        const targetRules = rule.rules[conditionType];
        
        if (logicType === 'or') {
          // OR conditions need to be grouped by field name
          addOrCondition(targetRules.or, currentCondition);
        } else {
          // AND conditions are stored as flat array
          if (!checkDuplicateAndCondition(targetRules.and, currentCondition)) {
            targetRules.and.push(currentCondition);
          } else {
            console.warn('Duplicate AND condition detected and not added:', currentCondition);
          }
        }
      }

      return {
        ...newData,
        metadata: {
          ...newData.metadata,
          updated: new Date().toISOString()
        }
      };
    });

    setShowConditionDialog(false);
    setCurrentCondition(null);
    setEditingContext(null);
  };

  // Helper function to check for duplicate AND conditions
  const checkDuplicateAndCondition = (conditions: RuleCondition[], newCondition: RuleCondition): boolean => {
    return conditions.some((cond: RuleCondition) => 
      cond.object === newCondition.object &&
      cond.mode === newCondition.mode &&
      cond.lower_bound === newCondition.lower_bound &&
      cond.upper_bound === newCondition.upper_bound &&
      cond.lower_tolerance === newCondition.lower_tolerance &&
      cond.upper_tolerance === newCondition.upper_tolerance
    );
  };

  // Helper function to add OR conditions grouped by field name
  const addOrCondition = (orArray: any[], newCondition: RuleCondition) => {
    const fieldName = newCondition.object;
    
    // Find existing group for this field name
    let existingGroup = orArray.find(group => group.hasOwnProperty(fieldName));
    
    if (existingGroup) {
      // Check for duplicate in existing group
      const isDuplicate = existingGroup[fieldName].some((cond: RuleCondition) => 
        cond.mode === newCondition.mode &&
        cond.lower_bound === newCondition.lower_bound &&
        cond.upper_bound === newCondition.upper_bound &&
        cond.lower_tolerance === newCondition.lower_tolerance &&
        cond.upper_tolerance === newCondition.upper_tolerance
      );
      
      if (!isDuplicate) {
        existingGroup[fieldName].push(newCondition);
      } else {
        console.warn('Duplicate OR condition detected and not added:', newCondition);
      }
    } else {
      // Create new group for this field name
      orArray.push({
        [fieldName]: [newCondition]
      });
    }
  };

  // Helper function to render grouped OR conditions
  const renderOrConditions = (orArray: any[], onDelete: (groupIndex: number, condIndex: number) => void) => {
    if (!orArray || orArray.length === 0) return null;

    return orArray.map((group, groupIndex) => {
      return Object.entries(group).map(([fieldName, conditions]) => {
        const condArray = conditions as RuleCondition[];
        return (
          <div key={`group-${groupIndex}-${fieldName}`} style={{ marginTop: '0.5rem' }}>
            <div style={{ 
              padding: '0.25rem 0.5rem',
              background: 'var(--blue-100)',
              fontWeight: 'bold',
              borderRadius: '4px 4px 0 0',
              fontSize: '0.9rem'
            }}>
              {fieldName} (OR group - any one matches)
            </div>
            {condArray.map((cond, condIndex) => (
              <div key={`cond-${groupIndex}-${condIndex}`} style={{ 
                padding: '0.5rem', 
                border: '1px solid #ccc', 
                borderTop: condIndex === 0 ? '1px solid #ccc' : 'none',
                borderRadius: condIndex === condArray.length - 1 ? '0 0 4px 4px' : '0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--blue-50)'
              }}>
                <span>{`${cond.object} ${cond.mode} [${cond.lower_bound}, ${cond.upper_bound}]`}</span>
                <Button 
                  icon="pi pi-trash" 
                  className="p-button-rounded p-button-text p-button-danger p-button-sm"
                  onClick={() => onDelete(groupIndex, condIndex)}
                />
              </div>
            ))}
          </div>
        );
      });
    });
  };

  const validateRule = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!ruleData.name.trim()) errors.push('Rule name is required');
    if (!ruleData.assignment.class_name.trim()) errors.push('Class name is required');
    if (!ruleData.assignment.class_map_code.trim()) errors.push('Class map code is required');
    if (ruleData.assignment.class_id === 0) errors.push('Class ID must be greater than 0');
    if (ruleData.inclusive.elements.length === 0) errors.push('At least one inclusive element rule is required');

    // Validate that elements have proper configurations
    ruleData.inclusive.elements.forEach((el, idx) => {
      if (el.element === 0) errors.push(`Element ${idx + 1}: Block must be selected`);
      if (el.ruleDefinition.properties.length === 0 && el.ruleDefinition.characteristics.length === 0) {
        errors.push(`Element ${idx + 1}: Must have at least one property or characteristic rule`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  };

  const handleSave = () => {
    const validation = validateRule();
    if (validation.valid) {
      onSave(ruleData);
    } else {
      alert('Validation errors:\n' + validation.errors.join('\n'));
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderBasicInfo = () => (
    <div className="p-fluid">
      <Panel header="Rule Information" style={{ marginBottom: '1rem' }}>
        <div className="p-field p-grid" style={{ marginBottom: '1rem' }}>
          <label htmlFor="ruleName" className="p-col-12 p-md-2">Rule Name *</label>
          <div className="p-col-12 p-md-10">
            <InputText
              id="ruleName"
              value={ruleData.name}
              onChange={(e) => updateRuleField('name', e.target.value)}
              placeholder="e.g., Closed Trees Classification"
            />
          </div>
        </div>

        <div className="p-field p-grid" style={{ marginBottom: '1rem' }}>
          <label htmlFor="priority" className="p-col-12 p-md-2">Priority</label>
          <div className="p-col-12 p-md-10">
            <InputNumber
              id="priority"
              value={ruleData.priority}
              onValueChange={(e) => updateRuleField('priority', e.value)}
              min={1}
              showButtons
            />
            <small>Lower values = higher priority</small>
          </div>
        </div>

        <div className="p-field p-grid" style={{ marginBottom: '1rem' }}>
          <label htmlFor="syntax" className="p-col-12 p-md-2">Syntax</label>
          <div className="p-col-12 p-md-10">
            <InputText
              id="syntax"
              value={ruleData.syntax}
              onChange={(e) => updateRuleField('syntax', e.target.value)}
              placeholder="e.g., Ms'Trees, cover 10-100%'"
            />
          </div>
        </div>

        <div className="p-field p-grid" style={{ marginBottom: '1rem' }}>
          <label htmlFor="description" className="p-col-12 p-md-2">Description</label>
          <div className="p-col-12 p-md-10">
            <InputTextarea
              id="description"
              value={ruleData.description || ''}
              onChange={(e) => updateRuleField('description', e.target.value)}
              placeholder="Describe what this rule identifies"
              rows={3}
            />
          </div>
        </div>

        <div className="p-field p-grid">
          <label htmlFor="notes" className="p-col-12 p-md-2">Notes</label>
          <div className="p-col-12 p-md-10">
            <InputTextarea
              id="notes"
              value={ruleData.metadata?.notes || ''}
              onChange={(e) => setRuleData(prev => ({
                ...prev,
                metadata: { ...prev.metadata, notes: e.target.value }
              }))}
              placeholder="Internal notes (optional)"
              rows={2}
            />
          </div>
        </div>
      </Panel>
    </div>
  );

  const renderClassAssignment = () => (
    <div className="p-fluid">
      <Panel header="Target Class Assignment" style={{ marginBottom: '1rem' }}>
        <Message 
          severity="info" 
          text="This rule will assign matches to the following class"
          style={{ marginBottom: '1rem' }}
        />

        {availableClasses.length > 0 ? (
          // Dropdown selection mode when classes are available
          <div>
            <div className="p-field p-grid" style={{ marginBottom: '1rem' }}>
              <label htmlFor="classSelection" className="p-col-12 p-md-2">Select Class *</label>
              <div className="p-col-12 p-md-10">
                <Dropdown
                  id="classSelection"
                  value={ruleData.assignment.class_id || null}
                  options={availableClasses.map(cls => ({
                    label: `${cls.class_id} - ${cls.class_name} (${cls.class_map_code})`,
                    value: cls.class_id,
                    class: cls
                  }))}
                  onChange={(e) => {
                    const selectedClass = availableClasses.find(c => c.class_id === e.value);
                    if (selectedClass) {
                      setRuleData(prev => ({
                        ...prev,
                        assignment: {
                          class_id: selectedClass.class_id,
                          class_name: selectedClass.class_name,
                          class_map_code: selectedClass.class_map_code,
                          class_description: selectedClass.class_description || ''
                        }
                      }));
                    }
                  }}
                  placeholder="Select a class..."
                  disabled={!!targetClass}
                  filter
                  showClear
                />
              </div>
            </div>

            {ruleData.assignment.class_id > 0 && (
              <div>
                <Divider />
                <div style={{ padding: '0.5rem', background: 'var(--surface-100)', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Selected Class Details:</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>ID:</strong> {ruleData.assignment.class_id}</p>
                  <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {ruleData.assignment.class_name}</p>                  
                  <p style={{ margin: '0.25rem 0' }}><strong>Map Code:</strong> {ruleData.assignment.class_map_code}</p>
                  {ruleData.assignment.class_description && <p style={{ margin: '0.25rem 0' }}><strong>Description:</strong> {ruleData.assignment.class_description}</p>}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Manual entry mode when no classes available
          <div>
            <Message 
              severity="warn" 
              text="No classes defined in plugin. Please add classes in Plugin Manager first, or enter manually below."
              style={{ marginBottom: '1rem' }}
            />

            <div className="p-field p-grid" style={{ marginBottom: '1rem' }}>
              <label htmlFor="classId" className="p-col-12 p-md-2">Class ID *</label>
              <div className="p-col-12 p-md-10">
                <InputNumber
                  id="classId"
                  value={ruleData.assignment.class_id}
                  onValueChange={(e) => updateAssignment('class_id', e.value)}
                  min={1}
                  disabled={!!targetClass}
                />
              </div>
            </div>

            <div className="p-field p-grid" style={{ marginBottom: '1rem' }}>
              <label htmlFor="className" className="p-col-12 p-md-2">Class Name *</label>
              <div className="p-col-12 p-md-10">
                <InputText
                  id="className"
                  value={ruleData.assignment.class_name}
                  onChange={(e) => updateAssignment('class_name', e.target.value)}
                  disabled={!!targetClass}
                />
              </div>
            </div>

            <div className="p-field p-grid" style={{ marginBottom: '1rem' }}>
              <label htmlFor="classMapCode" className="p-col-12 p-md-2">Map Code *</label>
              <div className="p-col-12 p-md-10">
                <InputText
                  id="classMapCode"
                  value={ruleData.assignment.class_map_code}
                  onChange={(e) => updateAssignment('class_map_code', e.target.value)}
                  disabled={!!targetClass}
                />
              </div>
            </div>

            <div className="p-field p-grid" style={{ marginBottom: '1rem' }}>
              <label htmlFor="classDescription" className="p-col-12 p-md-2">Description</label>
              <div className="p-col-12 p-md-10">
                <InputTextarea
                  id="classDescription"
                  value={ruleData.assignment.class_description || ''}
                  onChange={(e) => updateAssignment('class_description', e.target.value)}
                  disabled={!!targetClass}
                  placeholder="Class description"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        {targetClass && (
          <Message 
            severity="warn" 
            text="Class assignment is locked because this rule is created for a specific class"
            style={{ marginTop: '1rem' }}
          />
        )}
      </Panel>
    </div>
  );

  const renderStructuralRules = () => {
    return (
      <div>
        <Message 
          severity="info" 
          text="Structural rules define conditions for Classes, Class Characteristics, Horizontal Patterns, and Strata that must be present or absent in the appointed legend"
          style={{ marginBottom: '1rem', width: '100%' }}
        />

        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <SelectButton 
            value={rulesetType} 
            onChange={(e) => setRulesetType(e.value)}
            options={[
              { label: 'Inclusive Rules', value: 'inclusive' },
              { label: 'Exclusive Rules', value: 'exclusive' }
            ]}
          />
          <small style={{ color: 'var(--text-color-secondary)' }}>
            {rulesetType === 'inclusive' 
              ? 'Structural elements that MUST be present for a match'
              : 'Structural elements that MUST NOT be present for a match'}
          </small>
        </div>

        <Accordion multiple>
          {/* Classes Structural Rule */}
          <AccordionTab header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="pi pi-tags" />
              <span>Class Rules</span>
            </div>
          }>
            {renderStructuralRuleSection(ruleData[rulesetType].classes, 'classes')}
          </AccordionTab>

          {/* Class Characteristics Structural Rule */}
          <AccordionTab header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="pi pi-sliders-h" />
              <span>Class Characteristics Rules</span>
            </div>
          }>
            {renderStructuralRuleSection(ruleData[rulesetType].classCharacteristics, 'classCharacteristics')}
          </AccordionTab>

          {/* Horizontal Patterns Structural Rule */}
          <AccordionTab header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="pi pi-table" />
              <span>Horizontal Pattern Rules</span>
            </div>
          }>
            {renderStructuralRuleSection(ruleData[rulesetType].horizontalPatterns, 'horizontalPatterns')}
          </AccordionTab>

          {/* Strata Structural Rule */}
          <AccordionTab header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="pi pi-list" />
              <span>Stratum Rules</span>
            </div>
          }>
            {renderStructuralRuleSection(ruleData[rulesetType].strata, 'strata')}
          </AccordionTab>
        </Accordion>
      </div>
    );
  };

  const renderStructuralRuleSection = (structuralRule: StructuralRule, type: 'classes' | 'classCharacteristics' | 'horizontalPatterns' | 'strata') => {
    // Get elements based on type
    let elements: any[] = [];
    let elementLabel = '';
    let idField: { element_name: string; element_label: string } | null = null;
    
    // Get elements for the current structural type
    if (type === 'classes') {
      elements = getClassElements();
      elementLabel = 'Class Field';
      //idField = { element_name: 'class_id', element_label: 'Class ID' };
    } else if (type === 'classCharacteristics') {
      elements = getClassCharacteristicsElements();
      elementLabel = 'Class Characteristic Field';
      // No ID field for class characteristics
    } else if (type === 'horizontalPatterns') {
      elements = getHorizontalPatternElements();
      elementLabel = 'Horizontal Pattern Field';
      idField = { element_name: 'horizontal_pattern_id', element_label: 'Horizontal Pattern ID' };
    } else {
      elements = getStrataElements();
      elementLabel = 'Stratum Field';
      idField = { element_name: 'stratumID', element_label: 'Stratum ID' };
    }

    // Special aggregation rules with property selection
    // Format: "aggregationType:propertyName" (e.g., "sum:class_id", "average:cover")
    const aggregationTypes = [
      { name: 'distinct', label: 'Count of ' },      
      { name: 'min', label: 'Minimum ' },
      { name: 'max', label: 'Maximum ' },
      { name: 'average', label: 'Average of ' },
      { name: 'sum', label: 'Sum of ' }
    ];

    // Build special property options: aggregation + available properties
    const specialProperties: any[] = [];
    
    // Add ID field for aggregations if available
    if (idField) {
      aggregationTypes.forEach(agg => {
        specialProperties.push({
          element_name: `${agg.name}:${idField.element_name}`,
          element_label: `${agg.label} of ${idField.element_label}`
        });
      });
    }
    
    // Add numeric elements for aggregations (for average, min, max)
    elements.forEach((el: any) => {
      if (el.element_type === 'Number' || el.element_type === 'Range') {
        ['distinct',  'min', 'max','average', 'sum' ].forEach(aggType => {
          const aggLabel = aggregationTypes.find(a => a.name === aggType)?.label || aggType;
          specialProperties.push({
            element_name: `${aggType}:${el.element_name}`,
            element_label: `${aggLabel} ${el.element_label || el.element_name}`
          });
        });
      }
    });

    // Combine special properties with regular elements
    const allPropertyOptions = [
      ...specialProperties.map(sp => ({ label: sp.element_label, value: sp.element_name })),
      //...elements.map((el: any) => ({ label: el.element_label || el.element_name, value: el.element_name }))
    ];

    // Just regular elements for characteristics (no special properties)
    const characteristicOptions = [
      ...(idField ? [{ label: idField.element_label, value: idField.element_name }] : []),
      ...elements.map((el: any) => ({ label: el.element_label || el.element_name, value: el.element_name }))
    ];

    return (
      <div className="p-fluid">
        <div className="p-field" style={{ marginBottom: '1rem' }}>
          <label>Rule Name</label>
          <InputText
            value={structuralRule.name}
            onChange={(e) => {
              const newData = { ...ruleData };
              newData[rulesetType][type].name = e.target.value;
              setRuleData(newData);
            }}
          />
        </div>

        <div className="p-field" style={{ marginBottom: '1rem' }}>
          <label>Priority</label>
          <InputNumber
            value={structuralRule.priority}
            onValueChange={(e) => {
              const newData = { ...ruleData };
              newData[rulesetType][type].priority = e.value || 1;
              setRuleData(newData);
            }}
            min={1}
            showButtons
          />
        </div>

        <Divider />

        {/* Property Rules */}
        <Panel header="Property Conditions" toggleable collapsed>
          {allPropertyOptions.length === 0 ? (
            <Message 
              severity="warn" 
              text={`No ${elementLabel} elements loaded from LC_Legend.json`}
            />
          ) : (
            <>
              <Message 
                severity="info" 
                text="Property conditions include aggregation rules (sum, average, min, max, count distinct) that can be applied to any numeric field, plus regular field checks"
                style={{ marginBottom: '1rem' }}
              />
              <div style={{ marginBottom: '1rem' }}>
                <strong>AND Conditions (All must match):</strong>
                <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <Dropdown
                    options={allPropertyOptions}
                    placeholder={`Add AND condition for ${elementLabel}...`}
                    onChange={(e) => {
                      const cond = createDefaultCondition();
                      cond.object = e.value;
                      openConditionDialog({
                        type: 'structural',
                        rulesetType,
                        structuralType: type,
                        conditionType: 'properties',
                        logicType: 'and'
                      }, cond);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                {structuralRule.rules.properties.and.map((cond, condIndex) => (
                  <div key={condIndex} style={{ 
                    padding: '0.5rem', 
                    border: '1px solid #ccc', 
                    marginTop: '0.25rem',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{`${cond.object} ${cond.mode} [${cond.lower_bound}, ${cond.upper_bound}]`}</span>
                    <Button 
                      icon="pi pi-trash" 
                      className="p-button-rounded p-button-text p-button-danger p-button-sm"
                      onClick={() => {
                        const newData = { ...ruleData };
                        newData[rulesetType][type].rules.properties.and.splice(condIndex, 1);
                        setRuleData(newData);
                      }}
                    />
                  </div>
                ))}
              </div>

              <Divider />

              <div style={{ marginTop: '0.5rem' }}>
                <strong>OR Conditions (At least one must match):</strong>
                <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <Dropdown
                    options={allPropertyOptions}
                    placeholder={`Add OR condition for ${elementLabel}...`}
                    onChange={(e) => {
                      const cond = createDefaultCondition();
                      cond.object = e.value;
                      openConditionDialog({
                        type: 'structural',
                        rulesetType,
                        structuralType: type,
                        conditionType: 'properties',
                        logicType: 'or'
                      }, cond);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                {renderOrConditions(structuralRule.rules.properties.or, (groupIndex, condIndex) => {
                  const newData = { ...ruleData };
                  const group = newData[rulesetType][type].rules.properties.or[groupIndex];
                  const fieldName = Object.keys(group)[0];
                  group[fieldName].splice(condIndex, 1);
                  // Remove the group if it's empty
                  if (group[fieldName].length === 0) {
                    newData[rulesetType][type].rules.properties.or.splice(groupIndex, 1);
                  }
                  setRuleData(newData);
                })}
              </div>
            </>
          )}
        </Panel>

        <Divider />

        {/* Characteristic Rules */}
        <Panel header="Characteristic Conditions" toggleable collapsed>
          {characteristicOptions.length === 0 ? (
            <Message 
              severity="warn" 
              text={`No ${elementLabel} elements loaded from LC_Legend.json`}
            />
          ) : (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <strong>AND Conditions (All must match):</strong>
                <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <Dropdown
                    options={characteristicOptions}
                    placeholder={`Add AND condition for ${elementLabel}...`}
                    onChange={(e) => {
                      const cond = createDefaultCondition();
                      cond.object = e.value;
                      openConditionDialog({
                        type: 'structural',
                        rulesetType,
                        structuralType: type,
                        conditionType: 'characteristics',
                        logicType: 'and'
                      }, cond);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                {structuralRule.rules.characteristics.and.map((cond, condIndex) => (
                  <div key={condIndex} style={{ 
                    padding: '0.5rem', 
                    border: '1px solid #ccc', 
                    marginTop: '0.25rem',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{`${cond.object} ${cond.mode} [${cond.lower_bound}, ${cond.upper_bound}]`}</span>
                    <Button 
                      icon="pi pi-trash" 
                      className="p-button-rounded p-button-text p-button-danger p-button-sm"
                      onClick={() => {
                        const newData = { ...ruleData };
                        newData[rulesetType][type].rules.characteristics.and.splice(condIndex, 1);
                        setRuleData(newData);
                      }}
                    />
                  </div>
                ))}
              </div>

              <Divider />

              <div style={{ marginTop: '0.5rem' }}>
                <strong>OR Conditions (At least one must match):</strong>
                <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <Dropdown
                    options={characteristicOptions}
                    placeholder={`Add OR condition for ${elementLabel}...`}
                    onChange={(e) => {
                      const cond = createDefaultCondition();
                      cond.object = e.value;
                      openConditionDialog({
                        type: 'structural',
                        rulesetType,
                        structuralType: type,
                        conditionType: 'characteristics',
                        logicType: 'or'
                      }, cond);
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                {renderOrConditions(structuralRule.rules.characteristics.or, (groupIndex, condIndex) => {
                  const newData = { ...ruleData };
                  const group = newData[rulesetType][type].rules.characteristics.or[groupIndex];
                  const fieldName = Object.keys(group)[0];
                  group[fieldName].splice(condIndex, 1);
                  // Remove the group if it's empty
                  if (group[fieldName].length === 0) {
                    newData[rulesetType][type].rules.characteristics.or.splice(groupIndex, 1);
                  }
                  setRuleData(newData);
                })}
              </div>
            </>
          )}
        </Panel>
      </div>
    );
  };

  const renderElementRules = () => {
    const currentRuleset = ruleData[rulesetType];
    
    return (
      <div>
        <Panel header="Ruleset Type" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <SelectButton 
              value={rulesetType} 
              onChange={(e) => setRulesetType(e.value)}
              options={[
                { label: 'Inclusive Rules', value: 'inclusive' },
                { label: 'Exclusive Rules', value: 'exclusive' }
              ]}
            />
            <small style={{ color: 'var(--text-color-secondary)' }}>
              {rulesetType === 'inclusive' 
                ? 'Elements that MUST be present for a match'
                : 'Elements that MUST NOT be present for a match'}
            </small>
          </div>
        </Panel>

        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <Button 
            label="Add Element" 
            icon="pi pi-plus" 
            onClick={() => setShowBlockSelector(true)}
            className="p-button-success"
          />
          {blocks.length === 0 && (
            <Message 
              severity="warn" 
              text="No blocks loaded. Please ensure blocks are properly loaded from LC_Blocks.json"
            />
          )}
        </div>

        {currentRuleset.elements.length === 0 ? (
          <Message 
            severity="info" 
            text={`No ${rulesetType} elements defined. Click "Add Element" to begin.`}
          />
        ) : (
          <Accordion multiple>
            {currentRuleset.elements.map((element, elementIndex) => {
              const block = blocks.find(b => b.block_id === element.element);
              return (
                <AccordionTab 
                  key={elementIndex} 
                  header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span>
                        <i className={block?.block_icon || 'pi pi-box'} style={{ marginRight: '0.5rem' }} />
                        {block ? `${block.block_label} (ID: ${block.block_id})` : `Element ${element.element}`}
                      </span>
                      <Button 
                        icon="pi pi-trash" 
                        className="p-button-rounded p-button-text p-button-danger p-button-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeElement(elementIndex, rulesetType);
                        }}
                        tooltip="Remove Element"
                      />
                    </div>
                  }
                >
                  {renderElementContent(element, elementIndex, block)}
                </AccordionTab>
              );
            })}
          </Accordion>
        )}

        {/* Block Selector Dialog */}
        <Dialog
          header="Select Block"
          visible={showBlockSelector}
          style={{ width: '50vw' }}
          onHide={() => setShowBlockSelector(false)}
        >
          <div className="p-fluid">
            <Message 
              severity="info" 
              text="Select a block to add to the rule. Blocks define the structural elements being classified."
              style={{ marginBottom: '1rem' }}
            />
            <DataTable
              value={getBlockOptions()}
              selectionMode="single"
              onRowSelect={(e) => addElement(e.data.value, rulesetType)}
              paginator
              rows={10}
              emptyMessage="No blocks available"
            >
              {/*<Column field="value" header="Block ID" sortable />*/}
              <Column field="label" header="Block Name" sortable filter />
            </DataTable>
          </div>
        </Dialog>
      </div>
    );
  };

  const renderElementContent = (element: ElementRule, elementIndex: number, block: any) => {
    return (
      <div>
        {/* Element Info */}
        <Panel header="Element Information" style={{ marginBottom: '1rem' }}>
          <p><strong>Block:</strong> {block?.block_label || block?.block_name || 'Unknown'}</p>
          <p><strong>Description:</strong> {block?.block_description || 'N/A'}</p>
          <p><strong>Priority:</strong> 
            <InputNumber
              value={element.priority}
              onValueChange={(e) => updateElement(elementIndex, 'priority', e.value, rulesetType)}
              min={1}
              showButtons
              style={{ width: '120px', marginLeft: '1rem' }}
            />
          </p>
        </Panel>

        {/* Property Rules */}
        <Panel header="Property Rules" style={{ marginBottom: '1rem' }} toggleable>
          <div style={{ marginBottom: '1rem' }}>
            <Button 
              label="Add Property Rule" 
              icon="pi pi-plus" 
              onClick={() => addPropertyRule(elementIndex, rulesetType)}
              className="p-button-sm p-button-success"
            />
          </div>

          {element.ruleDefinition.properties.length === 0 ? (
            <Message severity="info" text="No property rules defined" />
          ) : (
            element.ruleDefinition.properties.map((propRule, propIndex) => 
              renderPropertyRule(propRule, propIndex, elementIndex, block)
            )
          )}
        </Panel>

        {/* Characteristic Rules */}
        <Panel header="Characteristic Rules" style={{ marginBottom: '1rem' }} toggleable>
          <div style={{ marginBottom: '1rem' }}>
            <Button 
              label="Add Characteristic Rule" 
              icon="pi pi-plus" 
              onClick={() => {
                setSelectedElement(elementIndex);
                setShowCharacteristicSelector(true);
              }}
              className="p-button-sm p-button-success"
            />
            {characteristics.length === 0 && (
              <Message 
                severity="warn" 
                text="No characteristics loaded. Please ensure characteristics are properly loaded from LC_Characteristics.json"
                style={{ marginTop: '0.5rem' }}
              />
            )}
          </div>

          {element.ruleDefinition.characteristics.length === 0 ? (
            <Message severity="info" text="No characteristic rules defined" />
          ) : (
            element.ruleDefinition.characteristics.map((charRule, charIndex) => 
              renderCharacteristicRule(charRule, charIndex, elementIndex)
            )
          )}
        </Panel>

        {/* Characteristic Selector Dialog */}
        <Dialog
          header="Select Characteristic"
          visible={showCharacteristicSelector && selectedElement === elementIndex}
          style={{ width: '50vw' }}
          onHide={() => {
            setShowCharacteristicSelector(false);
            setSelectedElement(null);
          }}
        >
          <div className="p-fluid">
            <Message 
              severity="info" 
              text="Select a characteristic to add to this element. Characteristics define specific attributes for classification."
              style={{ marginBottom: '1rem' }}
            />
            <DataTable
              value={getCharacteristicOptions(element.element)}
              selectionMode="single"
              onRowSelect={(e) => addCharacteristicRule(elementIndex, e.data.value, rulesetType)}
              emptyMessage="No characteristics available for this element"
            >
              <Column field="value" header="Characteristic ID" sortable />
              <Column field="label" header="Characteristic Name" sortable />
            </DataTable>
          </div>
        </Dialog>
      </div>
    );
  };

  const renderPropertyRule = (propRule: PropertyRuleDef, propIndex: number, elementIndex: number, block: any) => {
    const blockElements = getBlockElements(ruleData[rulesetType].elements[elementIndex].element);
    
    return (
      <Panel 
        key={propIndex} 
        header={propRule.name || `Property Rule ${propIndex + 1}`} 
        style={{ marginBottom: '0.5rem' }}
        toggleable
      >
        <div className="p-fluid">
          <InputText
            placeholder="Rule Name"
            value={propRule.name}
            onChange={(e) => {
              const newData = { ...ruleData };
              newData[rulesetType].elements[elementIndex].ruleDefinition.properties[propIndex].name = e.target.value;
              setRuleData(newData);
            }}
            style={{ marginBottom: '0.5rem' }}
          />

          <Divider />

          {/* AND Conditions */}
          <div style={{ marginTop: '0.5rem' }}>
            <strong>AND Conditions (All must match):</strong>
            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <Dropdown
                options={blockElements.map((el: any) => ({
                  label: el.element_label || el.element_name,
                  value: el.element_name
                }))}
                placeholder="Add AND condition for..."
                onChange={(e) => {
                  const cond = createDefaultCondition();
                  cond.object = e.value;
                  openConditionDialog({
                    type: 'property',
                    rulesetType,
                    elementIndex,
                    ruleType: 'property',
                    ruleIndex: propIndex,
                    conditionType: 'properties',
                    logicType: 'and'
                  }, cond);
                }}
                style={{ width: '100%' }}
              />
            </div>

            {propRule.rules.properties.and.map((cond, condIndex) => (
              <div key={condIndex} style={{ 
                padding: '0.5rem', 
                border: '1px solid #ccc', 
                marginTop: '0.25rem',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{`${cond.object} ${cond.mode} [${cond.lower_bound}, ${cond.upper_bound}]`}</span>
                <Button 
                  icon="pi pi-trash" 
                  className="p-button-rounded p-button-text p-button-danger p-button-sm"
                  onClick={() => {
                    const newData = { ...ruleData };
                    newData[rulesetType].elements[elementIndex].ruleDefinition.properties[propIndex].rules.properties.and.splice(condIndex, 1);
                    setRuleData(newData);
                  }}
                />
              </div>
            ))}
          </div>

          <Divider />

          {/* OR Conditions */}
          <div style={{ marginTop: '0.5rem' }}>
            <strong>OR Conditions (At least one must match):</strong>
            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <Dropdown
                options={blockElements.map((el: any) => ({
                  label: el.element_label || el.element_name,
                  value: el.element_name
                }))}
                placeholder="Add OR condition for..."
                onChange={(e) => {
                  const cond = createDefaultCondition();
                  cond.object = e.value;
                  openConditionDialog({
                    type: 'property',
                    rulesetType,
                    elementIndex,
                    ruleType: 'property',
                    ruleIndex: propIndex,
                    conditionType: 'properties',
                    logicType: 'or'
                  }, cond);
                }}
                style={{ width: '100%' }}
              />
            </div>

            {renderOrConditions(propRule.rules.properties.or, (groupIndex, condIndex) => {
              const newData = { ...ruleData };
              const group = newData[rulesetType].elements[elementIndex].ruleDefinition.properties[propIndex].rules.properties.or[groupIndex];
              const fieldName = Object.keys(group)[0];
              group[fieldName].splice(condIndex, 1);
              // Remove the group if it's empty
              if (group[fieldName].length === 0) {
                newData[rulesetType].elements[elementIndex].ruleDefinition.properties[propIndex].rules.properties.or.splice(groupIndex, 1);
              }
              setRuleData(newData);
            })}
          </div>
        </div>
      </Panel>
    );
  };

  const renderCharacteristicRule = (charRule: CharacteristicRuleDef, charIndex: number, elementIndex: number) => {
    const characteristic = characteristics.find(c => c.characteristic_id === charRule.characteristicID);
    const charElements = getCharacteristicElements(charRule.characteristicID);
    
    return (
      <Panel 
        key={charIndex} 
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span>
              <i className={characteristic?.characteristic_icon || 'pi pi-tag'} style={{ marginRight: '0.5rem' }} />
              {charRule.name || characteristic?.characteristic_label || `Characteristic Rule ${charIndex + 1}`}
            </span>
          </div>
        }
        style={{ marginBottom: '0.5rem' }}
        toggleable
      >
        <div className="p-fluid">
          <InputText
            placeholder="Rule Name"
            value={charRule.name}
            onChange={(e) => {
              const newData = { ...ruleData };
              newData[rulesetType].elements[elementIndex].ruleDefinition.characteristics[charIndex].name = e.target.value;
              setRuleData(newData);
            }}
            style={{ marginBottom: '0.5rem' }}
          />

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Characteristic ID: {charRule.characteristicID}</label>
            {characteristic && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                {characteristic.characteristic_description}
              </p>
            )}
          </div>

          <Divider />

          {/* AND Conditions */}
          <div style={{ marginTop: '0.5rem' }}>
            <strong>AND Conditions (All must match):</strong>
            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <Dropdown
                options={charElements.map((el: any) => ({
                  label: el.element_label || el.element_name,
                  value: el.element_name
                }))}
                placeholder="Add AND condition for..."
                onChange={(e) => {
                  const cond = createDefaultCondition();
                  cond.object = e.value;
                  openConditionDialog({
                    type: 'characteristic',
                    rulesetType,
                    elementIndex,
                    ruleType: 'characteristic',
                    ruleIndex: charIndex,
                    conditionType: 'characteristics',
                    logicType: 'and'
                  }, cond);
                }}
                style={{ width: '100%' }}
              />
            </div>

            {charRule.rules.characteristics.and.map((cond, condIndex) => (
              <div key={condIndex} style={{ 
                padding: '0.5rem', 
                border: '1px solid #ccc', 
                marginTop: '0.25rem',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{`${cond.object} ${cond.mode} [${cond.lower_bound}, ${cond.upper_bound}]`}</span>
                <Button 
                  icon="pi pi-trash" 
                  className="p-button-rounded p-button-text p-button-danger p-button-sm"
                  onClick={() => {
                    const newData = { ...ruleData };
                    newData[rulesetType].elements[elementIndex].ruleDefinition.characteristics[charIndex].rules.characteristics.and.splice(condIndex, 1);
                    setRuleData(newData);
                  }}
                />
              </div>
            ))}
          </div>

          <Divider />

          {/* OR Conditions */}
          <div style={{ marginTop: '0.5rem' }}>
            <strong>OR Conditions (At least one must match):</strong>
            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <Dropdown
                options={charElements.map((el: any) => ({
                  label: el.element_label || el.element_name,
                  value: el.element_name
                }))}
                placeholder="Add OR condition for..."
                onChange={(e) => {
                  const cond = createDefaultCondition();
                  cond.object = e.value;
                  openConditionDialog({
                    type: 'characteristic',
                    rulesetType,
                    elementIndex,
                    ruleType: 'characteristic',
                    ruleIndex: charIndex,
                    conditionType: 'characteristics',
                    logicType: 'or'
                  }, cond);
                }}
                style={{ width: '100%' }}
              />
            </div>

            {renderOrConditions(charRule.rules.characteristics.or, (groupIndex, condIndex) => {
              const newData = { ...ruleData };
              const group = newData[rulesetType].elements[elementIndex].ruleDefinition.characteristics[charIndex].rules.characteristics.or[groupIndex];
              const fieldName = Object.keys(group)[0];
              group[fieldName].splice(condIndex, 1);
              // Remove the group if it's empty
              if (group[fieldName].length === 0) {
                newData[rulesetType].elements[elementIndex].ruleDefinition.characteristics[charIndex].rules.characteristics.or.splice(groupIndex, 1);
              }
              setRuleData(newData);
            })}
          </div>
        </div>
      </Panel>
    );
  };

  const renderConditionDialog = () => (
    <Dialog
      header="Edit Condition"
      visible={showConditionDialog}
      style={{ width: '50vw' }}
      onHide={() => setShowConditionDialog(false)}
      footer={
        <div>
          <Button label="Cancel" icon="pi pi-times" onClick={() => setShowConditionDialog(false)} className="p-button-text" />
          <Button label="Save" icon="pi pi-check" onClick={saveCondition} />
        </div>
      }
    >
      {currentCondition && (
        <div className="p-fluid">
          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Field</label>
            <InputText
              value={currentCondition.object}
              onChange={(e) => setCurrentCondition({ ...currentCondition, object: e.target.value })}
              disabled
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Comparison Mode</label>
            <Dropdown
              value={currentCondition.mode}
              options={comparisonModes.map(m => ({ label: m, value: m }))}
              onChange={(e) => setCurrentCondition({ ...currentCondition, mode: e.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Lower Bound</label>
            <InputText
              value={String(currentCondition.lower_bound)}
              onChange={(e) => setCurrentCondition({ ...currentCondition, lower_bound: e.target.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Upper Bound</label>
            <InputText
              value={String(currentCondition.upper_bound)}
              onChange={(e) => setCurrentCondition({ ...currentCondition, upper_bound: e.target.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Lower Tolerance</label>
            <InputText
              value={String(currentCondition.lower_tolerance)}
              onChange={(e) => setCurrentCondition({ ...currentCondition, lower_tolerance: e.target.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Upper Tolerance</label>
            <InputText
              value={String(currentCondition.upper_tolerance)}
              onChange={(e) => setCurrentCondition({ ...currentCondition, upper_tolerance: e.target.value })}
            />
          </div>
        </div>
      )}
    </Dialog>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="rule-builder" style={{ padding: '1rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>{rule ? 'Edit Rule' : 'Create New Rule'}</h2>
          {targetClass && (
            <p style={{ color: 'var(--text-color-secondary)', margin: '0.25rem 0 0 0' }}>
              For class: {targetClass.class_name}
            </p>
          )}
        </div>
        <div>
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            onClick={onCancel} 
            className="p-button-text"
            style={{ marginRight: '0.5rem' }}
          />
          <Button 
            label="Save Rule" 
            icon="pi pi-check" 
            onClick={handleSave}
            className="p-button-success"
          />
        </div>
      </div>

      <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
        <TabPanel header="Basic Information" leftIcon="pi pi-info-circle">
          {renderBasicInfo()}
        </TabPanel>

        <TabPanel header="Class Assignment" leftIcon="pi pi-tag">
          {renderClassAssignment()}
        </TabPanel>

        <TabPanel header="Structural Rules" leftIcon="pi pi-sitemap">
          {renderStructuralRules()}
        </TabPanel>

        <TabPanel header="Element Rules" leftIcon="pi pi-box">
          {renderElementRules()}
        </TabPanel>

        <TabPanel header="Preview" leftIcon="pi pi-eye">
          <pre style={{ background: '#f4f4f4', padding: '1rem', overflow: 'auto', maxHeight: '600px', borderRadius: '4px' }}>
            {JSON.stringify(ruleData, null, 2)}
          </pre>
        </TabPanel>
      </TabView>

      {renderConditionDialog()}
    </div>
  );
};

export default RuleBuilder;