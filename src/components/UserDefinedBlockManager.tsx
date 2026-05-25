import { useState, useRef, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dropdown } from 'primereact/dropdown';
import { Panel } from 'primereact/panel';
import { Divider } from 'primereact/divider';
import { LocalStorageManager, UserDefinedBlock } from './LocalStorageManager';
import randomstring from 'randomstring';

interface UserDefinedBlockManagerProps {
    visible: boolean;
    setVisible: (visible: boolean) => void;
    userDefinedBlocks: UserDefinedBlock[];
    onBlocksUpdate: (blocks: UserDefinedBlock[]) => void;
    setRerenderTrigger: (trigger: string) => void;
}

export const UserDefinedBlockManager = (props: UserDefinedBlockManagerProps) => {
    const {
        visible,
        setVisible,
        userDefinedBlocks,
        onBlocksUpdate,
        setRerenderTrigger
    } = props;

    const toast = useRef<Toast>(null);
    const [blocks, setBlocks] = useState<UserDefinedBlock[]>([]);
    const [editDialogVisible, setEditDialogVisible] = useState(false);
    const [currentBlock, setCurrentBlock] = useState<UserDefinedBlock | null>(null);
    const [isNewBlock, setIsNewBlock] = useState(false);

    // Form fields
    const [blockName, setBlockName] = useState('');
    const [blockLabel, setBlockLabel] = useState('');
    const [blockDescription, setBlockDescription] = useState('');
    const [blockIcon, setBlockIcon] = useState('text-xs p-0 m-1 fa-solid fa-cube');
    const [blockElements, setBlockElements] = useState<any[]>([]);

    const elementTypes = [
        { label: 'Text', value: 'Text' },
        { label: 'Number', value: 'Number' },
        { label: 'Dropdown', value: 'Dropdown' },
        { label: 'Range', value: 'Range' },
        { label: 'Boolean', value: 'Boolean' }
    ];

    useEffect(() => {
        if (visible) {
            loadBlocks();
        }
    }, [visible, userDefinedBlocks]);

    const loadBlocks = () => {
        const savedBlocks = LocalStorageManager.getUserBlocks();
        setBlocks(savedBlocks);
    };

    const handleAddNewBlock = () => {
        setIsNewBlock(true);
        setCurrentBlock(null);
        resetForm();
        setEditDialogVisible(true);
    };

    const handleEditBlock = (block: UserDefinedBlock) => {
        setIsNewBlock(false);
        setCurrentBlock(block);
        setBlockName(block.block_name);
        setBlockLabel(block.block_label);
        setBlockDescription(block.block_description);
        setBlockIcon(block.block_icon);
        setBlockElements([...block.elements]);
        setEditDialogVisible(true);
    };

    const handleDeleteBlock = (block: UserDefinedBlock) => {
        confirmDialog({
            message: `Are you sure you want to delete the block "${block.block_label}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-trash',
            acceptClassName: 'p-button-danger',
            accept: () => {
                const success = LocalStorageManager.deleteUserBlock(block.block_id);
                if (success) {
                    toast.current?.show({
                        severity: 'success',
                        summary: 'Success',
                        detail: `Block "${block.block_label}" deleted successfully`
                    });
                    loadBlocks();
                    
                    // Update parent component
                    const updatedBlocks = blocks.filter(b => b.block_id !== block.block_id);
                    onBlocksUpdate(updatedBlocks);
                    setRerenderTrigger('Delete User Block ' + randomstring.generate(8));
                } else {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to delete block'
                    });
                }
            }
        });
    };

    const handleSaveBlock = () => {
        if (!blockName || !blockLabel) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please fill in all required fields'
            });
            return;
        }

        const block: UserDefinedBlock = {
            block_id: isNewBlock ? LocalStorageManager.getNextBlockId() : currentBlock!.block_id,
            block_name: blockName,
            block_label: blockLabel,
            block_description: blockDescription,
            block_icon: blockIcon,
            block_reference: `LC_UserDefined_${blockName}`,
            elements: blockElements,
            isUserDefined: true,
            createdAt: isNewBlock ? new Date().toISOString() : currentBlock!.createdAt
        };

        const success = LocalStorageManager.saveUserBlock(block);
        if (success) {
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `Block "${blockLabel}" ${isNewBlock ? 'created' : 'updated'} successfully`
            });
            setEditDialogVisible(false);
            loadBlocks();
            
            // Update parent component
            const updatedBlocks = LocalStorageManager.getUserBlocks();
            onBlocksUpdate(updatedBlocks);
            setRerenderTrigger('Save User Block ' + randomstring.generate(8));
        } else {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save block'
            });
        }
    };

    const resetForm = () => {
        setBlockName('');
        setBlockLabel('');
        setBlockDescription('');
        setBlockIcon('text-xs p-0 m-1 fa-solid fa-cube');
        setBlockElements([]);
    };

    const handleAddElement = () => {
        const newElement = {
            display_default: '',
            element_name: `element_${blockElements.length + 1}`,
            element_label: `Element ${blockElements.length + 1}`,
            element_type: 'Text',
            element_rules: {
                required: false,
                order: blockElements.length,
                min: 0,
                max: 0,
                unit: '',
                symbol: '',
                list: '',
                options_name: ''
            }
        };
        setBlockElements([...blockElements, newElement]);
    };

    const handleRemoveElement = (index: number) => {
        const updatedElements = blockElements.filter((_, i) => i !== index);
        setBlockElements(updatedElements);
    };

    const handleElementChange = (index: number, field: string, value: any) => {
        const updatedElements = [...blockElements];
        if (field.startsWith('rule_')) {
            const ruleField = field.substring(5);
            updatedElements[index].element_rules[ruleField] = value;
        } else {
            updatedElements[index][field] = value;
        }
        setBlockElements(updatedElements);
    };

    const actionBodyTemplate = (rowData: UserDefinedBlock) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-pencil"
                    rounded
                    outlined
                    severity="info"
                    tooltip="Edit Block"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => handleEditBlock(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    rounded
                    outlined
                    severity="danger"
                    tooltip="Delete Block"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => handleDeleteBlock(rowData)}
                />
            </div>
        );
    };

    const createdAtBodyTemplate = (rowData: UserDefinedBlock) => {
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
                onClick={handleSaveBlock}
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
                header="User-Defined Blocks"
                visible={visible}
                style={{ width: '90vw', maxWidth: '1200px' }}
                onHide={() => setVisible(false)}
                footer={footerContent}
            >
                <div className="flex flex-column gap-4">
                    <div className="flex justify-content-between align-items-center">
                        <p className="m-0 text-500">
                            Create custom blocks that will be available in the Properties form.
                        </p>
                        <Button
                            label="Add New Block"
                            icon="pi pi-plus"
                            onClick={handleAddNewBlock}
                        />
                    </div>

                    <Divider />

                    {blocks.length === 0 ? (
                        <p className="text-500 text-center">No user-defined blocks yet.</p>
                    ) : (
                        <DataTable
                            value={blocks}
                            paginator
                            rows={10}
                            responsiveLayout="scroll"
                        >
                            <Column field="block_label" header="Block Label" sortable />
                            <Column field="block_name" header="Block Name" sortable />
                            <Column field="block_description" header="Description" />
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

            {/* Edit/Create Block Dialog */}
            <Dialog
                header={isNewBlock ? 'Create New Block' : 'Edit Block'}
                visible={editDialogVisible}
                style={{ width: '80vw', maxWidth: '800px' }}
                onHide={() => setEditDialogVisible(false)}
                footer={editDialogFooter}
            >
                <div className="flex flex-column gap-3">
                    <div className="field">
                        <label htmlFor="blockName" className="block mb-2">
                            Block Name * (internal identifier, no spaces)
                        </label>
                        <InputText
                            id="blockName"
                            value={blockName}
                            onChange={(e) => setBlockName(e.target.value.replace(/\s/g, '_'))}
                            className="w-full"
                            placeholder="e.g., custom_vegetation"
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="blockLabel" className="block mb-2">
                            Block Label * (display name)
                        </label>
                        <InputText
                            id="blockLabel"
                            value={blockLabel}
                            onChange={(e) => setBlockLabel(e.target.value)}
                            className="w-full"
                            placeholder="e.g., Custom Vegetation"
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="blockDescription" className="block mb-2">
                            Block Description
                        </label>
                        <InputTextarea
                            id="blockDescription"
                            value={blockDescription}
                            onChange={(e) => setBlockDescription(e.target.value)}
                            className="w-full"
                            rows={3}
                            placeholder="Describe this block..."
                        />
                    </div>

                    <div className="field">
                        <label htmlFor="blockIcon" className="block mb-2">
                            Block Icon (CSS classes)
                        </label>
                        <InputText
                            id="blockIcon"
                            value={blockIcon}
                            onChange={(e) => setBlockIcon(e.target.value)}
                            className="w-full"
                            placeholder="e.g., text-xs p-0 m-1 fa-solid fa-cube"
                        />
                    </div>

                    <Divider />

                    <Panel header="Block Elements" toggleable>
                        <div className="flex flex-column gap-3">
                            {blockElements.map((element, index) => (
                                <div key={index} className="p-3 surface-100 border-round">
                                    <div className="flex justify-content-between align-items-center mb-2">
                                        <h4 className="m-0">Element {index + 1}</h4>
                                        <Button
                                            icon="pi pi-trash"
                                            rounded
                                            text
                                            severity="danger"
                                            onClick={() => handleRemoveElement(index)}
                                        />
                                    </div>
                                    <div className="grid">
                                        <div className="col-6">
                                            <label className="block mb-2">Element Name</label>
                                            <InputText
                                                value={element.element_name}
                                                onChange={(e) =>
                                                    handleElementChange(index, 'element_name', e.target.value)
                                                }
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="block mb-2">Element Label</label>
                                            <InputText
                                                value={element.element_label}
                                                onChange={(e) =>
                                                    handleElementChange(index, 'element_label', e.target.value)
                                                }
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="block mb-2">Element Type</label>
                                            <Dropdown
                                                value={element.element_type}
                                                options={elementTypes}
                                                onChange={(e) =>
                                                    handleElementChange(index, 'element_type', e.value)
                                                }
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button
                                label="Add Element"
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