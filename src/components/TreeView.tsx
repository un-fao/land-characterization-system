import { useState, useEffect, useRef } from 'react';
import { classNames } from 'primereact/utils';
import { Tree, TreeTogglerTemplateOptions, TreeNodeDoubleClickEvent, TreeDragDropEvent } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';
import { Toast } from 'primereact/toast';
import { ContextMenu } from 'primereact/contextmenu';
import { MenuItem } from 'primereact/menuitem';

import '../css/TreeView.css';

export const TreeView = (props)=> {
    const {UUID,
            legend,
            searchObj,
            rerenderTrigger,
            setRerenderTrigger,
            blocks,
            blockLookUp,
            elements,
            LC_Legend,
            LC_Class,
            LC_ClassCharacteristics,          
            LC_HorizontalPatterns,
            LC_Strata,
            horizontalPatternNumber,
            strataNumber,
            LC_Properties,
            stratumPropertyNumber,
            LC_Characteristics,
            activeLCElement,
            setActiveLCElement,
            whichTree,
            // ID generation and creation functions from UserInterface
            getMaxId,
            getNextClassId,
            getNextHPId,
            getNextStratumId,
            createHorizontalPattern,
            createStratum,
            addPropertyToStratum
        } = props;
    const toast = useRef(null);

    /**
     * Helper function: Get all ancestors of a block (including the block itself)
     */
    const getAllAncestors = (blockID) => {
        if (!blockLookUp || !blockLookUp.current || !blockLookUp.current["LC_Block-LC_Block"]) {
            return [];
        }
        
        const lookup = blockLookUp.current["LC_Block-LC_Block"];
        const ancestors = [blockID];
        let currentBlock = lookup.find(b => b.block_id === blockID);
        
        while (currentBlock && currentBlock.parent_id !== null) {
            ancestors.push(currentBlock.parent_id);
            currentBlock = lookup.find(b => b.block_id === currentBlock.parent_id);
        }
        
        return ancestors;
    };

    /**
     * Helper function: Get all descendants of a block
     */
    const getAllDescendants = (blockID) => {
        if (!blockLookUp || !blockLookUp.current || !blockLookUp.current["LC_Block-LC_Block"]) {
            return [];
        }
        
        const lookup = blockLookUp.current["LC_Block-LC_Block"];
        const descendants = [];
        
        const findChildren = (parentID) => {
            const children = lookup.filter(b => b.parent_id === parentID);
            children.forEach(child => {
                descendants.push(child.block_id);
                findChildren(child.block_id);
            });
        };
        
        findChildren(blockID);
        return descendants;
    };

    /**
     * Helper function: Check if adding a block would violate parent-child constraints
     * Returns: { valid: boolean, message: string, conflictingBlock: object }
     */
    const checkParentChildConflict = (stratumID, newBlockID) => {
        // Get all properties in the target stratum
        const stratumProperties = LC_Properties?.current.filter(
            prop => prop.StratumID === stratumID
        );
        
        if (!stratumProperties || stratumProperties.length === 0) {
            return { valid: true, message: '', conflictingBlock: null };
        }
        
        // Get ancestors and descendants of the new block
        const newBlockAncestors = getAllAncestors(newBlockID);
        const newBlockDescendants = getAllDescendants(newBlockID);
        
        // Check each existing property in the stratum
        for (const prop of stratumProperties) {
            const existingBlockID = prop.BlockID;
            
            // Skip if it's the same element - let checkDuplicateElement handle this
            if (existingBlockID === newBlockID) {
                continue;
            }
            
            // Check if the existing block is an ancestor of the new block
            if (newBlockAncestors.includes(existingBlockID)) {
                const existingBlock = blocks?.current["LC_Block"].find(b => b.block_id === existingBlockID);
                const newBlock = blocks?.current["LC_Block"].find(b => b.block_id === newBlockID);
                return {
                    valid: false,
                    message: `Cannot add "${newBlock?.block_label || 'element'}" because parent element "${existingBlock?.block_label || 'element'}" already exists in this stratum.`,
                    conflictingBlock: existingBlock
                };
            }
            
            // Check if the existing block is a descendant of the new block
            if (newBlockDescendants.includes(existingBlockID)) {
                const existingBlock = blocks?.current["LC_Block"].find(b => b.block_id === existingBlockID);
                const newBlock = blocks?.current["LC_Block"].find(b => b.block_id === newBlockID);
                return {
                    valid: false,
                    message: `Cannot add "${newBlock?.block_label || 'element'}" because child element "${existingBlock?.block_label || 'element'}" already exists in this stratum.`,
                    conflictingBlock: existingBlock
                };
            }
        }
        
        return { valid: true, message: '', conflictingBlock: null };
    };

    /**
     * Helper function: Check if a block already exists in stratum and validate presence type
     * Returns: { valid: boolean, message: string, shouldCreateNew: boolean }
     */
    const checkDuplicateElement = (stratumID, blockID) => {
        const existingProperties = LC_Properties?.current.filter(
            prop => prop.StratumID === stratumID && prop.BlockID === blockID
        );
        
        if (!existingProperties || existingProperties.length === 0) {
            // Element doesn't exist, safe to add
            return { valid: true, message: '', shouldCreateNew: false };
        }
        
        // Element exists - check presence type of the first instance
        const firstInstance = existingProperties[0];
        const presenceType = firstInstance.elementPresenceType;
        
        if (presenceType === "Exclusive" || presenceType === "Conditional Temporal"  || presenceType === "Temporal Sequence Depending") {
            // Valid presence types for multiple instances
            return { valid: true, message: '', shouldCreateNew: true };
        }
        
        // Invalid presence type for multiple instances
        const block = blocks?.current["LC_Block"].find(b => b.block_id === blockID);
        return {
            valid: false,
            message: `Element "${block?.block_label || 'element'}" already exists in this stratum. To add multiple instances, the Presence Type must be "Exclusive" or "Conditional Temporal".`,
            shouldCreateNew: false
        };
    };

    /**
     * Main function: Construct LC Block from tree node
     */
    const constructLCBlock = (nodeKey) => {
        // Extract block information
        const blockKey = nodeKey?.split("-");
        const BlockID = parseInt(blockKey[blockKey.length - 1]);
        const filterd_Properties = blocks?.current["LC_Block"].filter(block => block.block_id === BlockID);
        
        if (!filterd_Properties || filterd_Properties.length === 0) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'Block Not Found', 
                detail: 'The selected block could not be found.' 
            });
            return;
        }

        const BlockReference = filterd_Properties[0].block_reference;
        
        // Build property data elements from block definition
        let propertyDataElements = {};
        Object.entries(filterd_Properties[0]["elements"]).forEach((propertyElement) => {
            const elementName = propertyElement[1]["element_name"];
            const elementType = propertyElement[1]["element_type"];
            
            if (elementName === "elementPresenceType") {
                propertyDataElements[elementName] = "Fixed";
            } else if (elementType === "Number") {
                propertyDataElements[elementName] = propertyElement[1]["element_rules"]['min'];
            } else if (elementType === "Range") {
                propertyDataElements[elementName] = [
                    propertyElement[1]["element_rules"]['min'],
                    propertyElement[1]["element_rules"]['max']
                ];
            } else {
                propertyDataElements[elementName] = "";
            }
        });

        // Get filtered classes for current legend
        const filterd_classes = LC_Class?.current.filter(clss => clss.legend_id === LC_Legend?.current["id"]);
        
        if (!filterd_classes || filterd_classes.length === 0) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'No Class Found', 
                detail: 'Please create a class first before adding elements.' 
            });
            return;
        }

        // Parse active element selection (needed for both single and multiple class scenarios)
        const elementKeys = typeof activeLCElement === 'string' 
            ? activeLCElement.split("|") 
            : [];

        // SCENARIO: Single class exists
        if (filterd_classes.length === 1) {
            const singleClass = filterd_classes[0];
            
            // Case 1: No horizontal patterns exist - create HP, Stratum, and Property
            if (LC_HorizontalPatterns.current.length === 0) {
                const newHPId = createHorizontalPattern(singleClass.class_id);
                const newStratumId = createStratum(newHPId);
                if (addPropertyToStratumValidated(newStratumId, BlockID, BlockReference, propertyDataElements)) {
                    setRerenderTrigger(`New HP & Stratum ${Date.now()}`);
                }
                return;
            }

            // Case 2: No strata exist and no HP is selected
            if (LC_Strata.current.length === 0 && elementKeys.length !== 5) {
                if (LC_HorizontalPatterns.current.length === 1) {
                    // Single HP exists - create stratum in it
                    const hpId = LC_HorizontalPatterns.current[0].horizontal_pattern_id;
                    const newStratumId = createStratum(hpId);
                    if (addPropertyToStratumValidated(newStratumId, BlockID, BlockReference, propertyDataElements)) {
                        setRerenderTrigger(`New Stratum ${Date.now()}`);
                    }
                } else {
                    toast.current.show({ 
                        severity: 'error', 
                        summary: 'Multiple Locations Available', 
                        detail: 'Select the Horizontal Pattern to add the element to.' 
                    });
                }
                return;
            }

            // Case 3: Handle based on active selection
            if (!activeLCElement) {
                // No selection - check if we can auto-determine location
                if (LC_HorizontalPatterns.current.length === 1 && LC_Strata.current.length === 1) {
                    const hpId = LC_HorizontalPatterns.current[0].horizontal_pattern_id;
                    const stratum = LC_Strata.current.find(s => s.HPID === hpId);
                    if (stratum) {
                        if (addPropertyToStratumValidated(stratum.stratumID, BlockID, BlockReference, propertyDataElements)) {
                            setRerenderTrigger(`New Property ${Date.now()}`);
                        }
                        return;
                    }
                }
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'No Location Selected', 
                    detail: 'Select a Stratum or Horizontal Pattern to add the element to.' 
                });
                return;
            }

            // Handle different selection types
            const targetStratumId = determineTargetStratum(
                elementKeys, 
                singleClass.class_id, 
                BlockID, 
                BlockReference, 
                propertyDataElements
            );
            
            if (targetStratumId !== null) {
                setRerenderTrigger(`Property Added ${Date.now()}`);
            }
            
        } else {
            // SCENARIO: Multiple classes exist
            handleMultipleClassScenario(elementKeys, BlockID, BlockReference, propertyDataElements);
        }
    };

    /**
     * Validated wrapper for addPropertyToStratum that checks parent-child conflicts and duplicates
     * Returns: true if property was added successfully, false otherwise
     */
    const inheritPresenceTypeFromExisting = (stratumId, blockId, propertyDataElements) => {
        const existingInstances = LC_Properties.current.filter(
            prop => prop.StratumID === stratumId && prop.BlockID === blockId
        );
        
        if (existingInstances.length > 0) {
            const existingPresenceType = existingInstances[0].elementPresenceType;
            if (existingPresenceType === "Exclusive" 
                || existingPresenceType === "Conditional Temporal"
                || existingPresenceType === "Temporal Sequence Depending") {
                propertyDataElements.elementPresenceType = existingPresenceType;
            }
        }
        
        return propertyDataElements;
    };
    const addPropertyToStratumValidated = (stratumId, blockId, blockReference, propertyDataElements) => {
        // Inherit presenceType from existing instances if any exist
        propertyDataElements = inheritPresenceTypeFromExisting(stratumId, blockId, propertyDataElements);
        // Check for parent-child conflicts
        const parentChildCheck = checkParentChildConflict(stratumId, blockId);
        if (!parentChildCheck.valid) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'Parent-Child Conflict', 
                detail: parentChildCheck.message,
                life: 5000
            });
            return false;
        }
        
        // Check for duplicate element and presence type
        const duplicateCheck = checkDuplicateElement(stratumId, blockId);
        if (!duplicateCheck.valid) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'Element Already Exists', 
                detail: duplicateCheck.message,
                life: 5000
            });
            return false;
        }
        
        // All validations passed - add the property
        addPropertyToStratum(stratumId, blockId, blockReference, propertyDataElements);
        return true;
    };

    /**
     * Helper: Determine target stratum based on active element selection
     */
    const determineTargetStratum = (elementKeys, classId, blockId, blockReference, propertyDataElements) => {
        if (elementKeys.length === 5) {
            // Horizontal Pattern selected
            const hpId = parseInt(elementKeys[4]);
            const strataInHP = LC_Strata.current.filter(stratum => stratum.HPID === hpId);
            
            if (strataInHP.length === 0) {
                // No stratum in HP - create one
                const newStratumId = createStratum(hpId);
                if (addPropertyToStratumValidated(newStratumId, blockId, blockReference, propertyDataElements)) {
                    return newStratumId;
                }
                return null;
            } else if (strataInHP.length === 1) {
                // Single stratum - use it
                if (addPropertyToStratumValidated(strataInHP[0].stratumID, blockId, blockReference, propertyDataElements)) {
                    return strataInHP[0].stratumID;
                }
                return null;
            } else {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'Multiple Strata Available', 
                    detail: 'Select a specific Stratum to add the element to.' 
                });
                return null;
            }
        } else if (elementKeys.length === 6) {
            // Stratum selected
            const stratumId = parseInt(elementKeys[5]);
            if (addPropertyToStratumValidated(stratumId, blockId, blockReference, propertyDataElements)) {
                return stratumId;
            }
            return null;
        } else if (elementKeys.length === 7) {
            // Property selected - use its parent stratum
            const hpId = parseInt(elementKeys[4]);
            const stratumId = parseInt(elementKeys[5]);
            const stratum = LC_Strata.current.find(s => s.HPID === hpId && s.stratumID === stratumId);
            
            if (stratum) {
                if (addPropertyToStratumValidated(stratumId, blockId, blockReference, propertyDataElements)) {
                    return stratumId;
                }
                return null;
            } else {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'Stratum Not Found', 
                    detail: 'The selected stratum could not be found.' 
                });
                return null;
            }
        } else {
            // Class selected or other - handle class-level logic
            const hpsForClass = LC_HorizontalPatterns.current.filter(hp => hp.class_id === classId);
            
            if (hpsForClass.length === 0) {
                // No HP for class - create HP, Stratum, and Property
                const newHPId = createHorizontalPattern(classId);
                const newStratumId = createStratum(newHPId);
                if (addPropertyToStratumValidated(newStratumId, blockId, blockReference, propertyDataElements)) {
                    return newStratumId;
                }
                return null;
            } else if (hpsForClass.length === 1) {
                // Single HP for class
                const hpId = hpsForClass[0].horizontal_pattern_id;
                const strataInHP = LC_Strata.current.filter(s => s.HPID === hpId);
                
                if (strataInHP.length === 0) {
                    // No stratum - create one
                    const newStratumId = createStratum(hpId);
                    if (addPropertyToStratumValidated(newStratumId, blockId, blockReference, propertyDataElements)) {
                        return newStratumId;
                    }
                    return null;
                } else if (strataInHP.length === 1) {
                    // Single stratum - use it
                    if (addPropertyToStratumValidated(strataInHP[0].stratumID, blockId, blockReference, propertyDataElements)) {
                        return strataInHP[0].stratumID;
                    }
                    return null;
                } else {
                    toast.current.show({ 
                        severity: 'error', 
                        summary: 'Multiple Strata Available', 
                        detail: 'Select a specific Stratum to add the element to.' 
                    });
                    return null;
                }
            } else {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'Multiple Horizontal Patterns', 
                    detail: 'Select a Horizontal Pattern to add the element to.' 
                });
                return null;
            }
        }
    };

    /**
     * Helper: Handle scenario with multiple classes
     */
    const handleMultipleClassScenario = (elementKeys, blockId, blockReference, propertyDataElements) => {
        if (!activeLCElement || elementKeys.length < 3) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'No Class Selected', 
                detail: 'Select a Class, Horizontal Pattern, or Stratum to add the element to.' 
            });
            return;
        }

        const classId = parseInt(elementKeys[2]);

        // Handle different selection types based on element key length
        if (elementKeys.length === 5) {
            // Horizontal Pattern selected
            const hpId = parseInt(elementKeys[4]);
            const strataInHP = LC_Strata.current.filter(stratum => stratum.HPID === hpId);
            
            if (strataInHP.length === 0) {
                // No stratum - create one
                const newStratumId = createStratum(hpId);
                if (addPropertyToStratumValidated(newStratumId, blockId, blockReference, propertyDataElements)) {
                    setRerenderTrigger(`New Stratum ${Date.now()}`);
                }
            } else if (strataInHP.length === 1) {
                // Single stratum - use it
                if (addPropertyToStratumValidated(strataInHP[0].stratumID, blockId, blockReference, propertyDataElements)) {
                    setRerenderTrigger(`New Property ${Date.now()}`);
                }
            } else {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'Multiple Strata Available', 
                    detail: 'Select a specific Stratum to add the element to.' 
                });
            }
        } else if (elementKeys.length === 6) {
            // Stratum selected
            const stratumId = parseInt(elementKeys[5]);
            if (addPropertyToStratumValidated(stratumId, blockId, blockReference, propertyDataElements)) {
                setRerenderTrigger(`New Property ${Date.now()}`);
            }
        } else if (elementKeys.length === 7) {
            // Property selected - use its parent stratum
            const hpId = parseInt(elementKeys[4]);
            const stratumId = parseInt(elementKeys[5]);
            const stratum = LC_Strata.current.find(s => s.HPID === hpId && s.stratumID === stratumId);
            
            if (stratum) {
                if (addPropertyToStratumValidated(stratumId, blockId, blockReference, propertyDataElements)) {
                    setRerenderTrigger(`New Property ${Date.now()}`);
                }
            } else {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'Stratum Not Found', 
                    detail: 'Select a valid Stratum for the element.' 
                });
            }
        } else if (elementKeys.length >= 3) {
            // Class selected - check HPs for this class
            const hpsForClass = LC_HorizontalPatterns.current.filter(hp => hp.class_id === classId);
            
            if (hpsForClass.length === 0) {
                // No HP - create HP, Stratum, and Property
                const newHPId = createHorizontalPattern(classId);
                const newStratumId = createStratum(newHPId);
                if (addPropertyToStratumValidated(newStratumId, blockId, blockReference, propertyDataElements)) {
                    setRerenderTrigger(`New HP & Stratum ${Date.now()}`);
                }
            } else if (hpsForClass.length === 1) {
                // Single HP - check its strata
                const hpId = hpsForClass[0].horizontal_pattern_id;
                const strataInHP = LC_Strata.current.filter(s => s.HPID === hpId);
                
                if (strataInHP.length === 0) {
                    // No stratum - create one
                    const newStratumId = createStratum(hpId);
                    if (addPropertyToStratumValidated(newStratumId, blockId, blockReference, propertyDataElements)) {
                        setRerenderTrigger(`New Stratum ${Date.now()}`);
                    }
                } else if (strataInHP.length === 1) {
                    // Single stratum - use it
                    if (addPropertyToStratumValidated(strataInHP[0].stratumID, blockId, blockReference, propertyDataElements)) {
                        setRerenderTrigger(`New Property ${Date.now()}`);
                    }
                } else {
                    toast.current.show({ 
                        severity: 'error', 
                        summary: 'Multiple Strata Available', 
                        detail: 'Select a specific Stratum to add the element to.' 
                    });
                }
            } else {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'Multiple Horizontal Patterns', 
                    detail: 'Select a Horizontal Pattern to add the element to.' 
                });
            }
        }
    };

    const [displayClasses,setDisplayClasses]=useState<any>([]);
    useEffect(() => {
        let classes: any = [];
        let filterd_classes = LC_Class?.current.filter((clss: any) => clss.legend_id === parseInt(LC_Legend?.current["id"]));
        
        if (filterd_classes !== undefined) {
            Object.keys(filterd_classes).forEach((key0) => {
                let class_id = filterd_classes[key0].class_id;
                let CC_children: any[] = [];

                // Build Class Characteristics tree nodes
                if (LC_ClassCharacteristics.current[class_id] !== undefined) {
                    let treeKey = 1;
                    Object.entries(LC_ClassCharacteristics.current[class_id]).forEach((ClassXteristic: any) => {
                        let characteristicTemplate = searchObj(legend["LC_ClassCharacteristics"], ClassXteristic[0]);
                        let CC_elements: any[] = [];
                        let elementKey = 1;

                        // Build elements under each characteristic
                        Object.entries(ClassXteristic[1]).forEach((Element: any) => {
                            if (Element[0] !== ClassXteristic[0] + '-name' && Element[0] !== ClassXteristic[0] + '-description') {
                                let elementTemplate = searchObj(characteristicTemplate[0].elements, Element[0]);
                                if (elementTemplate[0] !== undefined) {
                                    let displayValue = Element[1];
                                    // Format the display value based on type
                                    if (Array.isArray(displayValue)) {
                                        displayValue = `[${displayValue[0]} - ${displayValue[1]}]`;
                                    } else if (typeof displayValue === 'object' && displayValue?.label) {
                                        displayValue = displayValue.label;
                                    }
                                    
                                    CC_elements.push({
                                        key: treeKey + '|' + elementKey + '|' + class_id + '|' + ClassXteristic[0],
                                        label: elementTemplate[0].element_label + ': ' + displayValue + elementTemplate[0].element_rules.symbol,
                                        icon: 'text-xs p-0 m-1 pi pi-fw pi-tag'
                                    });
                                }
                                elementKey++;
                            }
                        });

                        if (characteristicTemplate[0] !== undefined) {
                            // Make the characteristic itself clickable with a 4-part key
                            // Format: 'A|legend_id|class_id|characteristic_name'
                            CC_children.push({
                                key: 'A|' + LC_Legend.current.id + '|' + class_id + '|' + ClassXteristic[0],
                                label: characteristicTemplate[0]['characteristic_label'] + ': ' + 
                                    (ClassXteristic[1][ClassXteristic[0] + '-name'] || 'Not set'),
                                icon: 'text-xs p-0 m-1 ' + characteristicTemplate[0]['characteristic_icon'],
                                children: [...CC_elements]
                            });
                        }
                        treeKey++;
                    });
                }

                // Build Horizontal Patterns tree nodes
                let filterd_HPs = LC_HorizontalPatterns?.current.filter((HP: any) => HP.class_id === class_id);
                let patterns: any[] = [];
                let strata: any[] = [];
                let elementals: any[] = [];

                if (filterd_HPs !== undefined) {
                    Object.keys(filterd_HPs).forEach((key0) => {
                        let filterd_strata = LC_Strata?.current.filter((stratum: any) => 
                            stratum.HPID === filterd_HPs[key0]["horizontal_pattern_id"]
                        );
                        
                        if (filterd_strata !== undefined) {
                            Object.keys(filterd_strata).forEach((key1) => {
                                let filterd_elements = LC_Properties?.current.filter((properties: any) => 
                                    properties.StratumID === filterd_strata[key1]["stratumID"]
                                );
                                
                                // Group properties by BlockID to handle multiple instances
                                const propertiesByBlock = new Map();
                                filterd_elements.forEach(element => {
                                    const blockId = element.BlockID;
                                    if (!propertiesByBlock.has(blockId)) {
                                        propertiesByBlock.set(blockId, []);
                                    }
                                    propertiesByBlock.get(blockId).push(element);
                                });
                                
                                // Create nodes for each property instance
                                propertiesByBlock.forEach((instances, blockId) => {
                                    let filterd_blocks = blocks?.current["LC_Block"].filter((block: any) => 
                                        block.block_id === blockId
                                    );
                                    
                                    if (filterd_blocks !== undefined && filterd_blocks.length > 0) {
                                        const block = filterd_blocks[0];
                                        
                                        // Sort instances by instanceIndex
                                        instances.sort((a, b) => (a.instanceIndex || 0) - (b.instanceIndex || 0));
                                        
                                        instances.forEach((element) => {
                                            const presenceType = element.elementPresenceType;
                                            const instanceIndex = element.instanceIndex || 0;
                                            let keySuffix = '';
                                            let labelPrefix = '';
                                            
                                            // Add suffix and prefix only if multiple instances exist
                                            if (instances.length > 1) {
                                                if (presenceType === "Exclusive") {
                                                    keySuffix = `|excl${instanceIndex}`;
                                                    labelPrefix = `<${instanceIndex + 1}> `;
                                                } else if ( presenceType === "Conditional Temporal" || presenceType === "Temporal Sequence Depending") {
                                                    keySuffix = `|seq${instanceIndex}`;
                                                    labelPrefix = `[${instanceIndex + 1}] `;
                                                }
                                            }
                                            
                                            elementals = [...elementals, {
                                                key: 'A|' + LC_Legend.current.id + '|' + class_id + '|1|' + 
                                                    filterd_HPs[key0]["horizontal_pattern_id"] + "|" + 
                                                    filterd_strata[key1]["stratumID"] + '|' + 
                                                    block.block_id + keySuffix,
                                                label: labelPrefix + block.block_label,
                                                icon: block.block_icon
                                            }];
                                        });
                                    }
                                });
                                
                                strata = [...strata, {
                                    key: 'A|' + LC_Legend.current.id + '|' + class_id + '|1|' + 
                                        filterd_HPs[key0]["horizontal_pattern_id"] + "|" + 
                                        filterd_strata[key1]["stratumID"],
                                    label: filterd_strata[key1]["name"],
                                    icon: 'pi pi-fw pi-minus',
                                    children: elementals
                                }];
                                elementals = [];
                            });
                            
                            patterns = [...patterns, {
                                key: 'A|' + LC_Legend.current.id + '|' + class_id + '|1|' + 
                                    filterd_HPs[key0]["horizontal_pattern_id"],
                                label: filterd_HPs[key0]["name"],
                                icon: 'pi pi-fw pi-bars',
                                children: strata
                            }];
                        }
                        strata = [];
                    });
                }

                // Construct the complete class node
                classes = [...classes, {
                    key: 'A|' + LC_Legend.current.id + '|' + class_id,
                    label: filterd_classes[key0]["class_name"],
                    icon: 'text-xs p-0 m-1 pi pi-fw pi-folder-open',
                    children: [
                        {
                            key: 'A|'+LC_Legend.current.id+'|'+class_id+'|CHARACTERISTICS',
                            label: 'Characteristics',
                            icon: 'text-xs p-0 m-1 pi pi-fw pi-cog',
                            children: [...CC_children]
                        },
                        ...patterns
                    ]
                }];
            });
        }
        
        setDisplayClasses(classes);
    }, [rerenderTrigger]);
    
    const [nodes, setNodes] = useState([]);
    useEffect(() => {
        setNodes(
            [{
                key: 'A|'+LC_Legend.current.id,
                label: LC_Legend.current.legend_name,
                icon: 'text-xs p-1 m-1 pi pi-fw pi-briefcase',
                children: [...displayClasses]
            }]
        );
    },[rerenderTrigger,displayClasses]);

    const togglerTemplate = (node: TreeNode, options: TreeTogglerTemplateOptions) => {
        if (!node) {
            return;
        }
        const expanded = options.expanded;
        const iconClassName = classNames('text-xs p-0 m-0 p-tree-toggler-icon pi pi-fw', {
            'text-xs p-0 m-0 pi-caret-right': !expanded,
            'text-xs p-0 m-0 pi-caret-down': expanded
        });
        return (
            <button type="button" className="text-xs p-0 m-0 p-tree-toggler p-link" tabIndex={-1} onClick={options.onClick}>
                <span className={iconClassName} aria-hidden="true"></span>
            </button>
        );
    };

    const nodeTemplate = (node: TreeNode) => {
        // Check if this node is the active one - exact string match
        const isActive = activeLCElement === node.key;
        
        /*// Debug logging for instance nodes (nodes with <> or [] brackets)
        if (node.label?.includes('<') || node.label?.includes('[')) {
            console.log('ðŸ” Instance Node Debug:', {
                label: node.label,
                nodeKey: node.key,
                activeLCElement: activeLCElement,
                isActive: isActive,
                keysMatch: activeLCElement === node.key
            });
        }*/
        
        // Custom style for active node
        const nodeStyle = isActive ? {
            border: '2px solid #FA8128',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 129, 40, 0.08)',
            padding: '4px',
            fontWeight: 'bold'
        } : {};
        
        return (
            <div style={nodeStyle}>
                <span>{node.label}</span>
            </div>
        );
    };

    const buildExpandedMap = (treeNodes: any[]): Record<string, boolean> => {
        const expanded: Record<string, boolean> = {};

        const walk = (nodes: any[]) => {
            nodes.forEach((node) => {
                if (!node) return;

                // Only expand nodes that have children
                if (node.children && node.children.length > 0) {
                    expanded[node.key] = true;
                    walk(node.children);
                }
            });
        };

        walk(treeNodes);
        return expanded;
    };

    // Fully expand the Legend tree whenever its node structure changes
    useEffect(() => {
        if (nodes && nodes.length > 0) {
            setExpandedNodes(buildExpandedMap(nodes));
        }
    }, [nodes]);

    // Fully expand the LCML Elements tree whenever its node structure changes
    useEffect(() => {
        if (elements && elements.length > 0) {
            setExpandedElements(buildExpandedMap(elements));
        }
    }, [elements]);

    /*const [expandedNodes, setExpandedNodes] = useState({'A|1': true, 'A|1|1': true});
    const [expandedElements, setExpandedElements] = useState({'1001': true, '1002': true, '1003': true, '1004': true, '1007': true, '1010': true, '1015': true, '1018': true, '1019': true, '1022': true, '1023': true});*/
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
    const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>({});

    const [activeLCBlock,setActiveLCBlock] = useState<any>(false);
    
    // Context menu for duplication
    const contextMenu = useRef<ContextMenu>(null);
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
    const [contextMenuItems, setContextMenuItems] = useState<MenuItem[]>([]);
    const isDuplicating = useRef(false); // Flag to prevent rapid duplicate executions

    // Duplication handler
    const duplicateElement = (node: TreeNode) => {
        if (!node || !node.key) return;
        
        // Prevent multiple rapid executions
        if (isDuplicating.current) {
            console.log('Duplication already in progress, ignoring...');
            return;
        }
        
        isDuplicating.current = true;

        const nodeKey = node.key as string;
        const keyParts = nodeKey.split('|');

        // Determine element type
        const getElementType = (parts: string[]) => {
            if (parts.length === 3) return 'CLASS';
            if (parts.length === 5) return 'HORIZONTAL_PATTERN';
            if (parts.length === 6) return 'STRATUM';
            return 'UNKNOWN';
        };

        const elementType = getElementType(keyParts);

        try {
            switch (elementType) {
                case 'CLASS': {
                    const classId = parseInt(keyParts[2]);
                    const originalClass = LC_Class.current.find(c => c.class_id === classId);
                    
                    if (!originalClass) {
                        toast.current?.show({ 
                            severity: 'error', 
                            summary: 'Error', 
                            detail: 'Class not found.' 
                        });
                        return;
                    }

                    // Generate new class ID using helper function with fallback
                    const newClassId = getNextClassId 
                        ? getNextClassId() 
                        : Math.max(getMaxId(LC_Class.current, 'class_id') + 1, 1);

                    // Duplicate the class
                    const newClass = {
                        ...originalClass,
                        class_id: newClassId,
                        class_name: originalClass.class_name + ' - Copy'
                    };
                    LC_Class.current = [...LC_Class.current, newClass];

                    // Duplicate class characteristics
                    // LC_ClassCharacteristics is an object keyed by class_id
                    if (LC_ClassCharacteristics.current[classId]) {
                        const originalCharacteristics = LC_ClassCharacteristics.current[classId];
                        // Deep copy the characteristics for the new class
                        LC_ClassCharacteristics.current[newClassId] = JSON.parse(JSON.stringify(originalCharacteristics));
                    }

                    // Duplicate horizontal patterns - collect all new HPs first
                    const originalHPs = LC_HorizontalPatterns.current.filter(
                        hp => hp.class_id === classId
                    );
                    
                    const hpIdMap = new Map(); // Map old HP IDs to new HP IDs
                    const newHPs: any[] = [];
                    let nextHPId = getNextHPId 
                        ? getNextHPId() 
                        : Math.max(getMaxId(LC_HorizontalPatterns.current, 'horizontal_pattern_id') + 1, horizontalPatternNumber.current);
                    
                    originalHPs.forEach(hp => {
                        hpIdMap.set(hp.horizontal_pattern_id, nextHPId);
                        
                        const newHP = {
                            ...hp,
                            class_id: newClassId,
                            horizontal_pattern_id: nextHPId,
                            name: hp.name + ' - Copy'
                        };
                        newHPs.push(newHP);
                        nextHPId++;
                    });
                    
                    // Add all new HPs at once
                    LC_HorizontalPatterns.current = [...LC_HorizontalPatterns.current, ...newHPs];
                    horizontalPatternNumber.current = nextHPId;

                    // Duplicate strata - collect all new strata first
                    const originalStrata = LC_Strata.current.filter(
                        s => originalHPs.some(hp => hp.horizontal_pattern_id === s.HPID)
                    );
                    
                    const strataIdMap = new Map(); // Map old Stratum IDs to new Stratum IDs
                    const newStrata: any[] = [];
                    let nextStratumId = getNextStratumId 
                        ? getNextStratumId() 
                        : Math.max(getMaxId(LC_Strata.current, 'stratumID') + 1, strataNumber.current);
                    
                    originalStrata.forEach(stratum => {
                        strataIdMap.set(stratum.stratumID, nextStratumId);
                        
                        const newStratum = {
                            ...stratum,
                            HPID: hpIdMap.get(stratum.HPID),
                            stratumID: nextStratumId,
                            name: stratum.name + ' - Copy'
                        };
                        newStrata.push(newStratum);
                        nextStratumId++;
                    });
                    
                    // Add all new strata at once
                    LC_Strata.current = [...LC_Strata.current, ...newStrata];
                    strataNumber.current = nextStratumId;

                    // Duplicate properties
                    const originalProperties = LC_Properties.current.filter(
                        p => originalStrata.some(s => s.stratumID === p.StratumID)
                    );
                    
                    const newProperties = originalProperties.map(prop => ({
                        ...prop,
                        StratumID: strataIdMap.get(prop.StratumID)
                    }));
                    LC_Properties.current = [...LC_Properties.current, ...newProperties];

                    stratumPropertyNumber.current += newProperties.length;
                    
                    toast.current?.show({ 
                        severity: 'success', 
                        summary: 'Success', 
                        detail: 'Class duplicated successfully.' 
                    });
                    
                    setRerenderTrigger('Duplicate Class ' + Date.now());
                    break;
                }

                case 'HORIZONTAL_PATTERN': {
                    const classId = parseInt(keyParts[2]);
                    const hpId = parseInt(keyParts[4]);
                    const originalHP = LC_HorizontalPatterns.current.find(
                        hp => hp.horizontal_pattern_id === hpId
                    );
                    
                    if (!originalHP) {
                        toast.current?.show({ 
                            severity: 'error', 
                            summary: 'Error', 
                            detail: 'Horizontal Pattern not found.' 
                        });
                        return;
                    }

                    // Generate new HP ID using helper function with fallback
                    const newHPId = getNextHPId 
                        ? getNextHPId() 
                        : Math.max(getMaxId(LC_HorizontalPatterns.current, 'horizontal_pattern_id') + 1, horizontalPatternNumber.current);
                    horizontalPatternNumber.current = newHPId + 1;

                    // Duplicate the horizontal pattern
                    const newHP = {
                        ...originalHP,
                        horizontal_pattern_id: newHPId,
                        name: originalHP.name + ' - Copy'
                    };
                    LC_HorizontalPatterns.current = [...LC_HorizontalPatterns.current, newHP];

                    // Duplicate strata - collect all new strata first
                    const originalStrata = LC_Strata.current.filter(
                        s => s.HPID === hpId
                    );
                    
                    const strataIdMap = new Map();
                    const newStrata: any[] = [];
                    let nextStratumId = getNextStratumId 
                        ? getNextStratumId() 
                        : Math.max(getMaxId(LC_Strata.current, 'stratumID') + 1, strataNumber.current);
                    
                    originalStrata.forEach(stratum => {
                        strataIdMap.set(stratum.stratumID, nextStratumId);
                        
                        const newStratum = {
                            ...stratum,
                            HPID: newHPId,
                            stratumID: nextStratumId,
                            name: stratum.name + ' - Copy'
                        };
                        newStrata.push(newStratum);
                        nextStratumId++;
                    });
                    
                    // Add all new strata at once
                    LC_Strata.current = [...LC_Strata.current, ...newStrata];
                    strataNumber.current = nextStratumId;

                    // Duplicate properties
                    const originalProperties = LC_Properties.current.filter(
                        p => originalStrata.some(s => s.stratumID === p.StratumID)
                    );
                    
                    const newProperties = originalProperties.map(prop => ({
                        ...prop,
                        StratumID: strataIdMap.get(prop.StratumID)
                    }));
                    LC_Properties.current = [...LC_Properties.current, ...newProperties];

                    stratumPropertyNumber.current += newProperties.length;
                    
                    toast.current?.show({ 
                        severity: 'success', 
                        summary: 'Success', 
                        detail: 'Horizontal Pattern duplicated successfully.' 
                    });
                    
                    setRerenderTrigger('Duplicate HP ' + Date.now());
                    break;
                }

                case 'STRATUM': {
                    const hpId = parseInt(keyParts[4]);
                    const stratumId = parseInt(keyParts[5]);
                    const originalStratum = LC_Strata.current.find(
                        s => s.stratumID === stratumId
                    );
                    
                    if (!originalStratum) {
                        toast.current?.show({ 
                            severity: 'error', 
                            summary: 'Error', 
                            detail: 'Stratum not found.' 
                        });
                        return;
                    }

                    // Generate new Stratum ID using helper function with fallback
                    const newStratumId = getNextStratumId 
                        ? getNextStratumId() 
                        : Math.max(getMaxId(LC_Strata.current, 'stratumID') + 1, strataNumber.current);
                    strataNumber.current = newStratumId + 1;

                    // Duplicate the stratum
                    const newStratum = {
                        ...originalStratum,
                        stratumID: newStratumId,
                        name: originalStratum.name + ' - Copy'
                    };
                    LC_Strata.current = [...LC_Strata.current, newStratum];

                    // Duplicate properties
                    const originalProperties = LC_Properties.current.filter(
                        p => p.StratumID === stratumId
                    );
                    
                    const newProperties = originalProperties.map(prop => ({
                        ...prop,
                        StratumID: newStratumId
                    }));
                    LC_Properties.current = [...LC_Properties.current, ...newProperties];

                    stratumPropertyNumber.current += newProperties.length;
                    
                    toast.current?.show({ 
                        severity: 'success', 
                        summary: 'Success', 
                        detail: 'Stratum duplicated successfully.' 
                    });
                    
                    setRerenderTrigger('Duplicate Stratum ' + Date.now());
                    break;
                }

                default:
                    toast.current?.show({ 
                        severity: 'warn', 
                        summary: 'Cannot Duplicate', 
                        detail: 'This type of element cannot be duplicated.' 
                    });
            }
        } catch (error) {
            console.error('Error during duplication:', error);
            toast.current?.show({ 
                severity: 'error', 
                summary: 'Error', 
                detail: 'An error occurred while duplicating.' 
            });
        } finally {
            // Always reset the flag to allow future duplications
            setTimeout(() => {
                isDuplicating.current = false;
            }, 300);
        }
    };

    // Context menu handler
    const onNodeContextMenu = (event: any) => {
        const node = event.node as TreeNode;
        setSelectedNode(node);

        if (!node || !node.key) return;

        const nodeKey = node.key as string;
        const keyParts = nodeKey.split('|');

        // Determine if this node can be duplicated
        const canDuplicate = 
            keyParts.length === 3 || // CLASS
            keyParts.length === 5 || // HORIZONTAL_PATTERN
            keyParts.length === 6;   // STRATUM

        if (canDuplicate && !keyParts.includes('CHARACTERISTICS')) {
            // Capture the node in the closure to avoid stale state
            const nodeToClone = node;
            const items: MenuItem[] = [
                {
                    label: 'Duplicate',
                    icon: 'pi pi-copy',
                    command: () => {
                        // Use the captured node directly
                        duplicateElement(nodeToClone);
                        // Clear state after duplication
                        setTimeout(() => {
                            setSelectedNode(null);
                            setContextMenuItems([]);
                        }, 100);
                    }
                }
            ];
            setContextMenuItems(items);
            contextMenu.current?.show(event.originalEvent);
        }
    };

    // Drag and drop handler
    const onDragDrop = (event: TreeDragDropEvent) => {
        const dragNode = event.dragNode;
        const dropNode = event.dropNode;
        const dropIndex = event.dropIndex;

        if (!dragNode || !dropNode) return;

        const dragKey = dragNode.key as string;
        const dropKey = dropNode.key as string;

        const dragParts = dragKey.split('|');
        const dropParts = dropKey.split('|');

        // Prevent dragging legend root or characteristics
        if (dragParts.length <= 2 || dragParts.includes('CHARACTERISTICS')) {
            toast.current?.show({ 
                severity: 'warn', 
                summary: 'Cannot Move', 
                detail: 'This element cannot be reordered.' 
            });
            return;
        }

        // Determine the type of element being dragged
        const getElementType = (keyParts: string[]) => {
            if (keyParts[3] === 'CHARACTERISTICS') return 'CHARACTERISTICS';
            if (keyParts.length === 3) return 'CLASS';
            if (keyParts.length === 5) return 'HORIZONTAL_PATTERN';
            if (keyParts.length === 6) return 'STRATUM';
            // Property can be length 7 (normal) or length 8 (with seq/excl suffix)
            if (keyParts.length === 7) return 'PROPERTY';
            if (keyParts.length === 8 && /^(seq|excl)\d+$/.test(keyParts[7])) return 'PROPERTY';
            return 'UNKNOWN';
        };

        const dragType = getElementType(dragParts);
        const dropType = getElementType(dropParts);

        // Only allow reordering within the same type and parent
        if (dragType !== dropType) {
            toast.current?.show({ 
                severity: 'warn', 
                summary: 'Invalid Move', 
                detail: 'Can only reorder elements of the same type.' 
            });
            return;
        }

        try {
            switch (dragType) {
                case 'CLASS': {
                    const dragClassId = parseInt(dragParts[2]);
                    const dropClassId = parseInt(dropParts[2]);
                    
                    const classArray = [...LC_Class.current];
                    const dragIndex = classArray.findIndex(c => c.class_id === dragClassId);
                    const dropIdx = classArray.findIndex(c => c.class_id === dropClassId);
                    
                    if (dragIndex !== -1 && dropIdx !== -1) {
                        const [removed] = classArray.splice(dragIndex, 1);
                        classArray.splice(dropIdx, 0, removed);
                        LC_Class.current = classArray;
                        setRerenderTrigger('Reorder Class ' + Date.now());
                    }
                    break;
                }
                
                case 'HORIZONTAL_PATTERN': {
                    // Ensure they're in the same class
                    if (dragParts[2] !== dropParts[2]) {
                        toast.current?.show({ 
                            severity: 'warn', 
                            summary: 'Invalid Move', 
                            detail: 'Can only reorder Horizontal Patterns within the same Class.' 
                        });
                        return;
                    }
                    
                    const dragHPId = parseInt(dragParts[4]);
                    const dropHPId = parseInt(dropParts[4]);
                    
                    const hpArray = [...LC_HorizontalPatterns.current];
                    const dragIndex = hpArray.findIndex(hp => hp.horizontal_pattern_id === dragHPId);
                    const dropIdx = hpArray.findIndex(hp => hp.horizontal_pattern_id === dropHPId);
                    
                    if (dragIndex !== -1 && dropIdx !== -1) {
                        const [removed] = hpArray.splice(dragIndex, 1);
                        hpArray.splice(dropIdx, 0, removed);
                        LC_HorizontalPatterns.current = hpArray;
                        setRerenderTrigger('Reorder HP ' + Date.now());
                    }
                    break;
                }
                
                case 'STRATUM': {
                    // Ensure they're in the same horizontal pattern
                    if (dragParts[4] !== dropParts[4]) {
                        toast.current?.show({ 
                            severity: 'warn', 
                            summary: 'Invalid Move', 
                            detail: 'Can only reorder Strata within the same Horizontal Pattern.' 
                        });
                        return;
                    }
                    
                    const dragStratumId = parseInt(dragParts[5]);
                    const dropStratumId = parseInt(dropParts[5]);
                    
                    const strataArray = [...LC_Strata.current];
                    const dragIndex = strataArray.findIndex(s => s.stratumID === dragStratumId);
                    const dropIdx = strataArray.findIndex(s => s.stratumID === dropStratumId);
                    
                    if (dragIndex !== -1 && dropIdx !== -1) {
                        const [removed] = strataArray.splice(dragIndex, 1);
                        strataArray.splice(dropIdx, 0, removed);
                        LC_Strata.current = strataArray;
                        setRerenderTrigger('Reorder Stratum ' + Date.now());
                    }
                    break;
                }
                
                case 'PROPERTY': {
                    // Ensure they're in the same stratum
                    if (dragParts[5] !== dropParts[5]) {
                        toast.current?.show({ 
                            severity: 'warn', 
                            summary: 'Invalid Move', 
                            detail: 'Can only reorder Properties within the same Stratum.' 
                        });
                        return;
                    }
                    
                    const dragStratumId = parseInt(dragParts[5]);
                    const dragBlockId = parseInt(dragParts[6]);
                    const dropBlockId = parseInt(dropParts[6]);
                    
                    // Extract instanceIndex from keys if present (for seq/excl elements)
                    let dragInstanceIndex = 0;
                    let dropInstanceIndex = 0;
                    
                    if (dragParts.length === 8 && /^(seq|excl)\d+$/.test(dragParts[7])) {
                        dragInstanceIndex = parseInt(dragParts[7].replace(/^(seq|excl)/, ''));
                    }
                    if (dropParts.length === 8 && /^(seq|excl)\d+$/.test(dropParts[7])) {
                        dropInstanceIndex = parseInt(dropParts[7].replace(/^(seq|excl)/, ''));
                    }
                    
                    const propertiesArray = [...LC_Properties.current];
                    const stratumProperties = propertiesArray.filter(p => p.StratumID === dragStratumId);
                    const otherProperties = propertiesArray.filter(p => p.StratumID !== dragStratumId);
                    
                    // Find the specific instances being dragged/dropped
                    const dragIndex = stratumProperties.findIndex(p => 
                        p.BlockID === dragBlockId && (p.instanceIndex || 0) === dragInstanceIndex
                    );
                    const dropIdx = stratumProperties.findIndex(p => 
                        p.BlockID === dropBlockId && (p.instanceIndex || 0) === dropInstanceIndex
                    );
                    
                    if (dragIndex !== -1 && dropIdx !== -1) {
                        // For properties with the same BlockID (same block type), we need to renumber instanceIndex values
                        // For properties with different BlockIDs, we just reorder positions
                        const sameBlock = dragBlockId === dropBlockId;
                        
                        if (sameBlock) {
                            // Same block type - renumber ALL instances based on new array order
                            // This is needed for Exclusive/Temporal instances like <1>, <2>, <3>
                            
                            // Step 1: Physically reorder the array
                            const [removed] = stratumProperties.splice(dragIndex, 1);
                            stratumProperties.splice(dropIdx, 0, removed);
                            
                            // Step 2: Find all properties of this block type in the stratum
                            const sameBlockProperties = stratumProperties.filter(p => p.BlockID === dragBlockId);
                            
                            // Step 3: Create mapping of old instanceIndex -> new instanceIndex
                            const instanceIndexMapping = new Map();
                            sameBlockProperties.forEach((prop, newIndex) => {
                                const oldInstanceIndex = prop.instanceIndex || 0;
                                instanceIndexMapping.set(oldInstanceIndex, newIndex);
                            });
                            
                            // Step 4: Update all properties of this block type with new instanceIndex
                            sameBlockProperties.forEach((prop, newIndex) => {
                                prop.instanceIndex = newIndex;
                            });
                            
                            // Step 5: Update ALL characteristics for this block type with new instanceIndex
                            const characteristicsArray = [...LC_Characteristics.current];
                            characteristicsArray.forEach(char => {
                                if (char.StratumID === dragStratumId && char.BlockID === dragBlockId) {
                                    const oldInstanceIndex = char.instanceIndex || 0;
                                    if (instanceIndexMapping.has(oldInstanceIndex)) {
                                        char.instanceIndex = instanceIndexMapping.get(oldInstanceIndex);
                                    }
                                }
                            });
                            
                            LC_Characteristics.current = characteristicsArray;
                            LC_Properties.current = [...otherProperties, ...stratumProperties];
                        } else {
                            // Different block types - just reorder positions
                            const [removed] = stratumProperties.splice(dragIndex, 1);
                            stratumProperties.splice(dropIdx, 0, removed);
                            LC_Properties.current = [...otherProperties, ...stratumProperties];
                            
                            // Also reorder associated characteristics to maintain parallel order
                            const characteristicsArray = [...LC_Characteristics.current];
                            const stratumCharacteristics = characteristicsArray.filter(c => c.StratumID === dragStratumId);
                            const otherCharacteristics = characteristicsArray.filter(c => c.StratumID !== dragStratumId);
                            
                            // Find characteristics belonging to the dragged property instance
                            const draggedPropertyChars = stratumCharacteristics.filter(c => 
                                c.BlockID === dragBlockId && (c.instanceIndex || 0) === dragInstanceIndex
                            );
                            
                            // Find characteristics belonging to the drop target property instance
                            const dropPropertyChars = stratumCharacteristics.filter(c => 
                                c.BlockID === dropBlockId && (c.instanceIndex || 0) === dropInstanceIndex
                            );
                            
                            // Remove characteristics of both properties
                            const remainingChars = stratumCharacteristics.filter(c => 
                                !((c.BlockID === dragBlockId && (c.instanceIndex || 0) === dragInstanceIndex) ||
                                  (c.BlockID === dropBlockId && (c.instanceIndex || 0) === dropInstanceIndex))
                            );
                            
                            // Rebuild characteristics array in the new order
                            const reorderedChars = [];
                            
                            stratumProperties.forEach(prop => {
                                const propBlockId = prop.BlockID;
                                const propInstanceIndex = prop.instanceIndex || 0;
                                
                                // Add characteristics for this property
                                if (propBlockId === dragBlockId && propInstanceIndex === dragInstanceIndex) {
                                    reorderedChars.push(...draggedPropertyChars);
                                } else if (propBlockId === dropBlockId && propInstanceIndex === dropInstanceIndex) {
                                    reorderedChars.push(...dropPropertyChars);
                                } else {
                                    // Add characteristics from remaining pool that match this property
                                    const matchingChars = remainingChars.filter(c => 
                                        c.BlockID === propBlockId && (c.instanceIndex || 0) === propInstanceIndex
                                    );
                                    reorderedChars.push(...matchingChars);
                                }
                            });
                            
                            LC_Characteristics.current = [...otherCharacteristics, ...reorderedChars];
                        }
                        
                        setRerenderTrigger('Reorder Property ' + Date.now());
                    }
                    break;
                }
                
                default:
                    toast.current?.show({ 
                        severity: 'warn', 
                        summary: 'Cannot Reorder', 
                        detail: 'This type of element cannot be reordered.' 
                    });
            }
        } catch (error) {
            console.error('Error during drag and drop:', error);
            toast.current?.show({ 
                severity: 'error', 
                summary: 'Error', 
                detail: 'An error occurred while reordering.' 
            });
        }
    };

    return (        
        <div className="m-0 p-0 align-self-start" style={{ height: '100%', overflow: 'hidden'}}>
            <Toast ref={toast} />
            <ContextMenu model={contextMenuItems} ref={contextMenu} />
            {whichTree==="LCMLElements" && 
                <div className="guide-LCMLElements m-0 p-0" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                    <Tree value={elements} selectionMode="single" selectionKeys={activeLCBlock} onSelectionChange={(e) => setActiveLCBlock(e.value)} expandedKeys={expandedElements} onToggle={(e) => setExpandedElements(e.value)} togglerTemplate={togglerTemplate} filter filterMode="strict" filterPlaceholder="Search LCML Elements" className="p-0 m-0 w-full flex-grow text-xs p-inputtext-sm" style={{ minWidth: '240px', minHeight: '100%', backgroundColor: 'var(--blue-50)' }} onNodeDoubleClick={(e)=>constructLCBlock(e.node.key)} />
                </div>
            }
            {whichTree==="Legend" &&
                <div className="guide-myLegend m-0 p-0" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                    <Tree 
                        value={nodes} 
                        selectionMode="single" 
                        selectionKeys={activeLCElement} 
                        onSelectionChange={(e) => setActiveLCElement(e.value)} 
                        expandedKeys={expandedNodes}
                        onToggle={(e) => setExpandedNodes(e.value)}
                        togglerTemplate={togglerTemplate} 
                        nodeTemplate={nodeTemplate} 
                        filter 
                        filterMode="strict" 
                        filterPlaceholder="Search Your Legend" 
                        className="p-0 m-0 w-full flex-grow text-xs p-inputtext-sm" 
                        style={{ minWidth: '210px', minHeight: '100%' }} 
                        onNodeDoubleClick={(e)=>alert("Double click on the Basic Elements to the left to add them to the Legend.")}
                        dragdropScope="legend-tree"
                        onDragDrop={onDragDrop}
                        onContextMenu={onNodeContextMenu}
                        contextMenuSelectionKey={selectedNode?.key ? String(selectedNode.key) : undefined}
                    />
                </div>
            }
        </div>
    )
}