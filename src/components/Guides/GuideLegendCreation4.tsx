import React, { useState, useRef, useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Button } from "primereact/button";
import { Controller, useForm } from 'react-hook-form';
import { Toast,ToastMessage } from 'primereact/toast';
import { Slider, SliderChangeEvent } from "primereact/slider";
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Tree, TreeTogglerTemplateOptions } from 'primereact/tree';
import { TreeNode } from 'primereact/treenode';
import { classNames } from 'primereact/utils';

import "./tabview.css";
import '../../css/TreeView.css';

export const GuideLegendCreation4 = (props: any) => {
    const {
        setRerenderTrigger,
        setGuide3Visible,
        setGuide4Visible,
        setGuide5Visible,
        LC_Class,
        LC_HorizontalPatterns,
        LC_Strata,
        strataNumber,
        getNextStratumId,
        LC_Properties,
        LC_Characteristics,
        OptionsBus,
        validateRange
    } = props;

    strataNumber.current = getNextStratumId();

    const [selectedHP, setSelectedHP] = useState<number | null>(null);
    const [strata, setStrata] = useState(LC_Strata.current);
    const [StratumID, setStratumID] = useState(getNextStratumId());
    const [editingStratum, setEditingStratum] = useState<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const stratumToDelete = useRef<number | null>(null);
    const toast = useRef<Toast>(null);

    const bounds = [{ type: "Percentage", min: 0, max: 100 }];
    const returnBounds = (searchType: string) => bounds.find((type) => type.type === searchType);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
        setValue
    } = useForm({});

    const showToast = (
        severity: ToastMessage['severity'],
        summary: string,
        detail: string
    ) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const getFormErrorMessage = (name: string) => {
        return errors[name] ? <small className="p-error">This field is required</small> : <small className="p-error">&nbsp;</small>;
    };

    const submitStratum = (data: any, event: any) => {
        event.preventDefault();
        if (!selectedHP) {
            showToast('error', 'Error', 'Please select a Horizontal Pattern from the tree.');
            return;
        }

        if (editingStratum !== null) {
            const updated = strata.map(str =>
                str.stratumID === editingStratum
                    ? {
                        ...str,
                        name: data.stratum_name,
                        description: data.stratum_description,
                        presenceType: data.stratum_presenceType.label,
                        portioning: data.stratum_portioning,
                        onTop: (strata.find((s:any)=> s.stratumID === data.stratum_onTop)?.name) || '',
                        onTopID: data.stratum_onTop ?? undefined,
                        onTopType: data.stratum_onTopType?.label || ''
                    }
                    : str
            );
            setStrata(updated);
            LC_Strata.current = updated;
            setEditingStratum(null);
            showToast('success', 'Stratum Updated', `Stratum ${data.stratum_name} updated successfully.`);
        } else {
            const newStratum = {
                HPID: selectedHP,
                stratumID: StratumID,
                name: data.stratum_name,
                description: data.stratum_description,
                presenceType: data.stratum_presenceType.label,
                portioning: data.stratum_portioning,
                onTop: (strata.find((s:any)=> s.stratumID === data.stratum_onTop)?.name) || '',
                        onTopID: data.stratum_onTop ?? undefined,
                onTopType: data.stratum_onTopType?.label || ''
            };
            const updatedStrata = [...(strata || []), newStratum];
            setStrata(updatedStrata);
            LC_Strata.current = updatedStrata;
            strataNumber.current = getNextStratumId();
            setStratumID(getNextStratumId());
            showToast('success', 'Stratum Added', `Stratum ${data.stratum_name} added successfully.`);
        }
        const nextCount = selectedHP ? getStrataForHP(selectedHP).length : strata.length;
        reset({
            stratum_name: `Stratum ${nextCount + 1}`,
            stratum_description: 'A layer in the Horizontal Pattern',
            stratum_presenceType: OptionsBus['PresenceTypes'][0],
            stratum_portioning: [returnBounds('Percentage')?.min, returnBounds('Percentage')?.max],
            stratum_onTop: undefined,
            stratum_onTopType: undefined
        });
    };

    const editStratum = (stratum: any) => {
        setEditingStratum(stratum.stratumID);
        setValue('stratum_name', stratum.name);
        setValue('stratum_description', stratum.description);
        setValue('stratum_presenceType', { label: stratum.presenceType });
        setValue('stratum_portioning', stratum.portioning);
        setValue('stratum_onTop', (typeof stratum.onTopID !== 'undefined' ? stratum.onTopID : (strata.find((s:any)=> s.name === stratum.onTop)?.stratumID)));
        setValue('stratum_onTopType', { label: stratum.onTopType });
    };

    const cancelEdit = () => {
        setEditingStratum(null);
        reset();
    };

    const promptDelete = (id: number) => {
        stratumToDelete.current = id;
        setConfirmDelete(true);
    };

    const acceptDelete = () => {
        const id = stratumToDelete.current;
        if (id === null) return;
        const stratum = strata.find(s => s.stratumID === id);
        const undeleted = strata.filter(s => s.stratumID !== id);
        setStrata(undeleted);
        LC_Strata.current = undeleted;
        LC_Properties.current = LC_Properties.current.filter(p => p.StratumID !== id);
        LC_Characteristics.current = LC_Characteristics.current.filter(c => c.StratumID !== id);
        strataNumber.current = getNextStratumId();
        setStratumID(getNextStratumId());
        showToast('warn', 'Deleted', `Stratum ${stratum?.name || ''} deleted.`);
        setConfirmDelete(false);
    };

    const rejectDelete = () => {
        setConfirmDelete(false);
        showToast('info', 'Cancelled', 'Action cancelled.');
    };

    const processStrata = () => {
        LC_Strata.current = strata;
        const missingHPs = LC_HorizontalPatterns.current?.filter(({ horizontal_pattern_id: id1 }) =>
            !strata?.some(({ HPID: id2 }) => id2 === id1)
        );
        if (strata?.length > 0 && (!missingHPs || missingHPs.length === 0)) {
            showToast('success', 'Strata Saved', `Total Strata: ${strata.length}`);
            setTimeout(() => {
                setGuide4Visible(false);
                setGuide5Visible(true);
                setRerenderTrigger('Strata');
            }, 1000);
        } else {
            if (strata?.length === 0) {
                showToast('error', 'Error', 'At least 1 Stratum is required.');
            }
            if (missingHPs?.length > 0) {
                showToast('error', 'Missing Strata', `Strata for ${missingHPs.map(hp => hp.name).join(', ')} are undefined.`);
            }
        }
    };

    const togglerTemplate = (node: TreeNode, options: TreeTogglerTemplateOptions) => {
        if (!node) return;
        const expanded = options.expanded;
        const iconClassName = classNames('text-xs p-0 m-0 p-tree-toggler-icon pi pi-fw', {
            'pi-caret-right': !expanded,
            'pi-caret-down': expanded
        });
        return (
            <button type="button" className="text-xs p-0 m-0 p-tree-toggler p-link" tabIndex={-1} onClick={options.onClick}>
                <span className={iconClassName} aria-hidden="true"></span>
            </button>
        );
    };

    const treeData: TreeNode[] = LC_Class.current.map((clss) => {
        const hps = LC_HorizontalPatterns.current.filter((hp) => hp.class_id === clss.class_id);
        return {
            key: `class-${clss.class_id}`,
            label: clss.class_name,
            icon: 'pi pi-folder-open',
            children: hps.map((hp) => ({
                key: `hp-${hp.horizontal_pattern_id}`,
                label: hp.name,
                icon: 'pi pi-minus'
            }))
        };
    });

    // Build expandedKeys so that all class and HP nodes are expanded by default
    const initialExpandedKeys: Record<string, boolean> = {};
    try {
        LC_Class.current.forEach((clss: any) => {
            initialExpandedKeys[`class-${clss.class_id}`] = true;
            const hps = LC_HorizontalPatterns.current.filter(
                (hp: any) => hp.class_id === clss.class_id
            );
            hps.forEach((hp: any) => {
                initialExpandedKeys[`hp-${hp.horizontal_pattern_id}`] = true;
            });
        });
    } catch {}

    const [expandedElements, setExpandedElements] = useState(initialExpandedKeys);

    const onTreeSelect = (e: any) => {
        const nodeKey = e.node.key;
        if (nodeKey.startsWith('hp-')) {
            const hpID = parseInt(nodeKey.split('-')[1]);
            setSelectedHP(hpID);
            setEditingStratum(null);
            {
                const count = getStrataForHP(hpID).length;
                reset({
                    stratum_name: `Stratum ${count + 1}`,
                    stratum_description: 'A layer in the Horizontal Pattern',
                    stratum_presenceType: OptionsBus['PresenceTypes'][0],
                    stratum_portioning: [returnBounds('Percentage')?.min, returnBounds('Percentage')?.max],
                    stratum_onTop: undefined,
                    stratum_onTopType: undefined
                });
            }
        } else {
            setSelectedHP(null);
        }
    };

    const getStrataForHP = (hpID: number) => strata.filter(stratum => stratum.HPID === hpID);

    // Returns all other strata (within the selected HP if present) excluding the given stratumID,
    // and appends a composite displayName: "Class X / Horizontal Pattern Y / Stratum Z"
    const getAllOtherStrata = (strID: number | null) => {
        const pool = selectedHP ? getStrataForHP(selectedHP) : (strata || []);
        const others = pool.filter((s: any) => s.stratumID !== strID);
        return others.map((s: any) => {
            const hp  = LC_HorizontalPatterns.current.find((h: any) => h.horizontal_pattern_id === s.HPID);
            const cls = LC_Class.current.find((c: any) => c.class_id === (hp?.class_id));
            const classLabel   = cls?.class_name || `Class ${cls?.class_id ?? "?"}`;
            const hpLabel      = hp?.name || `Horizontal Pattern ${hp?.horizontal_pattern_id ?? "?"}`;
            const stratumLabel = s.name || `Stratum ${s.stratumID}`;
            return { ...s, displayName: `${classLabel} / ${hpLabel} / ${stratumLabel}` };
        });
    };
       
    // Auto-default the Stratum name when HP or strata changes (and not editing)
    useEffect(() => {
        if (!selectedHP || editingStratum) return;
        const count = getStrataForHP(selectedHP).length;
        setValue('stratum_name', `Stratum ${count + 1}`);
    }, [selectedHP, strata, editingStratum, setValue]);


    return (
        <div className="card flex flex-column justify-content-center gap-1">
            <Toast ref={toast} />
            <ConfirmDialog visible={confirmDelete} onHide={() => setConfirmDelete(false)} message="Are you sure you want to delete this Stratum?" header="Delete Stratum Confirmation" icon="pi pi-exclamation-triangle" acceptClassName='p-button-danger' accept={acceptDelete} reject={rejectDelete} />

            <div className="card flex flex-row justify-content-center">
                <Card title="Step 4: Strata" className="w-full" style={{ width: '40%', background: '#eee' }}>
                    <div className="m-0">
                        <b>Stratum:</b> Represents a grouping of basic elements (Vegetated and/or Abiotic).<br />
                        <b>Presence Type:</b> Fixed or conditional presence of a stratum.<br />
                        <b>Portioning:</b> Defines element percentage within an area when multiple elements coexist.
                    </div>
                    <Divider />
                    <h3 className="m-0 p-0">Select Horizontal Pattern:</h3>
                    <Tree
                        value={treeData}
                        selectionMode="single"
                        onSelect={onTreeSelect}
                        togglerTemplate={togglerTemplate}
                        className="p-0 m-0 w-full flex-grow text-xs"
                        style={{ width: '100%' }}
                        expandedKeys={expandedElements}
                    />
                </Card>

                <Divider layout="vertical" />

                <div className="card align-contents-top w-full" style={{ width: '60%' }}>

                    {!selectedHP && (
                        <div className="p-message p-message-warn">
                            <span className="pi pi-exclamation-triangle mr-2"></span>
                            Please select a horizontal pattern from the tree to manage its strata.
                        </div>
                    )}

                    {selectedHP && (
                        <div>
                            <div className="m-0 p-2" style={{  background: '#fff3cd', boxShadow: '0 2px 2px 0 rgba(0,0,0,0.25)', borderRadius: '4px' }}>
                                <h4 className="m-0 p-0">Strata {selectedHP ? `for ${LC_Class.current.find(c => c.class_id === LC_HorizontalPatterns.current.find(h => h.horizontal_pattern_id === selectedHP)?.class_id)?.class_name} / ${LC_HorizontalPatterns.current.find(h => h.horizontal_pattern_id === selectedHP)?.name}` : ''}:</h4>

                                <div className="card flex flex-column gap-1">
                                    {getStrataForHP(selectedHP).map((s) => (
                                        <div key={s.stratumID} className="flex justify-content-between align-items-center p-1 m-1" style={{ background: '#fff3cd', borderRadius: '4px', height: '20px', fontSize: 'xs' }}>
                                            <span>{s.name}</span>
                                            <div className="flex gap-1">
                                                <Button icon="pi pi-pencil" size="small" rounded text onClick={() => editStratum(s)} />
                                                <Button icon="pi pi-trash" size="small" rounded text severity="danger" onClick={() => promptDelete(s.stratumID)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                            </div>

                            <Divider />

                            <h4 className="m-0 p-0">{editingStratum ? 'Edit' : 'Add'} Stratum for {LC_Class.current.find(c => c.class_id === LC_HorizontalPatterns.current.find(h => h.horizontal_pattern_id === selectedHP)?.class_id)?.class_name} / {LC_HorizontalPatterns.current.find(h => h.horizontal_pattern_id === selectedHP)?.name}</h4>                            

                            {/* === Stratum Management Form === */}
                            <form onSubmit={handleSubmit(submitStratum)} className="flex flex-column gap-1 m-0">

                                {/* Stratum Name */}
                                <Controller
                                    name="stratum_name"
                                    control={control}                                    
                                    rules={{ required: 'Name is required.' }}
                                    defaultValue={"Stratum "+(getStrataForHP(selectedHP).length+1)}
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
                                                <label htmlFor={field.name}>Stratum name</label>
                                            </span>
                                            {getFormErrorMessage(field.name)}
                                        </div>
                                    )}
                                />
                                
                                {/* Description */}
                                <Controller
                                    name="stratum_description"
                                    control={control}
                                    rules={{ required: 'Description is required.' }}
                                    defaultValue="A layer in the Horizontal Pattern"
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
                                
                                {/* Presence Type */}
                                <Controller
                                    name="stratum_presenceType"
                                    control={control}
                                    defaultValue={OptionsBus['PresenceTypes'][0]}
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                            <span className="p-inputgroup-addon text-s p-0 m-0">
                                                <i className="pi pi-pencil"></i>
                                            </span>
                                            <span className="p-float-label w-full">
                                                <Dropdown {...field} options={OptionsBus['PresenceTypes']} optionLabel="label"
                                                    placeholder="Select Presence Type" className="p-inputtext-sm w-full" />
                                                <label htmlFor={field.name}>Presence Type</label>
                                            </span>
                                            {getFormErrorMessage(field.name)}
                                        </div>
                                    )}
                                />
                                
                                {/* Portioning (Range Slider) */}
                                <Controller
                                    name="stratum_portioning"
                                    control={control}
                                    defaultValue={[returnBounds("Percentage")?.min, returnBounds("Percentage")?.max]}
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                            <span className="p-inputgroup-addon text-xs p-2 pr-4 pl-4 m-0">Portioning:</span>
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

                                {/* On Top / On Top Type */}
                                
                                <Controller
                                    name="stratum_onTop"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                            <span className="p-inputgroup-addon text-s p-0 m-0">
                                                <i className="pi pi-pencil"></i>
                                            </span>
                                            <span className="p-float-label w-full"><Dropdown id="stratum_onTop" {...field} options={getAllOtherStrata(editingStratum)} optionLabel="displayName" optionValue="stratumID" placeholder="Select On Top Stratum" className="p-inputtext-sm w-full" />
                                                <label htmlFor={field.name}>On Top</label>
                                            </span>
                                        </div>
                                    )}
                                />
                                <Controller
                                    name="stratum_onTopType"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                            <span className="p-inputgroup-addon text-s p-0 m-0">
                                                <i className="pi pi-pencil"></i>
                                            </span>
                                            <span className="p-float-label w-full">
                                                <Dropdown {...field} options={OptionsBus['OnTopTypes']} optionLabel="label"
                                                    placeholder="Select On Top Type" className="p-inputtext-sm w-full" />
                                                <label htmlFor={field.name}>On Top Type</label>
                                            </span>
                                        </div>
                                    )}
                                />

                                {/* Buttons */}
                                <div className="card flex gap-2" style={{ textAlign: 'right' }}>
                                    {editingStratum && (
                                        <Button 
                                            label="Cancel Edit" 
                                            icon="pi pi-times" 
                                            onClick={cancelEdit} 
                                            size="small" 
                                            severity="secondary"
                                        />
                                    )}
                                    <Button
                                        label={editingStratum ? 'Update Stratum' : 'Add Stratum'}
                                        icon="pi pi-save"
                                        type="submit"
                                        size="small"
                                        iconPos="right"
                                        style={{ backgroundColor: 'var(--green-100)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }}
                                        disabled={!selectedHP}
                                    />
                                </div>
                            </form>
                            {/* === End Form === */}

                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ textAlign: 'right' }}>
                <Button label="Back" icon="pi pi-arrow-left" onClick={() => { setGuide3Visible(true); setGuide4Visible(false); setRerenderTrigger('Strata'); }} text size="small" />
                <Button label="Next" icon="pi pi-arrow-right" onClick={() => processStrata()} size="small" iconPos="right" className="align-self-end" />
            </div>
        </div>
    );
};
