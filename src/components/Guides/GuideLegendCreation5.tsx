import { useState,useRef,useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Button } from "primereact/button";
import { Controller, useForm } from 'react-hook-form';
import { Toast } from 'primereact/toast';
import { Tree, TreeTogglerTemplateOptions } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';
import { classNames } from 'primereact/utils';
import { Slider, SliderChangeEvent } from "primereact/slider";
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import { InputNumber } from "primereact/inputnumber";
import { Chip } from 'primereact/chip';
import { ListBox, ListBoxChangeEvent } from 'primereact/listbox';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

import '../../css/TreeView.css';

export const GuideLegendCreation5 = (props:any) => {
     const {UUID,
            setRerenderTrigger,
            setGuide4Visible,
            setGuide5Visible,
            blocks,
            blockLookUp,
            characteristicLookUp,
            characteristics,
            elements,
            LC_Class,
            LC_HorizontalPatterns,
            LC_Strata,
            LC_Properties,
            stratumPropertyNumber,
            LC_Characteristics,
            stratumCharacteristicNumber,
            OptionsBus,
            options,
            validateRange
        } = props;
    
    const toast = useRef(null);

    const searchByCriteria = (array, criteria) => {
        return array.filter(item => {
            return Object.keys(criteria).every(key => item[key] === criteria[key]);
        });
    };

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
            
            // CRITICAL: Skip if the existing property has Exclusive or Temporal presence type
            const existingPresenceType = prop.elementPresenceType;
            if (existingPresenceType === "Exclusive" || 
                existingPresenceType === "Conditional Temporal" || 
                existingPresenceType === "Temporal Sequence Depending") {
                // These presence types allow hierarchical conflicts
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
        
        if (presenceType === "Exclusive" || presenceType === "Conditional Temporal" || presenceType === "Temporal Sequence Depending") {
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

    const {
        register,
        control,
        formState: { errors },
        handleSubmit,
        getValues,
        setValue,
        watch,
        reset
    } = useForm({ });
    const getFormErrorMessage = (name:any) => {
        return errors[name] ? <small className="p-error">This field is required</small> : <small className="p-error">&nbsp;</small>;
    };
    const {
        register: register1,
        control: control1,
        formState: { errors:errors1 },
        handleSubmit: handleSubmit1,
        getValues: getValues1,
        setValue: setValue1,
        reset: reset1
    } = useForm({ });    
    const getFormErrorMessage1 = (name:any) => {
        return errors1[name] ? <small className="p-error">This field is required</small> : <small className="p-error">&nbsp;</small>;
    };

    // Edit Mode State Management
    const [editMode, setEditMode] = useState(false);
    const [editingProperty, setEditingProperty] = useState(null);
    const [editingCharacteristic, setEditingCharacteristic] = useState(null);
    const [editCharacteristicMode, setEditCharacteristicMode] = useState(false);

    /*const showProperty = () => {
        for (const [key, value] of Object.entries(getValues())) {
            toast.current.show({ severity: 'success', summary: 'Property Submitted', detail: key+": "+value});
        };
    };
    const showCharacteristic = () => {
        for (const [key, value] of Object.entries(getValues1())) {
            toast.current.show({ severity: 'success', summary: 'Characteristic Submitted', detail: key+": "+value});
        };
    };*/

    const [StratumPropertyID, setSPID] = useState(stratumPropertyNumber.current);
    const [stratumProperties, addStratumProperty] = useState(LC_Properties.current);
    
    const submitProperty = (data: any,event) => {
        event.preventDefault();
        let StratumID = (document.getElementById("stratumID") as HTMLInputElement).value;
        let BlockID = (document.getElementById("blockID") as HTMLInputElement).value;
        let BlockReference = (document.getElementById("blockReference") as HTMLInputElement).value;
        let formValues = {};
        Object.entries(getValues()).forEach((submission)=>{            
            if(typeof(submission[1]) === "object"){
                if(!Array.isArray(submission[1])){                    
                    if(submission[1]['label'] !== undefined){                        
                        submission = [submission[0],submission[1]['label']];                        
                    }                        
                }                
            }            
            formValues = {...formValues, [submission[0]]: submission[1]};
        });

        // Extract instanceIndex from activeBlock key (handles seq0, seq1, excl0, excl1 suffixes)
        let instanceIndex = 0;
        if (activeBlock) {
            const blockKey = activeBlock.split("-");
            if (blockKey.length > 0) {
                const lastSegment = blockKey[blockKey.length - 1];
                if (/^(seq|excl)\d+$/.test(lastSegment)) {
                    instanceIndex = parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                }
            }
        }

        // Check if this exact property already exists
        const existingProperty = LC_Properties.current.find(properties => 
            properties.StratumID === parseInt(StratumID) && 
            properties.BlockID === parseInt(BlockID) &&
            (properties.instanceIndex || 0) === instanceIndex
        );

        // EDIT MODE: Update existing property
        if (editMode && editingProperty) {
            // Update the property
            const updatedProperties = stratumProperties.map(p => 
                (p.StratumID === editingProperty.StratumID && 
                 p.BlockID === editingProperty.BlockID &&
                 (p.instanceIndex || 0) === (editingProperty.instanceIndex || 0))
                ? { 
                    ...p, 
                    ...formValues,
                    StratumID: parseInt(StratumID),
                    BlockID: parseInt(BlockID),
                    BlockReference: BlockReference,
                    instanceIndex: editingProperty.instanceIndex || 0
                  }
                : p
            );
            
            addStratumProperty(updatedProperties);
            
            // Update LC_Properties.current
            LC_Properties.current = LC_Properties.current.map(p =>
                (p.StratumID === editingProperty.StratumID && 
                 p.BlockID === editingProperty.BlockID &&
                 (p.instanceIndex || 0) === (editingProperty.instanceIndex || 0))
                ? { 
                    ...p, 
                    ...formValues,
                    StratumID: parseInt(StratumID),
                    BlockID: parseInt(BlockID),
                    BlockReference: BlockReference,
                    instanceIndex: editingProperty.instanceIndex || 0
                  }
                : p
            );
            
            // Exit edit mode and clear form
            setEditMode(false);
            setEditingProperty(null);
            reset();
            
            setRerenderTrigger('Element:'+parseInt(StratumID)+parseInt(BlockID));
            
            // Show success toast FIRST
            toast.current.show({ 
                severity: 'success', 
                summary: 'Updated', 
                detail: 'Property updated successfully',
                life: 3000
            });
            
            // Delay state clearing to allow toast to mount and display (200ms)
            setTimeout(() => {
                setActiveBlock(null);
                setActiveCharacteristic(null);
                setActiveStratum(null);
                setActiveBlockDetails(undefined);
                setActiveStratumDetails(undefined);
                setDisplayElements(false);
                setDisplayInstruction(true);
            }, 200);
            
            return;
        }

        // ADD MODE: Check duplicate element status
        const duplicateCheck = checkDuplicateElement(parseInt(StratumID), parseInt(BlockID));
        
        // If element exists but doesn't allow multiple instances
        if (!duplicateCheck.valid) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'Element Already Exists', 
                detail: duplicateCheck.message,
                life: 5000
            });
            return;
        }

        // If element exists and SHOULD create new instance (Exclusive/Temporal)
        if (duplicateCheck.shouldCreateNew) {
            // Calculate next instanceIndex
            const existingInstances = LC_Properties.current.filter(p => 
                p.StratumID === parseInt(StratumID) && 
                p.BlockID === parseInt(BlockID)
            );
            
            // Find max instanceIndex
            const maxInstanceIndex = existingInstances.reduce((max, p) => {
                const pIndex = p.instanceIndex || 0;
                return pIndex > max ? pIndex : max;
            }, 0);
            
            instanceIndex = maxInstanceIndex + 1;
            
            toast.current.show({ 
                severity: 'info', 
                summary: 'Creating New Instance', 
                detail: `Creating instance ${instanceIndex} of this element`,
                life: 3000
            });
        } else if (existingProperty) {
            // Element exists with same instanceIndex (should not happen in ADD mode)
            toast.current.show({ 
                severity: 'warn', 
                summary: 'Element Already Added', 
                detail: `This element already exists in ${activeStratumDetails?.name}. Click on the chip below to edit it, or select a different element to add.`,
                life: 5000
            });
            return;
        }

        // Run hierarchical validations for NEW properties
        const parentChildCheck = checkParentChildConflict(parseInt(StratumID), parseInt(BlockID));
        if (!parentChildCheck.valid) {
            toast.current.show({ 
                severity: 'error', 
                summary: 'Parent-Child Conflict', 
                detail: parentChildCheck.message,
                life: 5000
            });
            return;
        }

        // All validations passed - ADD the property (APPEND, don't replace)
        const newProperty = { 
            StratumID: parseInt(StratumID), 
            BlockID: parseInt(BlockID), 
            BlockReference: BlockReference, 
            instanceIndex: instanceIndex,
            ...formValues 
        };

        addStratumProperty([...stratumProperties, newProperty]);  // APPEND

        setSPID(StratumPropertyID+1);
        stratumPropertyNumber.current++;
        
        LC_Properties.current = [...LC_Properties.current, newProperty];  // APPEND
        
        setRerenderTrigger('Element:'+parseInt(StratumID)+parseInt(BlockID));
        reset();

        //showProperty(); old notification
        // Success toast for property add
        const blockLabel = activeBlockDetails?.block_label || 'Element';
        const stratumName = activeStratumDetails?.name || 'Stratum';
        const instanceLabel = instanceIndex > 0 ? ` (Instance ${instanceIndex})` : '';
        toast.current.show({ 
            severity: 'success', 
            summary: 'Property Added', 
            detail: `${stratumName} > ${blockLabel}${instanceLabel} added successfully`,
            life: 3000
        });

        // Delay state clearing to allow toast to mount and display (200ms)
        setTimeout(() => {
            setActiveBlock(null);
            setActiveCharacteristic(null);
            setActiveStratum(null);
            setActiveBlockDetails(undefined);
            setActiveStratumDetails(undefined);
            setDisplayElements(false);
            setDisplayInstruction(true);
        }, 3000);
    };
    const [StratumCharacteristicID, setCID] = useState(stratumCharacteristicNumber.current);
    const [stratumCharacteristics, addStratumCharacteristic] = useState(LC_Characteristics.current);
    
    const submitCharacteristic = (data: any,event) => {
        event.preventDefault();
        let StratumID = (document.getElementById("stratumID") as HTMLInputElement).value;
        let BlockID = (document.getElementById("blockID") as HTMLInputElement).value;
        let BlockReference = (document.getElementById("blockReference") as HTMLInputElement).value;
        let CharacteristicID = (document.getElementById("characteristicID") as HTMLInputElement).value;
        let CharacteristicReference = (document.getElementById("characteristicReference") as HTMLInputElement).value;
        let CharacteristicLabel = (document.getElementById("characteristicLabel") as HTMLInputElement).value;
        let formValues = {};
        Object.entries(getValues1()).forEach((submission)=>{            
            if(typeof(submission[1]) === "object"){
                if(!Array.isArray(submission[1])){                    
                    if(submission[1]['label'] !== undefined){                        
                        submission = [submission[0],submission[1]['label']];                        
                    }                        
                }                
            }            
            formValues = {...formValues, [submission[0]]: submission[1]};
        });

        // Extract instanceIndex from activeBlock key (handles seq0, seq1, excl0, excl1 suffixes)
        let instanceIndex = 0;
        if (activeBlock) {
            const blockKey = activeBlock.split("-");
            if (blockKey.length > 0) {
                const lastSegment = blockKey[blockKey.length - 1];
                if (/^(seq|excl)\d+$/.test(lastSegment)) {
                    instanceIndex = parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                }
            }
        }

        // Check if this exact characteristic already exists
        const existingCharacteristic = LC_Characteristics.current.find(characteristics => 
            characteristics.StratumID === parseInt(StratumID) && 
            characteristics.BlockID === parseInt(BlockID) &&
            characteristics.CharacteristicID === parseInt(CharacteristicID) &&
            (characteristics.instanceIndex || 0) === instanceIndex
        );

        // EDIT MODE: Update existing characteristic
        if (editCharacteristicMode && editingCharacteristic) {
            const updatedCharacteristics = stratumCharacteristics.map(c => 
                (c.StratumID === editingCharacteristic.StratumID && 
                 c.BlockID === editingCharacteristic.BlockID &&
                 c.CharacteristicID === editingCharacteristic.CharacteristicID &&
                 (c.instanceIndex || 0) === (editingCharacteristic.instanceIndex || 0))
                ? { 
                    ...c, 
                    ...formValues,
                    StratumID: parseInt(StratumID),
                    BlockID: parseInt(BlockID),
                    BlockReference: BlockReference,
                    CharacteristicID: parseInt(CharacteristicID),
                    CharacteristicReference: CharacteristicReference,
                    CharacteristicLabel: CharacteristicLabel,
                    instanceIndex: editingCharacteristic.instanceIndex || 0
                  }
                : c
            );
            
            addStratumCharacteristic(updatedCharacteristics);
            
            LC_Characteristics.current = LC_Characteristics.current.map(c =>
                (c.StratumID === editingCharacteristic.StratumID && 
                 c.BlockID === editingCharacteristic.BlockID &&
                 c.CharacteristicID === editingCharacteristic.CharacteristicID &&
                 (c.instanceIndex || 0) === (editingCharacteristic.instanceIndex || 0))
                ? { 
                    ...c, 
                    ...formValues,
                    StratumID: parseInt(StratumID),
                    BlockID: parseInt(BlockID),
                    BlockReference: BlockReference,
                    CharacteristicID: parseInt(CharacteristicID),
                    CharacteristicReference: CharacteristicReference,
                    CharacteristicLabel: CharacteristicLabel,
                    instanceIndex: editingCharacteristic.instanceIndex || 0
                  }
                : c
            );
            
            setEditCharacteristicMode(false);
            setEditingCharacteristic(null);
            reset1();
            
            setRerenderTrigger('Element:'+parseInt(StratumID)+parseInt(BlockID));
            
            // Show success toast
            toast.current.show({ 
                severity: 'success', 
                summary: 'Updated', 
                detail: 'Characteristic updated successfully',
                life: 3000
            });
            
            // Delay clearing characteristic selection to allow toast to display (200ms)
            setTimeout(() => {
                setActiveCharacteristic(null);
            }, 200);
            
            return;
        }

        // ADD MODE: Check if characteristic with same IDs and instanceIndex exists
        // For characteristics, we need to check if the property itself supports multiple instances
        const parentProperty = LC_Properties.current.find(p => 
            p.StratumID === parseInt(StratumID) && 
            p.BlockID === parseInt(BlockID) &&
            (p.instanceIndex || 0) === instanceIndex
        );
        
        // Check if this characteristic already exists for this property instance
        if (existingCharacteristic) {
            toast.current.show({ 
                severity: 'warn', 
                summary: 'Characteristic Already Added', 
                detail: `This characteristic already exists. Click on the chip below to edit it, or select a different characteristic to add.`,
                life: 5000
            });
            return;
        }

        // Check if we're trying to add a characteristic to a property instance that supports multiples
        const existingCharacteristicsForBlock = LC_Characteristics.current.filter(c => 
            c.StratumID === parseInt(StratumID) && 
            c.BlockID === parseInt(BlockID) &&
            c.CharacteristicID === parseInt(CharacteristicID)
        );

        // If characteristic exists for this block with different instanceIndex
        if (existingCharacteristicsForBlock.length > 0 && parentProperty) {
            const presenceType = parentProperty.elementPresenceType;
            
            // Allow multiple characteristic instances if parent property is Exclusive/Temporal
            if (presenceType === "Exclusive" || 
                presenceType === "Conditional Temporal" || 
                presenceType === "Temporal Sequence Depending") {
                
                toast.current.show({ 
                    severity: 'info', 
                    summary: 'Adding Characteristic Instance', 
                    detail: `Adding characteristic for instance ${instanceIndex}`,
                    life: 3000
                });
            }
        }

        // All validations passed - ADD the characteristic (APPEND, don't replace)
        const newCharacteristic = { 
            StratumID: parseInt(StratumID), 
            BlockID: parseInt(BlockID), 
            BlockReference: BlockReference, 
            CharacteristicID: parseInt(CharacteristicID), 
            CharacteristicReference: CharacteristicReference, 
            CharacteristicLabel: CharacteristicLabel, 
            instanceIndex: instanceIndex,
            ...formValues 
        };

        addStratumCharacteristic([...stratumCharacteristics, newCharacteristic]);  // APPEND

        setCID(StratumCharacteristicID+1);
        stratumCharacteristicNumber.current++;
        
        LC_Characteristics.current = [...LC_Characteristics.current, newCharacteristic];  // APPEND
        
        setRerenderTrigger('Element:'+parseInt(StratumID)+parseInt(BlockID));
        reset1();

        //showCharacteristic(); old notification
        // Success toast for characteristic add
        const characteristicLabel = CharacteristicLabel || 'Characteristic';
        const blockLabel = activeBlockDetails?.block_label || 'Element';
        const instanceLabel = instanceIndex > 0 ? ` (Instance ${instanceIndex})` : '';
        toast.current.show({ 
            severity: 'success', 
            summary: 'Characteristic Added', 
            detail: `${characteristicLabel} added to ${blockLabel}${instanceLabel}`,
            life: 3000
        });

        // Delay clearing characteristic selection to allow toast to display (200ms)
        setTimeout(() => {
            setActiveCharacteristic(null);
        }, 200);
        
        // Keep property form visible (don't clear activeBlock or activeStratum)
        // This allows user to add more characteristics to the same property
    };    
    
    let patterns = [];
    let strata = [];
    Object.keys(LC_HorizontalPatterns?.current).forEach((key0) => {     
        let filterd_strata = LC_Strata?.current.filter( stratum => stratum.HPID === LC_HorizontalPatterns?.current[key0]["horizontal_pattern_id"] );
        if(filterd_strata !== undefined){            
            Object.keys(filterd_strata).forEach((key1) => {       
                strata = [...strata, { key: LC_HorizontalPatterns?.current[key0]["horizontal_pattern_id"]+"-"+filterd_strata[key1]["stratumID"], label: filterd_strata[key1]["name"], icon: 'pi pi-fw pi-minus' }
                        ];
            });
            patterns = [...patterns, {key: LC_HorizontalPatterns?.current[key0]["horizontal_pattern_id"], label: searchByCriteria(LC_Class.current,{class_id: LC_HorizontalPatterns?.current[key0]["class_id"]})[0]["class_name"]+" / "+LC_HorizontalPatterns?.current[key0]["name"], icon: 'pi pi-fw pi-bars', children: strata }];
        }
        strata = [];
    });
       
    patterns.sort((a, b) => a.label.localeCompare(b.label));

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
    const [displayElements,setDisplayElements] = useState(false);
    const [displayInstruction,setDisplayInstruction] = useState(true);
    const [displayStratumHint,setDisplayStratumHint] = useState(false);
    const [showCurrentEntries,setShowCurrentEntries] = useState(true);
    const [SPIDBID,setSPIDBID] = useState<any>([]);
    const [activeStratum, setActiveStratum] = useState<any>(undefined);    
    const [activeStratumDetails,setActiveStratumDetails] = useState(undefined);
    const [activeBlock, setActiveBlock] = useState<any>(undefined);    
    const [activeBlockDetails,setActiveBlockDetails] = useState(undefined);
    const [displayCharacteristics,setdisplayCharacteristics] = useState([]);
    const [activeCharacteristic, setActiveCharacteristic] = useState<any>(null);    
    const [activeCharacteristicDetails,setActiveCharacteristicDetails] = useState(undefined);
    const [XteristicResets, setXteristicResets] = useState<any>();
    const [propertyResets, setPropertyResets] = useState<any>();
    const [disableXteristic, setDisableXteristic] = useState<boolean>(true);
    useEffect(()=>{
        reset1();
        if(typeof(activeCharacteristic) === 'number')
            setDisableXteristic(false);
        else
            setDisableXteristic(true);
        displayFormElements('','');
        let activCharacteristic = characteristics.current["LC_Characteristics"]?.filter( characteristic => characteristic.characteristic_id === activeCharacteristic);        
        let resetter = [];
        let display = [];
        let reconfig = [];
        if(activCharacteristic !== undefined && activCharacteristic[0] !== undefined){
            setActiveCharacteristicDetails(activCharacteristic[0]);
            let stratumKey = activeStratum?.split("-");
            if(stratumKey === undefined)
                stratumKey = 0;
            let blockKey = activeBlock?.split("-");
            if(blockKey === undefined)
                blockKey = 0;

            // Extract instanceIndex from activeBlock key
            let instanceIndex = 0;
            if (blockKey && blockKey.length > 0) {
                const lastSegment = blockKey[blockKey.length - 1];
                if (/^(seq|excl)\d+$/.test(lastSegment)) {
                    instanceIndex = parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                    // Remove the suffix from blockKey for ID extraction
                    blockKey = blockKey.slice(0, -1);
                }
            }

            activCharacteristic[0].elements.map((element)=>{
                display.push('document.getElementById("guide_'+element['element_name']+'").style.display = "'+element['display_default']+'"');
                let prevValue = undefined;
                if(stratumCharacteristics.length > 0){
                    // Filter by instanceIndex as well
                    let relevantCharacteristic = stratumCharacteristics.filter(characteristics => 
                        characteristics.StratumID === parseInt(stratumKey[stratumKey.length-1]) && 
                        characteristics.BlockID === parseInt(blockKey[blockKey.length-1]) && 
                        characteristics.CharacteristicID === activeCharacteristic &&
                        (characteristics.instanceIndex || 0) === instanceIndex
                    );
                    if(relevantCharacteristic[0] !== undefined){
                        prevValue = relevantCharacteristic[0][element['element_name']];
                        if(typeof(prevValue) === "object")
                            resetter.push('setValue1("'+element['element_name']+'", ['+prevValue[0]+','+prevValue[1]+'])');
                        else if(typeof(prevValue) === "number")
                            resetter.push('setValue1("'+element['element_name']+'", '+prevValue+')');
                        else
                            resetter.push('setValue1("'+element['element_name']+'", "'+prevValue+'")');
                    }
                    else{
                        if(element['element_type'] === 'Range'){
                            prevValue = [element['element_rules']['min'],element['element_rules']['max']];
                            resetter.push('setValue1("'+element['element_name']+'", ['+prevValue[0]+','+prevValue[1]+'])');
                        }
                        else if(element['element_type'] === "number"){
                            prevValue = element['element_rules']['min'];
                            resetter.push('setValue1("'+element['element_name']+'", '+prevValue+')');
                        }
                        else{
                            prevValue = "";
                            resetter.push('setValue1("'+element['element_name']+'", "'+prevValue+'")');
                        }
                    }
                    if(element['element_type'] == 'Dropdown' && prevValue != '')
                        reconfig.push('formReconfig_guide("'+element['element_rules']['options_name']+'","'+prevValue+'")');
                }
                else{
                    if(element['element_type'] === 'Range'){
                        prevValue = [element['element_rules']['min'],element['element_rules']['max']];
                        resetter.push('setValue1("'+element['element_name']+'", ['+prevValue[0]+','+prevValue[1]+'])');
                    }
                    else if(element['element_type'] === "number"){
                        prevValue = element['element_rules']['min'];
                        resetter.push('setValue1("'+element['element_name']+'", '+prevValue+')');
                    }
                    else{
                        prevValue = "";
                        resetter.push('setValue1("'+element['element_name']+'", "'+prevValue+'")');
                    }
                }
            });
            setXteristicResets(resetter);
            displays_guide.current = display;
            reconfigs_guide.current = reconfig;
        }
        else
            setActiveCharacteristicDetails(undefined);
    },[activeCharacteristic]);

    const displays_guide = useRef<any>([]);
    const reconfigs_guide = useRef<any>([]);

    useEffect(()=>{
        setActiveCharacteristic(null);
        reset();
        
        let stratumKey = activeStratum?.split("-");
        if(stratumKey === undefined)
         stratumKey = 0;

        const stratumSelected = stratumKey?.length > 1;
        const blockSelected = activeBlock !== undefined && activeBlock !== null;

        if(blockSelected && activeStratum !== undefined){
            setDisplayInstruction(false);
            setDisplayStratumHint(false);
            setDisplayElements(true);
        } else if(stratumSelected && !blockSelected){
            setDisplayInstruction(false);
            setDisplayStratumHint(true);
            setDisplayElements(false);
        } else {
            setDisplayInstruction(true);
            setDisplayStratumHint(false);
            setDisplayElements(false);
        }

        if(stratumSelected){
            let activStratum = LC_Strata.current.filter( stratum => stratum.stratumID === parseInt(stratumKey[stratumKey.length-1]) );
            if(activStratum !== undefined)
                setActiveStratumDetails(activStratum[0]);
            else{
                setActiveStratumDetails(undefined);
                setDisplayInstruction(true);
                setDisplayStratumHint(false);
                setDisplayElements(false);
            }
        }else{
            setActiveStratumDetails(undefined);
            setDisplayInstruction(true);
            setDisplayStratumHint(false);
            setDisplayElements(false);
        }

        let blockKey = activeBlock?.split("-");
        if(blockKey !== undefined){
            // Extract instanceIndex from blockKey
            let instanceIndex = 0;
            let cleanBlockKey = [...blockKey];
            if (blockKey.length > 0) {
                const lastSegment = blockKey[blockKey.length - 1];
                if (/^(seq|excl)\d+$/.test(lastSegment)) {
                    instanceIndex = parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                    // Remove the suffix for ID extraction
                    cleanBlockKey = blockKey.slice(0, -1);
                }
            }

            let activBlock = blocks.current["LC_Block"]?.filter( block => block.block_id === parseInt(cleanBlockKey[cleanBlockKey.length-1]) );            
            let resetter = [];
            let display = [];
            let reconfig = [];
            if(activBlock.length > 0){
                setActiveBlockDetails(activBlock[0]);
                activBlock[0].elements.map((element)=>{
                    display.push('document.getElementById("guide_'+element['element_name']+'").style.display = "'+element['display_default']+'"');
                    let prevValue = undefined;
                    if(stratumProperties.length > 0){
                        // Filter by instanceIndex as well
                        let relevantProperty = stratumProperties.filter(property => 
                            property.StratumID === parseInt(stratumKey[stratumKey.length-1]) && 
                            property.BlockID === parseInt(cleanBlockKey[cleanBlockKey.length-1]) &&
                            (property.instanceIndex || 0) === instanceIndex
                        );
                        if(relevantProperty[0] !== undefined){
                            prevValue = relevantProperty[0][element['element_name']];
                            if(typeof(prevValue) === "object")
                                resetter.push('setValue("'+element['element_name']+'", ['+prevValue[0]+','+prevValue[1]+'])');
                            else if(typeof(prevValue) === "number")
                                resetter.push('setValue("'+element['element_name']+'", '+prevValue+')');
                            else
                                resetter.push('setValue("'+element['element_name']+'", "'+prevValue+'")');
                        }
                        else{
                            if(element['element_type'] === 'Range'){
                                prevValue = [element['element_rules']['min'],element['element_rules']['max']];
                                resetter.push('setValue("'+element['element_name']+'", ['+prevValue[0]+','+prevValue[1]+'])');
                            }
                            else if(element['element_type'] === "number"){
                                prevValue = element['element_rules']['min'];
                                resetter.push('setValue("'+element['element_name']+'", '+prevValue+')');
                            }
                            else{
                                prevValue = "";
                                resetter.push('setValue("'+element['element_name']+'", "'+prevValue+'")');
                            }
                        } 
                        if(element['element_type'] == 'Dropdown' && prevValue != '')
                            reconfig.push('formReconfig_guide("'+element['element_rules']['options_name']+'","'+prevValue+'")');
                    }
                    else{
                        if(element['element_type'] === 'Range'){
                            prevValue = [element['element_rules']['min'],element['element_rules']['max']];
                            resetter.push('setValue("'+element['element_name']+'", ['+prevValue[0]+','+prevValue[1]+'])');
                        }
                        else if(element['element_type'] === "number"){
                            prevValue = element['element_rules']['min'];
                            resetter.push('setValue("'+element['element_name']+'", '+prevValue+')');
                        }
                        else{
                            prevValue = "";
                            resetter.push('setValue("'+element['element_name']+'", "'+prevValue+'")');
                        }
                    }
                });
                setPropertyResets(resetter);
                displays_guide.current = display;
                reconfigs_guide.current = reconfig;
            }
            else
                setActiveBlockDetails(undefined);            
            setSPIDBID([parseInt(stratumKey[stratumKey.length-1]),parseInt(cleanBlockKey[cleanBlockKey.length-1])]);

            const existingProp = stratumProperties.find(p =>
                p.StratumID === parseInt(stratumKey[stratumKey.length-1]) &&
                p.BlockID === parseInt(cleanBlockKey[cleanBlockKey.length-1]) &&
                (p.instanceIndex || 0) === instanceIndex
            );
            if (existingProp) {
                setEditMode(true);
                setEditingProperty(existingProp);
            } else {
                setEditMode(false);
                setEditingProperty(null);
            }

            let subDisplayCharacteristics = [];
            Object.keys(characteristicLookUp.current).forEach((key0) => {
                let _1_blocks = characteristicLookUp.current[key0].filter( selectedblock => selectedblock.block_id === parseInt(cleanBlockKey[cleanBlockKey.length-1] ));                
                Object.keys(_1_blocks).forEach((key1) => {
                    let _characteristics = characteristics.current["LC_Characteristics"]?.filter( characteristics => characteristics.characteristic_id === _1_blocks[key1]["characteristic_id"] );                    
                    Object.keys(_characteristics).forEach((key2) => {                        
                        subDisplayCharacteristics = ([...subDisplayCharacteristics, { label: _characteristics[key2]["characteristic_label"], name: _characteristics[key2]["characteristic_name"], value: _characteristics[key2]["characteristic_id"] }]);
                    });
                });
            });
            setdisplayCharacteristics(subDisplayCharacteristics);        
        }else{
            blockKey = 0;
            setActiveBlockDetails(undefined);
            setdisplayCharacteristics([]);
            setEditMode(false);
            setEditingProperty(null);
        }
        const timer = setTimeout(() => {
            reset();
            reset1();
        }, 500);
    },[activeStratum,activeBlock]);

    const propertyReset = ()=>{
        propertyResets?.map((formElement)=>{
            eval(formElement);            
        });
        formReconfigExe_guide();
    }
    const XteristicReset = ()=>{
        XteristicResets?.map((formElement)=>{
            eval(formElement);
        });
        formReconfigExe_guide();
    }

    const displayFormElements = (elements,form)=>{
        var ctlr = [];
        if(elements != undefined){
            Object.values(elements).forEach((element)=>{                
                let component = null;
                switch(element['element_type']) {
                case "Range":
                    component = <Controller
                                name={element['element_name']}                            
                                control={eval('control'+form)}
                                defaultValue={[element['element_rules']['min'],element['element_rules']['max']]}
                                render={({ field, fieldState }) => (
                                    <div className="p-inputgroup flex-1 mb-1" id={'guide_'+field.name}>
                                        <span className="p-inputgroup-addon text-xs p-2 pl-3 pr-3 m-0">{element['element_label']}:</span>
                                            <div className="card flex flex-column w-full gap-0">
                                                <Slider name={field.name} value={field.value as [number,number]} onChange={(e: SliderChangeEvent) => { field.onChange(validateRange([e.value[0], e.value[1]],[element['element_rules']['min'],element['element_rules']['max']])); }} className="p-inputtext-sm text-xs p-0 m-0 mt-2" range style={{width: '100%', alignSelf: 'center', verticalAlign: 'middle' }} min={element['element_rules']['min']} max={element['element_rules']['max']} required={element['element_rules']['required']} />
                                                <div className="flex flex-row align-content-center justify-content-center p-0 m-0 gap-2" style={{ width: '100px', alignSelf: 'center', verticalAlign: 'middle' }}>
                                                    <input name={"L"+field.name} type="number" value={field.value[0]} className="text-xs p-0 m-0" onChange={(e) => { const newValue = validateRange([Number(e.target.value),field.value[1]],[element['element_rules']['min'],element['element_rules']['max']]); field.onChange(newValue); }} min={element['element_rules']['min']} max={element['element_rules']['max']} required={element['element_rules']['required']} /> - <input name={"U"+field.name} type="number" value={field.value[1]} className="text-xs p-0 m-0" onChange={(e) => { const newValue = validateRange([field.value[0],Number(e.target.value)],[element['element_rules']['min'],element['element_rules']['max']]); field.onChange(newValue); }} min={element['element_rules']['min']} max={element['element_rules']['max']} required={element['element_rules']['required']} />
                                                </div>                                                
                                            </div>
                                        <span className="p-inputgroup-addon text-xs p-2 m-0">{element['element_rules']['symbol']}</span>
                                    </div>
                                    )}
                                />;
                    break;
                case "Dropdown":
                    component = <Controller
                                name={element['element_name']}
                                control={eval('control'+form)}
                                rules={{ required:element['element_rules']['required'] }}
                                render={({ field, fieldState }) => (
                                    <div className="p-inputgroup flex-1 mb-1" id={'guide_'+field.name}>
                                        <span className="p-inputgroup-addon text-s p-0 m-0">
                                            <i className="pi pi-pencil"></i>
                                        </span>
                                        <Dropdown inputId={field.name} name={field.name} value={field.value} onChange={(e: DropdownChangeEvent) => {field.onChange(e.value);formReconfig_guide(element['element_rules']['options_name'],e.value)}} inputRef={field.ref} options={eval(element['element_rules']['list'])} optionLabel="label" placeholder={"Select a "+element['element_label']} className="p-inputtext-sm text-xs p-0 m-0" editable required={element['element_rules']['required']} tooltip={element['element_label']} tooltipOptions={{ event: 'both' }} />
                                        <span className="p-inputgroup-addon text-xs p-0 m-0">{element['element_rules']['symbol']}</span>
                                    </div>
                                    )}
                                />;
                    break;
                case "Number":
                    component = <Controller
                                name={element['element_name']}
                                control={eval('control'+form)}
                                defaultValue={element['element_rules']['min']}
                                render={({ field, fieldState }) => (
                                    <div className="p-inputgroup flex-1 mb-1" id={'guide_'+field.name}>
                                        <span className="p-inputgroup-addon text-xs p-0 m-0">
                                            <i className="pi pi-pencil"></i>
                                        </span>
                                        <InputNumber name={field.name} value={field.value} className="p-inputtext-sm text-xs p-1 m-0" onValueChange={(e) => field.onChange(e.target.value)} showButtons buttonLayout="horizontal" style={{ width: '100%' }} min={element['element_rules']['min']} max={element['element_rules']['max']} placeholder={element['element_label']} required={element['element_rules']['required']} tooltip={element['element_label']} tooltipOptions={{ event: 'both' }} />
                                        <span className="p-inputgroup-addon text-xs p-0 m-0">{element['element_rules']['symbol']}</span>
                                    </div>
                                    )}
                                />;
                    break;
                default:
                    component =<>
                                <div className="p-inputgroup flex-1 mb-1" id={'guide_'+element['element_name']}>
                                    <span className="p-inputgroup-addon text-xs p-0 m-0">
                                        <i className="pi pi-pencil"></i>
                                    </span>                                    
                                    <InputText {...eval('register'+form+'("'+element['element_name']+'")')} className="p-inputtext-sm text-xs p-2 m-0" style={{ width: '100%' }} placeholder={element['element_label']} required={element['element_rules']['required']} tooltip={element['element_label']} tooltipOptions={{ event: 'both' }} />
                                    <span className="p-inputgroup-addon text-xs p-0 m-0">{element['element_rules']['symbol']}</span>                                
                                </div>
                            </>;
                }
                ctlr.push(component);
            });
        }
        return (<>{ctlr}</>);
    }

    const processElements = ()=> { 
        const propertyCheck = LC_Strata?.current.filter(({ stratumID: id1 }) => !stratumProperties?.some(({ StratumID: id2 }) => id2 === id1));
        
        let SP = stratumProperties?.length;
        let chr = stratumCharacteristics?.length;
        
        if(SP > 0 && propertyCheck.length === 0){            
            toast.current.show({ severity: 'success', summary: 'Elements Saved', detail: "Properties: "+SP+" Characteristics: "+chr });
            const timer = setTimeout(() => {                
                setGuide5Visible(false);
                setRerenderTrigger('Elements');
            }, 1000);           
        }
        else{
            toast.current.show({ severity: 'error', summary: 'Elements Error', detail: "Properties: "+SP+" Characteristics: "+chr, life: 60000 });
            SP === 0? toast.current.show({ severity: 'error', summary: 'Element & Property Error', detail: "Stratum Elements and Properties are required.", life: 60000 }) : toast.current.show({ severity: 'error', summary: 'Property Error', detail: "Properties for "+propertyCheck?.map((property)=>(property.name))+" are undefined.", life: 60000 });
        }        
    }

    const [confirmPropertyDelete, setConfirmPropertyDelete] = useState<boolean>(false);    
    const [confirmCharacteristicDelete, setConfirmCharacteristicDelete] = useState<boolean>(false);
    const [StratumID,setStratumID] = useState<number>(null);
    const [BlockID,setBlockID] = useState<number>(null);
    const promptPropertyDelete = (StratumID,BlockID)=>{       
        setStratumID(StratumID);
        setBlockID(BlockID);
        setConfirmPropertyDelete(true);
    }    
    const [CharacteristicID,setCharacteristicID] = useState<number>(null);
    const promptCharacteristicDelete = (StratumID,BlockID,CharacteristicID)=>{        
        setStratumID(StratumID);
        setBlockID(BlockID);
        setCharacteristicID(CharacteristicID);        
        setConfirmCharacteristicDelete(true);
    }    
    const acceptPropertyDelete = (StratumID,BlockID) => {
        let deletd_Element = blocks.current["LC_Block"].filter(blocks => blocks.block_id === parseInt(BlockID));       
        deleteProperty(StratumID,BlockID);
        toast.current?.show({ severity: 'warn', summary: 'Confirmed', detail: 'Element '+deletd_Element[0].block_label+' deleted! Please click on a different Element to refresh.', life: 3000 });
    }    
    const acceptCharacteristicDelete = (StratumID,BlockID,CharacteristicID) => {
        let deletd_Characteristic = LC_Characteristics.current.filter(characteristics => characteristics.StratumID === parseInt(StratumID) && characteristics.BlockID === parseInt(BlockID) && characteristics.CharacteristicID === parseInt(CharacteristicID));        
        deleteCharacteristic(StratumID,BlockID,CharacteristicID);
        toast.current?.show({ severity: 'warn', summary: 'Confirmed', detail: 'Element '+deletd_Characteristic[0].CharacteristicLabel+' deleted! Please click on a different Element to refresh.', life: 3000 });
    }
    const reject = () => {
        toast.current?.show({ severity: 'info', summary: 'Cancelled', detail: 'Action Cancelled. Please click on a different Element to refresh.', life: 3000 });
    }

    const deleteProperty = (StratumID,BlockID)=>{
        // Extract instanceIndex from activeBlock
        let instanceIndex = 0;
        if (activeBlock) {
            const blockKey = activeBlock.split("-");
            if (blockKey.length > 0) {
                const lastSegment = blockKey[blockKey.length - 1];
                if (/^(seq|excl)\d+$/.test(lastSegment)) {
                    instanceIndex = parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                }
            }
        }

        // Filter out properties matching StratumID, BlockID, and instanceIndex
        let undeletd_properties = stratumProperties.filter(properties => 
            !((properties.StratumID === parseInt(StratumID)) && 
              (properties.BlockID === parseInt(BlockID)) && 
              ((properties.instanceIndex || 0) === instanceIndex))
        );

        // Also delete associated characteristics matching the same instanceIndex
        let deletd_characteristics = stratumCharacteristics.filter(characteristics => 
            characteristics.StratumID === parseInt(StratumID) && 
            characteristics.BlockID === parseInt(BlockID) &&
            (characteristics.instanceIndex || 0) === instanceIndex
        );

        if(deletd_characteristics !== undefined){            
            deletd_characteristics.map((deletd_characteristic)=>{
                deleteCharacteristic(deletd_characteristic.StratumID,deletd_characteristic.BlockID,deletd_characteristic.CharacteristicID);
            });
        }
        addStratumProperty([...(undeletd_properties || [])]);        
        LC_Properties.current = [...(undeletd_properties || [])];
        stratumPropertyNumber.current = undeletd_properties.length+1;
    }
    const deleteCharacteristic = (StratumID,BlockID,CharacteristicID)=>{
        // Extract instanceIndex from activeBlock
        let instanceIndex = 0;
        if (activeBlock) {
            const blockKey = activeBlock.split("-");
            if (blockKey.length > 0) {
                const lastSegment = blockKey[blockKey.length - 1];
                if (/^(seq|excl)\d+$/.test(lastSegment)) {
                    instanceIndex = parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                }
            }
        }

        // Filter out characteristics matching StratumID, BlockID, CharacteristicID, and instanceIndex
        let undeletd_characteristics = stratumCharacteristics.filter(characteristics => 
            !((characteristics.StratumID === parseInt(StratumID)) && 
              (characteristics.BlockID === parseInt(BlockID)) && 
              (characteristics.CharacteristicID === parseInt(CharacteristicID)) && 
              ((characteristics.instanceIndex || 0) === instanceIndex))
        );

        addStratumCharacteristic([...(undeletd_characteristics || [])]);
        LC_Characteristics.current = [...(undeletd_characteristics || [])];
        stratumCharacteristicNumber.current = undeletd_characteristics.length+1;        
    }

    const formDefault_guide = ()=>{        
        if(displays_guide.current.length > 0){
            displays_guide.current?.map((displayCondition)=>{
                if(displayCondition){
                    const timer = setTimeout(() => {
                        eval(displayCondition);
                    }, 20);
                }
            });
        }
        displays_guide.current = [];
    }
    const formReconfig_guide = (element,value)=>{        
        let option = options.current["LC_Options"]?.filter( selectedOptions => selectedOptions.option_name === element );
        let optionDetails = option[0].options.find(o => o.label === value.label);
        if(optionDetails == undefined)
            optionDetails = option[0].options.find(o => o.label === value);        
        if(optionDetails!=undefined){
            let show = optionDetails['show']?.split(',');
            show?.map((element)=>{                
                const timer = setTimeout(() => {
                    eval('document.getElementById("guide_'+element.trim()+'").style.display = ""');
                }, 20);
            });            
            let hide = optionDetails['hide']?.split(',');
            hide?.map((element)=>{            
                const timer = setTimeout(() => {                
                    eval('document.getElementById("guide_'+element.trim()+'").style.display = "none"');
                }, 20);
            });
        }
    }
    const formReconfigExe_guide = ()=>{
        if(reconfigs_guide.current?.length > 0){
            reconfigs_guide.current?.map((displayCondition)=>{                
                if(displayCondition){
                    const timer = setTimeout(() => {
                        eval(displayCondition);
                    }, 20);
                }
            });
        }
        //reconfigs.current = [];
    }

    const getCurrentEntries = () => {
        // Get the current instance index from activeBlock key
        const activeInstanceIndex = (() => {
            if (!activeBlock) return 0;
            const segs = (activeBlock as string).split('-');
            const last = segs[segs.length - 1];
            return /^(seq|excl)\d+$/.test(last) ? parseInt(last.replace(/^(seq|excl)/, '')) : 0;
        })();

        return stratumProperties.map((prop, idx) => {
            const stratum = LC_Strata.current.find((s:any) => s.stratumID === prop.StratumID);
            const hp = stratum
                ? Object.values(LC_HorizontalPatterns.current).find((h:any) => h.horizontal_pattern_id === stratum.HPID) as any
                : undefined;
            const classItem = hp ? LC_Class.current.find((c:any) => c.class_id === hp.class_id) : undefined;
            const block = blocks.current["LC_Block"]?.find((b:any) => b.block_id === prop.BlockID);
            const instanceLabel = prop.instanceIndex && prop.instanceIndex > 0 ? ` (Inst ${prop.instanceIndex})` : '';
            const stratumTreeKey = stratum ? `${stratum.HPID}-${stratum.stratumID}` : undefined;
            const instanceSuffix = prop.instanceIndex && prop.instanceIndex > 0
                ? (prop.elementPresenceType === 'Exclusive' ? `-excl${prop.instanceIndex}` : `-seq${prop.instanceIndex}`)
                : '';
            // Reconstruct the full tree path key (root→leaf) so the elements tree highlights correctly
            const ancestorPath = block ? getAllAncestors(prop.BlockID).reverse().join('-') : undefined;
            const blockTreeKey = ancestorPath ? `${ancestorPath}${instanceSuffix}` : undefined;
            const isActive =
                activeStratumDetails?.stratumID === prop.StratumID &&
                activeBlockDetails?.block_id === prop.BlockID &&
                (prop.instanceIndex || 0) === activeInstanceIndex;
            return {
                key: `entry-${idx}`,
                label: `${classItem?.class_name ?? '?'} / ${hp?.name ?? '?'} › ${stratum?.name ?? '?'} › ${block?.block_label ?? '?'}${instanceLabel}`,
                stratumTreeKey,
                blockTreeKey,
                isActive,
            };
        });
    };

    return (
        <div className="card flex flex-column justify-content-center">
            <Toast ref={toast} />
            <div className="card flex flex-row justify-content-center">
                <div className="card flex flex-column justify-content-center align-self-start" style={{ width: '40%' }}>
                    <Card title="Step 5: Elements" className="w-full" style={{ background: '#eee' }}>
                        <p className="m-0">
                            Add all the elements in your class per horizontal pattern and stratum.
                        </p>
                    </Card>
                    <Divider />
                    { stratumProperties.length > 0 && (                           
                        <div className="card w-full p-2" style={{ background: '#fff3cd', borderRadius: '12px', boxShadow: '0 2px 2px 0 rgba(0,0,0,0.25)' }}>
                            <h3
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => setShowCurrentEntries(prev => !prev)}
                            >
                                <i className={`pi pi-fw ${showCurrentEntries ? 'pi-chevron-down' : 'pi-chevron-right'}`} style={{ fontSize: '0.8rem' }} />
                                {' '}Entered Elements ({stratumProperties.length})
                            </h3>
                            { showCurrentEntries && (
                                <div className="flex flex-column gap-1">
                                    { getCurrentEntries().map(entry => (
                                        <Chip
                                            key={entry.key}
                                            label={entry.label}
                                            className={`text-xs w-full${entry.isActive ? ' p-chip-primary' : ''}`}
                                            style={{ cursor: entry.stratumTreeKey ? 'pointer' : 'default', justifyContent: 'flex-start' }}
                                            onClick={() => {
                                                if (entry.stratumTreeKey && entry.blockTreeKey) {
                                                    setActiveStratum(entry.stratumTreeKey);
                                                    setActiveBlock(entry.blockTreeKey);
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="card w-full" style={{ maxHeight: '800px', overflow: 'auto' }}>
                        <h3>Strata</h3>
                        <Tree value={patterns} selectionMode="single" selectionKeys={activeStratum}
                            onSelectionChange={(e) => {
                                const selected = String(e.value);
                                // Only respond when the key contains "-" (indicating a Stratum node)
                                if (selected && selected.indexOf("-") > 0) {
                                    setActiveStratum(e.value);
                                    if(!activeBlock)
                                        toast.current?.show({ severity: 'info', summary: 'Next Step', detail: 'Now select the relevant element below', life: 2500 });
                                }
                            }}
                            togglerTemplate={togglerTemplate} className=".p-tree-horizontal p-0 m-0 w-full flex-grow text-xs" style={{ width: '100%' }} onNodeDoubleClick={(e)=>toast.current?.show({ severity: 'info', summary: 'Tip', detail: 'Single click to select the relevant stratum.', life: 2500 })}
                        />
                        <Divider />
                        <h3>Elements</h3>
                        <Tree value={elements} selectionMode="single" selectionKeys={activeBlock} onSelectionChange={(e) => setActiveBlock(e.value)} filter filterMode="strict" filterPlaceholder="Search LCML Elements" togglerTemplate={togglerTemplate} className=".p-tree-horizontal p-0 m-0 w-full flex-grow text-xs" style={{ width: '100%' }} onNodeDoubleClick={(e)=>setActiveBlock(e.node.key)} />                        
                    </div>

                </div>

                <Divider layout="vertical" />
                
                <div className="card flex flex-column" style={{ width: '60%' }}>
                    { displayInstruction &&
                        <Card title="Pick Stratum and Element" subTitle="On the left menus, select the relevant stratum and element" className="w-full" style={{ width: '50%', background: '#eee', marginTop: '20vh' }}>
                            <i className="pi pi-arrow-left" style={{ fontSize: '2.5rem' }}></i><i className="pi pi-spin pi-cog" style={{ fontSize: '2.5rem' }}></i>
                        </Card>
                    }
                    { displayStratumHint &&
                        <Card title="Element Required" subTitle={`Stratum "${activeStratumDetails?.name}" selected — now pick an element below`} className="w-full" style={{ width: '50%', background: '#fff3cd', marginTop: '20vh' }}>
                            <i className="pi pi-arrow-down" style={{ fontSize: '2.5rem' }}></i>
                        </Card>
                    }
                    { displayElements &&
                        <Card title={activeStratumDetails?.name+" > "+activeBlockDetails?.block_label} subTitle={"Set Element Properties & Characteristics"} className="w-full" style={{ width: '50%' }}>                        
                            <div className="card flex w-full">
                                <ConfirmDialog visible={confirmPropertyDelete} onHide={() => setConfirmPropertyDelete(false)} message="Are you sure you want to delete the Property? This will delete the Element and Characteristics associated with it." header="Delete Property & Element Confirmation" icon="pi pi-exclamation-triangle" acceptClassName='p-button-danger' accept={()=>acceptPropertyDelete(StratumID,BlockID)} reject={reject} />
                                <div className="card flex flex-column justify-content-center w-full" style={{ padding: 0, margin: 0 }}>
                                    <p className="text-xs justify-content-center" style={{ backgroundColor: 'var(--highlight-bg)' }}><b><u style={{textAlign: "center"}}>Property</u><br/><i className="pi pi-info-circle" style={{ color: 'slateblue' }}></i>{activeBlockDetails?.block_label}</b><br/>{activeBlockDetails?.block_description}</p>
                                    <div className="card flex flex-row flex-wrap gap-2">                               
                                        {stratumProperties?.map((Properties)=>{
                                            if(JSON.stringify(SPIDBID) === JSON.stringify([parseInt(Properties?.StratumID),parseInt(Properties?.BlockID)])){
                                                const instanceLabel = (Properties.instanceIndex && Properties.instanceIndex > 0) 
                                                    ? ` (Instance ${Properties.instanceIndex})` 
                                                    : '';
                                                
                                                // Construct the full block key with instance suffix
                                                const blockKeyParts = activeBlock ? activeBlock.split("-") : [];
                                                let baseBlockKey = activeBlock || `Legend-Class-${Properties.StratumID}-${Properties.BlockID}`;
                                                
                                                // Remove any existing instance suffix from base key
                                                if (blockKeyParts.length > 0) {
                                                    const lastSeg = blockKeyParts[blockKeyParts.length - 1];
                                                    if (/^(seq|excl)\d+$/.test(lastSeg)) {
                                                        baseBlockKey = blockKeyParts.slice(0, -1).join("-");
                                                    }
                                                }
                                                
                                                // Add instance suffix if needed
                                                let fullBlockKey = baseBlockKey;
                                                if (Properties.instanceIndex && Properties.instanceIndex > 0) {
                                                    const presenceType = Properties.elementPresenceType;
                                                    const suffix = (presenceType === "Exclusive") ? `excl${Properties.instanceIndex}` :
                                                                   (presenceType === "Conditional Temporal" || presenceType === "Temporal Sequence Depending") ? `seq${Properties.instanceIndex}` :
                                                                   `inst${Properties.instanceIndex}`;
                                                    fullBlockKey = `${baseBlockKey}-${suffix}`;
                                                }
                                                
                                                return(
                                                    <Chip 
                                                        key={parseInt(Properties?.StratumID)+"-"+parseInt(Properties?.BlockID)+"-"+(Properties.instanceIndex || 0)} 
                                                        className={editMode && editingProperty === Properties ? "text-xs p-chip-primary" : "text-xs green"} 
                                                        label={activeStratumDetails?.name+" > "+activeBlockDetails?.block_label+instanceLabel}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={(e) => {
                                                            // Prevent triggering when clicking the remove icon
                                                            if ((e.target as HTMLElement).classList?.contains('p-chip-remove-icon')) return;
                                                            
                                                            // Set activeBlock to trigger useEffect and reload form
                                                            setActiveBlock(fullBlockKey);
                                                            
                                                            // Enter edit mode
                                                            setEditMode(true);
                                                            setEditingProperty(Properties);
                                                            
                                                            // Note: Form values will be loaded by useEffect based on activeBlock
                                                            toast.current.show({ 
                                                                severity: 'info', 
                                                                summary: 'Edit Mode', 
                                                                detail: 'Editing property. Click "Update" to save changes or "Cancel" to discard.',
                                                                life: 3000
                                                            });
                                                        }}
                                                        removable 
                                                        onRemove={()=>{
                                                            promptPropertyDelete(parseInt(Properties?.StratumID),parseInt(Properties?.BlockID));
                                                            return true;
                                                        }} 
                                                    />
                                                )
                                            }
                                        })}                                    
                                    </div> 
                                    <form id="Properties" name="Properties" onSubmit={handleSubmit(submitProperty)} className="flex flex-column justify-contents-center">                                                     
                                    <div className="w-full card justify-content-center gap-3">
                                        <Controller
                                        name={"stratumID"}                                 
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={activeStratumDetails?.stratumID} />
                                            )}
                                        />
                                        <Controller
                                        name={"blockID"}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={activeBlockDetails?.block_id} />
                                            )}
                                        />
                                        <Controller
                                        name={"blockReference"}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={activeBlockDetails?.block_reference} />
                                            )}
                                        />
                                        {
                                            <>
                                                {displayFormElements(activeBlockDetails?.elements,'')}
                                                {propertyReset()}
                                                {formDefault_guide()}
                                            </>
                                        }                                        
                                    </div>
                                    <div className="card mt-1 flex gap-2" style={{ textAlign: 'right', justifyContent: 'flex-end' }} >
                                        {editMode ? (
                                            <>
                                                <Button 
                                                    label="Cancel Edit" 
                                                    icon="pi pi-times" 
                                                    type="button"
                                                    onClick={() => {
                                                        setEditMode(false);
                                                        setEditingProperty(null);
                                                        reset();
                                                        toast.current.show({ 
                                                            severity: 'info', 
                                                            summary: 'Cancelled', 
                                                            detail: 'Edit cancelled',
                                                            life: 2000
                                                        });
                                                    }}
                                                    size="small" 
                                                    className="p-button-secondary"
                                                />
                                                <Button 
                                                    label="Update Property" 
                                                    icon="pi pi-check" 
                                                    type="submit"
                                                    size="small"
                                                    iconPos="right"
                                                    style={{ backgroundColor: 'var(--highlight-bg)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }}
                                                />
                                            </>
                                        ) : (
                                            <Button 
                                                label={"Add "+activeStratumDetails?.name+" > "+activeBlockDetails?.block_label+" Property"} 
                                                icon="pi pi-plus" 
                                                type="submit" 
                                                size="small" 
                                                iconPos="right" 
                                                className="align-self-end"  
                                                style={{ backgroundColor: 'var(--highlight-bg)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }} 
                                            />
                                        )}
                                    </div>
                                    </form>
                                </div>                       
                            </div>

                            <Divider />

                            <div className="card flex w-full">
                                <ConfirmDialog visible={confirmCharacteristicDelete} onHide={() => setConfirmCharacteristicDelete(false)} message="Are you sure you want to delete the Characteristic?" header="Delete Characteristic Confirmation" icon="pi pi-exclamation-triangle" acceptClassName='p-button-danger' accept={()=>acceptCharacteristicDelete(StratumID,BlockID,CharacteristicID)} reject={reject} />
                                <div className="card flex flex-column justify-content-center w-full" style={{ padding: 0, margin: 0 }}>                                
                                    <p className="text-xs justify-content-center" style={{ backgroundColor: 'var(--highlight-bg)' }}><b><u>Characteristic</u><br/><i className="pi pi-info-circle" style={{ color: 'slateblue' }}></i>{activeBlockDetails?.block_label}</b><br/>{activeBlockDetails?.block_description}</p>
                                    <div className="card flex flex-row flex-wrap gap-2">
                                        {stratumCharacteristics?.map((Characteristics)=>{                                                                                        
                                            if(JSON.stringify(SPIDBID) === JSON.stringify([parseInt(Characteristics.StratumID),parseInt(Characteristics.BlockID)])){
                                                const instanceLabel = (Characteristics.instanceIndex && Characteristics.instanceIndex > 0) 
                                                    ? ` (Instance ${Characteristics.instanceIndex})` 
                                                    : '';
                                                return(
                                                    <Chip 
                                                        key={parseInt(Characteristics.StratumID)+"-"+parseInt(Characteristics.BlockID)+"-"+parseInt(Characteristics.CharacteristicID)+"-"+(Characteristics.instanceIndex || 0)} 
                                                        className={editCharacteristicMode && editingCharacteristic === Characteristics ? "text-xs p-chip-primary" : "text-xs"}
                                                        label={activeStratumDetails?.name+" > "+activeBlockDetails?.block_label+" > "+Characteristics?.CharacteristicLabel+instanceLabel}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={(e) => {
                                                            if ((e.target as HTMLElement).classList?.contains('p-chip-remove-icon')) return;
                                                            
                                                            // Set activeCharacteristic to trigger useEffect and reload form
                                                            setActiveCharacteristic(Characteristics.CharacteristicID);
                                                            
                                                            setEditCharacteristicMode(true);
                                                            setEditingCharacteristic(Characteristics);
                                                            
                                                            // Note: Form values will be loaded by useEffect based on activeCharacteristic
                                                            toast.current.show({ 
                                                                severity: 'info', 
                                                                summary: 'Edit Mode', 
                                                                detail: 'Editing characteristic. Click "Update" to save changes or "Cancel" to discard.',
                                                                life: 3000
                                                            });
                                                        }}
                                                        removable 
                                                        onRemove={()=>{
                                                            promptCharacteristicDelete(parseInt(Characteristics?.StratumID),parseInt(Characteristics?.BlockID),parseInt(Characteristics?.CharacteristicID));
                                                            return true;
                                                        }} 
                                                    />
                                                );
                                            }
                                        })}                                    
                                    </div> 
                                    <form id="Characteristics" name="Characteristics" onSubmit={handleSubmit1(submitCharacteristic)} className="flex flex-column justify-contents-center">                                                     
                                    <div className="w-full card justify-content-center gap-3">
                                        <Controller
                                        name={"stratumID"}                                 
                                        control={control1}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={activeStratumDetails?.stratumID} />
                                            )}
                                        />
                                        <Controller
                                        name={"blockID"}                                 
                                        control={control1}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={activeBlockDetails?.block_id} />
                                            )}
                                        />
                                        <Controller
                                        name={"blockReference"}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={activeBlockDetails?.block_reference} />
                                            )}
                                        />
                                        <Controller
                                        name={"characteristicID"}                                 
                                        control={control1}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={activeCharacteristicDetails?.characteristic_id} />
                                            )}
                                        />
                                        <Controller
                                        name={"characteristicReference"}                                 
                                        control={control1}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={activeCharacteristicDetails?.characteristic_reference} />
                                            )}
                                        />
                                        <Controller
                                        name={"characteristicLabel"}                                 
                                        control={control1}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={activeCharacteristicDetails?.characteristic_label} />
                                            )}
                                        />                                    
                                        <ListBox listStyle={{ maxHeight: '150px' }} value={activeCharacteristic} onChange={(e: ListBoxChangeEvent) => setActiveCharacteristic(e.value)} options={displayCharacteristics} optionLabel="label" className="w-full text-xs" listClassName="text-xs" filter />
                                        {
                                            <>
                                                {displayFormElements(activeCharacteristicDetails?.elements,1)}
                                                {XteristicReset()}                                                
                                            </>
                                        }
                                    </div>
                                    <div className="card mt-1 flex gap-2" style={{ textAlign: 'right', justifyContent: 'flex-end' }} >
                                        {editCharacteristicMode ? (
                                            <>
                                                <Button 
                                                    label="Cancel Edit" 
                                                    icon="pi pi-times" 
                                                    type="button"
                                                    onClick={() => {
                                                        setEditCharacteristicMode(false);
                                                        setEditingCharacteristic(null);
                                                        reset1();
                                                        toast.current.show({ 
                                                            severity: 'info', 
                                                            summary: 'Cancelled', 
                                                            detail: 'Edit cancelled',
                                                            life: 2000
                                                        });
                                                    }}
                                                    size="small" 
                                                    className="p-button-secondary"
                                                />
                                                <Button 
                                                    label="Update Characteristic" 
                                                    icon="pi pi-check" 
                                                    type="submit"
                                                    size="small"
                                                    iconPos="right"
                                                    style={{ backgroundColor: 'var(--highlight-bg)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }}
                                                    disabled={disableXteristic}
                                                />
                                            </>
                                        ) : (
                                            <Button 
                                                label={"Add "+activeStratumDetails?.name+" > "+activeBlockDetails?.block_label+" Characteristic"} 
                                                icon="pi pi-plus" 
                                                type="submit" 
                                                size="small" 
                                                iconPos="right" 
                                                className="align-self-end"  
                                                style={{ backgroundColor: 'var(--highlight-bg)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }} 
                                                disabled={disableXteristic} 
                                            />
                                        )}
                                    </div>
                                    </form>
                                </div>
                            </div>
                        </Card>
                    }
                </div>                
            </div>
            <div className="card mt-3" style={{ textAlign: 'right' }} >
                <Button label="Back" icon="pi pi-arrow-left" onClick={() => {setGuide4Visible(true);setGuide5Visible(false);setRerenderTrigger('Elements');}} text size="small" />
                <Button label="Finish" onClick={() => processElements()} size="small" className="align-self-end" disabled={stratumProperties.length === 0 || LC_Strata?.current.some(({ stratumID: id1 }) => !stratumProperties.some(({ StratumID: id2 }) => id2 === id1))} />
            </div>
        </div>
    );
}