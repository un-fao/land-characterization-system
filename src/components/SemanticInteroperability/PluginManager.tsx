// ============================================================================
// PLUGIN MANAGER COMPONENT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Panel } from 'primereact/panel';
import { Toolbar } from 'primereact/toolbar';
import { FileUpload } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Chip } from 'primereact/chip';
import { RuleBuilder } from './RuleBuilder';
import { 
  RuleSet, 
  RuleSetMetadata, 
  LegendRule, 
  ReferenceClass,
  ReferenceLegendPlugin 
} from './semantic-types';
import { LegendRegistry } from './LegendRegistry';

interface PluginManagerProps {
  registry: LegendRegistry;
  legend?: any;
  blocks?: any[];
  blockLookUp?: any[];
  characteristics?: any[];
  characteristicLookUp?: any[];
  onClose?: () => void;
}

export const PluginManager: React.FC<PluginManagerProps> = ({ 
  registry, 
  legend = null,
  blocks = [],
  blockLookUp = [], 
  characteristics = [],
  characteristicLookUp = [],
  onClose 
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [plugins, setPlugins] = useState<ReferenceLegendPlugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<ReferenceLegendPlugin | null>(null);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<LegendRule | null>(null);
  const [metadataForm, setMetadataForm] = useState<RuleSetMetadata | null>(null);
  const [classForm, setClassForm] = useState<ReferenceClass | null>(null);
  const [newPlugin, setNewPlugin] = useState<ReferenceLegendPlugin | null>(null);
  const [legendData, setLegendData] = useState<any>(legend);
  const toast = React.useRef<Toast>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    refreshPlugins();
    //loadLegendData();
  }, [registry]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const refreshPlugins = () => {
    setPlugins(registry.getAll());
  };

  const createNewPlugin = () => {
    const newMetadata: RuleSetMetadata = {
      id: `plugin_${Date.now()}`,
      name: '',
      fullName: '',
      version: '1.0.0',
      author: '',
      organization: '',
      description: '',
      url: '',
      citation: '',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      tags: []
    };

    const plugin: ReferenceLegendPlugin = {
      metadata: newMetadata,
      ruleSet: {
        metadata: newMetadata,
        rules: [],
        classes: [],
        validation: {
          version: '1.0',
          requiredElements: [],
          requiredCharacteristics: [],
          validPresenceTypes: ['Fixed', 'Mandatory', 'Optional'],
          coverageRules: {
            min: 0,
            max: 100
          }
        }
      }
    };

    setNewPlugin(plugin);
    setMetadataForm(newMetadata);
    setShowMetadataDialog(true);
  };

  const editPluginMetadata = (plugin: ReferenceLegendPlugin) => {
    setSelectedPlugin(plugin);
    setMetadataForm({ ...plugin.metadata });
    setShowMetadataDialog(true);
  };

  const saveMetadata = () => {
    if (!metadataForm) return;

    const plugin = newPlugin || selectedPlugin;
    if (!plugin) return;

    // Update both metadata locations
    plugin.metadata = metadataForm;
    plugin.ruleSet.metadata = metadataForm;

    if (newPlugin) {
      // Register new plugin
      try {
        registry.register(plugin);
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Plugin created successfully'
        });
        setSelectedPlugin(plugin);
      } catch (error: any) {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: error.message
        });
      }
      setNewPlugin(null);
    } else {
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Metadata updated successfully'
      });
    }

    refreshPlugins();
    setShowMetadataDialog(false);
    setMetadataForm(null);
  };

  const deletePlugin = (plugin: ReferenceLegendPlugin) => {
    confirmDialog({
      message: `Are you sure you want to delete plugin "${plugin.metadata.name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        registry.unregister(plugin.metadata.id);
        toast.current?.show({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Plugin deleted successfully'
        });
        if (selectedPlugin?.metadata.id === plugin.metadata.id) {
          setSelectedPlugin(null);
        }
        refreshPlugins();
      }
    });
  };

  const exportPlugin = (plugin: ReferenceLegendPlugin) => {
    const json = JSON.stringify(plugin, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${plugin.metadata.id}-plugin.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.current?.show({
      severity: 'success',
      summary: 'Exported',
      detail: 'Plugin exported successfully'
    });
  };

  const importPlugin = async (event: any) => {
    const file = event.files[0];
    if (!file) return;

    try {
      const plugin = await registry.loadFromFile(file);
      toast.current?.show({
        severity: 'success',
        summary: 'Imported',
        detail: `Plugin "${plugin.metadata.name}" imported successfully`
      });
      refreshPlugins();
    } catch (error: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Import Failed',
        detail: error.message
      });
    }
  };

  const addRule = () => {
    if (!selectedPlugin) {
      toast.current?.show({
        severity: 'warn',
        summary: 'No Plugin Selected',
        detail: 'Please select a plugin first'
      });
      return;
    }

    setEditingRule(null);
    setShowRuleBuilder(true);
  };

  const editRule = (rule: LegendRule) => {
    setEditingRule({ ...rule });
    setShowRuleBuilder(true);
  };

  const saveRule = (rule: LegendRule) => {
    if (!selectedPlugin) return;

    const existingIndex = selectedPlugin.ruleSet.rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      // Update existing rule
      selectedPlugin.ruleSet.rules[existingIndex] = rule;
      toast.current?.show({
        severity: 'success',
        summary: 'Updated',
        detail: 'Rule updated successfully'
      });
    } else {
      // Add new rule
      selectedPlugin.ruleSet.rules.push(rule);
      toast.current?.show({
        severity: 'success',
        summary: 'Added',
        detail: 'Rule added successfully'
      });
    }

    // Update plugin modified date
    selectedPlugin.metadata.updated = new Date().toISOString();
    selectedPlugin.ruleSet.metadata.updated = new Date().toISOString();

    setShowRuleBuilder(false);
    setEditingRule(null);
    refreshPlugins();
  };

  const deleteRule = (rule: LegendRule) => {
    if (!selectedPlugin) return;

    confirmDialog({
      message: `Are you sure you want to delete rule "${rule.name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        selectedPlugin.ruleSet.rules = selectedPlugin.ruleSet.rules.filter(r => r.id !== rule.id);
        selectedPlugin.metadata.updated = new Date().toISOString();
        toast.current?.show({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Rule deleted successfully'
        });
        refreshPlugins();
      }
    });
  };

  const addClass = () => {
    if (!selectedPlugin) return;

    const newClass: ReferenceClass = {
      class_id: selectedPlugin.ruleSet.classes.length + 1,
      class_name: '',
      class_map_code: '',
      class_description: ''
    };

    setClassForm(newClass);
    setShowClassDialog(true);
  };

  const saveClass = () => {
    if (!classForm || !selectedPlugin) return;

    // Validate required fields
    if (!classForm.class_name || !classForm.class_map_code) {
      toast.current?.show({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Class name and map code are required'
      });
      return;
    }

    // Check if editing existing or adding new
    const existingIndex = selectedPlugin.ruleSet.classes.findIndex(c => c.class_id === classForm.class_id);
    
    if (existingIndex >= 0) {
      selectedPlugin.ruleSet.classes[existingIndex] = classForm;
      toast.current?.show({
        severity: 'success',
        summary: 'Updated',
        detail: 'Class updated successfully'
      });
    } else {
      selectedPlugin.ruleSet.classes.push(classForm);
      toast.current?.show({
        severity: 'success',
        summary: 'Added',
        detail: 'Class added successfully'
      });
    }

    selectedPlugin.metadata.updated = new Date().toISOString();
    refreshPlugins();
    setShowClassDialog(false);
    setClassForm(null);
  };

  const editClass = (cls: ReferenceClass) => {
    setClassForm({ ...cls });
    setShowClassDialog(true);
  };

  const updateClass = (index: number, field: string, value: any) => {
    if (!selectedPlugin) return;

    selectedPlugin.ruleSet.classes[index] = {
      ...selectedPlugin.ruleSet.classes[index],
      [field]: value
    };
    refreshPlugins();
  };

  const deleteClass = (classId: number) => {
    if (!selectedPlugin) return;

    confirmDialog({
      message: 'Are you sure you want to delete this class?',
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        selectedPlugin.ruleSet.classes = selectedPlugin.ruleSet.classes.filter(
          c => c.class_id !== classId
        );
        toast.current?.show({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Class deleted successfully'
        });
        refreshPlugins();
      }
    });
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderPluginList = () => (
    <DataTable
      value={plugins}
      selection={selectedPlugin}
      onSelectionChange={(e) => setSelectedPlugin(e.value)}
      selectionMode="single"
      dataKey="metadata.id"
      emptyMessage="No plugins available"
      style={{ marginTop: '1rem' }}
    >
      <Column field="metadata.name" header="Name" sortable />
      <Column field="metadata.version" header="Version" sortable />
      <Column field="metadata.author" header="Author" sortable />
      <Column 
        field="ruleSet.rules.length" 
        header="Rules" 
        body={(plugin) => plugin.ruleSet.rules.length}
        sortable 
      />
      <Column 
        field="ruleSet.classes.length" 
        header="Classes" 
        body={(plugin) => plugin.ruleSet.classes.length}
        sortable 
      />
      <Column
        header="Actions"
        body={(plugin) => (
          <div>
            <Button
              icon="pi pi-pencil"
              className="p-button-rounded p-button-text"
              onClick={() => editPluginMetadata(plugin)}
              tooltip="Edit Metadata"
            />
            <Button
              icon="pi pi-download"
              className="p-button-rounded p-button-text"
              onClick={() => exportPlugin(plugin)}
              tooltip="Export"
            />
            <Button
              icon="pi pi-trash"
              className="p-button-rounded p-button-text p-button-danger"
              onClick={() => deletePlugin(plugin)}
              tooltip="Delete"
            />
          </div>
        )}
      />
    </DataTable>
  );

  const renderRuleList = () => {
    if (!selectedPlugin) {
      return (
        <Panel header="Rules" style={{ marginTop: '1rem' }}>
          <p>Select a plugin to view rules</p>
        </Panel>
      );
    }

    return (
      <Panel 
        header={`Rules - ${selectedPlugin.metadata.name}`}
        style={{ marginTop: '1rem' }}
      >
        <Button
          label="Add Rule"
          icon="pi pi-plus"
          onClick={addRule}
          style={{ marginBottom: '1rem' }}
          className="p-button-success"
        />

        <DataTable value={selectedPlugin.ruleSet.rules} emptyMessage="No rules defined">
          {/*<Column field="id" header="ID" sortable />*/}
          <Column field="name" header="Name" sortable />
          <Column field="priority" header="Priority" sortable />
          <Column field="assignment.class_name" header="Assigns To" sortable />
          <Column
            header="Elements"
            body={(rule) => rule.inclusive.elements.length}
          />
          <Column
            header="Actions"
            body={(rule) => (
              <div>
                <Button
                  icon="pi pi-pencil"
                  className="p-button-rounded p-button-text"
                  onClick={() => editRule(rule)}
                  tooltip="Edit"
                />
                <Button
                  icon="pi pi-trash"
                  className="p-button-rounded p-button-text p-button-danger"
                  onClick={() => deleteRule(rule)}
                  tooltip="Delete"
                />
              </div>
            )}
          />
        </DataTable>
      </Panel>
    );
  };

  const renderClassList = () => {
    if (!selectedPlugin) {
      return (
        <Panel header="Classes" style={{ marginTop: '1rem' }}>
          <p>Select a plugin to view classes</p>
        </Panel>
      );
    }

    return (
      <Panel 
        header={`Classes - ${selectedPlugin.metadata.name}`}
        style={{ marginTop: '1rem' }}
      >
        <Button
          label="Add Class"
          icon="pi pi-plus"
          onClick={addClass}
          style={{ marginBottom: '1rem' }}
          className="p-button-success"
        />

        <DataTable value={selectedPlugin.ruleSet.classes} emptyMessage="No classes defined">
          <Column field="class_id" header="ID" />
          <Column field="class_name" header="Name" />
          <Column field="class_map_code" header="Map Code" />
          <Column 
            field="class_description" 
            header="Description"
            body={(cls) => (
              <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cls.class_description || '-'}
              </div>
            )}
          />
          <Column
            header="Actions"
            body={(cls) => (
              <div>
                <Button
                  icon="pi pi-pencil"
                  className="p-button-rounded p-button-text p-button-info"
                  onClick={() => editClass(cls)}
                  tooltip="Edit"
                  style={{ marginRight: '0.25rem' }}
                />
                <Button
                  icon="pi pi-trash"
                  className="p-button-rounded p-button-text p-button-danger"
                  onClick={() => deleteClass(cls.class_id)}
                  tooltip="Delete"
                />
              </div>
            )}
          />
        </DataTable>
      </Panel>
    );
  };

  const renderMetadataDialog = () => (
    <Dialog
      header={newPlugin ? "Create New Plugin" : "Edit Plugin Metadata"}
      visible={showMetadataDialog}
      style={{ width: '50vw' }}
      onHide={() => {
        setShowMetadataDialog(false);
        setMetadataForm(null);
        setNewPlugin(null);
      }}
      footer={
        <div>
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            onClick={() => setShowMetadataDialog(false)} 
            className="p-button-text" 
          />
          <Button 
            label="Save" 
            icon="pi pi-check" 
            onClick={saveMetadata} 
          />
        </div>
      }
    >
      {metadataForm && (
        <div className="p-fluid">
          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>ID *</label>
            <InputText
              value={metadataForm.id}
              onChange={(e) => setMetadataForm({ ...metadataForm, id: e.target.value })}
              disabled={!newPlugin}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Name *</label>
            <InputText
              value={metadataForm.name}
              onChange={(e) => setMetadataForm({ ...metadataForm, name: e.target.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Full Name</label>
            <InputText
              value={metadataForm.fullName}
              onChange={(e) => setMetadataForm({ ...metadataForm, fullName: e.target.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Version</label>
            <InputText
              value={metadataForm.version}
              onChange={(e) => setMetadataForm({ ...metadataForm, version: e.target.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Author</label>
            <InputText
              value={metadataForm.author}
              onChange={(e) => setMetadataForm({ ...metadataForm, author: e.target.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Organization</label>
            <InputText
              value={metadataForm.organization || ''}
              onChange={(e) => setMetadataForm({ ...metadataForm, organization: e.target.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Description</label>
            <InputTextarea
              value={metadataForm.description}
              onChange={(e) => setMetadataForm({ ...metadataForm, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>URL</label>
            <InputText
              value={metadataForm.url || ''}
              onChange={(e) => setMetadataForm({ ...metadataForm, url: e.target.value })}
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Citation</label>
            <InputTextarea
              value={metadataForm.citation || ''}
              onChange={(e) => setMetadataForm({ ...metadataForm, citation: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      )}
    </Dialog>
  );

  const renderClassDialog = () => (
    <Dialog
      header={classForm && selectedPlugin?.ruleSet.classes.find(c => c.class_id === classForm.class_id) ? "Edit Class" : "Add New Class"}
      visible={showClassDialog}
      style={{ width: '50vw' }}
      onHide={() => {
        setShowClassDialog(false);
        setClassForm(null);
      }}
      footer={
        <div>
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            onClick={() => {
              setShowClassDialog(false);
              setClassForm(null);
            }} 
            className="p-button-text" 
          />
          <Button 
            label="Save" 
            icon="pi pi-check" 
            onClick={saveClass} 
          />
        </div>
      }
    >
      {classForm && (
        <div className="p-fluid">
          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Class ID *</label>
            <InputNumber
              value={classForm.class_id}
              onValueChange={(e) => setClassForm({ ...classForm, class_id: e.value || 1 })}
              min={1}
              showButtons
            />
            <small>Unique identifier for this class</small>
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Class Name *</label>
            <InputText
              value={classForm.class_name}
              onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })}
              placeholder="e.g., Closed Trees"
            />
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Map Code *</label>
            <InputText
              value={classForm.class_map_code}
              onChange={(e) => setClassForm({ ...classForm, class_map_code: e.target.value })}
              placeholder="e.g., TCL"
            />
            <small>Short code used for mapping and display</small>
          </div>

          <div className="p-field" style={{ marginBottom: '1rem' }}>
            <label>Description</label>
            <InputTextarea
              value={classForm.class_description || ''}
              onChange={(e) => setClassForm({ ...classForm, class_description: e.target.value })}
              placeholder="Detailed description of this class"
              rows={4}
            />
          </div>
        </div>
      )}
    </Dialog>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const toolbarStart = (
    <div className="flex flex-row">
      <Button 
        label="New Plugin" 
        icon="pi pi-plus" 
        onClick={createNewPlugin}
        className="p-button-success"
        style={{ marginRight: '0.5rem' }}
      />
      <FileUpload
        mode="basic"
        name="plugin"
        accept="application/json"
        chooseLabel="Import Plugin"
        customUpload
        uploadHandler={importPlugin}
        auto
        className="p-button-help"
      />
    </div>
  );

  const toolbarEnd = (
    <div>
      {selectedPlugin && (
        <Chip 
          label={`Selected: ${selectedPlugin.metadata.name}`} 
          icon="pi pi-check"
          className="p-mr-2"
        />
      )}
      {onClose && (
        <Button 
          label="Close" 
          icon="pi pi-times" 
          onClick={onClose}
          className="p-button-text"
        />
      )}
    </div>
  );

  if (showRuleBuilder) {
    return (
      <RuleBuilder
        rule={editingRule || undefined}
        availableClasses={selectedPlugin?.ruleSet.classes || []}
        blocks={blocks}
        characteristics={characteristics}
        characteristicLookUp={characteristicLookUp}
        legendData={legendData}
        onSave={saveRule}
        onCancel={() => {
          setShowRuleBuilder(false);
          setEditingRule(null);
        }}
      />
    );
  }

  return (
    <div className="plugin-manager" style={{ padding: '1rem' }}>
      <Toast ref={toast} />
      <ConfirmDialog />

      <h2>Plugin Manager</h2>
      <p>Manage classification rule sets and reference legend plugins</p>

      <Toolbar left={toolbarStart} right={toolbarEnd} style={{ marginBottom: '1rem' }} />

      {renderPluginList()}
      {renderClassList()}
      {renderRuleList()}      
      {renderMetadataDialog()}
      {renderClassDialog()}
    </div>
  );
};

export default PluginManager;