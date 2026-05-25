import { useState, useRef, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { ProgressBar } from 'primereact/progressbar';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import randomstring from 'randomstring';
import { LocalStorageManager, LegendData } from './LocalStorageManager';

interface LegendStorageManagerProps {
    visible: boolean;
    setVisible: (visible: boolean) => void;
    LC_Legend: any;
    LC_Class: any;
    LC_ClassCharacteristics: any;
    LC_HorizontalPatterns: any;
    LC_Strata: any;
    LC_Properties: any;
    LC_Characteristics: any;
    userDefinedBlocks: any[];
    userDefinedCharacteristics: any[];
    onLoadLegend: (legendData: LegendData) => void;
    setRerenderTrigger: (trigger: string) => void;
}

export const LegendStorageManager = (props: LegendStorageManagerProps) => {
    const {
        visible,
        setVisible,
        LC_Legend,
        LC_Class,
        LC_ClassCharacteristics,
        LC_HorizontalPatterns,
        LC_Strata,
        LC_Properties,
        LC_Characteristics,
        userDefinedBlocks,
        userDefinedCharacteristics,
        onLoadLegend,
        setRerenderTrigger
    } = props;

    const toast = useRef<Toast>(null);
    const [legendList, setLegendList] = useState<any[]>([]);
    const [legendName, setLegendName] = useState<string>('');
    const [autoSaveData, setAutoSaveData] = useState<LegendData | null>(null);
    const [storageInfo, setStorageInfo] = useState({ used: 0, total: 0, percentage: 0 });

    useEffect(() => {
        if (visible) {
            refreshLegendList();
            loadAutoSaveData();
            updateStorageInfo();
        }
    }, [visible]);

    const refreshLegendList = () => {
        const list = LocalStorageManager.getLegendList();
        setLegendList(list);
    };

    const loadAutoSaveData = () => {
        const data = LocalStorageManager.loadAutoSave();
        setAutoSaveData(data);
    };

    const updateStorageInfo = () => {
        const info = LocalStorageManager.getStorageInfo();
        setStorageInfo(info);
    };

    const handleSaveLegend = () => {
        if (!legendName || legendName.trim() === '') {
            toast.current?.show({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please enter a work progress name',
                life: 3000
            });
            return;
        }

        const legendId = randomstring.generate(12);
        const success = LocalStorageManager.saveLegend(
            legendId,
            legendName,
            LC_Legend.current,
            LC_Class.current,
            LC_ClassCharacteristics.current,
            LC_HorizontalPatterns.current,
            LC_Strata.current,
            LC_Properties.current,
            LC_Characteristics.current,
            userDefinedBlocks,
            userDefinedCharacteristics
        );

        if (success) {
            setLegendName('');
            refreshLegendList();
            updateStorageInfo();
            
            // Show toast only once
            setTimeout(() => {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Work progress "${legendName}" saved successfully`,
                    life: 3000
                });
            }, 100);
        } else {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save work progress',
                life: 3000
            });
        }
    };

    const handleLoadLegend = (legendId: string) => {
        confirmDialog({
            message: 'Loading this save will replace your current work. Continue?',
            header: 'Confirm Load',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                const legendData = LocalStorageManager.loadLegend(legendId);
                if (legendData) {
                    onLoadLegend(legendData);
                    setVisible(false);
                    setRerenderTrigger('Load work progress ' + randomstring.generate(8));
                    
                    // Show toast after dialog closes
                    setTimeout(() => {
                        toast.current?.show({
                            severity: 'success',
                            summary: 'Success',
                            detail: `Work progress "${legendData.name}" loaded successfully`,
                            life: 3000
                        });
                    }, 300);
                } else {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to load work progress',
                        life: 3000
                    });
                }
            }
        });
    };

    const handleDeleteLegend = (legendId: string, legendName: string) => {
        confirmDialog({
            message: `Are you sure you want to delete "${legendName}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-trash',
            acceptClassName: 'p-button-danger',
            accept: () => {
                const success = LocalStorageManager.deleteLegend(legendId);
                if (success) {
                    refreshLegendList();
                    updateStorageInfo();
                    
                    // Show toast after confirmation
                    setTimeout(() => {
                        toast.current?.show({
                            severity: 'success',
                            summary: 'Success',
                            detail: `Work progress "${legendName}" deleted successfully`,
                            life: 3000
                        });
                    }, 300);
                } else {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to delete work progress',
                        life: 3000
                    });
                }
            }
        });
    };

    const handleLoadAutoSave = () => {
        if (!autoSaveData) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Warning',
                detail: 'No auto-save data available'
            });
            return;
        }

        confirmDialog({
            message: 'Loading auto-save will replace your current work. Continue?',
            header: 'Confirm Load Auto-Save',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                onLoadLegend(autoSaveData);
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Auto-save data loaded successfully'
                });
                setVisible(false);
                setRerenderTrigger('Load Auto-Save ' + randomstring.generate(8));
            }
        });
    };

    const handleExportLegend = (legendId: string) => {
        const legendData = LocalStorageManager.loadLegend(legendId);
        if (legendData) {
            LocalStorageManager.exportLegend(legendData);
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Work progress exported successfully'
            });
        } else {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to export work progress'
            });
        }
    };

    const actionBodyTemplate = (rowData: any) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-folder-open"
                    rounded
                    outlined
                    severity="info"
                    tooltip="Load saved work progress"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => handleLoadLegend(rowData.id)}
                />
                <Button
                    icon="pi pi-download"
                    rounded
                    outlined
                    severity="success"
                    tooltip="Export saved work progress"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => handleExportLegend(rowData.id)}
                />
                <Button
                    icon="pi pi-trash"
                    rounded
                    outlined
                    severity="danger"
                    tooltip="Delete saved work progress"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => handleDeleteLegend(rowData.id, rowData.name)}
                />
            </div>
        );
    };

    const timestampBodyTemplate = (rowData: any) => {
        return new Date(rowData.timestamp).toLocaleString();
    };

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
                header="Work Storage Manager"
                visible={visible}
                style={{ width: '80vw', maxWidth: '1000px' }}
                onHide={() => setVisible(false)}
                footer={footerContent}
            >
                <div className="flex flex-column gap-1">
                    {/* Save Current Legend */}
                    <Card title="Save Current Work" className="w-full m-0 p-0">
                        <div className="flex gap-1 align-items-end m-0 p-0">
                            <div className="flex-1">
                                <label htmlFor="legendName" className="block mb-2">
                                    Save Name
                                </label>
                                <InputText
                                    id="legendName"
                                    value={legendName}
                                    onChange={(e) => setLegendName(e.target.value)}
                                    placeholder="Enter save name..."
                                    className="w-full"
                                />
                            </div>
                            <Button
                                label="Save"
                                icon="pi pi-save"
                                onClick={handleSaveLegend}
                            />
                        </div>
                    </Card>

                    {/* Auto-Save Section */}
                    {autoSaveData && (
                        <Card title="Auto-Save" className="w-full">
                            <div className="flex justify-content-between align-items-center m-0 p-0">
                                <div>
                                    <p className="m-0">
                                        <strong>Last Auto-Save:</strong>{' '}
                                        {new Date(autoSaveData.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <Button
                                    label="Load Auto-Save"
                                    icon="pi pi-replay"
                                    onClick={handleLoadAutoSave}
                                />
                            </div>
                        </Card>
                    )}

                    {/* Storage Info */}
                    <Card title="Storage Information" className="w-full">
                        <div className="flex flex-column gap-1 m-0 p-0">
                            <div className="flex justify-content-between">
                                <span>Used: {storageInfo.used} KB</span>
                                <span>Total: {storageInfo.total} KB</span>
                            </div>
                            <ProgressBar 
                                value={storageInfo.percentage} 
                                showValue={false}
                                color={storageInfo.percentage > 80 ? '#ef4444' : '#3b82f6'}
                            />
                            <small className="text-500">
                                {storageInfo.percentage}% of local storage used
                            </small>
                        </div>
                    </Card>

                    <Divider />

                    {/* Saved Legends List */}
                    <div>
                        <h3>Saved Work Progress</h3>
                        {legendList.length === 0 ? (
                            <p className="text-500">No saved work progress yet.</p>
                        ) : (
                            <DataTable
                                value={legendList}
                                paginator
                                rows={5}
                                rowsPerPageOptions={[5, 10, 25]}
                                responsiveLayout="scroll"
                            >
                                <Column field="name" header="Work Progress Name" sortable />
                                <Column
                                    field="timestamp"
                                    header="Last Modified"
                                    body={timestampBodyTemplate}
                                    sortable
                                />
                                <Column
                                    header="Actions"
                                    body={actionBodyTemplate}
                                    style={{ width: '200px' }}
                                />
                            </DataTable>
                        )}
                    </div>
                </div>
            </Dialog>
        </>
    );
};