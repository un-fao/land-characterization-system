import React, { useState, useRef, useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Button } from "primereact/button";
import { Controller } from 'react-hook-form';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { ColorPicker } from 'primereact/colorpicker';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { ConfirmDialog } from "primereact/confirmdialog";
import randomstring from "randomstring";

export const GuideLegendCreation2 = (props: any) => {
    const {
        UUID,
        legend,
        classCharacteristics,
        setRerenderTrigger,
        setGuide1Visible,
        setGuide2Visible,
        setGuide3Visible,
        LC_Legend,
        LC_Class,
        classesNumber,
        getNextClassId,
        LC_ClassCharacteristics,
        LC_HorizontalPatterns,
        LC_Strata,
        horizontalPatternNumber,
        strataNumber,
        LC_Properties,
        stratumPropertyNumber,
        LC_Characteristics,
        stratumCharacteristicNumber,
        displayFormElements,
        control,
        errors,
        register,
        handleSubmit,
        getValues,
        setValue,
        watch,
        reset,
        searchObjKeyVal,
        OptionsBus
    } = props;

    const toast = useRef<Toast | null>(null);

    classesNumber.current = getNextClassId();

    const class_id = useRef(getNextClassId());
    const class_name = useRef<string>('Class ' + (LC_Class.current?.length ? LC_Class.current.length + 1 : 1));
    const class_map_code = useRef<string>('LCC' + (LC_Class.current?.length ? LC_Class.current.length + 1 : 1));
    const class_description = useRef<string>('The land characterisation class');
    const class_color_code = useRef<string>('FFFFFF');
    let classes = LC_Class.current;
    const [displayClasses, setClasses] = useState(classes);

    const onSubmit = (data: any, event: any) => {
        event.preventDefault();
        let class_id = parseInt((document.getElementById("class_id" + event.target.id) as HTMLInputElement).value);
        classes.splice(event.target.id, 1, {
            legend_id: parseInt((document.getElementById("legend_id" + event.target.id) as HTMLInputElement).value),
            class_id: class_id,
            class_name: (document.getElementById("class_name" + event.target.id) as HTMLInputElement).value,
            class_description: (document.getElementById("class_description" + event.target.id) as HTMLInputElement).value,
            class_map_code: (document.getElementById("class_map_code" + event.target.id) as HTMLInputElement).value,
            class_color_code: (document.getElementById("class_color_code" + event.target.id) as HTMLInputElement).value
        });

        let formValues: any = {};
        Object.keys(control._fields).map((field) => {
            if (control._fields[field]['_f']['mount'])
                formValues = { ...formValues, [field]: control._fields[field]['_f']['value'] };
        });
        let CharNames: any[] = [];
        let Charact: any = {};
        Object.entries(formValues).forEach((tab: any) => {
            if (tab[0].indexOf("-") > -1) {
                let IDlength = (document.getElementById("class_id" + event.target.id) as HTMLInputElement).value.length * -1;
                tab[0] = (tab[0] as string).slice(0, IDlength);
                LC_ClassCharacteristics.current[class_id] = null;
                let fieldName = (tab[0] as string).split('-');
                CharNames.push(fieldName[0]);
                let unique = new Set(CharNames);
                unique.forEach((Char: any) => {
                    if (fieldName[0] === Char) {
                        if (typeof (tab[1]) === "object") {
                            if (tab[1]['label'] !== undefined)
                                Charact = { ...Charact, [Char]: { ...Charact[Char], [tab[0]]: tab[1]['label'] } };
                            else
                                Charact = { ...Charact, [Char]: { ...Charact[Char], [tab[0]]: tab[1] } };
                        }
                        else
                            Charact = { ...Charact, [Char]: { ...Charact[Char], [tab[0]]: tab[1] } };
                    }
                });
                LC_ClassCharacteristics.current[class_id] = Charact;
            }
        });
        toast.current?.show({ severity: 'success', summary: 'Class saved', detail: (document.getElementById("class_name" + event.target.id) as HTMLInputElement).value + " saved successfully." });
    };

    const getFormErrorMessage = (name: any) => {
        return errors[name] ? <small className="p-error">{errors[name].message}</small> : <small className="p-error">&nbsp;</small>;
    };

    let Characteristics = Object.entries(classCharacteristics.current);
    let Tabs: any = {};
    let resetter: any[] = [];
    const resets = useRef<any>();
    displayClasses.map((clss: any, index: number) => {
        let SubTabs: any[] = [];
        Characteristics.map((characteristics: any) => {
            let tabelements: any[] = [];
            tabelements.push(displayFormElements(characteristics[1]["elements"], index));
            let tab = <TabPanel header={characteristics[1]['characteristic_label']} leftIcon={characteristics[1]['characteristic_icon']} className="card flex flex-column overflow-hidden" style={{ height: 'fit-content' }} >
                <p className="p-inputtext-sm text-s justify-content-center" style={{ backgroundColor: 'var(--highlight-bg)' }}><b><i className="pi pi-info-circle" style={{ color: 'slateblue' }}></i><u style={{ textAlign: "center" }}>{characteristics[1]['characteristic_description']}</u></b></p>
                {tabelements}
            </TabPanel>;
            SubTabs.push(tab);
            characteristics[1]["elements"].map((element: any) => {
                if (LC_ClassCharacteristics.current[clss.class_id] !== undefined && Object.keys(LC_ClassCharacteristics.current[clss.class_id]).length !== undefined && LC_ClassCharacteristics.current[clss.class_id][characteristics[1]['characteristic_name']] !== undefined) {
                    let prevValue = LC_ClassCharacteristics.current[clss.class_id][characteristics[1]['characteristic_name']][element['element_name']];
                    if (typeof (prevValue) === "undefined" || prevValue === null || prevValue === "")
                        resetter.push('setValue("' + element['element_name'] + index + '", "")');
                    else if (typeof (prevValue) === "object")
                        resetter.push('setValue("' + element['element_name'] + index + '", [' + prevValue[0] + ',' + prevValue[1] + '])');
                    else if (typeof (prevValue) === "number")
                        resetter.push('setValue("' + element['element_name'] + index + '", ' + prevValue + ')');
                    else
                        resetter.push('setValue("' + element['element_name'] + index + '", "' + prevValue + '")');
                }
            });
            resets.current = resetter;
        });
        Tabs = { ...Tabs, [index]: SubTabs };
    });

    const formReset = () => {
        resets.current?.map((formElement: any) => {
            // eslint-disable-next-line no-eval
            eval(formElement);
        });
    }

    const [confirmClassDelete, setConfirmClassDelete] = useState<boolean>(false);
    const ClassToDelete = useRef<number | null>(null);
    const promptClassDelete = (index: number) => {
        setConfirmClassDelete(true);
        ClassToDelete.current = index;
    }
    const acceptClassDelete = (index: number | null) => {
        if (index == null) return;
        let ClassName = displayClasses[index].class_name;
        deleteClass(index);
        toast.current?.show({ severity: 'warn', summary: 'Confirmed', detail: 'Class ' + ClassName + ' deleted!', life: 3000 });
    }
    const reject = () => {
        toast.current?.show({ severity: 'info', summary: 'Cancelled', detail: 'Action Cancelled.', life: 3000 });
    }

    const deleteClass = (index: number) => {
        let class_id = displayClasses[index]['class_id'];
        let filterd_CXteristics: any = {};
        Object.entries(LC_ClassCharacteristics.current).forEach((CChr: any) => {
            if (parseInt(CChr[0]) !== class_id)
                filterd_CXteristics = { ...filterd_CXteristics, [CChr[0]]: CChr[1] };
        });
        let filterd_classes: any[] = [];
        Object.entries(displayClasses).forEach((clss: any) => {
            if (parseInt(clss[0]) !== index)
                filterd_classes.push(clss[1]);
        });
        LC_Class.current = filterd_classes;
        LC_ClassCharacteristics.current = filterd_CXteristics;
        setClasses(filterd_classes);
        classes = LC_Class.current;

        let deletd_HPs = LC_HorizontalPatterns.current.filter((HPs: any) => HPs.class_id === class_id);
        if (deletd_HPs !== undefined) {
            deletd_HPs.map((deletd_HP: any) => {
                deleteHorizontalPattern(deletd_HP.horizontal_pattern_id);
            });
        }
        classesNumber.current = getNextClassId();
        setRerenderTrigger('Deleted Class' + LC_Class.current.length + randomstring.generate(8));
    }
    const deleteHorizontalPattern = (HPID: any) => {
        let deletd_strata = LC_Strata.current.filter((stratum: any) => stratum.HPID === HPID);
        if (deletd_strata !== undefined) {
            deletd_strata.map((deletd_stratum: any) => {
                deleteStratum(deletd_stratum.stratumID);
            });
        }
        let undeletd_HPs = LC_HorizontalPatterns.current.filter((HP: any) => HP.horizontal_pattern_id !== HPID);
        LC_HorizontalPatterns.current = [...(undeletd_HPs || [])];
        horizontalPatternNumber.current = horizontalPatternNumber.current + 1;
        setRerenderTrigger('Deleted Horizontal Pattern' + horizontalPatternNumber.current + randomstring.generate(8));
    }
    const deleteStratum = (StratumID: any) => {
        let undeletd_properties = LC_Properties.current.filter((properties: any) => properties.StratumID !== StratumID);
        if (undeletd_properties !== undefined) {
            LC_Properties.current = [...(undeletd_properties || [])];
            stratumPropertyNumber.current = undeletd_properties.length + 1;
        }
        let undeletd_characteristics = LC_Characteristics.current.filter((characteristics: any) => characteristics.StratumID !== StratumID);
        if (undeletd_characteristics !== undefined) {
            LC_Characteristics.current = [...(undeletd_characteristics || [])];
            stratumCharacteristicNumber.current = undeletd_characteristics.length + 1;
        }
        let undeletd_strata = LC_Strata.current.filter((stratum: any) => stratum.stratumID !== StratumID);
        LC_Strata.current = [...(undeletd_strata || [])];
        strataNumber.current = strataNumber.current + 1;
        setRerenderTrigger('Deleted Strata' + strataNumber.current + randomstring.generate(8));
    }

    const addClass = () => {
        classesNumber.current = getNextClassId();
        LC_Class.current = [...LC_Class.current, { legend_id: LC_Legend.current.id, class_id: classesNumber.current, class_name: 'Class ' + classesNumber.current, class_description: 'The land characterization class', class_map_code: 'LCR' + classesNumber.current, class_color_code: '00FF00' }];
        classes = LC_Class.current;
        setClasses(classes);
        toast.current?.show({ severity: 'success', summary: 'Class added', detail: classesNumber.current + "Class added successfully." });
        setRerenderTrigger('Added Class' + classesNumber.current + randomstring.generate(8));
    }

    const submitAllForms = () => {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            // @ts-ignore
            form.requestSubmit();
        });
    };

    const createDynamicTabs = () => {
        return displayClasses.map((tab: any, index: number) => {
            return (
                <AccordionTab key={tab.class_id} header={'Class ' + (index + 1) + ' - ' + tab.class_name}>
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-column gap-1" id={index as any}>
                        <div className="card flex flex-row justify-content-center">
                            <Card title="Step 2: Class definition" subTitle="Input land cover class definition" className="w-full" style={{ width: '50%', background: '#eee' }}>
                                <p className="m-0">
                                    Define the land cover class and characteristics: climate, land form, geographical aspects, topographical aspects and surface characteristics
                                </p>
                            </Card>
                            <Divider layout="vertical" />
                            <div className="card align-contents-top w-full">
                                <div className="w-full card justify-content-center gap-3" style={{ width: '50%' }}>
                                    <Controller
                                        name={"legend_id" + index}
                                        control={control}
                                        defaultValue={LC_Legend.current.id}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={field.value} />
                                        )}
                                    />
                                    <Controller
                                        name={"class_id" + index}
                                        control={control}
                                        defaultValue={tab.class_id}
                                        render={({ field, fieldState }) => (
                                            <input type="hidden" id={field.name} name={field.name} value={tab.class_id} />
                                        )}
                                    />
                                    <Controller
                                        name={"class_name" + index}
                                        control={control}
                                        defaultValue={tab.class_name}
                                        render={({ field, fieldState }) => (
                                            <p className="card flex w-full p-inputgroup mt-3 pt-1">
                                                <span className="p-inputgroup-addon text-s p-0 m-0">
                                                    <i className="pi pi-pencil"></i>
                                                </span>
                                                <span className="p-float-label w-full">
                                                    <InputText autoFocus id={field.name} name={field.name} value={field.value} className="p-inputtext-sm text-s  p-2 m-0" onChange={(e) => field.onChange(e.target.value)} style={{ width: '100%' }} required />
                                                    <label htmlFor={field.name}>Class name</label>
                                                </span>
                                                {getFormErrorMessage(field.name)}
                                            </p>
                                        )}
                                    />
                                    <Controller
                                        name={"class_description" + index}
                                        control={control}
                                        defaultValue={tab.class_description}
                                        render={({ field, fieldState }) => (
                                            <p className="card flex w-full p-inputgroup mt-3 pt-1">
                                                <span className="p-inputgroup-addon text-s p-0 m-0">
                                                    <i className="pi pi-pencil"></i>
                                                </span>
                                                <span className="p-float-label w-full">
                                                    <InputText id={field.name} name={field.name} value={field.value} className="p-inputtext-sm text-s  p-2 m-0" onChange={(e) => field.onChange(e.target.value)} style={{ width: '100%' }} required />
                                                    <label htmlFor={field.name}>Description</label>
                                                </span>
                                                {getFormErrorMessage(field.name)}
                                            </p>
                                        )}
                                    />
                                    <Controller
                                        name={"class_map_code" + index}
                                        control={control}
                                        defaultValue={tab.class_map_code}
                                        render={({ field, fieldState }) => (
                                            <p className="card flex w-full p-inputgroup mt-3 pt-1">
                                                <span className="p-inputgroup-addon text-s p-0 m-0">
                                                    <i className="fa-solid fa-map"></i>
                                                </span>
                                                <span className="p-float-label w-full">
                                                    <InputText id={field.name} name={field.name} value={field.value} className="p-inputtext-sm text-s  p-2 m-0" onChange={(e) => field.onChange(e.target.value)} style={{ width: '100%' }} />
                                                    <label htmlFor={field.name}>Code</label>
                                                </span>
                                                {getFormErrorMessage(field.name)}
                                            </p>
                                        )}
                                    />

                                    {/* --- Improved HEX colour input (text + color picker + preview) --- */}
                                    <Controller
                                        name={"class_color_code" + index}
                                        control={control}
                                        defaultValue={tab.class_color_code == undefined ? "00FF00" : (tab.class_color_code as string).toUpperCase()}
                                        render={({ field, fieldState }) => {
                                            const raw = (typeof field.value === 'string' ? field.value : '') || (tab.class_color_code || '00FF00');
                                            const current = raw.toString().toUpperCase();
                                            const hexOnly = (s: string) => s.replace(/[^0-9A-F]/gi, "").toUpperCase();
                                            const expand3 = (s: string) => s.length === 3 ? s.split("").map(c => c + c).join("") : s;
                                            const isValid = /^[0-9A-F]{3}$|^[0-9A-F]{6}$/.test(current);
                                            const expanded = isValid ? expand3(current) : hexOnly(current).slice(0, 6);
                                            const colorForPicker = `#${/^[0-9A-F]{6}$/.test(expanded) ? expanded : "000000"}`;

                                            const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                                let v = (e.target.value || "").toUpperCase().trim();
                                                if (v.startsWith("#")) v = v.slice(1);
                                                v = hexOnly(v).slice(0, 6);
                                                field.onChange(v);
                                            };

                                            const handleTextBlur = () => {
                                                let v = (field.value || "").toString().toUpperCase();
                                                if (/^[0-9A-F]{3}$|^[0-9A-F]{6}$/.test(v)) {
                                                    v = expand3(hexOnly(v));
                                                    field.onChange(v);
                                                }
                                            };

                                            const handlePickerChange = (e: any) => {
                                                const v = hexOnly((e?.value || "")).slice(0, 6).toUpperCase();
                                                field.onChange(v || "000000");
                                            };

                                            return (
                                                <div className="card flex w-full p-inputgroup mt-3 pt-1">
                                                    <span className="p-inputgroup-addon text-s p-0 m-0">
                                                        <i className="pi pi-palette"></i>
                                                    </span>

                                                    <span className="p-inputgroup-addon text-s p-0 m-0">
                                                        <ColorPicker
                                                            format="hex"
                                                            className="p-0 m-0"
                                                            value={expanded}
                                                            onChange={handlePickerChange}
                                                            style={{ width: '40px' }}
                                                        />#
                                                    </span>
                                                    
                                                    <InputText
                                                        id={field.name}
                                                        name={field.name}
                                                        value={current}
                                                        onChange={handleTextChange}
                                                        onBlur={handleTextBlur}
                                                        className="p-inputtext-sm text-s  p-2 m-0"
                                                        style={{ width: '30%' }}
                                                        placeholder="FFFFFF"
                                                        aria-invalid={!isValid}
                                                        aria-describedby={field.name + "-err"}
                                                    />

                                                    

                                                    {!isValid && (
                                                        <small id={field.name + "-err"} className="p-error" style={{ marginLeft: '0.5rem' }}>
                                                            Use 3 or 6 hex digits (0–9, A–F).
                                                        </small>
                                                    )}

                                                    {/* Hidden input mirrors value for onSubmit() DOM reads */}
                                                    <input type="hidden" id={field.name} name={field.name} value={current} />
                                                    {getFormErrorMessage(field.name)}
                                                </div>
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card flex flex-column justify-content-center p-0 m-0">
                            <TabView className="card flex flex-row justify-content-center p-0 m-0 overflow-hidden" >
                                {Tabs[index]}
                            </TabView>
                            <div className="flex" style={{ justifyContent: 'flex-end' }} >
                                <>{formReset()}</>
                                <Button label="Delete class" icon="pi pi-times-circle" type="button" onClick={() => promptClassDelete(index)} size="small" iconPos="top" style={{ backgroundColor: 'var(--red-100)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }} disabled={lastClass} />
                                <Button label="Save class" icon="pi pi-check-circle" type="submit" size="small" iconPos="top" style={{ backgroundColor: 'var(--highlight-bg)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }} />
                            </div>
                        </div>
                    </form>
                </AccordionTab>
            );
        });
    };

    const processClasses = () => {
        LC_Class.current = classes;

        let empty_class_names = searchObjKeyVal(LC_Class.current, 'class_name', '');
        let empty_class_descriptions = searchObjKeyVal(LC_Class.current, 'class_description', '');
        if (empty_class_names.length > 0 || empty_class_descriptions.length > 0) {
            let displayNames = "";
            empty_class_names.map((clss: any) => {
                displayNames = displayNames + clss.class_id + ", "
            });
            displayNames = "Missing class name on class: " + displayNames;
            let displayDescription = "";
            empty_class_descriptions.map((clss: any) => {
                displayDescription = displayDescription + clss.class_id + ", "
            });
            displayDescription = "Missing class description on class: " + displayDescription;
            toast.current?.show({ severity: 'error', summary: 'Class error', detail: displayNames + " " + displayDescription, life: 60000 });
        }
        else {
            toast.current?.show({ severity: 'success', summary: 'Classes saved', detail: LC_Class.current.length + " Classes." });
            const timer = setTimeout(() => {
                setGuide2Visible(false);
                setGuide3Visible(true);
                setRerenderTrigger('Classes');
            }, 1000);
        }
    }

    const [lastClass, setLastClass] = useState(true);
    const [classMisMatch, setClassMisMatch] = useState(true);
    useEffect(() => {
        if (displayClasses.length < 2)
            setLastClass(true);
        else
            setLastClass(false);
        if (LC_Class.current.length !== displayClasses.length)
            setClassMisMatch(true);
        else
            setClassMisMatch(false);
    }, [displayClasses.length, LC_Class.current.length]);

    return (
        <div className="card flex flex-column  justify-content-center">
            <Toast ref={toast} />
            <ConfirmDialog visible={confirmClassDelete} onHide={() => setConfirmClassDelete(false)} message="Are you sure you want to delete the class? This will delete all horizontal patterns, strata, elements, properties and characteristics associated with it." header="Delete class confirmation" icon="pi pi-exclamation-triangle" acceptClassName='p-button-danger' accept={() => acceptClassDelete(ClassToDelete.current)} reject={reject} />
            <Accordion activeIndex={0}>
                {createDynamicTabs()}
            </Accordion>
            <div className="card" style={{ textAlign: 'right' }} >
                <Button label="Back" icon="pi pi-arrow-left" type="button" onClick={() => { setGuide1Visible(true); setGuide2Visible(false); setRerenderTrigger('Class'); }} text size="small" className="mr-1" />
                <Button label="Add another class" icon="pi pi-plus-circle" type="button" onClick={() => { submitAllForms(); addClass(); }} iconPos="top" text size="small" className="mr-1" style={{ backgroundColor: 'var(--green-100)', color: 'var(--info-100)', borderRadius: 'var(--border-radius)' }} />
                <Button label="Next" icon="pi pi-arrow-right" type="button" onClick={() => processClasses()} size="small" iconPos="right" className="mr-1" disabled={classMisMatch} />
            </div>
        </div>
    )
}