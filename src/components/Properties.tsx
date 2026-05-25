import { useState,useRef,useEffect } from "react";
import { Button } from "primereact/button";
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import randomstring from "randomstring";

import { InputText } from "primereact/inputtext";
import { Dropdown,DropdownChangeEvent } from 'primereact/dropdown';
import { InputNumber, InputNumberChangeEvent } from "primereact/inputnumber";
import { Slider, SliderChangeEvent } from "primereact/slider";
import { ColorPicker, ColorPickerChangeEvent } from 'primereact/colorpicker';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

export const Properties = (props) => {
    const{ 
        legend,        
        rerenderTrigger,
        setRerenderTrigger,
        blocks,
        elements,
        options,
        LC_Legend,
        LC_Class,
        classesNumber,
        LC_ClassCharacteristics,
        LC_HorizontalPatterns,
        horizontalPatternNumber,
        LC_Strata,        
        strataNumber,
        LC_Properties,
        stratumPropertyNumber,
        LC_Characteristics,
        stratumCharacteristicNumber,
        getMaxId,
        getNextClassId,
        getNextHPId,
        getNextStratumId,
        createHorizontalPattern,
        createStratum,
        activeLCElement,
        setActiveLCElement,
        displayFormElements,
        control,
        errors,
        handleSubmit,
        fields, 
        append, 
        remove, 
        move,
        insert,
        getValues,
        setValue,
        watch,
        reset,
        LC_Objectfilter,
        onFormDirtyChange,
        isNavigationDialogVisible,
        userChoseToStay
     } = props;
    
    const toast = useRef(null);

    const [userHasMadeChanges, setUserHasMadeChanges] = useState(false);
    
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Check if we're in the Properties panel
            const target = e.target as HTMLElement;
            const inPropertiesPanel = target.closest('.guide-properties');
            
            if (!inPropertiesPanel) {
                return; // Not in our panel, ignore
            }
            
            if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Enter') return;
            
            if (!userHasMadeChanges) {
                //console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Properties: Marked dirty from keypress');
                setUserHasMadeChanges(true);
            }
        };
        
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // First check: Are we in the Properties panel?
            const inPropertiesPanel = target.closest('.guide-properties');
            if (!inPropertiesPanel) {
                return; // Not in our panel, ignore
            }
            
            // Second check: Is it a form element?
            const isFormElement = target.closest(
                '.p-inputtext, .p-dropdown, .p-inputnumber, .p-button, .p-slider, .p-colorpicker'
            ) || target.matches('input[type="number"]') || target.matches('input[type="text"]');
            
            if (isFormElement && !userHasMadeChanges) {
                //console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Properties: Marked dirty from click');
                setUserHasMadeChanges(true);
            }
        };
        
        const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // Check if we're in the Properties panel
            const inPropertiesPanel = target.closest('.guide-properties');
            if (!inPropertiesPanel) {
                return; // Not in our panel, ignore
            }
            
            const isSlider = target.closest('.p-slider');
            if (isSlider && e.buttons === 1 && !userHasMadeChanges) {
                //console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Properties: Marked dirty from slider drag');
                setUserHasMadeChanges(true);
            }
        };
        
        // Handle input events specifically for number inputs
        const handleInput = (e: Event) => {
            const target = e.target as HTMLElement;
            
            // Check if we're in the Properties panel
            const inPropertiesPanel = target.closest('.guide-properties');
            if (!inPropertiesPanel) {
                return; // Not in our panel, ignore
            }
            
            // Check if it's a number or text input
            if (target.matches('input[type="number"]') || target.matches('input[type="text"]')) {
                if (!userHasMadeChanges) {
                    //console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Properties: Marked dirty from input change');
                    setUserHasMadeChanges(true);
                }
            }
        };
        
        document.addEventListener('keydown', handleKeyPress);
        document.addEventListener('click', handleClick);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('input', handleInput, true);
        
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('input', handleInput, true);
        };
    }, [userHasMadeChanges]);
    
    useEffect(() => {
        //console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Å¾ Properties: Resetting dirty flag');
        setUserHasMadeChanges(false);
    }, [activeLCElement]);
    
    useEffect(() => {
        //console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¢ Properties: userHasMadeChanges =', userHasMadeChanges);
        if (onFormDirtyChange) {
            onFormDirtyChange(userHasMadeChanges);
        }
    }, [userHasMadeChanges, onFormDirtyChange]);

    const updateReferencedProperty = (Reference,reference_id,id,objectReference,Data)=>{
        let ReferenceFile = "LC_"+Reference+".current";      
        if(Reference === "Properties"){
            // Get instanceIndex from form data (need to add this to form)
            let instanceIndex = parseInt(Data.instanceIndex || 0);

            let elementReference = blocks.current['LC_Block'].filter(element => element.block_id === parseInt(Data.objectID));
            let newElement = {StratumID: parseInt(Data.elementID), BlockID: parseInt(Data.objectID), BlockReference: objectReference, instanceIndex: instanceIndex};
            Object.values(elementReference[0]['elements']).forEach((item)=>{
                let content = item['element_name'] as any;
                if(typeof(Data[content]) === "object"){
                    if(!Array.isArray(Data[content])){
                        if(Data[content]['label'] !== undefined){
                            Data[content] = Data[content]['label'];
                        }
                    }
                }
                newElement = {...newElement, [content]: Data[content]};
            });
            /*let Elements = eval(ReferenceFile+'.filter(content => ((content.StratumID !== '+parseInt(Data.elementID)+') || (content.StratumID === '+parseInt(Data.elementID)+' && content.BlockID !== '+parseInt(Data.objectID)+')))');
            Elements = [...Elements, newElement];
            eval(ReferenceFile+' = Elements');*/
            

            // Filter: Keep all properties EXCEPT the specific instance we're updating
            let Elements = eval(ReferenceFile+'.filter(content => !((content.StratumID === '+parseInt(Data.elementID)+') && (content.BlockID === '+parseInt(Data.objectID)+') && ((content.instanceIndex || 0) === '+instanceIndex+')))');

            // Add the updated instance (with instanceIndex preserved)
            newElement = {...newElement, instanceIndex: instanceIndex};
            Elements = [...Elements, newElement];
            eval(ReferenceFile+' = Elements');

            toast.current.show({ severity: 'success', summary: 'Property Updated', detail: "Element Property Updated"});
        }
        else{
            if(Reference === "Class" || Reference === "HorizontalPatterns" || Reference === "Strata")
                ReferenceFile = ReferenceFile+"["+reference_id+"]";
            Object.keys(Data).forEach((element)=>{
                let appendix = "";
                if(isNaN(id))
                    appendix = "."+id;
                if(Data[element] !== undefined){
                    if(Data[element] === null)
                        Data[element] = "";
                    if(element === "class_id")
                        Data[element] = parseInt(Data[element]);
                    if(typeof(Data[element]) === "object"){
                        if(Data[element].label !== undefined)
                            eval([ReferenceFile]+""+[appendix]+""+"['"+[element]+"']"+"='"+Data[element].label+"'");
                        else
                            eval([ReferenceFile]+""+[appendix]+""+"['"+[element]+"']"+"=["+Data[element]+"]");
                    }
                    else if(typeof(Data[element]) === "number")
                        eval([ReferenceFile]+""+[appendix]+""+"['"+[element]+"']"+"="+Data[element]);
                    else
                        eval([ReferenceFile]+""+[appendix]+""+"['"+[element]+"']"+"='"+Data[element]+"'");
                    toast.current.show({ severity: 'success', summary: 'Property Submitted', detail: [element]+": "+Data[element]});
                }
            })
        }
        setRerenderTrigger(Reference+randomstring.generate(8)+d.getTime());
        return(true);    
    }

    const submitProperty = (data: any,event) => {
        event.preventDefault();
        let LCType = (document.getElementById("LCType") as HTMLInputElement).value;
        let elementID = (document.getElementById("elementID") as HTMLInputElement).value;
        let formElementID = (document.getElementById("formElementID") as HTMLInputElement).value;
        let objectID = (document.getElementById("objectID") as HTMLInputElement).value;
        let objectReference = (document.getElementById("objectReference") as HTMLInputElement).value;
        let formValues = {};
        Object.keys(control._fields).map((field)=>{
            if(control._fields[field]['_f']['mount'])
                formValues = {...formValues, [field]: control._fields[field]['_f']['value']};
        });
        
        // Check if this is a presenceType change that requires element key update
        const isPresenceTypeChange = LCType === 'Properties' && 
            formValues['elementPresenceType'] && 
            (formValues['elementPresenceType'] === 'Exclusive' || 
             formValues['elementPresenceType'] === 'Conditional Temporal' || 
             formValues['elementPresenceType'] === 'Temporal Sequence Depending');
        
        // Check the previous presenceType to determine if this is a transition
        let previousPresenceType = null;
        if (LCType === 'Properties' && elementID && objectID) {
            const instanceIndex = parseInt(formValues['instanceIndex'] || 0);
            const existingProperty = LC_Properties.current.find(property => 
                property.StratumID === parseInt(elementID) && 
                property.BlockID === parseInt(objectID) &&
                (property.instanceIndex || 0) === instanceIndex
            );
            if (existingProperty) {
                previousPresenceType = existingProperty.elementPresenceType;
            }
        }
        
        const isTransitionToMultiple = isPresenceTypeChange && 
            (!previousPresenceType || 
             (previousPresenceType !== 'Exclusive' && 
              previousPresenceType !== 'Conditional Temporal' && 
              previousPresenceType !== 'Temporal Sequence Depending'));
        
        if(!updateReferencedProperty(LCType,objectID,formElementID,objectReference,formValues))
            toast.current.show({ severity: 'error', summary: 'Undefined:', detail: 'No Property Type Identified', life: 60000});

        // Clear dirty flag
        setUserHasMadeChanges(false);
        
        // Immediately notify parent (don't wait for state to propagate)
        if (onFormDirtyChange) {
            onFormDirtyChange(false);
        }

        formReset();
        
        // Handle activeLCElement update for presenceType changes
        if (isTransitionToMultiple && activeLCElement) {
            // For Exclusive/Temporal presenceTypes, we need to update the key with the appropriate suffix
            const elementKeys = activeLCElement.split('|');
            
            // Remove any existing seq/excl suffix
            const baseKey = elementKeys.filter(key => !key.match(/^(seq|excl)\d+$/)).join('|');
            
            // Add the new suffix based on presenceType
            let newKey = baseKey;
            if (formValues['elementPresenceType'] === 'Exclusive') {
                newKey = baseKey + '|excl0';
            } else if (formValues['elementPresenceType'] === 'Conditional Temporal' || 
                       formValues['elementPresenceType'] === 'Temporal Sequence Depending') {
                newKey = baseKey + '|seq0';
            }
            
            // Update activeLCElement to the new key and trigger rerenders
            // Use longer delays to ensure data updates propagate
            const timer = setTimeout(() => {
                setActiveLCElement(false);
            }, 50);
            const timer2 = setTimeout(() => {
                setActiveLCElement(newKey);
            }, 100);
            const timer3 = setTimeout(() => {
                // Force a full rerender to update both TreeView and Chart
                setRerenderTrigger('PresenceTypeChange'+d.getTime());
            }, 150);
        } else {
            // Normal update flow for non-presenceType changes
            let tempActiveLCElement = activeLCElement;
            const timer = setTimeout(() => {
                setActiveLCElement(false);
            }, 10);
            const timer2 = setTimeout(() => {
                setActiveLCElement(tempActiveLCElement);
            }, 15);
        }
    };
    
    const [displayForm,setDisplayForm] = useState<any>();
    const [hideForm,setHideForm] = useState<boolean>(false);
    const [elementID,setElementID] = useState<any>(null);
    const [formElementID,setFormElementID] = useState<any>();
    const [objectID,setObjectID] = useState<any>();
    const [objectReference,setObjectReference] = useState<any>();
    const [LCType,setLCType] = useState<any>();
    const [Delete,setDelete] = useState<any>();
    const [Add,setAdd] = useState<any>();
    const [resets, setResets] = useState<any>();
    const displays = useRef<any>([]);
    const reconfigs = useRef<any>([]);
    useEffect(()=>{
        displays.current = [];
        reconfigs.current = [];
        if(activeLCElement){            
            let elementKey = activeLCElement?.split("|");
            
            // Normalize: Remove temporal/exclusive suffixes for switch logic
            // These will be in the last position as "seq0", "seq1", "excl0", "excl1", etc.
            // We need to strip them so the switch cases work correctly
            let normalizedKey = [...elementKey];
            if(normalizedKey.length > 0){
                const lastSegment = normalizedKey[normalizedKey.length - 1];
                if(/^(seq|excl)\d+$/.test(lastSegment)){
                    normalizedKey.pop(); // Remove the suffix for switch logic
                }
            }
            
            let resetter = [];
            let display = [];
            let reconfig = [];
            switch(normalizedKey.length) {
                case 2:
                    setHideForm(false);                    
                    setLCType('Legend');
                    setDelete(null);                    
                    setDisplayForm(displayFormElements(legend["LC_Legend"][0]["elements"]));
                    setElementID(elementKey[1]);
                    legend["LC_Legend"][0]["elements"].map((element)=>{                        
                        resetter.push('setValue("'+element['element_name']+'", "'+LC_Legend.current[element['element_name']]+'")');
                    });
                    resetter.push('setValue("objectReference", "LC_Legend")');
                    resetter.push('setValue("formElementID", '+LC_Legend.current["id"]+')');
                    resetter.push('setValue("elementID", '+elementKey[1]+')');
                    setFormElementID(LC_Legend.current["id"]);
                    setObjectID(null);
                    setObjectReference("LC_Legend");
                    setAdd(<Button id="Add" name="Add" label="Add Class" type="button" icon="fa fa-folder-open"  style={{ width: 'fit-contents', verticalAlign: 'center', fontSize: 'x-small', height: 40, backgroundColor: '#fff', color: '#000', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised onClick={()=>addClass()} />);
                    setResets(resetter);
                    break;
                case 3:
                    setHideForm(false);
                    setLCType('Class');
                    setDelete(<Button id="Delete" name="Delete" label="Delete Class" type="button" icon="pi pi-trash"  style={{ width: 'fit-contents', verticalAlign: 'center', fontSize: 'x-small', height: 40, backgroundColor: '#aaa', color: '#fff', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised onClick={()=>setConfirmClassDelete(true)} />);
                    setDisplayForm(displayFormElements(legend["LC_Class"][0]["elements"]));
                    setElementID(normalizedKey[normalizedKey.length-1]);
                    let Class = LC_Objectfilter(LC_Class.current, "class_id", normalizedKey[normalizedKey.length-1]);                    
                    if(Class.length > 0){
                        legend["LC_Class"][0]["elements"].map((element)=>{
                            resetter.push('setValue("'+element['element_name']+'", "'+Class[0][element['element_name']]+'")');
                        });
                        resetter.push('setValue("objectReference", "LC_Class")');
                        resetter.push('setValue("objectID", '+Class[0]["objectID"]+')');
                        resetter.push('setValue("formElementID", '+Class[0]["class_id"]+')');
                        resetter.push('setValue("elementID", '+normalizedKey[normalizedKey.length-1]+')');
                        setFormElementID(Class[0]["class_id"]);
                        setObjectID(Class[0]["objectID"]);
                        setObjectReference("LC_Class");
                    }
                    else{
                        setObjectID(null);
                        setObjectReference("LC_Class");
                    }
                    setAdd(<Button id="Add" name="Add" label="Add Horizontal Pattern" type="button" icon="pi pi-bars"  style={{ width: 'fit-contents', verticalAlign: 'center', fontSize: 'x-small', height: 40, backgroundColor: '#fff', color: '#000', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised onClick={()=>addHorizontalPattern(Class[0]["class_id"])} />);
                    setResets(resetter);
                    break;
                case 5:
                    setHideForm(false);
                    setLCType('HorizontalPatterns');
                    setDelete(<Button id="Delete" name="Delete" label="Delete Horizontal Pattern" type="button" icon="pi pi-trash"  style={{ width: 'fit-contents', verticalAlign: 'center', fontSize: 'x-small', height: 40, backgroundColor: '#aaa', color: '#fff', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised onClick={()=>setConfirmHPDelete(true)} />);
                    setDisplayForm(displayFormElements(legend["LC_Patterns"][0]["elements"]));
                    setElementID(normalizedKey[normalizedKey.length-1]);
                    let HorizontalPattern = LC_Objectfilter(LC_HorizontalPatterns.current, "horizontal_pattern_id", normalizedKey[normalizedKey.length-1]);
                    if(HorizontalPattern.length > 0){
                        legend["LC_Patterns"][0]["elements"].map((element)=>{
                            if(typeof(HorizontalPattern[0][element['element_name']]) === "undefined" || HorizontalPattern[0][element['element_name']] === null || HorizontalPattern[0][element['element_name']] === "")
                                resetter.push('setValue("'+element['element_name']+'", "")');
                            else if(typeof(HorizontalPattern[0][element['element_name']]) === "object")
                                resetter.push('setValue("'+element['element_name']+'", ['+HorizontalPattern[0][element['element_name']][0]+','+HorizontalPattern[0][element['element_name']][1]+'])');                                
                            else if(typeof(HorizontalPattern[0][element['element_name']]) === "number")
                                resetter.push('setValue("'+element['element_name']+'", '+HorizontalPattern[0][element['element_name']]+')');
                            else
                                resetter.push('setValue("'+element['element_name']+'", "'+HorizontalPattern[0][element['element_name']]+'")');
                        });
                        resetter.push('setValue("objectReference", "LC_HorizontalPattern")');
                        resetter.push('setValue("objectID", '+HorizontalPattern[0]["objectID"]+')');
                        resetter.push('setValue("formElementID", '+HorizontalPattern[0]["horizontal_pattern_id"]+')');
                        resetter.push('setValue("elementID", '+normalizedKey[normalizedKey.length-1]+')');
                        setFormElementID(HorizontalPattern[0]["horizontal_pattern_id"]);
                        setObjectID(HorizontalPattern[0]["objectID"]);
                        setObjectReference("LC_HorizontalPattern");
                    }
                    else{
                        setObjectID(null);
                        setObjectReference("LC_HorizontalPattern");
                    }
                    setAdd(<Button id="Add" name="Add" label="Add Stratum" type="button" icon="pi pi-plus"  style={{ width: 'fit-contents', verticalAlign: 'center', fontSize: 'x-small', height: 40, backgroundColor: '#fff', color: '#000', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised onClick={()=>addStratum(HorizontalPattern[0]["horizontal_pattern_id"])} />);
                    setResets(resetter);
                    break;
                case 6:
                    setHideForm(false);
                    setLCType('Strata');
                    setDelete(<Button id="Delete" name="Delete" label="Delete Stratum" type="button" icon="pi pi-trash"  style={{ width: 'fit-contents', verticalAlign: 'center', fontSize: 'x-small', height: 40, backgroundColor: '#aaa', color: '#fff', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised onClick={()=>setConfirmStratumDelete(true)} />);
                    setAdd(null);
                    setDisplayForm(displayFormElements(legend["LC_Patterns"][1]["elements"]));
                    setElementID(normalizedKey[normalizedKey.length-2]);
                    let Stratum = LC_Objectfilter(LC_Strata.current, "stratumID", normalizedKey[normalizedKey.length-1]);
                    if(Stratum.length > 0){
                        legend["LC_Patterns"][1]["elements"].map((element)=>{
                            if(typeof(Stratum[0][element['element_name']]) === "undefined" || Stratum[0][element['element_name']] === null || Stratum[0][element['element_name']] === "")
                                resetter.push('setValue("'+element['element_name']+'", "")');
                            else if(typeof(Stratum[0][element['element_name']]) === "object")
                                resetter.push('setValue("'+element['element_name']+'", ['+Stratum[0][element['element_name']][0]+','+Stratum[0][element['element_name']][1]+'])');
                            else if(typeof(Stratum[0][element['element_name']]) === "number")
                                resetter.push('setValue("'+element['element_name']+'", '+Stratum[0][element['element_name']]+')');
                            else
                                resetter.push('setValue("'+element['element_name']+'", "'+Stratum[0][element['element_name']]+'")');
                        });
                        resetter.push('setValue("objectReference", "LC_Stratum")');
                        resetter.push('setValue("objectID", '+Stratum[0]["objectID"]+')');
                        resetter.push('setValue("formElementID", '+Stratum[0]["stratumID"]+')'); 
                        resetter.push('setValue("elementID", '+normalizedKey[normalizedKey.length-2]+')');
                        setFormElementID(Stratum[0]["stratumID"]);
                        setObjectID(Stratum[0]["objectID"]);
                        setObjectReference("LC_Stratum");
                    }
                    else{
                        setObjectID(null);
                        setObjectReference("LC_Stratum");
                    }                    
                    setResets(resetter);
                    break;
                case 7:
                    setHideForm(false);                    
                    setLCType('Properties');
                    setDelete(<Button id="Delete" name="Delete" label="Delete Element Attributes" type="button" icon="pi pi-trash"  style={{ width: 'fit-contents', verticalAlign: 'center', fontSize: 'x-small', height: 40, backgroundColor: '#aaa', color: '#fff', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised onClick={()=>setConfirmPropertyDelete(true)} />);
                    setAdd(null);
                    let activBlock = blocks.current["LC_Block"]?.filter( block => block.block_id === parseInt(normalizedKey[normalizedKey.length-1]) );
                    setDisplayForm(displayFormElements(activBlock[0]["elements"]));
                    setElementID(normalizedKey[normalizedKey.length-2]);                    
                    activBlock[0].elements.map((element)=>{
                        display.push('document.getElementById( "'+element['element_name']+'" ).style.display = "'+element['display_default']+'"');
                        let prevValue = undefined;
                        /*if(LC_Properties.current.length > 0){
                            let relevantProperty = LC_Properties.current.filter(property => property.StratumID === parseInt(normalizedKey[normalizedKey.length-2]) && property.BlockID === parseInt(normalizedKey[normalizedKey.length-1]));                            
                            if(relevantProperty[0] !== undefined)
                                prevValue = relevantProperty[0][element['element_name']];                            
                        }*/
                       // Start Extract instance index from key if present

                        let instanceIndex = 0;
                        if (elementKey.length > normalizedKey.length) {
                            const lastSegment = elementKey[elementKey.length - 1];
                            if (/^(seq|excl)\d+$/.test(lastSegment)) {
                                instanceIndex = parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                            }
                        }

                        // Find the specific instance
                        let relevantProperty = LC_Properties.current.filter(property => 
                            property.StratumID === parseInt(normalizedKey[normalizedKey.length-2]) && 
                            property.BlockID === parseInt(normalizedKey[normalizedKey.length-1]) &&
                            (property.instanceIndex || 0) === instanceIndex
                        );

                        if(relevantProperty[0] !== undefined)
                            prevValue = relevantProperty[0][element['element_name']];

                        resetter.push('setValue("instanceIndex", '+(instanceIndex)+')');
                        // End Extract instance index from key if present

                        if(typeof(prevValue) === "undefined")
                            resetter.push('setValue("'+element['element_name']+'", "")');                        
                        else if(typeof(prevValue) === "object")
                            resetter.push('setValue("'+element['element_name']+'", ['+prevValue[0]+','+prevValue[1]+'])');
                        else if(typeof(prevValue) === "number")
                            resetter.push('setValue("'+element['element_name']+'", '+prevValue+')');
                        else
                            resetter.push('setValue("'+element['element_name']+'", "'+prevValue+'")');                        
                        if(element['element_type'] == 'Dropdown' && prevValue != '')
                            reconfig.push('formReconfig("'+element['element_rules']['options_name']+'","'+prevValue+'")');
                    });
                    resetter.push('setValue("objectReference", "'+activBlock[0].block_reference+'")');
                    resetter.push('setValue("objectID", '+normalizedKey[normalizedKey.length-1]+')');
                    resetter.push('setValue("formElementID", "'+normalizedKey[normalizedKey.length-2]+'")');
                    resetter.push('setValue("elementID", '+normalizedKey[normalizedKey.length-2]+')');                    
                    setFormElementID(normalizedKey[normalizedKey.length-2]);
                    setObjectID(normalizedKey[normalizedKey.length-1]);
                    setObjectReference(activBlock[0].block_reference);                    
                    setResets(resetter);
                    displays.current = display;
                    reconfigs.current = reconfig;
                    break;
                default:
                    setHideForm(true);setDelete(null);
            }
        }
        /*console.log(rerenderTrigger);
        const timer = setTimeout(() => {
            console.log(rerenderTrigger);
            reset();
        }, 500);*/
    },[activeLCElement,rerenderTrigger]);

    const formReset = ()=>{
        // Block if dialog is showing OR user just clicked Stay on Page
        if (isNavigationDialogVisible?.current || userChoseToStay?.current) {
            /*console.log('ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â« Properties: BLOCKED formReset', {
                dialogVisible: isNavigationDialogVisible?.current,
                userStaying: userChoseToStay?.current
            });*/
            return;
        }
        
        //console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Properties: Executing formReset');
        resets?.map((formElement)=>{            
            const timer = setTimeout(() => {                
                eval(formElement);
            }, 20);
        });
    }
    const formDefault = ()=>{
        // Block if dialog is showing OR user just clicked Stay on Page
        if (isNavigationDialogVisible?.current || userChoseToStay?.current) {
            /*console.log('ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â« Properties: BLOCKED formDefault', {
                dialogVisible: isNavigationDialogVisible?.current,
                userStaying: userChoseToStay?.current
            });*/
            return;
        }
        
        //console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Properties: Executing formDefault');
        if(displays.current.length > 0){
            displays.current?.map((displayCondition)=>{
                if(displayCondition){
                    const timer = setTimeout(() => {
                        eval(displayCondition);
                    }, 20);
                }
            });
        }
        displays.current = [];
    }
    const formReconfig = (element,value)=>{
        // Block if dialog is showing OR user just clicked Stay on Page
        if (isNavigationDialogVisible?.current || userChoseToStay?.current) {
            /*console.log('ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â« Properties: BLOCKED formReconfig', {
                dialogVisible: isNavigationDialogVisible?.current,
                userStaying: userChoseToStay?.current
            });*/
            return;
        }
        
        //console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Properties: Executing formReconfig');
        let option = options.current["LC_Options"]?.filter( selectedOptions => selectedOptions.option_name === element );
        let optionDetails = option[0].options.find(o => o.label === value);
        if(optionDetails!=undefined){
            let show = optionDetails['show']?.split(',');
            show?.map((element)=>{            
                const timer = setTimeout(() => {                
                    eval('document.getElementById( "'+element.trim()+'" ).style.display = ""');
                }, 20);
            });
            let hide = optionDetails['hide']?.split(',');
            hide?.map((element)=>{            
                const timer = setTimeout(() => {
                    eval('document.getElementById( "'+element.trim()+'" ).style.display = "none"');
                }, 20);
            });
        }
    }
    const formReconfigExe = ()=>{
        // Block if dialog is showing OR user just clicked Stay on Page
        if (isNavigationDialogVisible?.current || userChoseToStay?.current) {
            /*console.log('ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â« Properties: BLOCKED formReconfigExe', {
                dialogVisible: isNavigationDialogVisible?.current,
                userStaying: userChoseToStay?.current
            });*/
            return;
        }
        
        //console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Properties: Executing formReconfigExe');
        if(reconfigs.current?.length > 0){
            reconfigs.current?.map((displayCondition)=>{
                if(displayCondition){
                    const timer = setTimeout(() => {
                        eval(displayCondition);
                    }, 20);
                }
            });
        }
        reconfigs.current = [];
    }

    const [confirmClassDelete, setConfirmClassDelete] = useState<boolean>(false);
    const [confirmHPDelete, setConfirmHPDelete] = useState<boolean>(false);
    const [confirmStratumDelete, setConfirmStratumDelete] = useState<boolean>(false);
    const [confirmPropertyDelete, setConfirmPropertyDelete] = useState<boolean>(false);
    const acceptClassDelete = (formElementID) => {
        let deletd_Class = LC_Class.current.filter(Clss => Clss.class_id === formElementID);
        deleteClass(formElementID);
        toast.current?.show({ severity: 'warn', summary: 'Confirmed', detail: 'Class '+deletd_Class[0].name+' deleted!', life: 3000 });
    }
    const acceptHPDelete = (formElementID) => {
        let deletd_HP = LC_HorizontalPatterns.current.filter(HP => HP.horizontal_pattern_id === formElementID);
        deleteHorizontalPattern(formElementID);
        toast.current?.show({ severity: 'warn', summary: 'Confirmed', detail: 'Horizontal Pattern '+deletd_HP[0].name+' deleted!', life: 3000 });
    }
    const acceptStratumDelete = (formElementID) => {
        let deletd_Stratum = LC_Strata.current.filter(stratum => stratum.stratumID === formElementID);
        deleteStratum(formElementID);
        toast.current?.show({ severity: 'warn', summary: 'Confirmed', detail: 'Stratum '+deletd_Stratum[0].name+' deleted!', life: 3000 });
    }
    const acceptPropertyDelete = (elementID,formElementID,objectID) => {
        let deletd_Element = blocks.current["LC_Block"].filter(blocks => blocks.block_id === parseInt(objectID));       
        deleteProperty(formElementID,objectID);
        toast.current?.show({ severity: 'warn', summary: 'Confirmed', detail: 'Element '+deletd_Element[0].block_name+' deleted!', life: 3000 });
    }
    const reject = () => {
        toast.current?.show({ severity: 'info', summary: 'Cancelled', detail: 'Action Cancelled', life: 3000 });
    }

    const d = new Date();
    const deleteClass = (class_id)=> {   
        //console.log("Classes Start", LC_Class.current);     
        let undeletd_Classes = LC_Class.current.filter(Clss => Clss.class_id !== class_id);
        LC_Class.current = [...(undeletd_Classes || [])];        

        if(Object.keys(LC_ClassCharacteristics.current).length > 0){            
            delete LC_ClassCharacteristics.current[class_id];                       
        }        
        let deletd_HPs = LC_HorizontalPatterns.current.filter(HPs => HPs.class_id === class_id);        
        if(deletd_HPs !== undefined){
            deletd_HPs.map((deletd_HP)=>{
                deleteHorizontalPattern(deletd_HP.horizontal_pattern_id);
            });
        }
        setRerenderTrigger('Deleted Class'+classesNumber.current+d.getTime());
        classesNumber.current = getNextClassId();
        setActiveLCElement(null);
        //console.log("Classes End", LC_Class.current);
    }
    const deleteHorizontalPattern = (HPID)=>{
        //console.log("HP Start",LC_HorizontalPatterns.current);
        let deletd_strata = LC_Strata.current.filter(stratum => stratum.HPID === HPID);
        //console.log("Stratum to Delete",deletd_strata);
        if(deletd_strata !== undefined){            
            deletd_strata.map((deletd_stratum)=>{
                deleteStratum(deletd_stratum.stratumID);
            });
        }

        let undeletd_HPs = LC_HorizontalPatterns.current.filter(HP => HP.horizontal_pattern_id !== HPID);        
        LC_HorizontalPatterns.current = [...(undeletd_HPs || [])];
        setRerenderTrigger('Deleted Horizontal Pattern'+horizontalPatternNumber.current+d.getTime());
        horizontalPatternNumber.current = horizontalPatternNumber.current+1;
        setActiveLCElement(null);
        //console.log("HP End",LC_HorizontalPatterns.current);
    }
    const deleteStratum = (StratumID)=>{
        //console.log("Strata Start",LC_Strata.current);
        //console.log("Property Start", LC_Properties.current);
        let undeletd_properties = LC_Properties.current.filter(properties => properties.StratumID !== StratumID);
        //console.log("Properties to Keep", undeletd_properties);
        if(undeletd_properties !== undefined){
            LC_Properties.current = [...(undeletd_properties || [])];
            stratumPropertyNumber.current = undeletd_properties.length+1;
        }
        /*console.log("Property End", LC_Properties.current);
        console.log("Characteristics Start", LC_Characteristics.current);*/
        let undeletd_characteristics = LC_Characteristics.current.filter(characteristics => characteristics.StratumID !== StratumID);
        //console.log("Xteristics to Keep", undeletd_characteristics);
        if(undeletd_characteristics !== undefined){
            LC_Characteristics.current = [...(undeletd_characteristics || [])];
            stratumCharacteristicNumber.current = undeletd_characteristics.length+1;
        }
        //console.log("Characteristics End", LC_Characteristics.current);

        let undeletd_strata = LC_Strata.current.filter(stratum => stratum.stratumID !== StratumID);        
        LC_Strata.current = [...(undeletd_strata || [])];        
        setRerenderTrigger('Deleted Strata'+strataNumber.current+d.getTime());
        strataNumber.current = getNextStratumId();
        //setActiveLCElement(null);
        //console.log("Strata End",LC_Strata.current);
    }
    const deleteProperty = (StratumID,BlockID)=>{
        //console.log("Property Start", LC_Properties.current);
        /*let undeletd_properties = LC_Properties.current.filter(properties => ((properties.StratumID !== parseInt(StratumID)) || (properties.StratumID === parseInt(StratumID) && properties.BlockID !== parseInt(BlockID))));
        let deletd_characteristics = LC_Characteristics.current.filter(characteristics => characteristics.StratumID === parseInt(StratumID) && characteristics.BlockID === parseInt(BlockID));*/
        // Need to get instanceIndex from the active element key
        let instanceIndex = 0;
        if (activeLCElement) {
            const elementKey = activeLCElement.split("|");
            if (elementKey.length > 7) {
                const lastSegment = elementKey[elementKey.length - 1];
                if (/^(seq|excl)\d+$/.test(lastSegment)) {
                    instanceIndex = parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                }
            }
        }

        // Filter: Keep all properties EXCEPT the specific instance
        let undeletd_properties = LC_Properties.current.filter(properties => 
            !(properties.StratumID === parseInt(StratumID) && 
            properties.BlockID === parseInt(BlockID) && 
            (properties.instanceIndex || 0) === instanceIndex)
        );

        // Also delete characteristics for this specific instance
        let deletd_characteristics = LC_Characteristics.current.filter(characteristics => 
            characteristics.StratumID === parseInt(StratumID) && 
            characteristics.BlockID === parseInt(BlockID) &&
            (characteristics.instanceIndex || 0) === instanceIndex
        );

        //console.log("Xteristics to Delete", deletd_characteristics);
        if(deletd_characteristics !== undefined){            
            deletd_characteristics.map((deletd_characteristic)=>{
                deleteCharacteristic(deletd_characteristic.StratumID,deletd_characteristic.BlockID,deletd_characteristic.CharacteristicID);
            });
        }       
        LC_Properties.current = [...(undeletd_properties || [])];
        stratumPropertyNumber.current = undeletd_properties.length+1;
        setRerenderTrigger('Deleted Property'+stratumPropertyNumber.current+d.getTime());
        setActiveLCElement(null);
        //console.log("Property End", LC_Properties.current);
    }
    const deleteCharacteristic = (StratumID,BlockID,CharacteristicID)=>{
        //console.log("XTeristic Start", LC_Characteristics.current);
        let undeletd_characteristics = LC_Characteristics.current.filter(characteristics => ((characteristics.StratumID !== parseInt(StratumID) || characteristics.BlockID !== parseInt(BlockID)) || (characteristics.StratumID === parseInt(StratumID) && characteristics.BlockID === parseInt(BlockID) && characteristics.CharacteristicID !== parseInt(CharacteristicID))));
        LC_Characteristics.current = [...(undeletd_characteristics || [])];
        stratumCharacteristicNumber.current = undeletd_characteristics.length+1;
        setRerenderTrigger('Deleted Characteristic'+stratumCharacteristicNumber.current+d.getTime());
        setActiveLCElement(null);
        //console.log("XTeristic End", LC_Characteristics.current);
    }

    const addClass = ()=>{
        /*console.log("Classes Start",LC_Class.current);
        console.log("Class Number Start",classesNumber.current);
        console.log("HPs Start",LC_HorizontalPatterns.current);
        console.log("Strata Start",LC_Strata.current);
        console.log("Properties Start",LC_Properties.current);
        console.log("Characteristics Start",LC_Characteristics.current);
        classesNumber.current = getNextClassId();
        LC_Class.current = [...LC_Class.current, {legend_id: LC_Legend.current.id, class_id: classesNumber.current, class_name: 'Class '+classesNumber.current, class_description: 'The land characterization class', class_map_code: 'LCR'+classesNumber.current, class_color_code: '00FF00'}];
        setRerenderTrigger('Added Class'+classesNumber.current+d.getTime());*/
        const newClassId = getNextClassId();
        LC_Class.current = [
            ...LC_Class.current, 
            {
                legend_id: LC_Legend.current.id, 
                class_id: newClassId, 
                class_name: 'Class ' + newClassId, 
                class_description: 'The land characterization class', 
                class_map_code: 'LCR' + newClassId, 
                class_color_code: '00FF00'
            }
        ];
        classesNumber.current = newClassId + 1;
        setRerenderTrigger('Added Class' + newClassId + d.getTime());
        /*console.log("Classes End",LC_Class.current);
        console.log("Class Number End",classesNumber.current);
        console.log("HPs End",LC_HorizontalPatterns.current);
        console.log("Strata End",LC_Strata.current);
        console.log("Properties End",LC_Properties.current);
        console.log("Characteristics End",LC_Characteristics.current);*/
    }
    const addHorizontalPattern = (class_id)=>{
        /*console.log("Classes Start",LC_Class.current);
        console.log("HP Number Start",horizontalPatternNumber.current);
        console.log("HPs Start",LC_HorizontalPatterns.current);
        console.log("Strata Start",LC_Strata.current);
        console.log("Properties Start",LC_Properties.current);
        console.log("Characteristics Start",LC_Characteristics.current);
        // Count existing HPs for this class to restart numbering from 1
        const hpsForClass = LC_HorizontalPatterns.current.filter(hp => hp.class_id === parseInt(class_id));
        const hpCount = hpsForClass.length + 1;
        horizontalPatternNumber.current = getNextHPId();
        LC_HorizontalPatterns.current = [...LC_HorizontalPatterns.current, { class_id: parseInt(class_id), horizontal_pattern_id: horizontalPatternNumber.current, name: 'Horizontal Pattern '+hpCount, description: 'The class horizontal pattern', cover: [0,100], occurrence: [0,100], type: null }];
        setRerenderTrigger('Added Horizontal Pattern'+horizontalPatternNumber.current+d.getTime());*/
        const newHPId = createHorizontalPattern(parseInt(class_id));
        setRerenderTrigger('Added Horizontal Pattern' + newHPId + d.getTime());
        /*console.log("Classes End",LC_Class.current);
        console.log("HP Number End",horizontalPatternNumber.current);
        console.log("HPs End",LC_HorizontalPatterns.current);
        console.log("Strata End",LC_Strata.current);
        console.log("Properties End",LC_Properties.current);
        console.log("Characteristics End",LC_Characteristics.current);*/
    }
    const addStratum = (horizontal_pattern_id)=>{
        /*// Count existing strata for this HP to restart numbering from 1
        const strataForHP = LC_Strata.current.filter(stratum => stratum.HPID === parseInt(horizontal_pattern_id));
        const stratumCount = strataForHP.length + 1;
        strataNumber.current = getNextStratumId();
        LC_Strata.current = [...LC_Strata.current, { HPID: parseInt(horizontal_pattern_id), stratumID: strataNumber.current, name: 'Stratum '+stratumCount, description: 'The Horizontal Pattern layer', presenceType: 'Fixed', portioning: [0,100], onTop: null, onTopID: null, onTopType: null }];
        setRerenderTrigger('Added Stratum'+strataNumber.current+d.getTime());*/
        const newStratumId = createStratum(parseInt(horizontal_pattern_id));
        setRerenderTrigger('Added Stratum' + newStratumId + d.getTime());
    }
    
    return (
        <>
        {activeLCElement &&
            <div className="card flex flex-column gap-1 text-xs p-2 m-0 w-full" style={{ maxHeight: '200px' }}>
                <Toast ref={toast} />
                <ConfirmDialog visible={confirmClassDelete} onHide={() => setConfirmClassDelete(false)} message="Are you sure you want to delete the Class? This will delete all Horizontal Patterns, Strata, Elements, Properties and Characteristics associated with it." header="Delete Class Confirmation" icon="pi pi-exclamation-triangle" acceptClassName='p-button-danger' accept={()=>acceptClassDelete(formElementID)} reject={reject} />
                <ConfirmDialog visible={confirmHPDelete} onHide={() => setConfirmHPDelete(false)} message="Are you sure you want to delete the Horizontal Pattern? This will delete all Strata, Elements, Properties and Characteristics associated with it." header="Delete Horizontal Pattern Confirmation" icon="pi pi-exclamation-triangle" acceptClassName='p-button-danger' accept={()=>acceptHPDelete(formElementID)} reject={reject} />
                <ConfirmDialog visible={confirmStratumDelete} onHide={() => setConfirmStratumDelete(false)} message="Are you sure you want to delete the Stratum? This will delete all Elements, Properties and Characteristics associated with it." header="Delete Stratum Confirmation" icon="pi pi-exclamation-triangle" acceptClassName='p-button-danger' accept={()=>acceptStratumDelete(formElementID)} reject={reject} />
                <ConfirmDialog visible={confirmPropertyDelete} onHide={() => setConfirmPropertyDelete(false)} message="Are you sure you want to delete the Property? This will delete the Element and Characteristics associated with it." header="Delete Property & Element Confirmation" icon="pi pi-exclamation-triangle" acceptClassName='p-button-danger' accept={()=>acceptPropertyDelete(elementID,formElementID,objectID)} reject={reject} />
                <form key={LCType+d.getTime()} id={LCType+d.getTime()} name={LCType+d.getTime()} onSubmit={handleSubmit(submitProperty)} className="flex flex-column justify-contents-center">
                    <Controller
                    name="LCType"                                 
                    control={control}
                    render={({ field, fieldState }) => (
                        <input type="hidden" id={field.name} name={field.name} value={LCType} />
                        )}
                    />
                    <Controller
                    name="elementID"
                    control={control}
                    render={({ field, fieldState }) => (
                        <input type="hidden" id={field.name} name={field.name} value={elementID?elementID:null} />
                        )}
                    />
                    <Controller
                    name="formElementID"
                    control={control}
                    render={({ field, fieldState }) => (
                        <input type="hidden" id={field.name} name={field.name} value={formElementID} />
                        )}
                    />
                    <Controller
                    name="objectID"
                    control={control}
                    render={({ field, fieldState }) => (
                        <input type="hidden" id={field.name} name={field.name} value={objectID} />
                        )}
                    />
                    <Controller
                    name="objectReference"
                    control={control}
                    render={({ field, fieldState }) => (
                        <input type="hidden" id={field.name} name={field.name} value={objectReference} />
                        )}
                    />
                    {!hideForm && <>
                    {displayForm}
                    {formReset()}
                    {formDefault()}
                    {formReconfigExe()}
                    <div className="flex flex-row m-1 p-0" style={{ width: '100%'}}>
                        <div className="flex align-items-center justify-content-center" style={{ width: '25%' }}>                            
                            {Add}
                        </div>
                        <div className="flex align-items-center justify-content-center" style={{ width: '50%' }}>
                            <Button id="Property" name="Property" label="Save Properties" type="submit" icon="pi pi-check"  style={{ width: '60%', verticalAlign: 'center', fontSize: 'x-small', height: 20, backgroundColor: 'var(--blue-100)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised />
                        </div>
                        <div className="flex align-items-center justify-content-center" style={{ width: '25%' }}>                            
                            {Delete}
                        </div>
                    </div>
                    </>}
                </form>
            </div>
        }
        </>
    );
}