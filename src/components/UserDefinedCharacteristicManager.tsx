import { useState, useRef, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber'
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { Divider } from 'primereact/divider';
import { LocalStorageManager, UserDefinedCharacteristic } from './LocalStorageManager';
import randomstring from 'randomstring';

interface UserDefinedCharacteristicManagerProps {
    visible: boolean;
    setVisible: (visible: boolean) => void;
    userDefinedCharacteristics: UserDefinedCharacteristic[];
    onCharacteristicsUpdate: (characteristics: UserDefinedCharacteristic[]) => void;
    setRerenderTrigger: (trigger: string) => void;
}

export const UserDefinedCharacteristicManager = (props: UserDefinedCharacteristicManagerProps) => {
    const {
        visible,
        setVisible,
        userDefinedCharacteristics,
        onCharacteristicsUpdate,
        setRerenderTrigger
    } = props;

    const toast = useRef<Toast>(null);
    const USER_DEFINED_GROUP_ID = 900000; // The group ID for user-defined characteristics
    const [characteristics, setCharacteristics] = useState<UserDefinedCharacteristic[]>([]);
    const [editDialogVisible, setEditDialogVisible] = useState(false);
    const [currentCharacteristic, setCurrentCharacteristic] = useState<UserDefinedCharacteristic | null>(null);
    const [isNewCharacteristic, setIsNewCharacteristic] = useState(false);

    // Form fields
    const [characteristicName, setCharacteristicName] = useState('');
    const [characteristicLabel, setCharacteristicLabel] = useState('');
    const [characteristicDescription, setCharacteristicDescription] = useState('');
    const [characteristicElements, setCharacteristicElements] = useState<any[]>([]);

    const elementTypes = [
        { label: 'Text', value: 'Text' },
        { label: 'Range', value: 'Range' }
    ];

    useEffect(() => {
        if (visible) {
            loadCharacteristics();
        }
    }, [visible, userDefinedCharacteristics]);

    const loadCharacteristics = () => {
        const savedCharacteristics = LocalStorageManager.getUserCharacteristics();
        setCharacteristics(savedCharacteristics);
    };

    const handleAddNewCharacteristic = () => {
        setIsNewCharacteristic(true);
        setCurrentCharacteristic(null);
        resetForm();
        setEditDialogVisible(true);
    };

    const handleEditCharacteristic = (characteristic: UserDefinedCharacteristic) => {
        setIsNewCharacteristic(false);
        setCurrentCharacteristic(characteristic);
        // Extract the name without LC_ prefix for display
        const nameWithoutPrefix = characteristic.characteristic_name.startsWith('LC_') 
            ? characteristic.characteristic_name.substring(3) 
            : characteristic.characteristic_name;
        setCharacteristicName(nameWithoutPrefix);
        setCharacteristicLabel(characteristic.characteristic_label);
        setCharacteristicDescription(characteristic.characteristic_description);
        setCharacteristicElements([...characteristic.elements]);
        setEditDialogVisible(true);
    };

    const handleDeleteCharacteristic = (characteristic: UserDefinedCharacteristic) => {
        confirmDialog({
            message: `Are you sure you want to delete the characteristic "${characteristic.characteristic_label}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-trash',
            acceptClassName: 'p-button-danger',
            accept: () => {
                const success = LocalStorageManager.deleteUserCharacteristic(characteristic.characteristic_id);
                if (success) {
                    toast.current?.show({
                        severity: 'success',
                        summary: 'Success',
                        detail: `Characteristic "${characteristic.characteristic_label}" deleted successfully`
                    });
                    loadCharacteristics();
                    
                    // Update parent component
                    const updatedCharacteristics = characteristics.filter(
                        c => c.characteristic_id !== characteristic.characteristic_id
                    );
                    onCharacteristicsUpdate(updatedCharacteristics);
                    setRerenderTrigger('Delete User Characteristic ' + randomstring.generate(8));
                } else {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to delete characteristic'
                    });
                }
            }
        });
    };

    const generateInternalName = (label: string): string => {
        // Convert label to lowercase, replace spaces and special chars with underscores
        const cleaned = label
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscore
            .replace(/^_+|_+$/g, '');      // Remove leading/trailing underscores
        
        return `LC_${cleaned}`;
    };
    const generateElementName = (label: string): string => {
        // Convert label to lowercase, replace spaces and special chars with underscores
        const cleaned = label
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscore
            .replace(/^_+|_+$/g, '');      // Remove leading/trailing underscores
        
        return cleaned || 'attribute';
    };

    const handleSaveCharacteristic = () => {
        if (!characteristicLabel.trim()) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please enter a characteristic label'
            });
            return;
        }

        if (characteristicElements.length === 0) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please add at least one element to the characteristic'
            });
            return;
        }

        // Generate internal name from label
        const internalName = generateInternalName(characteristicLabel);
        
        const characteristic: UserDefinedCharacteristic = {
            characteristic_id: isNewCharacteristic 
                ? LocalStorageManager.getNextCharacteristicId() 
                : currentCharacteristic!.characteristic_id,
            characteristic_name: internalName,
            characteristic_label: characteristicLabel,
            characteristic_description: characteristicDescription,
            characteristic_icon: 'text-xs p-0 m-1 fa-solid fa-user-gear', // Automatically set icon
            characteristic_reference: `LC_UserDefined_${internalName.substring(3)}`, // Remove LC_ prefix for reference
            characteristic_group: USER_DEFINED_GROUP_ID,
            elements: characteristicElements,
            isUserDefined: true,
            createdAt: isNewCharacteristic ? new Date().toISOString() : currentCharacteristic!.createdAt
        };

        const success = LocalStorageManager.saveUserCharacteristic(characteristic);
        if (success) {
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `Characteristic "${characteristicLabel}" ${isNewCharacteristic ? 'created' : 'updated'} successfully`
            });
            setEditDialogVisible(false);
            loadCharacteristics();
            
            // Update parent component
            const updatedCharacteristics = LocalStorageManager.getUserCharacteristics();
            onCharacteristicsUpdate(updatedCharacteristics);
            setRerenderTrigger('Save User Characteristic ' + randomstring.generate(8));
        } else {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save characteristic'
            });
        }
    };

    const resetForm = () => {
        setCharacteristicName('');
        setCharacteristicLabel('');
        setCharacteristicDescription('');
        setCharacteristicElements([]);
    };

    const handleAddElement = () => {
        const elementNumber = characteristicElements.length + 1;
        const defaultLabel = `Attribute ${elementNumber}`;
        const newElement = {
            display_default: '',
            element_name: generateElementName(defaultLabel),
            element_label: defaultLabel,
            element_type: 'Text',
            element_rules: {
                required: false,
                order: elementNumber,
                min: 0,
                max: 255, // Default max for text
                unit: '',
                symbol: '',
                list: '',
                options_name: ''
            }
        };
        setCharacteristicElements([...characteristicElements, newElement]);
    };

    const handleRemoveElement = (index: number) => {
        const updatedElements = characteristicElements.filter((_, i) => i !== index);
        setCharacteristicElements(updatedElements);
    };

    const handleElementChange = (index: number, field: string, value: any) => {
        const updatedElements = [...characteristicElements];
        if (field.startsWith('rule_')) {
            const ruleField = field.substring(5);
            updatedElements[index].element_rules[ruleField] = value;
        } else {
            updatedElements[index][field] = value;
        }
        setCharacteristicElements(updatedElements);
    };

    const actionBodyTemplate = (rowData: UserDefinedCharacteristic) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-pencil"
                    rounded
                    outlined
                    severity="info"
                    tooltip="Edit Characteristic"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => handleEditCharacteristic(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    rounded
                    outlined
                    severity="danger"
                    tooltip="Delete Characteristic"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => handleDeleteCharacteristic(rowData)}
                />
            </div>
        );
    };

    const createdAtBodyTemplate = (rowData: UserDefinedCharacteristic) => {
        return new Date(rowData.createdAt).toLocaleString();
    };

    const editDialogFooter = (
        <div>
            <Button
                label="Cancel"
                icon="pi pi-times"
                onClick={() => setEditDialogVisible(false)}
                className="p-button-text"
            />
            <Button
                label="Save"
                icon="pi pi-check"
                onClick={handleSaveCharacteristic}
            />
        </div>
    );

    const footerContent = (
        <div>
            <Button
                label="Close"
                icon="pi pi-times"
                onClick={() => setVisible(false)}
                className="p-button-text"
            />
        </div>
    );

    return (
        <>
            <Toast ref={toast} />
            <Dialog
                header="User-Defined Characteristics"
                visible={visible}
                style={{ width: '90vw', maxWidth: '1200px' }}
                onHide={() => setVisible(false)}
                footer={footerContent}
            >
                <div className="flex flex-column gap-0">
                    <div className="flex justify-content-between align-items-center">
                        <p className="m-0 text-500">
                            Create custom characteristics that will be available in the Characteristics form.
                        </p>
                        <Button
                            label="Add New Characteristic"
                            icon="pi pi-plus"
                            onClick={handleAddNewCharacteristic}
                        />
                    </div>

                    <Divider />

                    {characteristics.length === 0 ? (
                        <p className="text-500 text-center">No user-defined characteristics yet.</p>
                    ) : (
                        <DataTable
                            value={characteristics}
                            paginator
                            rows={10}
                            responsiveLayout="scroll"
                        >
                            <Column field="characteristic_label" header="Characteristic Label" sortable />
                            <Column field="characteristic_name" header="Characteristic Name" sortable />
                            <Column field="characteristic_description" header="Description" />
                            <Column
                                field="elements.length"
                                header="Elements"
                                body={(rowData) => rowData.elements.length}
                            />
                            <Column
                                field="createdAt"
                                header="Created"
                                body={createdAtBodyTemplate}
                                sortable
                            />
                            <Column
                                header="Actions"
                                body={actionBodyTemplate}
                                style={{ width: '150px' }}
                            />
                        </DataTable>
                    )}
                </div>
            </Dialog>

            {/* Edit/Create Characteristic Dialog */}
            <Dialog
                header={isNewCharacteristic ? 'Create New Characteristic' : 'Edit Characteristic'}
                visible={editDialogVisible}
                style={{ width: '80vw', maxWidth: '800px' }}
                onHide={() => setEditDialogVisible(false)}
                footer={editDialogFooter}
            >
                <div className="flex flex-column gap-0">
                    <div className="flex flex-row gap-1">
                        <div className="field m-0 p-0">
                            <label htmlFor="characteristicLabel" className="block">
                                Characteristic Label * (display name)
                            </label>
                            <InputText
                                id="characteristicLabel"
                                value={characteristicLabel}
                                onChange={(e) => {
                                    setCharacteristicLabel(e.target.value);
                                    // Auto-generate internal name as user types
                                    setCharacteristicName(generateInternalName(e.target.value));
                                }}
                                className="w-full"
                                placeholder="e.g., Custom Soil Type"
                                autoFocus
                            />
                            <small className="text-500">
                                This is the name that will be displayed to users
                            </small>
                        </div>

                        <div className="field m-0 p-0">
                            <label htmlFor="characteristicName" className="block">
                                Internal Identifier (auto-generated)
                            </label>
                            <InputText
                                id="characteristicName"
                                value={characteristicName || 'LC_'}
                                className="w-full"
                                disabled
                                readOnly
                            />
                            <small className="text-500">
                                Automatically generated from the label above
                            </small>
                        </div>
                    </div>

                    <div className="field m-0 p-0">
                        <label htmlFor="characteristicDescription" className="block">
                            Characteristic Description
                        </label>
                        <InputText
                            id="characteristicDescription"
                            value={characteristicDescription}
                            onChange={(e) => setCharacteristicDescription(e.target.value)}
                            className="w-full"
                            placeholder="Describe this characteristic..."
                        />
                        <small className="text-500">
                            Optional: Provide additional information about this characteristic
                        </small>
                    </div>

                    <Divider className="m-0 p-0" />

                    <Panel header="Characteristic Attributes" toggleable>
                        <div className="flex flex-column gap-0 m-0 p-0">
                            {characteristicElements.map((element, index) => (
                                <div key={index} className="p-3 m-0 mt-1 mb-1 surface-100 border-round">
                                    <div className="flex justify-content-between align-items-center m-0 p-0">
                                        <h4 className="m-0">Attribute {index + 1}</h4>
                                        <Button
                                            icon="pi pi-trash"
                                            rounded
                                            text
                                            severity="danger"
                                            onClick={() => handleRemoveElement(index)}
                                        />
                                    </div>
                                    <div className="grid m-0 p-0">
                                        <div className="col-6 m-0 p-0">
                                            <label className="block">Attribute Label * (display name)</label>
                                            <InputText
                                                value={element.element_label}
                                                onChange={(e) => {
                                                    const newLabel = e.target.value;
                                                    handleElementChange(index, 'element_label', newLabel);
                                                    // Auto-generate element name from label
                                                    handleElementChange(index, 'element_name', generateElementName(newLabel));
                                                }}
                                                className="w-full"
                                                placeholder="e.g., Soil pH, Temperature, Elevation"
                                            />
                                        </div>
                                        <div className="col-6 m-0 p-0">
                                            <label className="block">Attribute Name (Internal)</label>
                                            <InputText
                                                value={element.element_name}
                                                className="w-full surface-100"
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                        <div className="col-12 m-0 p-0">
                                            <label className="block">Attribute Type *</label>
                                            <Dropdown
                                                value={element.element_type}
                                                options={elementTypes}
                                                onChange={(e) => {
                                                    handleElementChange(index, 'element_type', e.value);
                                                    // Set sensible defaults based on type
                                                    if (e.value === 'Range') {
                                                        handleElementChange(index, 'rule_min', 0);
                                                        handleElementChange(index, 'rule_max', 100);
                                                    } else if (e.value === 'Text') {
                                                        handleElementChange(index, 'rule_min', 0);
                                                        handleElementChange(index, 'rule_max', 255);
                                                    }
                                                }}
                                                className="w-full"
                                            />
                                            <small className="text-500">
                                                Text: Single/multi-line text | Range: Numeric range with min/max
                                            </small>
                                        </div>                                        
                                        
                                        <Divider className="m-1 p-1" />                                        

                                        <div className="col-6 m-0 p-0">
                                            <label className="block">
                                                {element.element_type === 'Range' ? 'Minimum Value *' : 'Minimum Length'}
                                            </label>
                                            <InputText
                                                type="number"
                                                value={element.element_rules.min}
                                                onChange={(e) =>
                                                    handleElementChange(index, 'rule_min', parseFloat(e.target.value) || 0)
                                                }
                                                className="w-full"
                                                placeholder={element.element_type === 'Range' ? '0' : '0'}
                                            />
                                            <small className="text-500">
                                                {element.element_type === 'Range' 
                                                    ? 'Minimum value for range' 
                                                    : 'Min text length (0 = no limit)'}
                                            </small>
                                        </div>
                                        <div className="col-6 m-0 p-0">
                                            <label className="block">
                                                {element.element_type === 'Range' ? 'Maximum Value *' : 'Maximum Length'}
                                            </label>
                                            <InputText
                                                type="number"
                                                value={element.element_rules.max}
                                                onChange={(e) =>
                                                    handleElementChange(index, 'rule_max', parseFloat(e.target.value) || 0)
                                                }
                                                className="w-full"
                                                placeholder={element.element_type === 'Range' ? '100' : '255'}
                                            />
                                            <small className="text-500">
                                                {element.element_type === 'Range' 
                                                    ? 'Maximum value for range' 
                                                    : 'Max text length (0 = no limit)'}
                                            </small>
                                        </div>
                                        <div className="col-6 m-0 p-0">
                                            <label className="block">Unit</label>
                                            <InputText
                                                value={element.element_rules.unit}
                                                onChange={(e) =>
                                                    handleElementChange(index, 'rule_unit', e.target.value)
                                                }
                                                className="w-full"
                                                placeholder={element.element_type === 'Range' ? 'e.g., Celsius, Meters' : 'e.g., Characters'}
                                            />
                                            <small className="text-500">Optional: Unit of measurement</small>
                                        </div>
                                        <div className="col-6 m-0 p-0">
                                            <label className="block">Symbol</label>
                                            <InputText
                                                value={element.element_rules.symbol}
                                                onChange={(e) =>
                                                    handleElementChange(index, 'rule_symbol', e.target.value)
                                                }
                                                className="w-full"
                                                placeholder={element.element_type === 'Range' ? 'e.g., °C, m, %' : ''}
                                            />
                                            <small className="text-500">Optional: Symbol to display (e.g., °C, %, m)</small>
                                        </div>

                                        {/* Preview */}
                                        {(element.element_label || element.element_rules.symbol || element.element_rules.unit) && (
                                            <div className="col-12 m-0 p-0">
                                                <Divider className="m-1 p-1" />
                                                <label className="block font-bold">Preview:</label>
                                                <div className="p-inputgroup">
                                                    <span className="p-inputgroup-addon">
                                                        <i className="pi pi-pencil"></i>
                                                    </span>
                                                    {element.element_type === 'Range' ? (
                                                        <span className="p-inputtext p-component">
                                                            [{element.element_rules.min} - {element.element_rules.max}]
                                                        </span>
                                                    ) : (
                                                        <span className="p-inputtext p-component">
                                                            {element.element_label || 'Text Input'}
                                                        </span>
                                                    )}
                                                    <span className="p-inputgroup-addon">
                                                        {element.element_rules.symbol || element.element_rules.unit || ''}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <Button
                                label="Add Attribute"
                                icon="pi pi-plus"
                                onClick={handleAddElement}
                                className="w-full"
                                outlined
                            />
                        </div>
                    </Panel>
                </div>
            </Dialog>
        </>
    );
};