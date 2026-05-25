import { useRef,useState } from "react";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Card } from "primereact/card";
import html2canvas from 'html2canvas';
import { Builder } from 'xml2js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const Export = (props) => {
    const {
        UUID,
        OBJtoXML,
        Validator,
        translator,            
        searchObj,
        searchObjKeyVal,
        blocks,
        characteristics,
        characteristicLookUp,
        legend,
        LC_Legend,
        LC_Class,
        LC_ClassCharacteristics,
        LC_HorizontalPatterns,
        LC_Strata,
        LC_Properties,
        LC_Characteristics,
        legendValid,
        setExportVisible,
        setFullExport
    }=props;
    const toast = useRef(null);

    let translation = null;
    const genLChS = () => {
        let ClassXteristic = {};
        Object.entries(LC_ClassCharacteristics.current).forEach((Xteristic)=>{
            ClassXteristic = {...ClassXteristic, ["_"+Xteristic[0]]:Xteristic[1]};
        });
        let Legend = {LC_Legend: {
                            $: {...LC_Legend.current},
                            objects: {
                                LC_Class: LC_Class.current,
                                LC_ClassCharacteristics: ClassXteristic,
                                LC_HorizontalPatterns: LC_HorizontalPatterns.current,
                                LC_Strata: LC_Strata.current,
                                LC_Properties: LC_Properties.current,
                                LC_Characteristics: LC_Characteristics.current
                            }   
                        }
                    };
        const builder = new Builder();
        const xml = builder.buildObject(Legend);        
        return xml;
    }
    const genCSV = () => {
        translation = translator['csv'];
        let TranslatedClass = [];
        let buildTranslatedClass = {};
        Object.values(LC_Class.current).forEach((clss)=>{
            buildTranslatedClass = {};
            Object.values(translation['LC_Class']).forEach((translation_element)=>{
                buildTranslatedClass = {...buildTranslatedClass, [translation_element['Translation']]: clss[translation_element['LChS_EquivalentElement']]};               
            });                
            let filterd_HPs = LC_HorizontalPatterns?.current.filter( HP => HP.class_id === clss['class_id'] );
            let elementals = [];
            let displayElements = "";
            if(filterd_HPs !== undefined){
                Object.keys(filterd_HPs).forEach((key0) => {
                    let filterd_strata = LC_Strata?.current.filter( stratum => stratum.HPID === filterd_HPs[key0]["horizontal_pattern_id"] );
                    if(filterd_strata !== undefined){            
                        Object.keys(filterd_strata).forEach((key1) => {
                            let filterd_elements = LC_Properties?.current.filter( properties => properties.StratumID === filterd_strata[key1]["stratumID"] );
                            Object.keys(filterd_elements).forEach((key2) => {
                                let filterd_blocks = blocks?.current["LC_Block"].filter( block => block.block_id === filterd_elements[key2]["BlockID"] );
                                elementals = [...elementals, filterd_blocks[0]["block_reference"]+";"];
                            });
                            let unique = new Set(elementals);
                            unique.forEach((element)=>{
                                displayElements = displayElements+" "+element;
                            });
                            buildTranslatedClass = {...buildTranslatedClass, Elements: displayElements}; 
                            elementals = [];
                        });
                    }
                });
            }
            TranslatedClass.push(buildTranslatedClass);
        });
        const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here
        const header = Object.keys(TranslatedClass[0]);
        const csv = [
                        header.join(','), // header row first
                        ...TranslatedClass.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
                    ].join('\r\n');
        return csv;
    }
    const downloadCSV = () => {
        if(Validator()){            
            const csv = genCSV();
            const file = new Blob([csv], {type: 'text/csv'});
            const element = document.createElement("a");            
            element.href = URL.createObjectURL(file);
            element.download = "LChS_CSVLegend.csv";
            document.body.appendChild(element); // Required for this to work in FireFox
            element.click();
        }
    }
    const downloadChartAsImage = () => {
        if(Validator()){
            html2canvas(document.getElementById("Full Legend")).then((canvas) => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/jpeg');
            link.download = 'LChS_Legend.jpg';
            link.click();
            });
        }
    };
    const downloadLChS = () => {
        if(Validator()){            
            const xml = genLChS();            
            const file = new Blob([xml], {type: 'text/xml'});
            const element = document.createElement("a");
            element.href = URL.createObjectURL(file);
            element.download = "LChS_Legend.lchs";
            document.body.appendChild(element); // Required for this to work in FireFox
            element.click();
        }
    }
    const downloadLCCSFile = () => {
        if(Validator()){
            let patterns = [];
            let strata = [];
            let elementals = [];
            let sub_elementals_chr = [];
            let sub_elementals_prop = [];
            Object.keys(LC_HorizontalPatterns?.current).forEach((key0) => {        
                let filterd_strata = LC_Strata?.current.filter( stratum => stratum.HPID === LC_HorizontalPatterns?.current[key0]["horizontal_pattern_id"] );
                if(filterd_strata !== undefined){            
                    Object.keys(filterd_strata).forEach((key1) => {
                        let filterd_elements = LC_Properties?.current.filter( properties => properties.StratumID === filterd_strata[key1]["stratumID"] );                        
                        Object.keys(filterd_elements).forEach((key2) => {
                            let filterd_blocks = blocks?.current["LC_Block"].filter( block => block.block_id === filterd_elements[key2]["BlockID"] );
                            if(LC_Characteristics?.current.length > 0){
                                let filterd_characteristics = LC_Characteristics?.current.filter( characteristics => characteristics.StratumID === filterd_strata[key1]["stratumID"] && characteristics.BlockID === filterd_elements[key2]["BlockID"] );
                                Object.keys(filterd_characteristics).forEach((key3) => {
                                    let filterd_Characteristics = characteristics?.current["LC_Characteristics"].filter( characteristic => characteristic.characteristic_id === filterd_characteristics[key3]["CharacteristicID"] );
                                    sub_elementals_chr = [...sub_elementals_chr, { [filterd_Characteristics[0]["characteristic_name"]]: {[filterd_Characteristics[0]["elements"][0]["element_name"]]: filterd_characteristics[key3][filterd_Characteristics[0]["elements"][0]["element_name"]] }}];                                    
                                });                                
                            }                            
                            if(LC_Properties?.current.length > 0){
                                let filterd_properties = LC_Properties?.current.filter( properties => properties.StratumID === filterd_strata[key1]["stratumID"] && properties.BlockID === filterd_elements[key2]["BlockID"] );
                                Object.keys(filterd_properties).forEach((key3) => {
                                    let filterd_Properties = blocks?.current["LC_Block"].filter( block => block.block_id === filterd_properties[key3]["BlockID"] );                                    
                                    sub_elementals_prop = [...sub_elementals_prop, { [filterd_Properties[0]["block_name"]]: {[filterd_Properties[0]["elements"][0]["element_name"]]: filterd_properties[key3][filterd_Properties[0]["elements"][0]["element_name"]] }}];
                                });
                            }
                            elementals = [...elementals, { element_name: filterd_blocks[0]["block_name"], Properties: sub_elementals_prop , Characteristics: sub_elementals_chr }];                            
                            sub_elementals_chr = [];
                            sub_elementals_prop = [];
                        });
                        strata = [...strata, { name: filterd_strata[key1]["name"], Element: elementals }];
                        elementals = [];                              
                    });                
                    patterns = [...patterns, { name: LC_HorizontalPatterns?.current[key0]["name"], Strata: strata }];
                }
                strata = [];
            });
            let ClassCharacteristics = [];
            Object.entries(LC_ClassCharacteristics.current).forEach((ClassCharacteristic)=>{
                if(ClassCharacteristic[0] !== "legend_id" && ClassCharacteristic[0] !== "id"){                
                    if(legend["LC_ClassCharacteristics"] !== undefined){
                        let characteristicTemplate = searchObj(legend["LC_ClassCharacteristics"],ClassCharacteristic[0]);                    
                        let CC_elements = {};
                        Object.entries(ClassCharacteristic[1]).forEach((Element)=>{                                                       
                            let elementTemplate = searchObj(characteristicTemplate[0].elements,Element[0]);
                            if(elementTemplate[0] !== undefined)
                                CC_elements = {...CC_elements, [elementTemplate[0].element_name]: Element[1] };
                        });
                        if(characteristicTemplate[0] !== undefined){
                            ClassCharacteristics = {...ClassCharacteristics, [characteristicTemplate[0]['characteristic_name']]: CC_elements};
                        }
                    }
                }   
            });            
            let Legend = {                            
                            name: LC_Legend.current.legend_name,
                            description: LC_Legend.current.legend_description, 
                            author: LC_Legend.current.legend_author,
                            elements: {
                                LC_LandCoverClass: {
                                    name: LC_Class.current.class_name,
                                    description: LC_Class.current.class_description,
                                    map_code: LC_Class.current.class_map_code,
                                    color_code: LC_Class.current.class_color_code,
                                    elements: {
                                        ClassCharacteristics: ClassCharacteristics,
                                        HorizontalPatterns: {...patterns}
                                    }
                                }
                            }                            
                        };

            let LChS_Legend = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<LC_Legend xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="1" uuid="`+UUID+`" xsi:noNamespaceSchemaLocation="LCML.xsd" xsi:type="LC_Legend">
    `+OBJtoXML(Legend)+`
</LC_Legend>
        `;

            const element = document.createElement("a");
            const file = new Blob([LChS_Legend], {type: 'text/xml'});
            element.href = URL.createObjectURL(file);
            element.download = "LChS_Legend.xml";
            document.body.appendChild(element); // Required for this to work in FireFox
            element.click();
        }
    }
  
    const fullExport = () => {
        if(Validator()){
            setExportVisible(false);
            setFullExport(true);
        }
    };
    return (
        <div className="flex flex-column gap-2">
            <Toast ref={toast} />
            <Card title="Complete:" subTitle="Export the full legend. LChS file, LCML XSD file, legend diagram, class diagrams and CSV file. [ZIP]" className="w-full text-s" style={{ background: '#eee', fontSize: '70%' }}>
                <div className="flex align-items-center justify-content-center">
                    <Button onClick={fullExport} icon="pi pi-download" raised />
                </div>                
            </Card>
            <Card title="LChS:" subTitle="Export Land CHaracterization System format. [XML]" className="w-full" style={{ background: '#eee', fontSize: '70%' }}>
                <div className="flex align-items-center justify-content-center">
                    <Button onClick={downloadLChS} icon="pi pi-download" raised />
                </div>
            </Card>
            {/*<Card title="Diagram:" subTitle="Export Legend Diagram. [JPEG]" className="w-full" style={{ background: '#eee' }}>
                <div className="flex align-items-center justify-content-center">
                    <Button onClick={downloadChartAsImage} icon="pi pi-download" raised />
                </div>
            </Card>
            <Card title="LCCS" subTitle="Export Land Cover Classification System Format. [LCCS]" className="w-full" style={{ background: '#eee' }}>
                <div className="flex align-items-center justify-content-center">
                    <Button onClick={downloadLChS} icon="pi pi-download" raised />
                </div>
            </Card>*/}
            <Card title="CSV" className="w-full" style={{ background: '#eee', fontSize: '70%' }}>
                <div className="flex align-items-center justify-content-center">
                    <Button onClick={downloadCSV} icon="pi pi-download" raised />
                </div>
            </Card>
        </div>
    );
}
