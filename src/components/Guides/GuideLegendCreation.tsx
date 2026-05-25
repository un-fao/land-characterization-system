import { useRef } from "react";
import { InputText } from "primereact/inputtext";
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Button } from "primereact/button";
import { Controller, useForm } from 'react-hook-form';
import { Toast } from 'primereact/toast';

export const GuideLegendCreation = (props:any) => {
    const {UUID,legend,setRerenderTrigger,setGuide1Visible,setGuide2Visible,LC_Legend} = props;    

    const toast = useRef(null);

    const show = () => {
        toast.current.show({ severity: 'success', summary: 'Form Submitted', detail: "Legend Name:"+getValues('legend_name') });
        toast.current.show({ severity: 'success', summary: 'Form Submitted', detail: "Legend Description:"+getValues('legend_description') });        
        toast.current.show({ severity: 'success', summary: 'Form Submitted', detail: "Author:"+getValues('legend_author') });
    };

    const defaultValues = {
        id: LC_Legend.current.id,
        legend_name: LC_Legend.current.legend_name,
        legend_description: LC_Legend.current.legend_description,
        legend_author: LC_Legend.current.legend_author
    };

    const {
        control,
        formState: { errors },
        handleSubmit,
        getValues
    } = useForm({ defaultValues });

    const onSubmit = (data: any,event) => {
        event.preventDefault();
        LC_Legend.current.id = data.id;
        LC_Legend.current.legend_name = data.legend_name;
        LC_Legend.current.legend_description = data.legend_description;
        LC_Legend.current.legend_author = data.legend_author;
        show();

        const timer = setTimeout(() => {
            setGuide1Visible(false);
            setGuide2Visible(true);
            setRerenderTrigger('Legend');
        }, 1000);
    };

    const getFormErrorMessage = (name:any) => {
        return errors[name] ? <small className="p-error">{errors[name].message}</small> : <small className="p-error">&nbsp;</small>;
    };
    
    return (
        <div className="card flex flex-row justify-content-center">
            <Card title="Step 1: Legend name" subTitle="Name your land cover legend" className="w-full" style={{ width: '50%', background: '#eee' }}>
                <p className="m-0">
                    Name the legend.  Please also include a description and the author.
                </p>
            </Card>
            <Divider layout="vertical" />
            <div className="card align-contents-top w-full">
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-column gap-1">
                    <Toast ref={toast} />                
                    <div className="w-full card justify-content-center gap-3" style={{width: '50%'}}>
                        <Controller
                        name="id"
                        control={control}
                        render={({ field, fieldState }) => (
                            <input type="hidden" id={field.name} name={field.name} value={field.value} />
                            )}
                        />
                        <Controller
                        name="legend_name"
                        control={control}
                        rules={{ required: 'Name is required.' }}
                        render={({ field, fieldState }) => (
                            <p className="card flex w-full p-inputgroup mt-3 pt-1">
                                <span className="p-inputgroup-addon text-s p-0 m-0">
                                    <i className="pi pi-pencil"></i>
                                </span>
                                <span className="p-float-label w-full">                        
                                    <InputText autoFocus id={field.name} name={field.name} value={field.value} className="p-inputtext-sm text-s p-2 m-0" onChange={(e) => field.onChange(e.target.value)} style={{ width: '100%'}} />
                                    <label htmlFor={field.name}>Legend name</label>
                                </span>
                                {getFormErrorMessage(field.name)}
                            </p>
                            )}
                        />
                        <Controller
                        name="legend_description"
                        control={control}
                        rules={{ required: 'Description is required.' }}
                        render={({ field, fieldState }) => (
                            <p className="card flex w-full p-inputgroup mt-3 pt-1">
                                <span className="p-inputgroup-addon text-s p-0 m-0">
                                    <i className="pi pi-pencil"></i>
                                </span>
                                <span className="p-float-label w-full">                        
                                    <InputText id={field.name} name={field.name} value={field.value} className="p-inputtext-sm text-s p-2 m-0" onChange={(e) => field.onChange(e.target.value)} style={{ width: '100%'}} />
                                    <label htmlFor={field.name}>Description</label>
                                </span>
                                {getFormErrorMessage(field.name)}
                            </p>
                            )}
                        />
                        <Controller
                        name="legend_author"
                        control={control}
                        rules={{ required: 'Author is required.' }}
                        render={({ field, fieldState }) => (
                            <p className="card flex w-full p-inputgroup mt-3 pt-1">
                                <span className="p-inputgroup-addon text-s p-0 m-0">
                                    <i className="pi pi-user"></i>
                                </span>
                                <span className="p-float-label w-full">                        
                                    <InputText id={field.name} name={field.name} value={field.value} className="p-inputtext-sm text-s p-2 m-0" onChange={(e) => field.onChange(e.target.value)} style={{ width: '100%'}} />
                                    <label htmlFor={field.name}>Author</label>
                                </span>
                                {getFormErrorMessage(field.name)}
                            </p>
                            )}
                        />
                        <div className="card" style={{ textAlign: 'right' }} >
                            <Button label="Back" icon="pi pi-arrow-left" type="button" onClick={() => {setGuide1Visible(false);setRerenderTrigger('Legend');}} text size="small" />
                            <Button label="Next" icon="pi pi-arrow-right" type="submit" size="small" iconPos="right" className="align-self-end" />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
