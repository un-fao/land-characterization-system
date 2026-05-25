import { useState,useRef,useEffect, act } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { MermaidChart } from './MermaidChart';
import MermaidChartRender from './MermaidChartRender';
import * as htmlToImage from 'html-to-image';
import { Builder } from 'xml2js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Toast } from 'primereact/toast';

import './flow.css';

export const TabsComponent = (props) => {
  const { rerenderTrigger,translator,blocks,blockLookUp,legend,options,normalizeColor,LC_Legend,LC_Class,LC_ClassCharacteristics,LC_HorizontalPatterns,LC_Strata,LC_Properties,characteristics,characteristicLookUp,LC_Characteristics,legendValid,activeLCElement,setActiveLCElement,triggerFullExport,setFullExport } = props;  
  const ClassTabs = useRef([]);
  const [flowDefinition,setFlowDefinition] = useState<any>(``);

  // TabsComponent.tsx - Updated useEffect with helper functions and dynamic display
    useEffect(() => {  
        // ===== HELPER FUNCTIONS =====
        
        // Helper function to convert variable names to readable labels
        // Handles: camelCase, snake_case, PascalCase
        // Examples: 
        //   "elementPresenceType" -> "Element Presence Type"
        //   "element_presence_type" -> "Element Presence Type"
        //   "ElementPresenceType" -> "Element Presence Type"
        const toReadableLabel = (str) => {
            if (!str) return '';
            
            return str
                // First, replace underscores with spaces
                .replace(/_/g, ' ')
                // Insert space before capital letters (for camelCase/PascalCase)
                .replace(/([A-Z])/g, ' $1')
                // Capitalize first letter of each word
                .replace(/^\w/, (c) => c.toUpperCase())
                // Clean up multiple spaces
                .replace(/\s+/g, ' ')
                // Trim leading/trailing spaces
                .trim();
        };
        
        // Helper function to recursively find root parent of a block
        const getRootParent = (blockID, lookupTable) => {
            if (!lookupTable || !lookupTable.current || !lookupTable.current["LC_Block-LC_Block"]) {
                return null;
            }
            
            const lookup = lookupTable.current["LC_Block-LC_Block"];
            const block = lookup.find(b => b.block_id === blockID);
            
            if (!block) return null;
            if (block.parent_id === null) return block.block_id;
            
            return getRootParent(block.parent_id, lookupTable);
        };
        
        // Helper function to get all ancestors up to root
        const getAncestorPath = (blockID, lookupTable) => {
            if (!lookupTable || !lookupTable.current || !lookupTable.current["LC_Block-LC_Block"]) {
                return [];
            }
            
            const lookup = lookupTable.current["LC_Block-LC_Block"];
            const path = [];
            let currentBlock = lookup.find(b => b.block_id === blockID);
            
            while (currentBlock) {
                path.push(currentBlock);
                if (currentBlock.parent_id === null) break;
                currentBlock = lookup.find(b => b.block_id === currentBlock.parent_id);
            }
            
            return path;
        };

        // MODIFIED getBlockColor function - replace the existing one:
        const getBlockColor = (blockID, lookupTable) => {
            const rootParent = getRootParent(blockID, lookupTable);
            
            if (rootParent === null) {
                return '#eee';
            }
            
            const lookup = lookupTable.current["LC_Block-LC_Block"];
            const rootBlock = lookup.find(b => b.block_id === rootParent);
            
            if (rootBlock && rootBlock.description) {
                if (rootBlock.description.toLowerCase().includes('vegetation')) {
                    return '#D0F0C0'; // Light green
                }
                else if (rootBlock.description.toLowerCase().includes('abiotic')) {
                    // Get the full path from this block to root
                    const ancestorPath = getAncestorPath(blockID, lookupTable);
                    
                    // Check if any ancestor (except root) has "water" in description
                    // ancestorPath[0] is current block, last is root, so check middle ones
                    for (let i = 0; i < ancestorPath.length - 1; i++) {
                        if (ancestorPath[i].description && 
                            ancestorPath[i].description.toLowerCase().includes('water')) {
                            return '#87CEEB'; // Sky blue (water blue)
                        }
                        if (ancestorPath[i].description && 
                            ancestorPath[i].description.toLowerCase().includes('natural')) {
                            return '#E3D2B5'; // Brown
                        }
                    }
                    
                    return '#FFB6C1'; // Light pink (abiotic)
                }
            }
            
            return '#eee';
        };

        // Helper function to get block icon from block_icon field
        const getBlockIcon = (blockID, blocksData) => {
            if (!blocksData || !blocksData.current || !blocksData.current["LC_Block"]) {
                return 'fa:fa-cube'; // Default icon
            }
            
            const block = blocksData.current["LC_Block"].find(b => b.block_id === blockID);
            if (!block || !block.block_icon) {
                return 'fa:fa-cube'; // Default icon
            }
            
            // Extract the last part of block_icon (e.g., "text-xs p-0 m-1 fa-solid fa-leaf" -> "fa-leaf")
            const iconString = block.block_icon.trim();
            if (!iconString) {
                return 'fa:fa-cube'; // Default if empty
            }
            
            const iconParts = iconString.split(' ');
            const lastPart = iconParts[iconParts.length - 1]; // Get "fa-leaf"
            
            // Remove "fa-" prefix if present and add "fa:" prefix for mermaid
            const iconName = lastPart.replace('fa-', '');
            return `fa:fa-${iconName}`;
        };

        // Add a new helper function to get characteristic definition and symbols
        const getCharacteristicBlock = (characteristicID, characteristicsData) => {
            if (!characteristicsData || !characteristicsData.current || !characteristicsData.current["LC_Characteristics"]) {
                return null;
            }
            return characteristicsData.current["LC_Characteristics"].find(c => c.characteristic_id === characteristicID);
        };

        const getClassCharacteristicBlock = (characteristicName, legendData) => {
            if (!legendData || !legendData["LC_ClassCharacteristics"]) {
                return null;
            }
            
            return legendData["LC_ClassCharacteristics"].find(
                c => c.characteristic_name === characteristicName
            );
        };

        const getStratumBlock = (legendData) => {
            if (!legendData || !legendData["LC_Patterns"]) {
                return null;
            }
            // Stratum has pattern_name "stratum"
            return legendData["LC_Patterns"].find(p => p.pattern_name === "stratum");
        };

        const getHorizontalPatternBlock = (legendData) => {
            if (!legendData || !legendData["LC_Patterns"]) {
                return null;
            }
            // Horizontal Pattern has pattern_name "horizontalPattern"
            return legendData["LC_Patterns"].find(p => p.pattern_name === "horizontal_pattern");
        };

        // Helper function to check if a range value is the default (full range)
        const isDefaultRange = (value, elementRules) => {
            if (!Array.isArray(value) || !elementRules) {
                return false;
            }
            
            // Check if the value matches [min, max] from element_rules
            const min = elementRules.min;
            const max = elementRules.max;
            
            return value.length === 2 && 
                   value[0] === min && 
                   value[1] === max;
        };

        // Helper function to format display value
        const formatValue = (value) => {
            if (value === null || value === undefined || value === '') {
                return null;
            }
            if (Array.isArray(value)) {
                return `${value[0]} - ${value[1]}`;
            }
            if (typeof value === 'object' && value.label) {
                return value.label;
            }
            return String(value).replace(/[`()<>\{\}\[\]\\\/\'\"]/gi, ' ');
        };
        
        // Helper function to build display string for an object's properties
        const buildDisplayString = (obj, block = null, excludeKeys = []) => {
            if (!obj || typeof obj !== 'object') return '';
            
            let display = '';
            const defaultExcludes = ['id', 'legend_id', 'class_id', 'HPID', 'stratumID', 'StratumID', 
                                    'BlockID', 'BlockReference', 'CharacteristicID', 
                                    'CharacteristicReference', 'horizontal_pattern_id', 'CharacteristicLabel',
                                    'elementID', 'formElementID', 'objectID', 'objectReference'];
            const allExcludes = [...defaultExcludes, ...excludeKeys];
            
            try {
                Object.entries(obj).forEach(([key, value]) => {
                    if (allExcludes.includes(key)) return;
                    if (key.endsWith('name') || key.endsWith('description') || key.endsWith('instanceIndex')) return;
                    
                    // Get the element definition if block is provided
                    let element = null;
                    if (block && block.elements) {
                        element = block.elements.find(e => e.element_name === key);
                    }
                    
                    // Filter out default range values
                    if (Array.isArray(value) && element && element.element_rules) {
                        if (isDefaultRange(value, element.element_rules)) {
                            return; // Skip displaying this default range
                        }
                    }
                    
                    // Format the value
                    let formattedValue = null;
                    if (value === null || value === undefined || value === '') {
                        return;
                    }
                    if (Array.isArray(value)) {
                        formattedValue = `${value[0]} - ${value[1]}`;
                    } else if (typeof value === 'object' && (value as any).label) {
                        formattedValue = (value as any).label;
                    } else {
                        formattedValue = String(value).replace(/[`()<>\{\}\[\]\\\/\'\"]/gi, ' ');
                    }
                    
                    // If block is provided, look up symbol for this element
                    if (element && element.element_rules && element.element_rules.symbol) {
                        const symbol = element.element_rules.symbol;
                        if (symbol) {
                            formattedValue = formattedValue + symbol;
                        }
                    }
                    
                    const readableKey = toReadableLabel(key);
                    display += `\n${readableKey}: ${formattedValue}`;
                });
            } catch (error) {
                console.error('Error in buildDisplayString:', error, obj);
                return '';
            }
            
            return display;
        };

        // Helper function to highlight active element
        const getActiveNodeId = (activeLCElement) => {
            if (!activeLCElement) return null;
            
            const parts = activeLCElement.split('|');
            
            // Map the element key to the node ID format used in mermaid
            // Legend: "A|1" -> "A"
            if (parts.length === 2 && parts[0] === 'A') {
                return 'A';
            }
            
            // Class: "A|1|123" -> "A123"
            if (parts.length === 3) {
                return `A${parts[2]}`;
            }
            
            // Class Characteristics: "A|1|123|CHARACTERISTICS" -> "B123"
            if (parts.length === 4 && parts[3] === 'CHARACTERISTICS') {
                return `B${parts[2]}`;
            }
            
            // Horizontal Pattern: "A|1|123|1|456" -> "C_1_123_1_456"
            if (parts.length === 5) {
                return `C_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}`;
            }
            
            // Stratum: "A|1|123|1|456|789" -> "D_1_123_1_456_789"
            if (parts.length === 6) {
                return `D_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}`;
            }
            
            // Property: "A|1|123|1|456|789|1001" -> "E_1_123_1_456_789_1001"
            // Check if it's a special presence type by examining the last part
            if (parts.length === 7) {
                const lastPart = parts[6];
                // Check if last part is a suffix like "seq0", "excl0", etc.
                if (/^(seq|excl)\d+$/.test(lastPart)) {
                    // This was normalized from a special type, but we don't have the actual node ID
                    // We need to handle this differently - just return the base node for now
                    // The highlighting won't work perfectly but the form will load
                    return `E_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[6]}`;
                }
                // Regular property
                return `E_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[6]}`;
            }
            
            // Temporal/Exclusive Property: "A|1|123|1|456|789|1001|seq0" -> "ESeq_1_123_1_456_789_1001_seq0"
            // or "A|1|123|1|456|789|1001|excl0" -> "EExcl_1_123_1_456_789_1001_excl0"
            if (parts.length === 8) {
                const suffix = parts[7];
                if (/^seq\d+$/.test(suffix)) {
                    return `ESeq_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[6]}_${suffix}`;
                } else if (/^excl\d+$/.test(suffix)) {
                    return `EExcl_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[6]}_${suffix}`;
                }
                // Fallback for any other 8-part format
                return `E_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[6]}_${parts[7]}`;
            }

            // Temporal/Exclusive Characteristics: "A|1|123|1|456|789|1001|seq0|2" -> "FSeq_1_123_1_456_789_1001_seq0_2"
            // or "A|1|123|1|456|789|1001|excl0|2" -> "FExcl_1_123_1_456_789_1001_excl0_2"
            if (parts.length === 9) {
                const suffix = parts[7];
                if (/^seq\d+$/.test(suffix)) {
                    return `FSeq_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[6]}_${suffix}_${parts[8]}`;
                } else if (/^excl\d+$/.test(suffix)) {
                    return `FExcl_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[6]}_${suffix}_${parts[8]}`;
                }
                // Regular characteristics
                return `F_${parts[1]}_${parts[2]}_${parts[3]}_${parts[4]}_${parts[5]}_${parts[6]}_${parts[7]}_${parts[8]}`;
            }
            
            return null;
        };
        
        // ===== MAIN CHART BUILDING CODE =====
        
        let classes = [];
        let indvClasses = [];
        let styles = `style A fill:#91AEC4,stroke:#333,stroke-width:2px,color:#fff`;
        let edits = `click A call emptyCall("Legend","A_1") "Edit Legend Information"`;
        let filterd_classes = LC_Class?.current.filter( clss => clss.legend_id === LC_Legend?.current["id"] );
        
        if(filterd_classes !== undefined){
            Object.keys(filterd_classes).forEach((key0) => {
                let class_id = filterd_classes[key0].class_id;
                
                // Build Class Characteristics display
                let DisplayClassCharacteristics = ``;            
                if(LC_ClassCharacteristics.current[class_id] !== undefined){
                    Object.entries(LC_ClassCharacteristics.current[class_id]).forEach((ClassXteristic)=>{
                        const charName = ClassXteristic[0];
                        const charData = ClassXteristic[1];
                        
                        if(charName !== "legend_id" && charName !== "id"){
                            // Get readable characteristic name
                            const readableCharName = toReadableLabel(charName);
                            
                            // Get the characteristic "block" (definition) for symbols
                            const charBlock = getClassCharacteristicBlock(charName, legend);
                            
                            // Build display
                            let charEntries = '';
                            const nameKey = charName + '-name';
                            const descKey = charName + '-description';
                            
                            // Show name first if exists (on same line as characteristic name)
                            if(charData[nameKey] !== undefined && charData[nameKey] !== ""){
                                charEntries += charData[nameKey];
                            }
                            
                            // Process other fields
                            Object.entries(charData).forEach(([key, value]) => {
                                if(key === nameKey || key === descKey) return;
                                
                                // Get the element definition to check if it's a default range
                                let element = null;
                                if (charBlock && charBlock.elements) {
                                    const fieldName = key.replace(charName + '-', '');
                                    element = charBlock.elements.find(e => e.element_name === fieldName);
                                }
                                
                                // Filter out default range values for Class Characteristics
                                if (Array.isArray(value) && element && element.element_rules) {
                                    if (isDefaultRange(value, element.element_rules)) {
                                        return; // Skip displaying this default range
                                    }
                                }
                                
                                // Format value
                                let formattedValue = null;
                                if (value === null || value === undefined || value === '') return;
                                
                                if (Array.isArray(value)) {
                                    formattedValue = `${value[0]} - ${value[1]}`;
                                } else if (typeof value === 'object' && (value as any).label) {
                                    formattedValue = (value as any).label;
                                } else {
                                    formattedValue = String(value).replace(/[`()<>\{\}\[\]\\\/\'\"]/gi, ' ');
                                }
                                
                                // Find symbol
                                let symbol = '';
                                if (element && element.element_rules && element.element_rules.symbol) {
                                    symbol = element.element_rules.symbol;
                                }
                                
                                if (symbol) {
                                    formattedValue = formattedValue + symbol;
                                }
                                
                                // Extract field name WITHOUT the characteristic prefix
                                // e.g., "topographical_aspects-altitude" -> "altitude"
                                const fieldName = key.replace(charName + '-', '');
                                const readableFieldName = toReadableLabel(fieldName);
                                
                                // Add on new line
                                charEntries += `\n${readableFieldName}: ${formattedValue}`;
                            });
                            
                            if(charEntries.trim() !== ''){
                                // Add characteristic with extra spacing (empty line using &nbsp;)
                                DisplayClassCharacteristics += `\n\n&nbsp;\n${readableCharName}: ${charEntries}`;
                            }
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
                                
                                // Group properties by temporal sequence and exclusive presence
                                const temporalGroups = new Map();
                                const exclusiveGroups = new Map();
                                const regularElements = [];

                                filterd_elements.forEach((element, index) => {
                                    const key = `${element.StratumID}_${element.BlockID}`;
                                    
                                    if (element.elementPresenceType === "Temporal Sequence Depending" || element.elementPresenceType === "Conditional Temporal") {
                                        if (!temporalGroups.has(key)) {
                                            temporalGroups.set(key, []);
                                        }
                                        temporalGroups.get(key).push({ element, originalIndex: index });
                                    } else if (element.elementPresenceType === "Exclusive") {
                                        if (!exclusiveGroups.has(key)) {
                                            exclusiveGroups.set(key, []);
                                        }
                                        exclusiveGroups.get(key).push({ element, originalIndex: index });
                                    } else {
                                        regularElements.push({ element, originalIndex: index });
                                    }
                                });

                                // Process regular (non-temporal) elements first
                                regularElements.forEach(({ element }) => {
                                    let filterd_blocks = blocks?.current["LC_Block"].filter( block => block.block_id === element.BlockID );
                                    
                                    if(filterd_blocks !== undefined && filterd_blocks.length > 0) {
                                        const propertyDisplay = buildDisplayString(element, filterd_blocks[0]);
                                        
                                        // Get characteristics for this property (normal way)
                                        let filterd_xteristics = LC_Characteristics?.current.filter( 
                                            characteristics => 
                                                characteristics.StratumID === filterd_strata[key2]["stratumID"] && 
                                                characteristics.BlockID === filterd_blocks[0]["block_id"]
                                        );
                                        
                                        let character = "";
                                        if(filterd_xteristics && filterd_xteristics.length > 0){
                                            let charLabels = '';
                                            Object.values(filterd_xteristics).forEach((entry: any) => {
                                                const charBlock = getCharacteristicBlock(entry.CharacteristicID, characteristics);
                                                const charDisplay = buildDisplayString(entry, charBlock);
                                                charLabels += `\n&lcub;${entry.CharacteristicLabel}${charDisplay}&rcub;`;
                                            });

                                            character = `E_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+` -.- F_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+'_'+filterd_xteristics.length+`[["fa:fa-paperclip ${charLabels}"]]`;
                                            
                                            let blockColor = getBlockColor(filterd_blocks[0]["block_id"], blockLookUp);
                                            styles = styles+`
                                            style F_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+'_'+filterd_xteristics.length+` fill:`+blockColor+`, stroke:#6366f1, stroke-width:0.5px`;
                                            
                                            edits = edits+`
                                            click F_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+'_'+filterd_xteristics.length+` call emptyCall("Characteristics","F_1_1_1_1_1_1_1") "Edit Characteristics"`;
                                        }
                                        
                                        const blockIcon = getBlockIcon(filterd_blocks[0]["block_id"], blocks);
                                        
                                        elementals = [...elementals, [ `D_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+` --- E_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+`("${blockIcon} ${filterd_blocks[0]["block_label"]}${propertyDisplay}")`, character ]];
                                        
                                        let blockColor = getBlockColor(filterd_blocks[0]["block_id"], blockLookUp);
                                        styles = styles+`
                                        style E_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+` fill:`+blockColor+`, text-align:left, stroke:#6366f1, stroke-width:0.5px`;
                                        
                                        edits = edits+`
                                        click E_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`_`+filterd_blocks[0]["block_id"]+` call emptyCall("Property","E_1_1_1_1_1_1") "Edit Property"`;
                                    }
                                });

                                // Process temporal sequence groups
                                temporalGroups.forEach((instances, groupKey) => {
                                    const firstInstance = instances[0].element;
                                    const stratumID = firstInstance.StratumID;
                                    const blockID = firstInstance.BlockID;
                                    
                                    // Get characteristics for each instance separately
                                    const numInstances = instances.length;
                                    
                                    instances.forEach((instance, seqIndex) => {
                                        const element = instance.element;
                                        
                                        let filterd_blocks = blocks?.current["LC_Block"].filter(
                                            block => block.block_id === element.BlockID
                                        );
                                        
                                        if (filterd_blocks && filterd_blocks.length > 0) {
                                            const block = filterd_blocks[0];
                                            
                                            // Filter characteristics by instanceIndex for THIS specific instance
                                            const instance_characteristics = LC_Characteristics?.current.filter(
                                                char => char.StratumID === stratumID && 
                                                        char.BlockID === blockID &&
                                                        (char.instanceIndex || 0) === seqIndex
                                            ) || [];
                                            
                                            // Build sequence label
                                            const sequenceLabel = `[${seqIndex + 1}] `;                                               
                                            
                                            const propertyDisplay = buildDisplayString(element, block);
                                                
                                                // Build characteristics display
                                                let character = "";
                                                if (instance_characteristics.length > 0) {
                                                    let charLabels = '';
                                                    instance_characteristics.forEach((entry: any) => {
                                                        const charBlock = getCharacteristicBlock(entry.CharacteristicID, characteristics);
                                                        const charDisplay = buildDisplayString(entry, charBlock);
                                                        charLabels += `\n&lcub;${entry.CharacteristicLabel}${charDisplay}&rcub;`;
                                                    });

                                                    const nodeId = `ESeq_1_${class_id}_1_${filterd_HPs[key1]["horizontal_pattern_id"]}_${filterd_strata[key2]["stratumID"]}_${block.block_id}_seq${seqIndex}`;
                                                    const charNodeId = `FSeq_1_${class_id}_1_${filterd_HPs[key1]["horizontal_pattern_id"]}_${filterd_strata[key2]["stratumID"]}_${block.block_id}_seq${seqIndex}_${instance_characteristics.length}`;
                                                    
                                                    character = `${nodeId} -.- ${charNodeId}[["fa:fa-paperclip ${charLabels}"]]`;
                                                    
                                                    let blockColor = getBlockColor(block.block_id, blockLookUp);
                                                    styles = styles+`
                                                    style ${charNodeId} fill:${blockColor}, stroke:#6366f1, stroke-width:0.5px`;
                                                    
                                                    edits = edits+`
                                                    click ${charNodeId} call emptyCall("Characteristics","FSeq_1_1_1_1_1_1_1") "Edit Temporal Characteristics"`;
                                                }
                                                
                                                const blockIcon = getBlockIcon(block.block_id, blocks);
                                                const nodeId = `ESeq_1_${class_id}_1_${filterd_HPs[key1]["horizontal_pattern_id"]}_${filterd_strata[key2]["stratumID"]}_${block.block_id}_seq${seqIndex}`;
                                                
                                                elementals = [...elementals, [
                                                    `D_1_${class_id}_1_${filterd_HPs[key1]["horizontal_pattern_id"]}_${filterd_strata[key2]["stratumID"]} --- ${nodeId}("${blockIcon} ${sequenceLabel}${block.block_label}${propertyDisplay}")`,
                                                    character
                                                ]];
                                                
                                                let blockColor = getBlockColor(block.block_id, blockLookUp);
                                                styles = styles+`
                                                style ${nodeId} fill:${blockColor}, text-align:left, stroke:#6366f1, stroke-width:0.5px`;
                                                
                                                edits = edits+`
                                                click ${nodeId} call emptyCall("Properties","ESeq_1_1_1_1_1_1") "Edit Temporal Property"`;
                                            }
                                        });
                                    });

                                // Process exclusive groups
                                exclusiveGroups.forEach((instances, groupKey) => {
                                    const firstInstance = instances[0].element;
                                    const stratumID = firstInstance.StratumID;
                                    const blockID = firstInstance.BlockID;
                                    
                                    // Get characteristics for each instance separately
                                    const numInstances = instances.length;
                                    
                                    instances.forEach((instance, exclIndex) => {
                                        const element = instance.element;
                                        
                                        let filterd_blocks = blocks?.current["LC_Block"].filter(
                                            block => block.block_id === element.BlockID
                                        );
                                        
                                        if (filterd_blocks && filterd_blocks.length > 0) {
                                            const block = filterd_blocks[0];
                                            
                                            // Filter characteristics by instanceIndex for THIS specific instance
                                            const instance_characteristics = LC_Characteristics?.current.filter(
                                                char => char.StratumID === stratumID && 
                                                        char.BlockID === blockID &&
                                                        (char.instanceIndex || 0) === exclIndex
                                            ) || [];
                                            
                                            // Build exclusive label
                                            const exclusiveLabel = `<${exclIndex + 1}> `;                                               
                                            
                                            const propertyDisplay = buildDisplayString(element, block);
                                                
                                                // Build characteristics display
                                                let character = "";
                                                if (instance_characteristics.length > 0) {
                                                    let charLabels = '';
                                                    instance_characteristics.forEach((entry: any) => {
                                                        const charBlock = getCharacteristicBlock(entry.CharacteristicID, characteristics);
                                                        const charDisplay = buildDisplayString(entry, charBlock);
                                                        charLabels += `\n&lcub;${entry.CharacteristicLabel}${charDisplay}&rcub;`;
                                                    });

                                                    const nodeId = `EExcl_1_${class_id}_1_${filterd_HPs[key1]["horizontal_pattern_id"]}_${filterd_strata[key2]["stratumID"]}_${block.block_id}_excl${exclIndex}`;
                                                    const charNodeId = `FExcl_1_${class_id}_1_${filterd_HPs[key1]["horizontal_pattern_id"]}_${filterd_strata[key2]["stratumID"]}_${block.block_id}_excl${exclIndex}_${instance_characteristics.length}`;
                                                    
                                                    character = `${nodeId} -.- ${charNodeId}[["fa:fa-paperclip ${charLabels}"]]`;
                                                    
                                                    let blockColor = getBlockColor(block.block_id, blockLookUp);
                                                    styles = styles+`
                                                    style ${charNodeId} fill:${blockColor}, stroke:#6366f1, stroke-width:0.5px`;
                                                    
                                                    edits = edits+`
                                                    click ${charNodeId} call emptyCall("Characteristics","FExcl_1_1_1_1_1_1_1") "Edit Exclusive Characteristics"`;
                                                }
                                                
                                                const blockIcon = getBlockIcon(block.block_id, blocks);
                                                const nodeId = `EExcl_1_${class_id}_1_${filterd_HPs[key1]["horizontal_pattern_id"]}_${filterd_strata[key2]["stratumID"]}_${block.block_id}_excl${exclIndex}`;
                                                
                                                elementals = [...elementals, [
                                                    `D_1_${class_id}_1_${filterd_HPs[key1]["horizontal_pattern_id"]}_${filterd_strata[key2]["stratumID"]} --- ${nodeId}("${blockIcon} ${exclusiveLabel}${block.block_label}${propertyDisplay}")`,
                                                    character
                                                ]];
                                                
                                                let blockColor = getBlockColor(block.block_id, blockLookUp);
                                                styles = styles+`
                                                style ${nodeId} fill:${blockColor}, text-align:left, stroke:#6366f1, stroke-width:0.5px`;
                                                
                                                edits = edits+`
                                                click ${nodeId} call emptyCall("Properties","EExcl_1_1_1_1_1_1") "Edit Exclusive Property"`;
                                            }
                                        });
                                    });
                                
                                // Build stratum display
                                const stratumBlock = getStratumBlock(legend);
                                const stratumDisplay = buildDisplayString(filterd_strata[key2], stratumBlock);
                                
                                strata = [...strata, [ `C_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+` --- D_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`_`+filterd_strata[key2]["stratumID"]+`(["fa:fa-minus ${filterd_strata[key2]["name"]}${stratumDisplay}"])`, ...elementals ]];
                                
                                styles = styles+`
                                style D_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+"_"+filterd_strata[key2]["stratumID"]+` text-align:left, stroke:#6366f1, stroke-width:0.5px`;
                                
                                edits = edits+`
                                click D_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+"_"+filterd_strata[key2]["stratumID"]+` call emptyCall("Stratum","D_1_1_1_1_1") "Edit Stratum"`;
                                
                                elementals = [];
                            });
                            
                            // Build HP display
                            const hpBlock = getHorizontalPatternBlock(legend);
                            const hpDisplay = buildDisplayString(filterd_HPs[key1], hpBlock);
                            
                            patterns = [...patterns, [ `A`+class_id+` --- C_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+`([fa:fa-bars ${String(filterd_HPs[key1]["name"]).replace(/[`()<>\{\}\[\]\\\/\'\"]/gi, ' ')}${hpDisplay}])`, ...strata ]];
                            
                            styles = styles+`
                            style C_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+` text-align:left, stroke:#6366f1, stroke-width:0.5px`;
                            
                            edits = edits+`
                            click C_1_`+class_id+`_1_`+filterd_HPs[key1]["horizontal_pattern_id"]+` call emptyCall("Horizontal Pattern","C_1_1_1_1") "Edit Horizontal Pattern"`;
                        }
                        strata = [];
                    });
                }

                // Build Legend and Class display
                const legendDisplay = buildDisplayString(LC_Legend.current);
                const classDisplay = buildDisplayString(filterd_classes[key0]);
                
                classes = [...classes, 
                    [
                        `A(fa:fa-briefcase ${LC_Legend.current.legend_name.replace(/[`()<>\{\}\[\]\\\/\'\"]/gi, ' ')}${legendDisplay}) --- A`+class_id+`("fa:fa-folder-open ${String(filterd_classes[key0]["class_name"]).replace(/[`()<>\{\}\[\]\\\/\'\"]/gi, ' ')}${classDisplay}")`,
                        [
                            [
                                `A`+class_id+` -....- B`+class_id+`[[fa:fa-gears Class Characteristics:`+DisplayClassCharacteristics+` ]]`
                            ],
                            ...patterns
                        ] 
                    ]
                ];
                
                indvClasses = [...indvClasses, 
                    [
                        `A`+class_id+`("fa:fa-folder-open ${String(filterd_classes[key0]["class_name"]).replace(/[`()<>\{\}\[\]\\\/\'\"]/gi, ' ')}${classDisplay}")`,
                        [
                            [
                                `A`+class_id+` -....- B`+class_id+`[[fa:fa-gears Class Characteristics:`+DisplayClassCharacteristics+` ]]`
                            ],
                            ...patterns
                        ] 
                    ]
                ];
                
                const classColorRaw = filterd_classes[key0]["class_color_code"];
                let classColorHex = normalizeColor(classColorRaw);

                styles = styles+`
                style A`+class_id+` fill:`+classColorHex+`,stroke:#6366f1, stroke-width:0.5px, opacity: 0.3
                style B`+class_id+` text-align:left, fill:#eee, stroke:#6366f1, stroke-width:0.5px`;
                
                edits = edits+`
                click A`+class_id+` call emptyCall("Class","A_1_1") "Edit Class Information"
                click B`+class_id+` call emptyCall("ClassCharacteristics","B_`+class_id+`") "Edit Class Characteristics"`;
            });
        }
        
        // Build flowchart
        let subFlow = "";    
        classes.flat(Infinity).map((line)=>{
            subFlow = subFlow+`
                    `+line;
        });
        if (activeLCElement) {
            const activeNodeId = getActiveNodeId(activeLCElement);
            if (activeNodeId) {
                styles = styles + `
                style ${activeNodeId} stroke:#FA8128,stroke-width:4px`;
            }
        }
        let buildFlow = `flowchart LR   
        `+subFlow+`
        `+styles+`
        `+edits;
        setFlowDefinition(buildFlow);

        // Build individual class tabs
        ClassTabs.current = [];
        filterd_classes.forEach((clss, index) => {
            let subFlow = "";
            indvClasses[index].flat(Infinity).map((line)=>{
                subFlow = subFlow+`
                        `+line;          
            });
            
            // Build class-specific styles - only for this class's nodes
            const class_id = clss.class_id;
            let classColorHex = normalizeColor(clss["class_color_code"]);
            
            let classStyles = `style A`+class_id+` fill:`+classColorHex+`,stroke:#6366f1, stroke-width:0.5px
                                style B`+class_id+` text-align:left, fill:#eee, stroke:#6366f1, stroke-width:0.5px`;
            
            // Extract only the styles that belong to this class from the main styles string
            // Match patterns like: style C_1_{class_id}_..., style D_1_{class_id}_..., etc.
            // Also match: style ESeq_1_{class_id}_..., style EExcl_1_{class_id}_..., etc.
            const classStylePattern = new RegExp(`style [C-F](Seq|Excl)?_1_${class_id}_[^\\n]+`, 'g');
            const matchedStyles = styles.match(classStylePattern);
            if (matchedStyles) {
                classStyles = classStyles + '\n' + matchedStyles.join('\n');
            }
            
            let buildFlow = `flowchart LR  
            `+subFlow+`
            `+classStyles+`
            `+edits;
            
            // Add active element highlighting ONLY if it belongs to this class
            if (activeLCElement) {
                const activeNodeId = getActiveNodeId(activeLCElement);
                if (activeNodeId) {
                    // Check if the active element belongs to this class
                    // Active elements for this class will have the class_id in their ID
                    // e.g., A123, B123, C_1_123_..., D_1_123_..., E_1_123_..., F_1_123_...
                    const belongsToThisClass = activeNodeId.includes(`_${class_id}_`) || 
                                            activeNodeId === `A${class_id}` || 
                                            activeNodeId === `B${class_id}`;
                    
                    if (belongsToThisClass) {
                        buildFlow = buildFlow + `
                            style ${activeNodeId} stroke:#FA8128,stroke-width:4px`;
                    }
                }
            }
            
            ClassTabs.current = [...ClassTabs.current, { index: index, title: String(clss["class_name"]), content: buildFlow }];
        });
    }, [rerenderTrigger,activeLCElement]);

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

  const genXSD = () => {
    // Helper function to escape XML special characters
    const escapeXml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // Helper to get XSD type from element_type
    const getXsdType = (elementType, elementRules) => {
      if (elementType === 'Dropdown' && elementRules?.options_name) {
        // Convert option_name to EnumType name (e.g., "climate_types" -> "ClimateTypesEnum")
        const enumName = elementRules.options_name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('') + 'Enum';
        return enumName;
      }
      
      switch(elementType) {
        case 'Number':
        case 'Range':
          return 'xs:decimal';
        case 'Text':
        case 'Dropdown':
        case 'Color':
          return 'xs:string';
        case 'Date':
          return 'xs:date';
        case 'Boolean':
          return 'xs:boolean';
        default:
          return 'xs:string';
      }
    };

    // Start building XSD
    let xsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  
  <!-- ========================================================================= -->
  <!-- Land Characterization System (LChS) XML Schema Definition                -->
  <!-- ========================================================================= -->

  <!-- ==================== Root Element ==================== -->
  
  <xs:element name="LC_Legend" type="LC_LegendType">
    <xs:annotation>
      <xs:documentation>
        Root element of the Land Characterization System legend. Contains metadata 
        about the legend and all classification elements including classes, patterns, 
        strata, properties, and characteristics.
      </xs:documentation>
    </xs:annotation>
  </xs:element>

  <!-- ==================== Legend Type ==================== -->
  
  <xs:complexType name="LC_LegendType">
    <xs:annotation>
      <xs:documentation>
        Defines the complete legend structure including all classes, characteristics,
        patterns, strata, and properties that describe land cover types.
      </xs:documentation>
    </xs:annotation>
    <xs:sequence>
      <xs:element name="objects" type="ObjectsContainerType" minOccurs="1" maxOccurs="1">
        <xs:annotation>
          <xs:documentation>Container for all legend components</xs:documentation>
        </xs:annotation>
      </xs:element>
    </xs:sequence>
    <xs:attribute name="id" type="xs:string" use="optional"/>
    <xs:attribute name="legend_name" type="xs:string" use="optional"/>
    <xs:attribute name="legend_description" type="xs:string" use="optional"/>
    <xs:attribute name="legend_author" type="xs:string" use="optional"/>
    <xs:attribute name="legend_version" type="xs:string" use="optional"/>
    <xs:attribute name="legend_date" type="xs:date" use="optional"/>
    <xs:attribute name="uuid" type="xs:string" use="optional"/>
  </xs:complexType>

  <!-- ==================== Objects Container ==================== -->
  
  <xs:complexType name="ObjectsContainerType">
    <xs:sequence>
      <xs:element name="LC_Class" type="LC_ClassType" minOccurs="0" maxOccurs="unbounded"/>
      <xs:element name="LC_ClassCharacteristics" type="LC_ClassCharacteristicsType" minOccurs="0" maxOccurs="1"/>
      <xs:element name="LC_HorizontalPatterns" type="LC_HorizontalPatternsType" minOccurs="0" maxOccurs="unbounded"/>
      <xs:element name="LC_Strata" type="LC_StrataType" minOccurs="0" maxOccurs="unbounded"/>
      <xs:element name="LC_Properties" type="LC_PropertiesType" minOccurs="0" maxOccurs="unbounded"/>
      <xs:element name="LC_Characteristics" type="LC_CharacteristicsType" minOccurs="0" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>

  <!-- ==================== LC_Class Type ==================== -->
  
  <xs:complexType name="LC_ClassType">
    <xs:annotation>
      <xs:documentation>Land cover classification class with identifying attributes</xs:documentation>
    </xs:annotation>
    <xs:sequence>
      <xs:element name="legend_id" type="xs:string" minOccurs="0"/>
      <xs:element name="class_id" type="xs:string" minOccurs="1"/>
      <xs:element name="class_name" type="xs:string" minOccurs="1"/>
      <xs:element name="class_description" type="xs:string" minOccurs="0"/>
      <xs:element name="class_map_code" type="xs:string" minOccurs="0"/>
      <xs:element name="class_color_code" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>

  <!-- ==================== LC_ClassCharacteristics Type ==================== -->
  
  <xs:complexType name="LC_ClassCharacteristicsType">
    <xs:annotation>
      <xs:documentation>
        Class-level characteristics (climate, soil, topography, etc.).
        Contains dynamic elements prefixed with underscore (_classID).
      </xs:documentation>
    </xs:annotation>
    <xs:sequence>
      <xs:any minOccurs="0" maxOccurs="unbounded" processContents="lax"/>
    </xs:sequence>
  </xs:complexType>

  <!-- ==================== LC_HorizontalPatterns Type ==================== -->
  
  <xs:complexType name="LC_HorizontalPatternsType">
    <xs:annotation>
      <xs:documentation>Spatial patterns within land cover classes</xs:documentation>
    </xs:annotation>
    <xs:sequence>
      <xs:element name="class_id" type="xs:string" minOccurs="1"/>
      <xs:element name="horizontal_pattern_id" type="xs:string" minOccurs="1"/>
      <xs:element name="description" type="xs:string" minOccurs="0"/>
      <xs:element name="cover" type="xs:decimal" minOccurs="0" maxOccurs="2"/>
      <xs:element name="occurrence" type="xs:decimal" minOccurs="0" maxOccurs="2"/>
      <xs:element name="type" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>

  <!-- ==================== LC_Strata Type ==================== -->
  
  <xs:complexType name="LC_StrataType">
    <xs:annotation>
      <xs:documentation>Vertical strata layers within horizontal patterns</xs:documentation>
    </xs:annotation>
    <xs:sequence>
      <xs:element name="HPID" type="xs:string" minOccurs="1"/>
      <xs:element name="stratumID" type="xs:string" minOccurs="1"/>
      <xs:element name="description" type="xs:string" minOccurs="0"/>
      <xs:element name="presenceType" type="PresenceTypeEnum" minOccurs="0"/>
      <xs:element name="portioning" type="xs:decimal" minOccurs="0" maxOccurs="2"/>
      <xs:element name="onTop" type="xs:string" minOccurs="0"/>
      <xs:element name="onTopType" type="xs:string" minOccurs="0"/>
      <xs:element name="order" type="xs:integer" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>

  <!-- ==================== LC_Properties Type ==================== -->
  
  <xs:complexType name="LC_PropertiesType">
    <xs:annotation>
      <xs:documentation>Properties of land cover blocks within strata</xs:documentation>
    </xs:annotation>
    <xs:sequence>
      <xs:element name="StratumID" type="xs:string" minOccurs="1"/>
      <xs:element name="BlockID" type="xs:string" minOccurs="1"/>
      <xs:element name="BlockReference" type="xs:string" minOccurs="0"/>
      <xs:element name="description" type="xs:string" minOccurs="0"/>
`;

    // Generate elements from blocks configuration
    if (blocks && blocks.current && blocks.current["LC_Block"]) {
      const allElements = new Set();
      blocks.current["LC_Block"].forEach(block => {
        if (block.elements) {
          block.elements.forEach(elem => {
            allElements.add(elem.element_name);
          });
        }
      });

      // Add all unique property elements
      Array.from(allElements).sort().forEach(elemName => {
        xsd += `      <xs:element name="${elemName}" type="xs:string" minOccurs="0" maxOccurs="unbounded"/>
`;
      });
    }

    xsd += `      <xs:any minOccurs="0" maxOccurs="unbounded" processContents="lax"/>
    </xs:sequence>
  </xs:complexType>

  <!-- ==================== LC_Characteristics Type ==================== -->
  
  <xs:complexType name="LC_CharacteristicsType">
    <xs:annotation>
      <xs:documentation>Detailed characteristics of individual elements within strata</xs:documentation>
    </xs:annotation>
    <xs:sequence>
      <xs:element name="StratumID" type="xs:string" minOccurs="1"/>
      <xs:element name="BlockID" type="xs:string" minOccurs="1"/>
      <xs:element name="BlockReference" type="xs:string" minOccurs="0"/>
      <xs:element name="CharacteristicID" type="xs:string" minOccurs="1"/>
      <xs:element name="CharacteristicReference" type="xs:string" minOccurs="0"/>
      <xs:element name="CharacteristicLabel" type="xs:string" minOccurs="0"/>
      <xs:element name="description" type="xs:string" minOccurs="0"/>
`;

    // Generate elements from characteristics configuration
    if (characteristics && characteristics.current && characteristics.current["LC_Characteristics"]) {
      const allCharElements = new Set();
      characteristics.current["LC_Characteristics"].forEach(char => {
        if (char.elements) {
          char.elements.forEach(elem => {
            allCharElements.add(elem.element_name);
          });
        }
      });

      // Add all unique characteristic elements
      Array.from(allCharElements).sort().forEach(elemName => {
        xsd += `      <xs:element name="${elemName}" type="xs:string" minOccurs="0" maxOccurs="unbounded"/>
`;
      });
    }

    xsd += `      <xs:any minOccurs="0" maxOccurs="unbounded" processContents="lax"/>
    </xs:sequence>
  </xs:complexType>

  <!-- ==================== Property Type Definitions ==================== -->
  
`;

    // Generate specific block types
    if (blocks && blocks.current && blocks.current["LC_Block"]) {
      blocks.current["LC_Block"].forEach(block => {
        const blockRef = escapeXml(block.block_reference);
        const blockDesc = escapeXml(block.block_description);
        
        xsd += `  <xs:complexType name="${blockRef}Type">
    <xs:annotation>
      <xs:documentation>${blockDesc}</xs:documentation>
    </xs:annotation>
    <xs:sequence>
`;
        
        // Add elements specific to this block
        if (block.elements && block.elements.length > 0) {
          block.elements.forEach(elem => {
            const elemName = escapeXml(elem.element_name);
            const elemLabel = escapeXml(elem.element_label);
            const elemType = getXsdType(elem.element_type, elem.element_rules);
            const required = elem.element_rules?.required ? '1' : '0';
            const maxOccurs = elem.element_type === 'Range' ? '2' : '1';
            
            xsd += `      <xs:element name="${elemName}" type="${elemType}" minOccurs="${required}" maxOccurs="${maxOccurs}">
        <xs:annotation>
          <xs:documentation>${elemLabel}</xs:documentation>
        </xs:annotation>
      </xs:element>
`;
          });
        }
        
        xsd += `    </xs:sequence>
  </xs:complexType>

`;
      });
    }

    xsd += `  <!-- ==================== Characteristic Type Definitions ==================== -->
  
`;

    // Generate specific characteristic types
    if (characteristics && characteristics.current && characteristics.current["LC_Characteristics"]) {
      characteristics.current["LC_Characteristics"].forEach(char => {
        const charRef = escapeXml(char.characteristic_reference);
        const charDesc = escapeXml(char.characteristic_description);
        
        xsd += `  <xs:complexType name="${charRef}Type">
    <xs:annotation>
      <xs:documentation>${charDesc}</xs:documentation>
    </xs:annotation>
    <xs:sequence>
`;
        
        // Add elements specific to this characteristic
        if (char.elements && char.elements.length > 0) {
          char.elements.forEach(elem => {
            const elemName = escapeXml(elem.element_name);
            const elemLabel = escapeXml(elem.element_label);
            const elemType = getXsdType(elem.element_type, elem.element_rules);
            const required = elem.element_rules?.required ? '1' : '0';
            const maxOccurs = elem.element_type === 'Range' ? '2' : '1';
            
            xsd += `      <xs:element name="${elemName}" type="${elemType}" minOccurs="${required}" maxOccurs="${maxOccurs}">
        <xs:annotation>
          <xs:documentation>${elemLabel}</xs:documentation>
        </xs:annotation>
      </xs:element>
`;
          });
        }
        
        xsd += `    </xs:sequence>
  </xs:complexType>

`;
      });
    }

    xsd += `  <!-- ==================== Enumeration Types ==================== -->
  
`;

    // Generate enumerations from options
    if (options?.current?.["LC_Options"] && Array.isArray(options.current["LC_Options"])) {
      const lcOptions = options.current["LC_Options"];
      
      lcOptions.forEach((optionGroup) => {
        if (optionGroup.options && Array.isArray(optionGroup.options) && optionGroup.options.length > 0) {
          const enumName = optionGroup.option_name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('') + 'Enum';
          
          const optionLabel = escapeXml(optionGroup.option_label || '');
          const optionDesc = escapeXml(optionGroup.option_description || '');
          
          xsd += `  <xs:simpleType name="${enumName}">
    <xs:annotation>
      <xs:documentation>${optionDesc}</xs:documentation>
    </xs:annotation>
    <xs:restriction base="xs:string">
`;
          
          optionGroup.options.forEach(opt => {
            const optValue = escapeXml(opt.option || opt.label || '');
            const optLabel = escapeXml(opt.label || '');
            
            xsd += `      <xs:enumeration value="${optValue}">
        <xs:annotation>
          <xs:documentation>${optLabel}</xs:documentation>
        </xs:annotation>
      </xs:enumeration>
`;
          });
          
          xsd += `    </xs:restriction>
  </xs:simpleType>

`;
        }
      });
    }

    // Add the hardcoded essential enumerations that may not be in options
    xsd += `  <!-- Essential enumeration types -->
  
  <xs:simpleType name="PresenceTypeEnum">
    <xs:annotation>
      <xs:documentation>Presence requirements for elements and strata</xs:documentation>
    </xs:annotation>
    <xs:restriction base="xs:string">
      <xs:enumeration value="Fixed"/>
      <xs:enumeration value="Exclusive"/>
      <xs:enumeration value="Conditional Temporal"/>
      <xs:enumeration value="Precluded"/>
      <xs:enumeration value="Mandatory"/>
      <xs:enumeration value="Temporal Sequence Depending"/>
    </xs:restriction>
  </xs:simpleType>

</xs:schema>`;

    return xsd;
  }

  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  // High-resolution export scale — matches MermaidChartRender.jsx
  const HIGH_RES_SCALE = 4;

  // Tier 3 fallback: return raw SVG as a Blob (lossless, always crisp)
  const altCaptureTabImage = async (index) => {
    const svgElement = document.getElementById(index).querySelector('svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      return new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    }
    return '';
  };

  // Tier 1: render the SVG onto a high-res canvas, return PNG data URL.
  // Uses viewBox dimensions so output size is independent of screen size.
  const exportSvgToCanvas = (svgElement: SVGSVGElement, scale: number): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const bbox = svgElement.getBoundingClientRect();
        const vb   = svgElement.viewBox?.baseVal;
        const natW = (vb && vb.width  > 0) ? vb.width  : bbox.width  || 1200;
        const natH = (vb && vb.height > 0) ? vb.height : bbox.height || 800;
        const outW = Math.round(natW * scale);
        const outH = Math.round(natH * scale);

        const cloned = svgElement.cloneNode(true) as SVGSVGElement;
        cloned.setAttribute('width',  String(outW));
        cloned.setAttribute('height', String(outH));
        if (!cloned.getAttribute('viewBox') || cloned.getAttribute('viewBox') === '')
          cloned.setAttribute('viewBox', `0 0 ${natW} ${natH}`);

        const svgData = new XMLSerializer().serializeToString(cloned);
        // Use a base64 data URI instead of a blob URL — blob URLs taint the canvas
        // and block toDataURL with a SecurityError in Chrome/Edge.
        const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

        const img = new Image();
        img.onload = () => {
          const canvas  = document.createElement('canvas');
          canvas.width  = outW;
          canvas.height = outH;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, outW, outH);
          ctx.drawImage(img, 0, 0, outW, outH);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = url;
      } catch (err) {
        resolve(null);
      }
    });
  };

  // Capture a diagram tab as a high-res image.
  // Tier 1 — SVG→Canvas at 4× (screen-size-independent)
  // Tier 2 — htmlToImage with pixelRatio: 4 (fallback)
  // Tier 3 — raw SVG Blob (last resort)
  const captureTabImage = async (index) => {
    await wait(500); // Wait for the tab to render

    const container  = document.getElementById(index);
    const svgElement = container?.querySelector('svg') as SVGSVGElement | null;

    if (svgElement) {
      const dataUrl = await exportSvgToCanvas(svgElement, HIGH_RES_SCALE);
      if (dataUrl) return dataUrl;
    }

    try {
      const dataUrl = await htmlToImage.toPng(container, { cacheBust: true, skipFonts: true, pixelRatio: HIGH_RES_SCALE });
      if (dataUrl) return dataUrl;
    } catch (error) {
      console.warn('htmlToImage failed for', index, error);
      toast.current.show({ severity: 'info', summary: 'PNG Export Failed', detail: `Export of diagram ${index} failed. Changing format to SVG.`, life: 5000 });
    }

    return altCaptureTabImage(index);
  };
  const fullExport = async () => {
    setLoading(true);        
    const LChS = new Blob([genLChS()], {type: 'text/xml'});
    const csv = new Blob([genCSV()], {type: 'text/csv'});
    const xsd = new Blob([genXSD()], {type: 'text/xml'});

    const originalTabIndex = tabIndex;
    await setTabIndex(0); // Switch to first tab
    const dataUrl0 = await captureTabImage("Full Legend");
    const dataUrls = [];
    for (let i = 0; i < LC_Class.current.length; i++) {
        let curr = i+1;
        await setTabIndex(curr);
        dataUrls[i] = await captureTabImage(LC_Class.current[i]["class_name"]);
    }
    await setTabIndex(LC_Class.current.length); // Switch to first tab                
    setTabIndex(originalTabIndex); // Switch back to original tab
    
    const zip = new JSZip();
    for (let i = 0; i < LC_Class.current.length; i++) {
        const safeName = LC_Class.current[i]["class_name"].replace(/[`()<>\{\}\[\]\\\/]\'\"/gi, ' ');
        if (dataUrls[i] instanceof Blob)
            zip.file(safeName + '.svg', dataUrls[i]);
        else if (typeof dataUrls[i] === 'string')
            zip.file(safeName + '.png', (dataUrls[i] as string).split(',')[1], { base64: true });
    }
    if (dataUrl0) {
        if (dataUrl0 instanceof Blob)
            zip.file('Legend Diagram.svg', dataUrl0);
        else if (typeof dataUrl0 === 'string')
            zip.file('Legend Diagram.png', (dataUrl0 as string).split(',')[1], { base64: true });
    }    
    zip.file('Legend.LChS', LChS);
    zip.file('Legend.csv', csv);
    zip.file('LCML.xsd', xsd);
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'legend.zip');
    setLoading(false);
  };

  useEffect(()=>{
    if(triggerFullExport){
      fullExport();
      setFullExport(false);
    }    
  },[triggerFullExport]);

  const toast = useRef(null);

  return (
    <>
    <Toast ref={toast} /> 
    <Tabs selectedIndex={tabIndex} onSelect={index => setTabIndex(index)}  style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{ height: 'fit-content', minHeight: '10%', maxHeight: '20%', overflow: 'auto', padding: 0, margin: 0 }}>
        <TabList className="guide-legendTabs p-0 m-0 react-tabs__tab-list">
            <Tab key="Full Legend"><p style={{ fontWeight: 'bold', padding: 0, margin: 0 }}>Legend</p></Tab>
            {ClassTabs.current.map((tab) => {
            return (
                <Tab key={tab.title}>{tab.title}</Tab>
            );
            })}        
        </TabList>
      </div>
      <div className="guide-legendDiagram" style={{ height: 'fit-content', minHeight: '80%', maxHeight: '83%', overflow: 'auto', padding: 0, margin: 0 }}>
        <TabPanel key="Full Legend">
            <MermaidChartRender chart={flowDefinition} legendValid={legendValid} setActiveLCElement={setActiveLCElement} index="Full Legend" />
        </TabPanel>
        {ClassTabs.current.map((tab) => {
          return (
              <TabPanel key={tab.title} className="flex p-0 m-0">
                  <MermaidChartRender chart={tab.content} legendValid={legendValid} setActiveLCElement={setActiveLCElement} index={tab.title} />
              </TabPanel>
          );
        })}        
      </div>
    </Tabs>
    {loading && (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
      </div>
    )}
    </>
  );
};