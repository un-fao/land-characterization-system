import { useState,useRef,useEffect } from 'react';
import XMLViewer from 'react-xml-viewer';
import { FileUpload, FileUploadHeaderTemplateOptions, FileUploadSelectEvent, FileUploadHandlerEvent, ItemTemplateOptions } from 'primereact/fileupload';
import { ProgressBar } from 'primereact/progressbar';
import { Tooltip } from 'primereact/tooltip';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Card } from 'primereact/card';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import axios from 'axios';

export const LegendLoader = (props) => {
    const {UUID,
            translator,
            legend,
            searchObj,
            searchObjKeyVal,
            setRerenderTrigger,
            blocks,
            characteristicLookUp,
            characteristics,
            elements,
            LC_Legend,
            LC_Class,
            classesNumber,
            LC_ClassCharacteristics,          
            LC_HorizontalPatterns,
            LC_Strata,
            horizontalPatternNumber,
            strataNumber,
            LC_Properties,
            stratumPropertyNumber,
            LC_Characteristics,
            stratumCharacteristicNumber,
            setFileUploadVisible,
            translateLegend
        } = props;

    const toast = useRef<Toast>(null);

    const [fileContent, setFileContent] = useState(null);
    const handleFileChange = (event) => {
        const file = event.files[0];
        if(file){
            const reader = new FileReader();
            let header = null;
            reader.onload = (e) => {
                let LegendType = file.name.split(".").pop().toLowerCase();
                if(LegendType === "csv"){
                    header = String(e.target.result).split("\r\n")[0];
                    setFileContent("<data_fields>"+header+"</data_fields>");
                }
                else if(LegendType === "lchs" || LegendType === "lccs" || LegendType === "xml")
                    setFileContent(e.target.result);
                else
                    setFileContent("<error>LChS only supports LChS, LCCS and CSV legends at the moment.</error>");
            };
            reader.readAsText(file);
            setTotalSize(file.size);
        }
    };
    const customTheme = {
        attributeKeyColor: "#0074D9",
        attributeValueColor: "#2ECC40"
    };
    const importLegend = (upload) => {
        toast.current.show({ severity: 'info', summary: 'Processing ...', detail: "Processing Land Cover File, Please Wait..."});
        const file = upload.files[0];
        if(file){
            const reader = new FileReader();
            reader.onload = (e) => {                
                let Legend = e.target.result;
                let LegendType = file.name.split(".").pop().toLowerCase();
                translateLegend(Legend,LegendType,file.name);
            };
            reader.readAsText(file);
        }
    }

    const [totalSize, setTotalSize] = useState(0);
    const fileUploadRef = useRef<FileUpload>(null);    
    const onTemplateClear = () => {
        setTotalSize(0);
        setFileContent(null);
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
                        <small>{new Date(file.lastModified).toDateString()}</small>
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
                    Drag and Drop Legend File Here
                </span>
            </div>
        );
    };

    const chooseOptions = { icon: 'fa-regular fa-file-code', iconOnly: true, className: 'custom-choose-btn p-button-rounded p-button-outlined' };
    const uploadOptions = { icon: 'pi pi-fw pi-cloud-upload', iconOnly: true, className: 'custom-upload-btn p-button-success p-button-rounded p-button-outlined' };
    const cancelOptions = { icon: 'pi pi-fw pi-times', iconOnly: true, className: 'custom-cancel-btn p-button-danger p-button-rounded p-button-outlined' };

    interface CatalogItem {
        // Define your JSON structure here
        "itemIdentifier": number,
        "date": string,
        "name": string,
        "alphaCode": string,
        "status": string,
        "code": string,
        "dataset_Id": string,
        "ID_ref": string,
        "country": string,
        "M49CountryCode": number,
        "ISO3CountryCode": string,
        "year": number,
        "subCountryCode_GADM": number,
        "subCountryRegionName": string,
        "UNRegion": string,
        "SubUNRegion": string,
        "Geonetwork": string,
        "FAOSupported": string,
        "Accessibility": string,
        "legend_Type": string,
        "data_Folder": string,
        "data_Label": string,
        "source_reference": string,
        ".xsd": string,
        ".htm": string,
        ".lccs": string,
        ".sho": string,
        ".eapx": string,
        ".shelf": string,
        ".csv": string,
        "class": string,
        "dataset": string,
        "references": string
        // Add other properties as needed
    }    
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('https://us-central1-fao-maps-review.cloudfunctions.net/getLandCoverLegend');                
                setCatalog(response.data.filter(Legends => Legends.status === "valid"));
            } catch (error) {
                console.error('Error fetching data:', error);
                alert('Error contacting Land Cover Registry, please try again!');
            }
        };
        fetchData();
    }, []);
    const [LCCS, setLCCS] = useState<any>(null);
    const processLCLR = (LCCSFile)=>{
        toast.current.show({ severity: 'info', summary: 'Processing ...', detail: "Processing Land Cover Registry Legend, Please Wait..." });
        const fetchLCCS = async () => {
            try {
                const response = await axios.get('https://storage.googleapis.com/fao-hih-gs-website-review/resources/lclr/legend/'+LCCSFile);
                setLCCS(response.data);
            } catch (error) {
                console.error('Error fetching data:', error);
                alert('Error accessing registry file, please try again!');
            }
        };
        fetchLCCS();
    }
    useEffect(() => {
        translateLegend(LCCS,"lccs");
    }, [LCCS]);

    const fileTemplate = (link) => {
        return <i className="pi pi-copy" onClick={()=>processLCLR(link[".lccs"])} style={{ cursor: 'pointer' }}></i>;
    };
    const fileNameTemplate = (link) => {
        return <p onClick={()=>processLCLR(link[".lccs"])} style={{ cursor: 'pointer' }}>{link.name} ({new Date(link.date).toDateString()})</p>;
    };

    return (
            <div className="m-0 p-0" style={{ overflow: 'hidden' }}>
                <Card subTitle="Select Legend Source" className="w-full m-0 p-0">
                    <Toast ref={toast}></Toast>
                    <TabView>
                        <TabPanel header="Legend File" className="w-full m-0 p-0">
                            <Tooltip target=".custom-choose-btn" content="Select Legend" position="bottom" />
                            <Tooltip target=".custom-upload-btn" content="Load Legend (Careful, this will overwrite your current Legend!)" position="bottom" />
                            <Tooltip target=".custom-cancel-btn" content="Clear Loaded Legend" position="bottom" />
                            <div className="card flex flex-column gap-2 m-1 p-1 overflow-auto w-full">
                                <div className="card flex flex-column justify-content-center align-self-start" style={{ width: '100%' }}>                                    
                                    <FileUpload name="Legend" accept=".lchs, .lccs, .xml, .csv" maxFileSize={1000000} onSelect={(e: FileUploadSelectEvent)=>handleFileChange(e)} customUpload uploadHandler={(e: FileUploadHandlerEvent)=>importLegend(e)}
                                        ref={fileUploadRef} onError={onTemplateClear} onClear={onTemplateClear} headerTemplate={headerTemplate} itemTemplate={itemTemplate} emptyTemplate={emptyTemplate} chooseOptions={chooseOptions} uploadOptions={uploadOptions} cancelOptions={cancelOptions} />
                                    {fileContent && <XMLViewer xml={fileContent} theme={customTheme} initalCollapsedDepth={3} collapsible />}                                    
                                </div>

                                <div className="card flex flex-column justify-content-center align-self-start gap-1" style={{ width: '500px' }}>
                                    <Card title="File Types" className="w-full" style={{ width: 'fit-contents', background: '#eee' }}>
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
                        </TabPanel>
                        <TabPanel header="Land Cover Registry (LCLR)">
                            <div className="flex flex-column m-0 p-0 w-full" style={{ width: '100%' }}>
                                <DataTable value={catalog} size="small" stripedRows removableSort emptyMessage="No legends found in registry">
                                    <Column field="itemIdentifier" header="ID" />
                                    <Column field="name" sortable filter header="Name" body={fileNameTemplate} />
                                    <Column field=".lccs" header="Load" body={fileTemplate} />
                                </DataTable>
                                <p className="flex">Loading ... <i className="pi pi-spin pi-cog"></i></p>
                            </div>                            
                        </TabPanel>
                    </TabView>
                </Card>
            </div>
        );
};