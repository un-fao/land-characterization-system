import { useEffect,useState } from 'react';
import Mermaid from './mermaid';

import './flow.css';

export const Legend = (props) => {
 const { rerenderTrigger,setRerenderTrigger,blocks,blockLookUp,LC_Legend,LC_Class,LC_ClassCharacteristics,LC_HorizontalPatterns,LC_Strata,LC_Properties,characteristics,characteristicLookUp,LC_Characteristics,legendValid,activeLCElement,setActiveLCElement } = props;
 const [flowDefinition,setFlowDefinition] = useState<any>(``);
 useEffect(()=>{
    // Helper function to recursively find root parent of a block
    const getRootParent = (blockID, lookupTable) => {
        if (!lookupTable || !lookupTable.current || !lookupTable.current["LC_Block-LC_Block"]) {
            return null;
        }
        
        const lookup = lookupTable.current["LC_Block-LC_Block"];
        const block = lookup.find(b => b.block_id === blockID);
        
        if (!block) return null;
        if (block.parent_id === null) return block.block_id; // This is a root
        
        // Recursively find parent
        return getRootParent(block.parent_id, lookupTable);
    };
    
    // Helper function to determine block color based on root ancestry
    const getBlockColor = (blockID, lookupTable) => {
        const rootParent = getRootParent(blockID, lookupTable);
        
        if (rootParent === null) {
            return '#eee'; // Default gray if not found
        }
        
        // Check the root parent's description to determine type
        const lookup = lookupTable.current["LC_Block-LC_Block"];
        const rootBlock = lookup.find(b => b.block_id === rootParent);
        
        if (rootBlock) {
            // Vegetation root has "Vegetation" in description
            if (rootBlock.description && rootBlock.description.toLowerCase().includes('vegetation')) {
                return '#90EE90'; // Light green
            }
            // Abiotic root has "Abiotic" in description
            if (rootBlock.description && rootBlock.description.toLowerCase().includes('abiotic')) {
                return '#FFB6C1'; // Light pink
            }
        }
        
        return '#eee'; // Default gray
    };
    
    // Helper function to format display value
    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') {
            return null; // Don't display
        }
        if (Array.isArray(value)) {
            return `[${value[0]} - ${value[1]}]`;
        }
        if (typeof value === 'object' && value.label) {
            return value.label;
        }
        return String(value).replace(/[`()<>\{\}\[\]\\\/]\'\"/gi, ' ');
    };
    
    // Helper function to build display string for an object's properties
    const buildDisplayString = (obj, excludeKeys = []) => {
        let display = '';
        const defaultExcludes = ['id', 'legend_id', 'class_id', 'HPID', 'stratumID', 'StratumID', 
                                 'BlockID', 'BlockReference', 'CharacteristicID', 
                                 'CharacteristicReference', 'horizontal_pattern_id'];
        const allExcludes = [...defaultExcludes, ...excludeKeys];
        
        Object.entries(obj).forEach(([key, value]) => {
            // Skip excluded keys
            if (allExcludes.includes(key)) return;
            
            // Skip keys ending with '-name' or '-description' for Class Characteristics
            if (key.endsWith('-name') || key.endsWith('-description')) return;
            
            const formattedValue = formatValue(value);
            if (formattedValue !== null) {
                // Convert key to readable format
                const readableKey = key.charAt(0).toUpperCase() + 
                                   key.slice(1).replace(/_/g, ' ');
                display += `\n${readableKey}: ${formattedValue}`;
            }
        });
        
        return display;
    };

    let classes = [];
    let styles = `style A fill:#91AEC4,stroke:#333,stroke-width:2px,color:#fff`;
    let edits = `click A call emptyCall("Legend","A_1") "Edit Legend Information"`;
    let filterd_classes = LC_Class?.current.filter( clss => clss.legend_id === LC_Legend?.current["id"] );
    if(filterd_classes !== undefined){
        Object.keys(filterd_classes).forEach((key0) => {
            let class_id = filterd_classes[key0].class_id;
            let DisplayClassCharacteristics = ``;            
            if(LC_ClassCharacteristics.current[class_id] !== undefined){
                Object.entries(LC_ClassCharacteristics.current[class_id]).forEach((ClassXteristic)=>{
                    if(ClassXteristic[0] !== "legend_id" && ClassXteristic[0] !== "id" && ClassXteristic[1][ClassXteristic[0]+'-name'] !== undefined && ClassXteristic[1][ClassXteristic[0]+'-name'] !== ""){
                        DisplayClassCharacteristics = DisplayClassCharacteristics+`
                                            `           +String(ClassXteristic[0]).charAt(0).toUpperCase()+String(ClassXteristic[0]).slice(1).replaceAll("_"," ")+`: `+String(ClassXteristic[1][ClassXteristic[0]+'-name']);
                    }                    
                });
            }

            let filterd_HPs = LC_HorizontalPatterns?.current.filter( HP => HP.class_id === class_id );
            let patterns = [];
            let strata = [];
            let elementals = [];            
            if(filterd_HPs !== undefined){
                Object.keys(filterd_HPs).forEach((key1) => {
                    let filterd_strata = LC_Strata?.current.filter( stratum => stratum.HPID === filterd_HPs[key1]["horizontal_pattern_id"] );
                    if(filterd_strata !== undefined){            
                        Object.keys(filterd_strata).forEach((key2) => {
                            let filterd_elements = LC_Properties?.current.filter( properties => properties.StratumID === filterd_strata[key2]["stratumID"] );
                            Object.keys(filterd_elements).forEach((key3) => {
                                let filterd_blocks = blocks?.current["LC_Block"].filter( block => block.block_id === filterd_elements[key3]["BlockID"] );
                                let filterd_xteristics = LC_Characteristics?.current.filter( characteristics => characteristics.StratumID === filterd_strata[key2]["stratumID"] && characteristics.BlockID === filterd_blocks[0]["block_id"] );
                                let character = "";
                                if(filterd_xteristics.length > 0){
                                    character = `E_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+` -.- F_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+'_'+filterd_xteristics.length+`[["fa:fa-paperclip `;
                                    Object.values(filterd_xteristics).forEach((entry) => {
                                        Object.entries(entry).forEach((XStic)=>{
                                            if(XStic[0] === "CharacteristicLabel" || XStic[0] === "name"){
                                                character = character+`\n&lcub;`+XStic[1]+`&rcub;`;
                                            }
                                            else if(XStic[0] !== "StratumID" && XStic[0] !== "stratumID" && XStic[0] !== "BlockID" && XStic[0] !== "CharacteristicID" && XStic[0] !== "description" && XStic[1] !== undefined && XStic[1] !== ""){
                                                let leftBracket = "";
                                                let rightBracket = "";
                                                if(Array.isArray(XStic[1])){
                                                    leftBracket = "&lsqb;";
                                                    rightBracket = "&rsqb;";
                                                    XStic[1] = XStic[1][0]+" "+XStic[1][1];
                                                }
                                                character = character+`\n`+XStic[0]+` - `+leftBracket+String(XStic[1])+rightBracket;
                                            }   
                                        });
                                    });
                                    character = character+`"]]`;
                                    styles = styles+`
                                    style F_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+'_'+filterd_xteristics.length+` fill:#fff4dd, stroke:#6366f1, stroke-width:0.5px`;
                                    edits = edits+`
                                    click F_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+'_'+filterd_xteristics.length+` call emptyCall("Characteristics","F_1_1_1_1_1_1_1") "Edit Characteristics"`;
                                }                                
                                elementals = [...elementals, [ `D_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+"_"+filterd_strata[key2]["stratumID"]+` --- E_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+`("fa:`+filterd_blocks[0]["block_icon"].slice(25)+` `+String(filterd_blocks[0]["block_label"])+`
                                                                                                                                                                                                                                                                                                                                Presence Type: `+filterd_elements[key3]["elementPresenceType"]+`
                                                                                                                                                                                                                                                                                                                                Cover: `+filterd_elements[key3]["cover"]+`%")`, character ]];
                                styles = styles+`
                                style E_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+` fill:#fff4dd, stroke:#6366f1, stroke-width:0.5px`;
                                edits = edits+`
                                click E_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+` call emptyCall("Property","E_1_1_1_1_1_1") "Edit Property"`;
                            });                            
                            strata = [...strata, [ `C_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+` --- D_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`(["fa:fa-minus `+filterd_strata[key2]["name"]+`
                                                                                                                                                                                            Presence Type: `+filterd_strata[key2]["presenceType"]+`"])`, ...elementals ]];
                            styles = styles+`
                            style D_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+"_"+filterd_strata[key2]["stratumID"]+` text-align:left, stroke:#6366f1, stroke-width:0.5px`;
                            edits = edits+`
                            click D_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+"_"+filterd_strata[key2]["stratumID"]+` call emptyCall("Stratum","D_1_1_1_1_1") "Edit Stratum"`;
                            elementals = [];
                        });
                        patterns = [...patterns, [ `A`+class_id+` --- C_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`([fa:fa-bars `+String(filterd_HPs[key1]["name"])+`
                                                                                                                    Cover: `+filterd_HPs[key1]["cover"]+`%
                                                                                                                    Occurrence: `+filterd_HPs[key1]["occurrence"]+`])`, ...strata ]];
                        styles = styles+`
                        style C_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+` text-align:left, stroke:#6366f1, stroke-width:0.5px`;
                        edits = edits+`
                        click C_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+` call emptyCall("Horizontal Pattern","C_1_1_1_1") "Edit Horizontal Pattern"`;
                    }
                    strata = [];
                });
            }            

            classes = [...classes, 
                                [
                                    `A(fa:fa-briefcase `+LC_Legend.current.legend_name+`) --- A`+class_id+`("fa:fa-folder-open `+String(filterd_classes[key0]["class_name"])+`
                                                                                                        Map Code: `+String(filterd_classes[key0]["class_map_code"])+`")`,
                                    [
                                        [
                                            `A`+class_id+` -.- B`+class_id+`[[fa:fa-gears Class Characteristics:`+DisplayClassCharacteristics+` ]]`
                                        ],
                                        ...patterns
                                    ] 
                                ]
                            ];
            styles = styles+`
            style A`+class_id+` stroke:#6366f1, stroke-width:0.5px
            style B`+class_id+` text-align:left, fill:#eee, stroke:#6366f1, stroke-width:0.5px`;
            edits = edits+`            
            click A`+class_id+` call emptyCall("Class","A_1_1") "Edit Class Information"
            click B`+class_id+` call emptyCall("Class Characteristics","B_1_`+class_id+`") "Edit Class Characteristics"`;
        });
    };    
    
    let subFlow = "";
    classes.flat(Infinity).map((line)=>{
        subFlow = subFlow+`
                `+line;
    });
    let buildFlow = `flowchart LR   
    `+subFlow+`
    `+styles+`
    `+edits;
    setFlowDefinition(buildFlow);
 },[rerenderTrigger]);

return (    
    <Mermaid chart={flowDefinition} legendValid={legendValid} setActiveLCElement={setActiveLCElement} />
 );
};