import { useState,useRef,useEffect } from 'react';
import { FileUpload, FileUploadHeaderTemplateOptions, FileUploadSelectEvent, FileUploadHandlerEvent, ItemTemplateOptions } from 'primereact/fileupload';
import { ProgressBar } from 'primereact/progressbar';
import { Tooltip } from 'primereact/tooltip';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Card } from 'primereact/card';
import XMLViewer from 'react-xml-viewer';
import { parseString } from 'xml2js';
import * as processors from 'xml2js/lib/processors';
import Papa from 'papaparse';
import { createLegendImporter, LegendImportConfig, LegendImportResult } from '../LegendImporter';

import { RadioButton, RadioButtonChangeEvent } from "primereact/radiobutton";
import { SelectButton, SelectButtonChangeEvent } from 'primereact/selectbutton';

import { searchObjKeyVal } from "../../App";
import { fuzzySearchObjKeyVal } from "../../App";

export const Upload = (props) => {
    const {UUID,
        translator,
        legendTemplate,
        options,        
        blocks,
        blockLookUp,
        characteristics,
        characteristicLookUp,
        fileContent,
        setFileContent,
        setUploadVisible,
        setComparatorVisible,
        method,
        setMethod
        } = props;

    const toast = useRef<Toast>(null);

    const [fileDisplay,setFileDisplay] = useState<string>();
    const handleFileChange = (event: any) => {
        let details = '';
        event.files.forEach((file: File) => {
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const extension = file.name.split('.').pop()?.toLowerCase();
                    if (extension === 'csv') {
                        const header = String(e.target?.result).split('\\r\\n')[0];
                        details += `<file>${file.name}</file><data_fields>${header}</data_fields>`;
                    } else if (['lchs', 'lccs', 'xml'].includes(extension || '')) {
                        details += `<file>${file.name}</file>${e.target?.result}`;
                    } else {
                        details += `<file>${file.name}</file><e>LChS only supports LChS, LCCS and CSV legends.</e>`;
                    }
                    setFileDisplay(details);
                };
                reader.readAsText(file);
                setTotalSize(file.size);
            }
        });
    };
    
    const Legends = useRef([]);    
    
    const importLegend = async (upload: any) => {
        // Configure importer (enable auto-create for similarity assessment)
        const config: LegendImportConfig = {
            autoCreateCharacteristics: false,   // Auto-create missing characteristics as user-defined
            maxRecursionDepth: 10,
            defaultPresenceType: 'Fixed',
            includeValidationErrors: false  // Suppress detailed errors for batch processing
        };

        // Process each file
        const processFile = async (file: File): Promise<{ name: string; data: any } | null> => {
            try {
                const reader = new FileReader();
                const content = await new Promise<string>((resolve, reject) => {
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsText(file);
                });

                const extension = file.name.split('.').pop()?.toLowerCase();
                if (!['lchs', 'lccs', 'xml', 'csv'].includes(extension || '')) {
                    toast.current?.show({
                        severity: 'warn',
                        summary: 'Unsupported Format',
                        detail: `${file.name} is not a supported format`
                    });
                    return null;
                }

                // Create importer
                const importer = createLegendImporter(
                    translator,
                    {
                        blocks: blocks,
                        characteristics: characteristics
                    },
                    config
                );

                // Import legend
                const result: LegendImportResult = await importer.importLegend(
                    content,
                    file.name,
                    extension as 'lchs' | 'lccs' | 'xml' | 'csv'
                );

                if (result.success && result.legend) {
                    return {
                        name: file.name,
                        data: {
                            LCT_Legend: result.legend.LC_Legend,
                            LCT_Class: result.legend.LC_Class,
                            LCT_ClassCharacteristics: result.legend.LC_ClassCharacteristics,
                            LCT_HorizontalPatterns: result.legend.LC_HorizontalPatterns,
                            LCT_Strata: result.legend.LC_Strata,
                            LCT_Properties: result.legend.LC_Properties,
                            LCT_Characteristics: result.legend.LC_Characteristics
                        }
                    };
                } else {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Import Failed',
                        detail: `Failed to import ${file.name}`
                    });
                    return null;
                }

            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                toast.current?.show({
                    severity: 'error',
                    summary: 'Processing Error',
                    detail: `Error processing ${file.name}`
                });
                return null;
            }
        };

        // Process all files
        const results = await Promise.all(
            upload.files.map((file: File) => processFile(file))
        );

        // Update Legends.current with successfully imported legends
        Legends.current = results
            .filter((result): result is { name: string; data: any } => result !== null)
            .map(result => ({ [result.name]: result.data }));

        // Update parent component state with imported legends
        setFileContent(Legends.current);

        // Show summary
        const successCount = Legends.current.length;
        const totalCount = upload.files.length;

        if (successCount === totalCount) {
            toast.current?.show({
                severity: 'success',
                summary: 'Import Complete',
                detail: `Successfully imported ${successCount} legend(s)`
            });
        } else {
            toast.current?.show({
                severity: 'warn',
                summary: 'Partial Import',
                detail: `Imported ${successCount} of ${totalCount} legend(s)`
            });
        }

        // Update state
        setUploadVisible(false);
        setComparatorVisible(true);
    };
        
    const [totalSize, setTotalSize] = useState(0);
    const fileUploadRef = useRef<FileUpload>(null);    
    const onTemplateClear = () => {
        setTotalSize(0);
        fileContent.current = {};
    };
    const onTemplateRemove = (file: File, callback: Function) => {
        setTotalSize(totalSize - file.size);
        callback();
    };

    const headerTemplate = (options: FileUploadHeaderTemplateOptions) => {
        const { className, chooseButton, uploadButton, cancelButton } = options;
        const value = totalSize / 10000;
        const formatedValue = fileUploadRef && fileUploadRef.current ? fileUploadRef.current.formatSize(totalSize) : '0 B';

        return (
            <div className={className} style={{ backgroundColor: 'transparent', display: 'flex', alignItems: 'center' }}>
                {chooseButton}
                {uploadButton}
                {cancelButton}
                <div className="flex align-items-center gap-3 ml-auto">
                    <span>{formatedValue} / 1 MB</span>
                    <ProgressBar value={value} showValue={false} style={{ width: '10rem', height: '12px' }}></ProgressBar>
                </div>
            </div>
        );
    };
    const itemTemplate = (inFile: object, props: ItemTemplateOptions) => {
        const file = inFile as File;
        return (
            <div className="flex align-items-center flex-wrap">
                <div className="flex align-items-center" style={{ width: '40%' }}>
                    <span className="flex flex-column text-left ml-3">
                        {file.name}
                        <small>{new Date().toLocaleDateString()}</small>
                    </span>
                </div>
                <Tag value={props.formatSize} severity="warning" className="px-3 py-2" />
                <Button type="button" icon="pi pi-times" className="p-button-outlined p-button-rounded p-button-danger ml-auto" onClick={() => onTemplateRemove(file, props.onRemove)} />
            </div>
        );
    };
    const emptyTemplate = () => {
        return (
            <div className="flex align-items-center flex-column">
                <i className="fa-regular fa-file-code mt-3 p-5" style={{ fontSize: '5em', borderRadius: '50%', backgroundColor: 'var(--surface-b)', color: 'var(--surface-d)' }}></i>
                <span style={{ fontSize: '1.2em', color: 'var(--text-color-secondary)' }} className="my-5">
                    Drag and Drop Legend Files Here
                </span>
            </div>
        );
    };

    const chooseOptions = { icon: 'fa-regular fa-file-code', iconOnly: true, className: 'custom-choose-btn p-button-rounded p-button-outlined' };
    const uploadOptions = { icon: 'pi pi-fw pi-cog', iconOnly: true, className: 'custom-upload-btn p-button-success p-button-rounded p-button-outlined' };
    const cancelOptions = { icon: 'pi pi-fw pi-times', iconOnly: true, className: 'custom-cancel-btn p-button-danger p-button-rounded p-button-outlined' };

    const customTheme = {
        attributeKeyColor: "#0074D9",
        attributeValueColor: "#2ECC40"
    };

    interface Item {
        name: string;
        value: number;
    }
    const [value, setValue] = useState<Item>(null);
    const items: Item[] = [
        {name: 'Natural', value: 1},
        {name: 'Cultivated', value: 2}
    ];
    
    return (
        <>
            <div className="card flex flex-row gap-2 m-1 p-1">
                <div className="card flex flex-column justify-content-center align-self-start" style={{ width: '60%' }}>
                    <Card title="Compare legends for similarity by:" className="w-full">
                        <Toast ref={toast}></Toast>
                        <Tooltip target=".custom-choose-btn" content="Select Legends" position="bottom" />
                        <Tooltip target=".custom-upload-btn" content="Process Legends" position="bottom" />
                        <Tooltip target=".custom-cancel-btn" content="Clear Loaded Legends" position="bottom" />

                        <div className="card flex gap-2 mb-2" style={{ alignItems: 'center' }}>                            
                            <div className="flex flex-wrap gap-3">
                                <div className="flex align-items-center">
                                    <input
                                        type="radio"
                                        id="method-correspondence"
                                        name="similarity-method"
                                        checked={method === 'Correspondence'}
                                        onChange={() => setMethod('Correspondence')}
                                        style={{ marginRight: '0.3rem' }}
                                    />
                                    <label htmlFor="method-correspondence" className="ml-1">
                                        Correspondence & Extensiveness
                                    </label>
                                </div>
                                <div className="flex align-items-center">
                                    <input
                                        type="radio"
                                        id="method-element"
                                        name="similarity-method"
                                        checked={method === 'Element Count'}
                                        onChange={() => setMethod('Element Count')}
                                        style={{ marginRight: '0.3rem' }}
                                    />
                                    <label htmlFor="method-element" className="ml-1">
                                        Element Count
                                    </label>
                                </div>                                
                            </div>
                        </div>
                        
                        <FileUpload name="Legend" accept=".lchs, .lccs, .xml, .csv" multiple maxFileSize={1000000} onSelect={(e: FileUploadSelectEvent)=>handleFileChange(e)} customUpload uploadHandler={(e: FileUploadHandlerEvent)=>importLegend(e)}
                            ref={fileUploadRef} onError={onTemplateClear} onClear={onTemplateClear} headerTemplate={headerTemplate} itemTemplate={itemTemplate} emptyTemplate={emptyTemplate} chooseOptions={chooseOptions} uploadOptions={uploadOptions} cancelOptions={cancelOptions} />                        
                        <XMLViewer xml={fileDisplay} theme={customTheme} initalCollapsedDepth={1} collapsible />

                    </Card>
                </div>
                <div className="card flex flex-column justify-content-center align-self-start gap-1" style={{ width: '40%' }}>
                    <Card title="File Types" className="w-full" style={{ background: '#eee' }}>
                        Rename the Reference Legend file name to include the word &quot;reference&quot;.
                        <table>
                            <tbody>
                                <tr>
                                    <td width='70px' valign='top'><b>LCHS Files:</b></td>
                                    <td><b>Natively Processed</b></td>
                                </tr>
                                <tr>
                                    <td width='70px' valign='top'><b>LCCS Files:</b></td>
                                    <td><b>Natively Processed</b><br />LCCS 3 and Land Cover Registry (LCLR) are natively processed</td>
                                </tr>
                                <tr>
                                    <td width='70px' valign='top'><b>CSV Files:</b></td>
                                    <td><b>Remap for Processing</b><br />
                                        <b>Data Fields: ID, Color Code(Hex), Class Code, Class Name, Class Description, Elements</b>                                        
                                        <p>Non native legends such as SEEA, Corine etc. should be reformatted to have these datafields for processing. (Note the Elements as separated with a colon &quot;;&quot;)</p> For Example:
                                        <table>
                                            <thead>
                                                <tr>
                                                    <td>ID</td>
                                                    <td>Color Code(Hex)</td>
                                                    <td>Class Code</td>
                                                    <td>Class Name</td>
                                                    <td>Class Description</td>
                                                    <td>Elements</td>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>1</td>
                                                    <td>FF0000</td>
                                                    <td>211</td>
                                                    <td>Non-irrigated arable land</td>
                                                    <td>Cultivated land parcels under rainfed agricultural use</td>
                                                    <td>Vegetation; Growth Forms; Woody Growth Forms; Trees; Shrubs;</td>
                                                </tr>
                                                <tr>
                                                    <td>2</td>
                                                    <td>FF00FF</td>
                                                    <td>SEEA 1</td>
                                                    <td>Herbaceous crops</td>
                                                    <td>Herbaceous crops</td>
                                                    <td>Herbaceous Growth Forms; Graminae; Forbs; Grass;</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Card>
                </div>
            </div>
        </>
    );
};