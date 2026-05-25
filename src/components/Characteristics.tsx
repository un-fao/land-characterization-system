import { useState,useRef,useEffect } from "react";
import { Button } from "primereact/button";
import { Controller, useForm } from 'react-hook-form';
import { ListBox, ListBoxChangeEvent } from 'primereact/listbox';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import randomstring from "randomstring";

export const Characteristics = (props) => {
    const{ 
        legend,        
        rerenderTrigger,
        setRerenderTrigger,
        blocks,
        elements,
        options,
        characteristics,
        characteristicLookUp,
        LC_Legend,
        LC_Class,
        LC_ClassCharacteristics,
        LC_HorizontalPatterns,
        LC_Strata,        
        LC_Properties,
        LC_Characteristics,
        stratumCharacteristicNumber,
        stratumPropertyNumber,
        activeLCElement,
        setActiveLCElement,
        displayFormElements,
        control,
        errors,
        register,
        handleSubmit,
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
            // Check if we're in the Characteristics panel
            const target = e.target as HTMLElement;
            const inCharacteristicsPanel = target.closest('.guide-characteristics');
            
            if (!inCharacteristicsPanel) {
                return; // Not in our panel, ignore
            }
            
            if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Enter') return;
            
            if (!userHasMadeChanges) {
                //console.log('âœ… Characteristics: Marked dirty from keypress');
                setUserHasMadeChanges(true);
            }
        };
        
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // First check: Are we in the Characteristics panel?
            const inCharacteristicsPanel = target.closest('.guide-characteristics');
            if (!inCharacteristicsPanel) {
                return; // Not in our panel, ignore
            }
            
            // Second check: Is it a form element?
            const isFormElement = target.closest(
                '.p-inputtext, .p-dropdown, .p-inputnumber, .p-button, .p-slider, .p-colorpicker'
            ) || target.matches('input[type="number"]') || target.matches('input[type="text"]');
            
            if (isFormElement && !userHasMadeChanges) {
                //console.log('âœ… Characteristics: Marked dirty from click');
                setUserHasMadeChanges(true);
            }
        };
        
        const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // Check if we're in the Characteristics panel
            const inCharacteristicsPanel = target.closest('.guide-characteristics');
            if (!inCharacteristicsPanel) {
                return; // Not in our panel, ignore
            }
            
            const isSlider = target.closest('.p-slider');
            if (isSlider && e.buttons === 1 && !userHasMadeChanges) {
                //console.log('âœ… Characteristics: Marked dirty from slider drag');
                setUserHasMadeChanges(true);
            }
        };
        
        // Handle input events specifically for number inputs
        const handleInput = (e: Event) => {
            const target = e.target as HTMLElement;
            
            // Check if we're in the Characteristics panel
            const inCharacteristicsPanel = target.closest('.guide-characteristics');
            if (!inCharacteristicsPanel) {
                return; // Not in our panel, ignore
            }
            
            // Check if it's a number or text input
            if (target.matches('input[type="number"]') || target.matches('input[type="text"]')) {
                if (!userHasMadeChanges) {
                    //console.log('âœ… Characteristics: Marked dirty from input change');
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
        //console.log('ðŸ”„ Characteristics: Resetting dirty flag');
        setUserHasMadeChanges(false);
    }, [activeLCElement]);
    
    useEffect(() => {
        //console.log('ðŸ“¢ Characteristics: userHasMadeChanges =', userHasMadeChanges);
        if (onFormDirtyChange) {
            onFormDirtyChange(userHasMadeChanges);
        }
    }, [userHasMadeChanges, onFormDirtyChange]);

    const updateCharacteristic = (Reference,reference_id,id,objectReference,element_id,Data)=>{        
        let ReferenceFile = "LC_"+Reference+".current";
        if(Reference === "ClassCharacteristics"){
            // FIX: Swap these - reference_id is actually the characteristic name, id is the class ID
            let CharacteristicName = reference_id;  // This comes from objectID
            let ClassID = id;  // This comes from formElementID
            
            // Initialize if needed
            if (!LC_ClassCharacteristics.current[ClassID]) {
                LC_ClassCharacteristics.current[ClassID] = {};
            }
            if (!LC_ClassCharacteristics.current[ClassID][CharacteristicName]) {
                LC_ClassCharacteristics.current[ClassID][CharacteristicName] = {};
            }
            
            // Get the characteristic template - this should now work
            let characteristicTemplate = legend["LC_ClassCharacteristics"].filter(
                characteristic => characteristic.characteristic_name === CharacteristicName
            );
            
            // Add safety check
            if(!characteristicTemplate || characteristicTemplate.length === 0 || !characteristicTemplate[0]){
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: 'Characteristic template not found: ' + CharacteristicName
                });
                return false;
            }
            
            // Build the data object
            let element_build = {};
            Object.entries(characteristicTemplate[0].elements).forEach((element)=>{
                let elementName = element[1]['element_name'];
                if(typeof(Data[elementName]) === "object"){
                    if(Data[elementName].label !== undefined)
                        element_build = {...element_build, [elementName]: Data[elementName].label};
                    else
                        element_build = {...element_build, [elementName]: Data[elementName]};
                }
                else
                    element_build = {...element_build, [elementName]: Data[elementName]};
            });
            
            // Save to LC_ClassCharacteristics
            LC_ClassCharacteristics.current[ClassID][CharacteristicName] = {
                ...LC_ClassCharacteristics.current[ClassID][CharacteristicName],
                ...element_build
            };
            
            // Show success message
            Object.entries(element_build).forEach((element)=>{
                if(element[1] !== null && element[1] !== ""){
                    toast.current.show({ 
                        severity: 'success', 
                        summary: 'Characteristic Submitted', 
                        detail: element[0]+": "+element[1]
                    });
                }
            });
            
            setRerenderTrigger(Reference+randomstring.generate(8));
            return true;
        }
        if(Reference === "Characteristics"){
            let newElement = {};
            let characteristicTemplate = characteristics.current["LC_Characteristics"].filter(characteristic => characteristic.characteristic_id === parseInt(Data.objectID1));            
            let element_build = {};
            Object.entries(characteristicTemplate[0].elements).forEach((element)=>{
                if(typeof(Data[element[1]['element_name']]) === "object"){
                    if(Data[element[1]['element_name']].label !== undefined)
                        element_build = {...element_build, [element[1]['element_name']]: Data[element[1]['element_name']].label};
                    else
                        element_build = {...element_build, [element[1]['element_name']]: Data[element[1]['element_name']]};
                }
                else
                    element_build = {...element_build, [element[1]['element_name']]: Data[element[1]['element_name']]};
            });
            /*newElement = { StratumID: parseInt(element_id), BlockID: parseInt(id), BlockReference: objectReference, CharacteristicID: parseInt(reference_id), CharacteristicReference: characteristicTemplate[0].characteristic_reference, CharacteristicLabel: characteristicTemplate[0].characteristic_label, ...element_build };
            let Elements = eval(ReferenceFile+'.filter(content => ((content.StratumID !== '+parseInt(element_id)+' || content.BlockID !== '+parseInt(id)+') || (content.StratumID === '+parseInt(element_id)+' && content.BlockID === '+parseInt(id)+' && content.CharacteristicID !== '+parseInt(reference_id)+')))');*/
            // Get instanceIndex from the property being edited
            const instanceIndex = (() => {
                if (activeLCElement) {
                    const elementKey = activeLCElement.split("|");
                    if (elementKey.length > 7) {
                        const lastSegment = elementKey[elementKey.length - 1];
                        if (/^(seq|excl)\d+$/.test(lastSegment)) {
                            return parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                        }
                    }
                }
                return 0;
            })();

            newElement = { 
                StratumID: parseInt(element_id), 
                BlockID: parseInt(id), 
                BlockReference: objectReference, 
                CharacteristicID: parseInt(reference_id), 
                CharacteristicReference: characteristicTemplate[0].characteristic_reference, 
                CharacteristicLabel: characteristicTemplate[0].characteristic_label, 
                instanceIndex: instanceIndex,  // ADD THIS
                ...element_build 
            };

            let Elements = eval(ReferenceFile+'.filter(content => !((content.StratumID === '+parseInt(element_id)+' && content.BlockID === '+parseInt(id)+' && content.CharacteristicID === '+parseInt(reference_id)+' && (content.instanceIndex || 0) === '+instanceIndex+')))');

            if(Elements.length > 0)
                Elements = [...Elements, newElement];
            else
                Elements = [newElement];
            eval(ReferenceFile+' = Elements');
            toast.current.show({ severity: 'success', summary: 'Characteristic Updated', detail: "Element Characteristic Updated"});
        }
        else{
            if(Reference === "ClassCharacteristics")
                ReferenceFile = ReferenceFile+"["+reference_id+"]";
            Object.keys(Data).forEach((element)=>{
                let appendix = "";
                if(isNaN(id))
                    appendix = "."+id;
                if(Data[element] === null)
                    Data[element] = "";
                if(Data[element] !== undefined){
                    if(typeof(Data[element]) === "object"){
                        if(Data[element].label !== undefined)
                            eval([ReferenceFile]+""+[appendix]+""+"['"+[element]+"']"+"='"+Data[element].label+"'");
                        else
                            eval([ReferenceFile]+""+[appendix]+""+"['"+[element]+"']"+"=["+Data[element][0]+","+Data[element][1]+"]");
                    }
                    else if(typeof(Data[element]) === "number")
                        eval([ReferenceFile]+""+[appendix]+""+"['"+[element]+"']"+"="+Data[element]);
                    else
                        eval([ReferenceFile]+""+[appendix]+""+"['"+[element]+"']"+"='"+Data[element]+"'");
                    toast.current.show({ severity: 'success', summary: 'Characteristic Submitted', detail: [element]+": "+Data[element]});
                }
            })
        }
        setRerenderTrigger(Reference+randomstring.generate(8));
        return(true);
    }

    const submitCharacteristic = (data: any,event) => {
        event.preventDefault();        
        let LCType = (document.getElementById("LCType1") as HTMLInputElement).value;        
        let elementID = (document.getElementById("elementID1") as HTMLInputElement).value;
        let formElementID = (document.getElementById("formElementID1") as HTMLInputElement).value;
        let objectID = (document.getElementById("objectID1") as HTMLInputElement).value;
        let objectReference = (document.getElementById("objectReference1") as HTMLInputElement).value;
        let formValues = {};
        Object.keys(control._fields).map((field)=>{
            if(control._fields[field]['_f']['mount'])
                formValues = {...formValues, [field]: control._fields[field]['_f']['value']};
        });
        if(!updateCharacteristic(LCType,objectID,formElementID,objectReference,elementID,formValues))
            toast.current.show({ severity: 'error', summary: 'Undefined:', detail: 'No Characteristic Type Identified', life: 60000});

        // Clear dirty flag
        setUserHasMadeChanges(false);
        
        // Immediately notify parent (don't wait for state to propagate)
        if (onFormDirtyChange) {
            onFormDirtyChange(false);
        }

        formReset();
        let tempActiveLCElement = activeLCElement;
        let tempList = list;
        const timer = setTimeout(() => {
            setActiveLCElement(false);
            setList("");
        }, 10);
        const timer2 = setTimeout(() => {
            setActiveLCElement(tempActiveLCElement);
            setList(tempList);
        }, 15);
    };
    const getFormErrorMessage = (name:any) => {
        return errors[name] ? <small className="p-error">This field is required</small> : <small className="p-error">&nbsp;</small>;
    };

    const [displayForm,setDisplayForm] = useState<any>();
    const [hideForm,setHideForm] = useState<boolean>(true);
    const [hideButton,setHideButton] = useState<boolean>(true);
    const [hideList,setHideList] = useState<boolean>(true);
    const [elementID,setElementID] = useState<any>(null);
    const [formElementID,setFormElementID] = useState<any>();
    const [objectID,setObjectID] = useState<any>();
    const [objectReference,setObjectReference] = useState<any>();
    const [LCType,setLCType] = useState<any>();
    const [Delete,setDelete] = useState<any>();
    const [resets, setResets] = useState<any>();

    const [list,setList] = useState<any>("");
    const [activeCharacteristic, setActiveCharacteristic] = useState<any>(null);
    useEffect(()=>{
        if(activeLCElement){
            let elementKey = activeLCElement?.split("|");
            
            // Create normalized key for switch logic (without instance suffix)
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
            setDisplayForm('');

            if(normalizedKey.length === 4 && normalizedKey[3] === 'CHARACTERISTICS' && LCType === 'ClassCharacteristics'){
                // Class Characteristic selected from list
                let ClassID_list = elementKey[2];
                let classCharacteristic = legend["LC_ClassCharacteristics"]?.filter(
                    characteristic => characteristic.characteristic_name === activeCharacteristic
                );
                
                if(classCharacteristic !== undefined && classCharacteristic[0] !== undefined){
                    setDisplayForm([
                        <p style={{textAlign: 'center' }}>
                            {classCharacteristic[0]['characteristic_label']}:
                        </p>,
                        displayFormElements(classCharacteristic[0].elements)
                    ]);
                    setHideButton(false);
                    
                    // Initialize if needed
                    if (!LC_ClassCharacteristics.current[ClassID_list]) {
                        LC_ClassCharacteristics.current[ClassID_list] = {};
                    }
                    if (!LC_ClassCharacteristics.current[ClassID_list][activeCharacteristic]) {
                        LC_ClassCharacteristics.current[ClassID_list][activeCharacteristic] = {};
                    }
                    
                    classCharacteristic[0].elements.map((element) => {
                        display.push('document.getElementById( "'+element['element_name']+'" ).style.display = "'+element['display_default']+'"');
                        let prevValue = undefined;
                        
                        if(LC_ClassCharacteristics.current[ClassID_list] && 
                        LC_ClassCharacteristics.current[ClassID_list][activeCharacteristic]){
                            prevValue = LC_ClassCharacteristics.current[ClassID_list][activeCharacteristic][element['element_name']];
                        }
                        
                        if(typeof(prevValue) === "undefined" || prevValue === null || prevValue === "")
                            resetter.push('setValue("'+element['element_name']+'", "")');
                        else if(typeof(prevValue) === "object")
                            resetter.push('setValue("'+element['element_name']+'", ['+prevValue[0]+','+prevValue[1]+'])');
                        else if(typeof(prevValue) === "number")
                            resetter.push('setValue("'+element['element_name']+'", '+prevValue+')');
                        else
                            resetter.push('setValue("'+element['element_name']+'", "'+prevValue+'")');
                        
                        // FIX: Add check for element_rules existence before accessing options_name
                        if(element['element_type'] == 'Dropdown' && 
                        prevValue != '' && 
                        element['element_rules'] && 
                        element['element_rules']['options_name'])
                            reconfig.push('formReconfig("'+element['element_rules']['options_name']+'","'+prevValue+'")');
                    });
                    
                    resetter.push('setValue("objectReference1", null)');
                    resetter.push('setValue("objectID1", "'+activeCharacteristic+'")');
                    resetter.push('setValue("formElementID1", "'+ClassID_list+'")');
                    setFormElementID(ClassID_list);
                    setObjectID(activeCharacteristic);
                    setObjectReference(null);
                }
                setResets(resetter);
                displays.current = display;
                reconfigs.current = reconfig;
            }

            let activCharacteristic = characteristics.current["LC_Characteristics"]?.filter( characteristic => characteristic.characteristic_id === activeCharacteristic);                        
            if(activCharacteristic !== undefined && activCharacteristic[0] !== undefined){
                setDisplayForm([<p style={{textAlign: 'center' }}>{activCharacteristic[0]['characteristic_label']}:</p>,displayFormElements(activCharacteristic[0].elements)]);
                setHideButton(false);
                activCharacteristic[0].elements.map((element)=>{
                    display.push('document.getElementById( "'+element['element_name']+'" ).style.display = "'+element['display_default']+'"');
                    let prevValue = undefined;
                    if(LC_Characteristics.current.length > 0){
                        /*let relevantCharacteristic = LC_Characteristics.current.filter(characteristics => characteristics.StratumID === parseInt(elementKey[elementKey.length-2]) && characteristics.BlockID === parseInt(elementKey[elementKey.length-1]) && characteristics.CharacteristicID === activeCharacteristic);*/
                        // Extract instanceIndex from activeLCElement
                        let instanceIndex = 0;
                        if (elementKey.length > 7) {
                            const lastSegment = elementKey[elementKey.length - 1];
                            if (/^(seq|excl)\d+$/.test(lastSegment)) {
                                instanceIndex = parseInt(lastSegment.replace(/^(seq|excl)/, ''));
                            }
                        }

                        // Use normalizedKey for StratumID and BlockID to handle instance suffix correctly
                        let relevantCharacteristic = LC_Characteristics.current.filter(characteristics => 
                            characteristics.StratumID === parseInt(normalizedKey[normalizedKey.length-2]) && 
                            characteristics.BlockID === parseInt(normalizedKey[normalizedKey.length-1]) && 
                            characteristics.CharacteristicID === activeCharacteristic &&
                            (characteristics.instanceIndex || 0) === instanceIndex
                        );
                        if(relevantCharacteristic[0] !== undefined)
                            prevValue = relevantCharacteristic[0][element['element_name']];
                    }
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
                // Use normalizedKey to get the correct BlockID (without instance suffix)
                let elementReference = blocks.current["LC_Block"]?.filter( block => block.block_id === parseInt(normalizedKey[normalizedKey.length-1]) );
                resetter.push('setValue("objectReference1", "'+elementReference[0].block_reference+'")');
                resetter.push('setValue("objectID1", '+activeCharacteristic+')');
                resetter.push('setValue("formElementID1", "'+normalizedKey[normalizedKey.length-1]+'")');
                setFormElementID(normalizedKey[normalizedKey.length-1]);
                setObjectID(activeCharacteristic);
                setObjectReference(elementReference[0].block_reference);                
            }
            setResets(resetter);
            displays.current = display;
            reconfigs.current = reconfig;
        }        
    },[activeCharacteristic,list]);
    
    const displays = useRef<any>([]);
    const reconfigs = useRef<any>([]);
    var elementKey = null;
    if(activeLCElement)
        elementKey = activeLCElement?.split("|");
    useEffect(()=>{
        displays.current = [];
        reconfigs.current = [];
        if(activeLCElement){
            let elementKey = activeLCElement?.split("|");
            
            // Normalize: Remove temporal/exclusive suffixes for switch logic
            let normalizedKey = [...elementKey];
            if(normalizedKey.length > 0){
                const lastSegment = normalizedKey[normalizedKey.length - 1];
                if(/^(seq|excl)\d+$/.test(lastSegment)){
                    normalizedKey.pop(); // Remove the suffix for switch logic
                }
            }
            
            let resetter = [];
            let subDisplayCharacteristics = [];
            switch(normalizedKey.length) {
                case 3:
                    // Characteristics folder clicked - show list
                    reset();
                    setHideForm(false);
                    setHideList(false);
                    setHideButton(true);
                    setLCType('ClassCharacteristics');
                    setDelete(null);
                    setActiveCharacteristic(null);
                    
                    // Extract class ID from key format: 'A' + legend_id + class_id + '0'
                    let ClassID_folder = normalizedKey[0].replace('A', '').replace(normalizedKey[1], '').replace('0', '');
                    
                    // Build list of all available Class Characteristics
                    let availableClassCharacteristics = [];
                    legend["LC_ClassCharacteristics"].forEach((characteristic) => {
                        availableClassCharacteristics.push({
                            label: characteristic.characteristic_label,
                            name: characteristic.characteristic_name,
                            value: characteristic.characteristic_name
                        });
                    });
                    
                    setList(
                        <>
                            <p className="text-xxs" style={{ textAlign: 'center' }}>
                                Select Class Characteristic to edit
                            </p>
                            <ListBox 
                                listStyle={{ maxHeight: '150px' }} 
                                value={activeCharacteristic} 
                                onChange={(e: ListBoxChangeEvent) => setActiveCharacteristic(e.value)} 
                                options={availableClassCharacteristics} 
                                optionLabel="label" 
                                className="w-full text-xs" 
                                listClassName="text-xs" 
                                filter 
                            />
                        </>
                    );
                    
                    resetter.push('setValue("objectID1", "'+ClassID_folder+'")');
                    resetter.push('setValue("formElementID1", "'+activeCharacteristic+'")');
                    resetter.push('setValue("elementID1", "'+ClassID_folder+'")');
                    setElementID(ClassID_folder);
                    setFormElementID(activeCharacteristic);
                    setObjectID(ClassID_folder);
                    setObjectReference(null);
                    setResets(resetter);
                    break;
                case 4:
                    reset();
                    
                    // Check if this is the Characteristics folder or a specific characteristic
                    if(normalizedKey[3] === 'CHARACTERISTICS'){
                        // Characteristics folder clicked - show list of available characteristics
                        setHideForm(false);
                        setHideList(false);
                        setHideButton(true);
                        setLCType('ClassCharacteristics');
                        setDelete(null);
                        setActiveCharacteristic(null);
                        
                        let ClassID_folder = normalizedKey[2];
                        
                        // Build list of all available Class Characteristics
                        let availableClassCharacteristics = [];
                        legend["LC_ClassCharacteristics"].forEach((characteristic) => {
                            availableClassCharacteristics.push({
                                label: characteristic.characteristic_label,
                                name: characteristic.characteristic_name,
                                value: characteristic.characteristic_name
                            });
                        });
                        
                        setList(
                            <>
                                <p className="text-xxs" style={{ textAlign: 'center' }}>
                                    Select Class Characteristic to edit
                                </p>
                                <ListBox 
                                    listStyle={{ maxHeight: '150px' }} 
                                    value={activeCharacteristic} 
                                    onChange={(e: ListBoxChangeEvent) => setActiveCharacteristic(e.value)} 
                                    options={availableClassCharacteristics} 
                                    optionLabel="label" 
                                    className="w-full text-xs" 
                                    listClassName="text-xs" 
                                    filter 
                                />
                            </>
                        );
                        
                        resetter.push('setValue("objectID1", "'+ClassID_folder+'")');
                        resetter.push('setValue("formElementID1", "'+activeCharacteristic+'")');
                        resetter.push('setValue("elementID1", "'+ClassID_folder+'")');
                        setElementID(ClassID_folder);
                        setFormElementID(activeCharacteristic);
                        setObjectID(ClassID_folder);
                        setObjectReference(null);
                        setResets(resetter);
                    } else {
                        // Specific Class Characteristic clicked - show form directly
                        setHideForm(false);
                        setHideList(true);
                        setHideButton(false);
                        setLCType('ClassCharacteristics');
                        setDelete(null);
                        
                        let ClassCharacteristicType = legend["LC_ClassCharacteristics"].filter(
                            characteristic => characteristic.characteristic_name === normalizedKey[normalizedKey.length-1]
                        );
                        
                        setDisplayForm('');
                        setDisplayForm([
                            <p style={{textAlign: 'center' }}>
                                {ClassCharacteristicType[0]['characteristic_label']}:
                            </p>,
                            displayFormElements(ClassCharacteristicType[0]["elements"])
                        ]);
                        
                        let ClassID = normalizedKey[2];
                        
                        // Initialize if needed
                        if (!LC_ClassCharacteristics.current[ClassID]) {
                            LC_ClassCharacteristics.current[ClassID] = {};
                        }
                        if (!LC_ClassCharacteristics.current[ClassID][normalizedKey[normalizedKey.length-1]]) {
                            LC_ClassCharacteristics.current[ClassID][normalizedKey[normalizedKey.length-1]] = {};
                        }
                        
                        ClassCharacteristicType[0]["elements"].map((element)=>{
                            let prevValue = LC_ClassCharacteristics.current[ClassID][normalizedKey[normalizedKey.length-1]][element['element_name']];
                            if(prevValue === undefined)
                                prevValue = null;
                            
                            if(typeof(prevValue) === "undefined" || prevValue === null || prevValue === "")
                                resetter.push('setValue("'+element['element_name']+'", '+null+')');
                            else if(typeof(prevValue) === "object")
                                resetter.push('setValue("'+element['element_name']+'", ['+prevValue[0]+','+prevValue[1]+'])');
                            else if(typeof(prevValue) === "number")
                                resetter.push('setValue("'+element['element_name']+'", '+prevValue+')');
                            else
                                resetter.push('setValue("'+element['element_name']+'", "'+prevValue+'")');
                        });
                        
                        resetter.push('setValue("objectID1", "'+normalizedKey[2]+'")');
                        resetter.push('setValue("formElementID1", "'+normalizedKey[normalizedKey.length-1]+'")');
                        resetter.push('setValue("elementID1", "'+normalizedKey[normalizedKey.length-1]+'")');
                        setElementID(normalizedKey[normalizedKey.length-1]);
                        setFormElementID(normalizedKey[normalizedKey.length-1]);
                        setObjectID(normalizedKey[2]);
                        setObjectReference(null);
                        setResets(resetter);
                    }
                    break;
                case 7:
                    reset();
                    setHideForm(false);
                    setHideList(false);
                    setHideButton(true);
                    setLCType('Characteristics');
                    setDelete(<Button id="Delete" name="Delete" label="Delete" type="button" icon="pi pi-trash"  style={{ width: 'fit-contents', verticalAlign: 'center', fontSize: 'x-small', height: 20, backgroundColor: '#aaa', color: '#fff', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised onClick={()=>setConfirmCharacteristicDelete(true)} />);
                    setActiveCharacteristic(null);
                    Object.keys(characteristicLookUp.current).forEach((key0) => {
                        // User Defined Characteristics block_id 900000 added to the list
                        // let _1_blocks = characteristicLookUp.current[key0].filter( selectedblock => selectedblock.block_id === parseInt(normalizedKey[normalizedKey.length-1]));
                        let _1_blocks = characteristicLookUp.current[key0].filter( selectedblock => selectedblock.block_id === parseInt(normalizedKey[normalizedKey.length-1]) || selectedblock.block_id === 900000);
                        Object.keys(_1_blocks).forEach((key1) => {
                            let _characteristics = characteristics.current["LC_Characteristics"]?.filter( characteristics => characteristics.characteristic_id === _1_blocks[key1]["characteristic_id"] );                
                            Object.keys(_characteristics).forEach((key2) => {                                
                                subDisplayCharacteristics = ([...subDisplayCharacteristics, { label: _characteristics[key2]["characteristic_label"], name: _characteristics[key2]["characteristic_name"], value: _characteristics[key2]["characteristic_id"] }]);
                            });
                        });
                    });                                        
                    setList(<><p className="text-xxs" style={{ textAlign: 'center' }}>Select Characteristic below</p><ListBox listStyle={{ maxHeight: '150px' }} value={activeCharacteristic} onChange={(e: ListBoxChangeEvent) => setActiveCharacteristic(e.value)} options={subDisplayCharacteristics} optionLabel="label" className="w-full text-xs" listClassName="text-xs" filter /></>);
                    resetter.push('setValue("objectID1", '+normalizedKey[normalizedKey.length-1]+')');
                    resetter.push('setValue("formElementID1", "'+activeCharacteristic+'")');
                    resetter.push('setValue("elementID1", "'+normalizedKey[normalizedKey.length-2]+'")');
                    setElementID(normalizedKey[normalizedKey.length-2]);
                    setFormElementID(activeCharacteristic);
                    setObjectID(normalizedKey[normalizedKey.length-1]);
                    setObjectReference(null);
                    setResets(resetter);                    
                    break;
                case 8:
                    reset();
                    setHideForm(false);
                    setHideList(false);
                    setHideButton(true);
                    setLCType('Characteristics');
                    setDelete(<Button id="Delete" name="Delete" label="Delete" type="button" icon="pi pi-trash"  style={{ width: 'fit-contents', verticalAlign: 'center', fontSize: 'x-small', height: 20, backgroundColor: '#aaa', color: '#fff', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised onClick={()=>setConfirmCharacteristicDelete(true)} />);
                    setActiveCharacteristic(null);                    
                    Object.keys(characteristicLookUp.current).forEach((key0) => {
                        // User Defined Characteristics block_id 900000 added to the list
                        // let _1_blocks = characteristicLookUp.current[key0].filter( selectedblock => selectedblock.block_id === parseInt(normalizedKey[normalizedKey.length-2]));
                        let _1_blocks = characteristicLookUp.current[key0].filter( selectedblock => selectedblock.block_id === parseInt(normalizedKey[normalizedKey.length-2]) || selectedblock.block_id === 900000);
                        Object.keys(_1_blocks).forEach((key1) => {
                            let _characteristics = characteristics.current["LC_Characteristics"]?.filter( characteristics => characteristics.characteristic_id === _1_blocks[key1]["characteristic_id"] );                
                            Object.keys(_characteristics).forEach((key2) => {                                
                                subDisplayCharacteristics = ([...subDisplayCharacteristics, { label: _characteristics[key2]["characteristic_label"], name: _characteristics[key2]["characteristic_name"], value: _characteristics[key2]["characteristic_id"] }]);
                            });
                        });
                    });                                        
                    setList(<><p className="text-xxs" style={{ textAlign: 'center' }}>Select Characteristic below</p><ListBox listStyle={{ maxHeight: '150px' }} value={activeCharacteristic} onChange={(e: ListBoxChangeEvent) => setActiveCharacteristic(e.value)} options={subDisplayCharacteristics} optionLabel="label" className="w-full text-xs" listClassName="text-xs" filter /></>);
                    resetter.push('setValue("objectID1", '+normalizedKey[normalizedKey.length-2]+')');
                    resetter.push('setValue("formElementID1", "'+activeCharacteristic+'")');
                    resetter.push('setValue("elementID1", "'+normalizedKey[normalizedKey.length-3]+'")');
                    setElementID(normalizedKey[normalizedKey.length-3]);
                    setFormElementID(activeCharacteristic);
                    setObjectID(normalizedKey[normalizedKey.length-2]);
                    setObjectReference(null);
                    setResets(resetter);                    
                    break;
                default:
                    setHideForm(true);setHideButton(true);setDelete(null);
            }
        }
        /*const timer = setTimeout(() => {
            reset();
        }, 500);*/
    },[activeLCElement,rerenderTrigger]);

    const formReset = ()=>{
        // Block if dialog is showing OR user just clicked Stay on Page
        if (isNavigationDialogVisible?.current || userChoseToStay?.current) {
            /*console.log('ðŸš« Characteristics: BLOCKED formReset', {
                dialogVisible: isNavigationDialogVisible?.current,
                userStaying: userChoseToStay?.current
            });*/
            return;
        }
        
        //console.log('âœ… Characteristics: Executing formReset');
        resets?.map((formElement)=>{
            const timer = setTimeout(() => {                
                eval(formElement);
            }, 20);
        });
    }
    const formDefault = ()=>{
        // Block if dialog is showing OR user just clicked Stay on Page
        if (isNavigationDialogVisible?.current || userChoseToStay?.current) {
            /*console.log('ðŸš« Characteristics: BLOCKED formDefault', {
                dialogVisible: isNavigationDialogVisible?.current,
                userStaying: userChoseToStay?.current
            });*/
            return;
        }
        
        //console.log('âœ… Characteristics: Executing formDefault');
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
            /*console.log('ðŸš« Characteristics: BLOCKED formReconfig', {
                dialogVisible: isNavigationDialogVisible?.current,
                userStaying: userChoseToStay?.current
            });*/
            return;
        }
        
        //console.log('âœ… Characteristics: Executing formReconfig');
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
            /*console.log('ðŸš« Characteristics: BLOCKED formReconfigExe', {
                dialogVisible: isNavigationDialogVisible?.current,
                userStaying: userChoseToStay?.current
            });*/
            return;
        }
        
        //console.log('âœ… Characteristics: Executing formReconfigExe');
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
    const [confirmCharacteristicDelete, setConfirmCharacteristicDelete] = useState<boolean>(false);   
    const acceptCharacteristicDelete = (elementID,formElementID,objectID) => {
        let deletd_Characteristic = LC_Characteristics.current.filter(characteristics => characteristics.StratumID === parseInt(elementID) && characteristics.BlockID === parseInt(formElementID) && characteristics.CharacteristicID === parseInt(objectID));        
        if(deletd_Characteristic[0] !== undefined ){
            deleteCharacteristic(elementID,formElementID,objectID);
            toast.current?.show({ severity: 'warn', summary: 'Confirmed', detail: 'Element '+deletd_Characteristic[0].CharacteristicLabel+' deleted!', life: 3000 });
        }
        else
            toast.current?.show({ severity: 'error', summary: 'Failed', detail: 'Characteristic is not set, cannot delete!', life: 60000 });
    }
    const reject = () => {
        toast.current?.show({ severity: 'info', summary: 'Cancelled', detail: 'Action Cancelled', life: 3000 });
    }

    const d = new Date();
    const deleteCharacteristic = (StratumID,BlockID,CharacteristicID)=>{
        // Extract instanceIndex from activeLCElement
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
        
        /*let undeletd_characteristics = LC_Characteristics.current.filter(characteristics => ((characteristics.StratumID !== parseInt(StratumID) || characteristics.BlockID !== parseInt(BlockID)) || (characteristics.StratumID === parseInt(StratumID) && characteristics.BlockID === parseInt(BlockID) && characteristics.CharacteristicID !== parseInt(CharacteristicID))));*/
        let undeletd_characteristics = LC_Characteristics.current.filter(characteristics => 
            !(characteristics.StratumID === parseInt(StratumID) && 
            characteristics.BlockID === parseInt(BlockID) && 
            characteristics.CharacteristicID === parseInt(CharacteristicID) &&
            (characteristics.instanceIndex || 0) === instanceIndex)
        );   
        LC_Characteristics.current = [...(undeletd_characteristics || [])];
        stratumCharacteristicNumber.current = undeletd_characteristics.length+1;
        setRerenderTrigger('Deleted Characteristic'+stratumCharacteristicNumber.current+d.getTime());
        setActiveLCElement(null);
    }

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeCharacteristic]);

    return (
        <>
        {(activeLCElement && (elementKey.length === 4 || elementKey.length === 7 || elementKey.length === 8)) &&
            <div className="flex flex-column gap-1 text-xs p-2 m-0 w-full overflow-auto" style={{ backgroundColor: 'white', height: '100%' }}>
                <Toast ref={toast} />
                <ConfirmDialog visible={confirmCharacteristicDelete} onHide={() => setConfirmCharacteristicDelete(false)} message="Are you sure you want to delete the Characteristic?" header="Delete Characteristic Confirmation" icon="pi pi-exclamation-triangle" acceptClassName='p-button-danger' accept={()=>acceptCharacteristicDelete(elementID,formElementID,objectID)} reject={reject} />
                <form id="Characteristics" name="Characteristics" onSubmit={handleSubmit(submitCharacteristic)} className="flex flex-column justify-contents-center">
                    <Controller
                    name="LCType1"                                 
                    control={control}
                    render={({ field, fieldState }) => (
                        <input key={field.name} type="hidden" id={field.name} name={field.name} value={LCType} />
                        )}
                    />
                    <Controller
                    name="elementID1"
                    control={control}
                    render={({ field, fieldState }) => (
                        <input key={field.name} type="hidden" id={field.name} name={field.name} value={elementID} />
                        )}
                    />
                    <Controller
                    name="formElementID1"
                    control={control}
                    render={({ field, fieldState }) => (
                        <input key={field.name} type="hidden" id={field.name} name={field.name} value={formElementID} />
                        )}
                    />
                    <Controller
                    name="objectID1"
                    control={control}
                    render={({ field, fieldState }) => (
                        <input key={field.name} type="hidden" id={field.name} name={field.name} value={objectID} />
                        )}
                    />
                    <Controller
                    name="objectReference1"
                    control={control}
                    render={({ field, fieldState }) => (
                        <input key={field.name} type="hidden" id={field.name} name={field.name} value={objectReference} />
                        )}
                    />
                    {!hideForm && <>                        
                        {displayForm}
                        {formReset()}
                        {formDefault()}
                        {formReconfigExe()}
                        {!hideButton && 
                        <div className="flex flex-row overflow-auto">
                            <div className="flex align-items-center justify-content-center" style={{ width: '80%' }}>
                                <Button id="Characteristics" name="Characteristics" label="Save Characteristics" type="submit" icon="pi pi-check"  style={{ width: '60%', alignSelf: 'center', verticalAlign: 'center', fontSize: 'x-small', height: 20, backgroundColor: 'var(--blue-100)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }} className="flex align-self-center" size="small" raised />
                            </div>
                            <div className="flex right-0" style={{ width: '20%' }}>                            
                                {Delete}
                            </div>
                        </div>}
                        {!hideList && list}
                    </>}             
                </form>
            </div>
        }        
        </>
    );
}