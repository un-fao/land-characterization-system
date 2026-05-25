import React, { useState, useRef, useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Button } from "primereact/button";
import { Controller, useForm } from 'react-hook-form';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel, TabViewTabChangeEvent } from 'primereact/tabview';
import { Slider, SliderChangeEvent } from "primereact/slider";
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Tree, TreeTogglerTemplateOptions } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';
import { classNames } from 'primereact/utils';

import randomstring from "randomstring";

import "./tabview.css";
import '../../css/TreeView.css';

export const GuideLegendCreation3 = (props: any) => {
    const {
        UUID,
        setRerenderTrigger,
        setGuide2Visible,
        setGuide3Visible,
        setGuide4Visible,
        LC_Class,
        LC_HorizontalPatterns,
        LC_Strata,
        horizontalPatternNumber,
        getNextHPId,
        strataNumber,
        LC_Properties,
        stratumPropertyNumber,
        LC_Characteristics,
        stratumCharacteristicNumber,
        OptionsBus,
        validateRange
    } = props;

    horizontalPatternNumber.current = getNextHPId();

    let clssess = [];
    LC_Class.current.map((clss) => {
        clssess.push({ key: clss.class_id, label: clss.class_name, icon: 'pi pi-folder-open' });
    });

    const [HorizontalPatternID, setHPID] = useState(getNextHPId());
    const [horizontalPatterns, addHorizontalPattern] = useState(LC_HorizontalPatterns.current);
    const [selectedClass, setSelectedClass] = useState(null);
    const [editingHP, setEditingHP] = useState(null);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    
    const toast = useRef(null);

    const bounds = [{
        type: "Percentage",
        min: 0,
        max: 100
    }];
    
    const returnBounds = (searchType: string) => {
        let resultType = bounds.find((type) => type.type === searchType);
        return resultType;
    }

    let defaultValues = {
        horizontal_pattern_id: HorizontalPatternID,
        horizontal_pattern_name: '',
        horizontal_pattern_description: '',
        horizontal_pattern_cover: [0, 100],
        horizontal_pattern_occurrence: [0, 100],
        horizontal_pattern_type: '',
    };

    const {
        control,
        formState: { errors },
        handleSubmit,
        getValues,
        reset,
        setValue
    } = useForm({ defaultValues });

    const showHorizontalPattern = (action: string, saved?: any) => {
        const selectedClassName = LC_Class.current.find(c => c.class_id === parseInt(selectedClass))?.class_name;
        toast.current.show({ 
            severity: 'success', 
            summary: `Horizontal Pattern ${action}`, 
            content: () => (
                <div className="flex flex-column align-items-left" style={{ flex: '1' }}>
                    <p>Class: {selectedClassName}<br/>
                       Name: {(saved?.name ?? getValues('horizontal_pattern_name'))}<br/>
                       Description: {(saved?.description ?? getValues('horizontal_pattern_description'))}<br/>
                       Cover: {(saved?.cover ?? getValues('horizontal_pattern_cover'))}<br/>
                       Occurrence: {(saved?.occurrence ?? getValues('horizontal_pattern_occurrence'))}<br/>
                       Type: {(saved?.type ?? getValues('horizontal_pattern_type'))}</p>
                </div>
            ) 
        });
    };

    const submitHorizontalPattern = (data: any, event) => {
        event.preventDefault();
        
        if (!selectedClass) {
            toast.current.show({ severity: 'error', summary: 'Error', detail: 'Please select a class first' });
            return;
        }

        if (editingHP !== null) {
            // Update existing HP
            const updatedHPs = horizontalPatterns.map(hp => 
                hp.horizontal_pattern_id === editingHP 
                    ? {
                        ...hp,
                        name: data.horizontal_pattern_name,
                        description: data.horizontal_pattern_description,
                        cover: data.horizontal_pattern_cover,
                        occurrence: data.horizontal_pattern_occurrence,
                        type: data.horizontal_pattern_type
                    }
                    : hp
            );
            addHorizontalPattern(updatedHPs);
            LC_HorizontalPatterns.current = updatedHPs;
            showHorizontalPattern('Updated', updatedHPs.find(hp => hp.horizontal_pattern_id === editingHP));
            setEditingHP(null);
        } else {
            // Add new HP
            const newHP = {
                class_id: parseInt(selectedClass),
                horizontal_pattern_id: HorizontalPatternID,
                name: data.horizontal_pattern_name,
                description: data.horizontal_pattern_description,
                cover: data.horizontal_pattern_cover,
                occurrence: data.horizontal_pattern_occurrence,
                type: data.horizontal_pattern_type
            };
            addHorizontalPattern([...(horizontalPatterns || []), newHP]);
            LC_HorizontalPatterns.current = [...(horizontalPatterns || []), newHP];
            showHorizontalPattern('Added', newHP);
            setHPID(getNextHPId());
            horizontalPatternNumber.current = getNextHPId();
        }
        
        const nextCount = selectedClass ? getHPsForClass(selectedClass).length : 0;
        reset({
            horizontal_pattern_id: getNextHPId(),
            horizontal_pattern_name: `Horizontal Pattern ${nextCount + 1}`,
            horizontal_pattern_description: 'The class horizontal pattern',
            horizontal_pattern_cover: [0, 100],
            horizontal_pattern_occurrence: [0, 100],
            horizontal_pattern_type: '',
        });
    };

    const editHorizontalPattern = (hp) => {
        setEditingHP(hp.horizontal_pattern_id);
        setValue('horizontal_pattern_name', hp.name);
        setValue('horizontal_pattern_description', hp.description);
        setValue('horizontal_pattern_cover', hp.cover);
        setValue('horizontal_pattern_occurrence', hp.occurrence);
        setValue('horizontal_pattern_type', hp.type);
        setSelectedClass(hp.class_id.toString());
    };

    const cancelEdit = () => {
        setEditingHP(null);
        reset({
            horizontal_pattern_id: HorizontalPatternID,
            horizontal_pattern_name: '',
            horizontal_pattern_description: '',
            horizontal_pattern_cover: [0, 100],
            horizontal_pattern_occurrence: [0, 100],
            horizontal_pattern_type: '',
        });
    };
    // Auto-default the Horizontal Pattern name when class or list changes (and not editing)
    useEffect(() => {
        if (!selectedClass || editingHP) return;
        const count = getHPsForClass(selectedClass).length;
        setValue('horizontal_pattern_name', `Horizontal Pattern ${count + 1}`);
    }, [selectedClass, horizontalPatterns, editingHP, setValue]);


    const getFormErrorMessage = (name: any) => {
        return errors[name] ? <small className="p-error">This field is required</small> : <small className="p-error">&nbsp;</small>;
    };

    const [confirmHPDelete, setConfirmHPDelete] = useState<boolean>(false);
    const HPToDelete = useRef<number>(null);
    
    const promptHPDelete = (HPID) => {
        setConfirmHPDelete(true);
        HPToDelete.current = HPID;
    }
    
    const acceptHPDelete = (HPID) => {
        const hp = horizontalPatterns.find(h => h.horizontal_pattern_id === HPID);
        const HPName = hp?.name;
        deleteHorizontalPattern(HPID);
        toast.current?.show({ severity: 'warn', summary: 'Confirmed', detail: `Horizontal Pattern ${HPName} deleted!`, life: 3000 });
    }
    
    const reject = () => {
        toast.current?.show({ severity: 'info', summary: 'Cancelled', detail: 'Action Cancelled. Please click Back or close the wizard to refresh.', life: 3000 });
    }

    const deleteHorizontalPattern = (HPID) => {
        // Clean up any related strata
        const deletedStrata = LC_Strata.current.filter(stratum => stratum.HPID === HPID);
        deletedStrata.forEach(stratum => {
            // Clean up properties and characteristics
            LC_Properties.current = LC_Properties.current.filter(prop => prop.StratumID !== stratum.stratumID);
            LC_Characteristics.current = LC_Characteristics.current.filter(char => char.StratumID !== stratum.stratumID);
        });
        LC_Strata.current = LC_Strata.current.filter(stratum => stratum.HPID !== HPID);
        
        // Remove the horizontal pattern
        const undeletedHPs = horizontalPatterns.filter(HP => HP.horizontal_pattern_id !== HPID);
        addHorizontalPattern(undeletedHPs);
        LC_HorizontalPatterns.current = undeletedHPs;
        setHPID(getNextHPId());
        horizontalPatternNumber.current = getNextHPId();
        setRerenderTrigger('Deleted Horizontal Pattern' + randomstring.generate(8));
    }

    const processStrata = () => {
        LC_HorizontalPatterns.current = horizontalPatterns;
        
        const classCheck = LC_Class.current?.filter(({ class_id: id1 }) => 
            !horizontalPatterns?.some(({ class_id: id2 }) => id2 === id1)
        );

        if (horizontalPatterns?.length > 0 && classCheck?.length === 0) {
            toast.current.show({ 
                severity: 'success', 
                summary: 'Horizontal Patterns Saved', 
                detail: `Total Horizontal Patterns: ${horizontalPatterns.length}` 
            });
            setTimeout(() => {
                setGuide3Visible(false);
                setGuide4Visible(true);
                setRerenderTrigger('HorizontalPatterns');
            }, 1000);
        } else {
            if (horizontalPatterns?.length === 0) {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: 'At least 1 Horizontal Pattern is required.', 
                    life: 60000 
                });
            }
            if (classCheck?.length > 0) {
                toast.current.show({ 
                    severity: 'error', 
                    summary: 'Horizontal Pattern Error', 
                    detail: `Horizontal Pattern for ${classCheck?.map(clss => clss.class_name).join(', ')} is undefined.`, 
                    life: 60000 
                });
            }
        }
    }

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

    const getHPsForClass = (classId) => {
        return horizontalPatterns.filter(hp => hp.class_id === parseInt(classId));
    };

    return (
        <div className="card flex flex-column justify-content-center gap-1">
            <Toast ref={toast} />
            <ConfirmDialog 
                visible={confirmHPDelete} 
                onHide={() => setConfirmHPDelete(false)} 
                message="Are you sure you want to delete this Horizontal Pattern? This will delete all associated Strata, Elements, Properties and Characteristics." 
                header="Delete Horizontal Pattern Confirmation" 
                icon="pi pi-exclamation-triangle" 
                acceptClassName='p-button-danger' 
                accept={() => acceptHPDelete(HPToDelete.current)} 
                reject={reject} 
            />
            
            <div className="card flex flex-row justify-content-center">
                <Card title="Step 3: Horizontal patterns" className="w-full" style={{ width: '40%', background: '#eee' }}>
                    <div className="m-0">
                        <b>Horizontal Pattern:</b> A horizontal pattern is composed of one or more stratum/strata.<br/>
                        <b>Pattern Occurrence:</b> It describes the probability of the presence of a specific horizontal pattern type.<br/>
                        <b>Pattern Type:</b> a textual description of the pattern.
                    </div>
                    <Divider />
                    <div className="w-full" style={{ maxHeight: '800px', overflow: 'auto' }}>
                        <h3 className="m-0 p-0">Select class:</h3>
                        <Tree 
                            value={clssess} 
                            selectionMode="single" 
                            selectionKeys={selectedClass} 
                            onSelectionChange={(e) => {
                                setSelectedClass(e.value);
                                if (editingHP) cancelEdit();
                                const hpCount = getHPsForClass(e.value).length;
                                reset({
                                    horizontal_pattern_id: HorizontalPatternID,
                                    horizontal_pattern_name: `Horizontal Pattern ${hpCount + 1}`,
                                    horizontal_pattern_description: 'The class horizontal pattern',
                                    horizontal_pattern_cover: [0, 100],
                                    horizontal_pattern_occurrence: [0, 100],
                                    horizontal_pattern_type: ''
                                });
                            }} 
                            togglerTemplate={togglerTemplate} 
                            className=".p-tree-horizontal p-0 m-0 w-full flex-grow text-xs" 
                            style={{ width: '100%' }} 
                        />
                    </div>
                </Card>
                
                <Divider layout="vertical" />
                
                <div className="card align-contents-top w-full" style={{width: '60%' }}>
                        
                    {!selectedClass && (
                        <div className="p-message p-message-warn">
                            <span className="pi pi-exclamation-triangle mr-2"></span>
                            Please select a class from the tree first
                        </div>
                    )}

                    {selectedClass && (
                        <div>
                            <div className="m-0 p-2" style={{ background: '#fff3cd', boxShadow: '0 2px 2px 0 rgba(0,0,0,0.25)', borderRadius: '4px' }}>
                                <h4 className="m-0 p-0">Horizontal patterns {selectedClass ? `for ${LC_Class.current.find(c => c.class_id === parseInt(selectedClass))?.class_name}` : ''}:</h4>
                                {getHPsForClass(selectedClass).map(hp => (
                                    <div key={hp.horizontal_pattern_id} className="flex justify-content-between align-items-center p-1 m-1" style={{ background: '#fff3cd', borderRadius: '4px', height: '20px', fontSize: 'xs' }}>
                                        <span>{hp.name}</span>
                                        <div className="flex gap-1">
                                            <Button 
                                                icon="pi pi-pencil" 
                                                size="small" 
                                                rounded 
                                                text 
                                                onClick={() => editHorizontalPattern(hp)} 
                                            />
                                            <Button 
                                                icon="pi pi-trash" 
                                                size="small" 
                                                rounded 
                                                text 
                                                severity="danger"
                                                onClick={() => promptHPDelete(hp.horizontal_pattern_id)} 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        
                            <Divider />

                            <form onSubmit={handleSubmit(submitHorizontalPattern)} className="flex flex-column gap-1">
                                <h4 className="m-0 p-0">{editingHP ? 'Edit' : 'Add'} horizontal pattern {selectedClass ? `for ${LC_Class.current.find(c => c.class_id === parseInt(selectedClass))?.class_name}` : ''}</h4>
                                <div className="w-full justify-content-center p-0 m-0">
                                    <Controller
                                        name="horizontal_pattern_id"
                                        control={control}
                                        render={({ field }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={editingHP || HorizontalPatternID} />
                                        )}
                                    />
                                    
                                    <Controller
                                        name="horizontal_pattern_name"
                                        control={control}
                                        rules={{ required: 'Name is required.' }}
                                        defaultValue={"Horizontal Pattern "+(getHPsForClass(selectedClass).length+1)}
                                        render={({ field }) => (
                                            <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                                <span className="p-inputgroup-addon text-s p-0 m-0">
                                                    <i className="pi pi-pencil"></i>
                                                </span>
                                                <span className="p-float-label w-full">
                                                    <InputText 
                                                        id={field.name} 
                                                        name={field.name} 
                                                        value={field.value} 
                                                        autoFocus 
                                                        className="p-inputtext-sm text-s p-2 m-0" 
                                                        onChange={(e) => field.onChange(e.target.value)} 
                                                        style={{ width: '100%'}} 
                                                        readOnly={true}
                                                    />
                                                    <label htmlFor={field.name}>Horizontal pattern name</label>
                                                </span>
                                                {getFormErrorMessage(field.name)}
                                            </div>
                                        )}
                                    />
                                    
                                    <Controller
                                        name="horizontal_pattern_description"
                                        control={control}
                                        rules={{ required: 'Description is required.' }}
                                        defaultValue="The class horizontal pattern"
                                        render={({ field }) => (
                                            <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                                <span className="p-inputgroup-addon text-s p-0 m-0">
                                                    <i className="pi pi-pencil"></i>
                                                </span>
                                                <span className="p-float-label w-full">
                                                    <InputText 
                                                        id={field.name} 
                                                        name={field.name} 
                                                        value={field.value} 
                                                        className="p-inputtext-sm text-s p-2 m-0" 
                                                        onChange={(e) => field.onChange(e.target.value)} 
                                                        style={{ width: '100%'}} 
                                                    />
                                                    <label htmlFor={field.name}>Description</label>
                                                </span>
                                                {getFormErrorMessage(field.name)}
                                            </div>
                                        )}
                                    />
                                    
                                    <Controller
                                        name="horizontal_pattern_cover"
                                        control={control}
                                        rules={{ required: 'Cover is required.' }}
                                        render={({ field }) => (
                                            <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                                <span className="p-inputgroup-addon text-xs p-2 m-0">Cover:</span>
                                                <div className="card flex flex-column w-full gap-0">
                                                    <Slider 
                                                        id={field.name} 
                                                        name={field.name} 
                                                        value={field.value as [number,number]} 
                                                        onChange={(e: SliderChangeEvent) => { 
                                                            field.onChange(validateRange([e.value[0], e.value[1]], [returnBounds("Percentage").min, returnBounds("Percentage").max])); 
                                                        }} 
                                                        className="text-xs p-0 m-0" 
                                                        range 
                                                        style={{width: '100%', alignSelf: 'center', verticalAlign: 'middle'}} 
                                                        min={returnBounds("Percentage").min} 
                                                        max={returnBounds("Percentage").max} 
                                                    />
                                                    <div className="flex flex-row align-content-center justify-content-center p-0 m-0 gap-2" style={{ width: '100px', alignSelf: 'center', verticalAlign: 'middle' }}>
                                                        <input 
                                                            name={"L"+field.name} 
                                                            type="number" 
                                                            value={field.value[0]} 
                                                            className="text-xs p-0 m-0" 
                                                            onChange={(e) => { 
                                                                const newValue = validateRange([Number(e.target.value), field.value[1]], [returnBounds("Percentage").min, returnBounds("Percentage").max]); 
                                                                field.onChange(newValue); 
                                                            }} 
                                                            min={returnBounds("Percentage").min} 
                                                            max={returnBounds("Percentage").max} 
                                                        /> 
                                                        - 
                                                        <input 
                                                            name={"U"+field.name} 
                                                            type="number" 
                                                            value={field.value[1]} 
                                                            className="text-xs p-0 m-0" 
                                                            onChange={(e) => { 
                                                                const newValue = validateRange([field.value[0], Number(e.target.value)], [returnBounds("Percentage").min, returnBounds("Percentage").max]); 
                                                                field.onChange(newValue); 
                                                            }} 
                                                            min={returnBounds("Percentage").min} 
                                                            max={returnBounds("Percentage").max} 
                                                        />
                                                    </div>
                                                </div>
                                                <span className="p-inputgroup-addon text-xs p-2 m-0">%</span>
                                                {getFormErrorMessage(field.name)}
                                            </div>
                                        )}
                                    />
                                    
                                    <Controller
                                        name="horizontal_pattern_occurrence"
                                        control={control}
                                        rules={{ required: 'Occurrence is required.' }}
                                        render={({ field }) => (
                                            <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                                <span className="p-inputgroup-addon text-xs p-2 pr-4 pl-4 m-0">Occurrence:</span>
                                                <div className="card flex flex-column w-full gap-0">
                                                    <Slider 
                                                        id={field.name} 
                                                        name={field.name} 
                                                        value={field.value as [number,number]} 
                                                        onChange={(e: SliderChangeEvent) => { 
                                                            field.onChange(validateRange([e.value[0], e.value[1]], [returnBounds("Percentage").min, returnBounds("Percentage").max])); 
                                                        }} 
                                                        className="text-xs p-0 m-0" 
                                                        range 
                                                        style={{width: '100%', alignSelf: 'center', verticalAlign: 'middle'}} 
                                                        min={returnBounds("Percentage").min} 
                                                        max={returnBounds("Percentage").max} 
                                                    />
                                                    <div className="flex flex-row align-content-center justify-content-center p-0 m-0 gap-2" style={{ width: '100px', alignSelf: 'center', verticalAlign: 'middle' }}>
                                                        <input 
                                                            name={"L"+field.name} 
                                                            type="number" 
                                                            value={field.value[0]} 
                                                            className="text-xs p-0 m-0" 
                                                            onChange={(e) => { 
                                                                const newValue = validateRange([Number(e.target.value), field.value[1]], [returnBounds("Percentage").min, returnBounds("Percentage").max]); 
                                                                field.onChange(newValue); 
                                                            }} 
                                                            min={returnBounds("Percentage").min} 
                                                            max={returnBounds("Percentage").max} 
                                                        /> 
                                                        - 
                                                        <input 
                                                            name={"U"+field.name} 
                                                            type="number" 
                                                            value={field.value[1]} 
                                                            className="text-xs p-0 m-0" 
                                                            onChange={(e) => { 
                                                                const newValue = validateRange([field.value[0], Number(e.target.value)], [returnBounds("Percentage").min, returnBounds("Percentage").max]); 
                                                                field.onChange(newValue); 
                                                            }} 
                                                            min={returnBounds("Percentage").min} 
                                                            max={returnBounds("Percentage").max} 
                                                        />
                                                    </div>
                                                </div>
                                                <span className="p-inputgroup-addon text-xs p-2 m-0">%</span>
                                                {getFormErrorMessage(field.name)}
                                            </div>
                                        )}
                                    />
                                    
                                    <Controller
                                        name="horizontal_pattern_type"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                                <span className="p-inputgroup-addon text-s p-0 m-0">
                                                    <i className="pi pi-pencil"></i>
                                                </span>
                                                <span className="p-float-label w-full">
                                                    <InputText 
                                                        id={field.name} 
                                                        name={field.name} 
                                                        value={field.value} 
                                                        className="p-inputtext-sm text-s p-2 m-0" 
                                                        onChange={(e) => field.onChange(e.target.value)} 
                                                        style={{ width: '100%' }} 
                                                    />
                                                    <label htmlFor={field.name}>Pattern Type</label>
                                                </span>
                                                {getFormErrorMessage(field.name)}
                                            </div>
                                        )}
                                    />
                                </div>
                                
                                <div className="card flex gap-2" style={{ textAlign: 'right' }}>
                                    {editingHP && (
                                        <Button 
                                            label="Cancel Edit" 
                                            icon="pi pi-times" 
                                            onClick={cancelEdit} 
                                            size="small" 
                                            severity="secondary"
                                        />
                                    )}
                                    <Button 
                                        label={editingHP ? "Update Horizontal Pattern" : "Add Horizontal Pattern"} 
                                        icon={editingHP ? "pi pi-check" : "pi pi-save"} 
                                        type="submit" 
                                        size="small" 
                                        iconPos="right" 
                                        style={{ backgroundColor: 'var(--green-100)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }} 
                                        disabled={!selectedClass}
                                    />
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="card" style={{ textAlign: 'right' }}>
                <Button 
                    label="Back" 
                    icon="pi pi-arrow-left" 
                    onClick={() => {
                        setGuide2Visible(true); 
                        setGuide3Visible(false);
                        setRerenderTrigger('HorizontalPatterns');
                    }} 
                    text 
                    size="small" 
                />
                <Button 
                    label="Next" 
                    icon="pi pi-arrow-right" 
                    onClick={() => processStrata()} 
                    size="small" 
                    iconPos="right" 
                    className="align-self-end" 
                />
            </div>
        </div>
    )
}