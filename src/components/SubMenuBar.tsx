import { Button } from 'primereact/button';

export const SubMenuBar = (props:any) => {
    const {
        setFileUploadVisible,
        setGuide1Visible,
        Validator,
        rerenderTrigger,
        blocks,
        characteristics,
        elements,
        LC_Legend,
        LC_Class,
        LC_ClassCharacteristics,          
        LC_HorizontalPatterns,
        LC_Strata,        
        LC_Properties,
        LC_Characteristics,
        confirm,
        legendValid,
        setExportVisible,
        setGuideVisible,
        setStorageManagerVisible,
        setCharacteristicManagerVisible,
        setActiveLCElement
    } = props;
    
    return (
        <div className="flex flex-row p-0 m-0 guide-subMenu" >
            <div className="flex flex-row p-0 m-0">
                <Button className="guide-newLegend" label="New" icon="pi pi-file-edit" style={{ color: 'var(--error-100)', verticalAlign: 'center', fontSize: 'xx-small', height: 20, padding: 10, margin: 0 }} size="small" text onClick={() => confirm('Are you sure you want to create a new Legend? This will wipe your current Legend.','Clear Legend Confirmation','pi pi-info-circle','p-button-danger')} />
                <Button className="guide-importLegend" label="Import" icon="pi pi-file-import" style={{ color: 'var(--error-100)', verticalAlign: 'center', fontSize: 'xx-small', height: 20, padding: 10, margin: 0 }} size="small" text onClick={() => setFileUploadVisible(true)} />
                <Button className="guide-exportLegend" label="Export" icon="pi pi-file-export" style={{ color: 'var(--error-100)', verticalAlign: 'center', fontSize: 'xx-small', height: 20, padding: 10, margin: 0 }} size="small" text onClick={() => setExportVisible(true)} />
                <Button className="guide-manageStorage" label="Save" icon="pi pi-database" style={{ color: 'var(--error-100)', verticalAlign: 'center', fontSize: 'xx-small', height: 20, padding: 10, margin: 0 }}  size="small" text onClick={() => setStorageManagerVisible(true)} />
                |
            </div>            
            <div className="flex flex-row p-0 m-0">
                <Button className="guide-validateLegend" label="Validate" icon="pi pi-check-circle" style={{ color: 'var(--error-100)', verticalAlign: 'center', fontSize: 'xx-small', height: 20, padding: 10, margin: 0 }}  size="small" text onClick={() => Validator()} />
                |
            </div>            
            <div className="flex flex-row p-0 m-0">
                <Button className="guide-legendWizard" label="Legend Wizard" icon="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--error-100)', verticalAlign: 'center', fontSize: 'xx-small', height: 20, padding: 10, margin: 0 }}  size="small" text onClick={()=>{setGuide1Visible(true);setActiveLCElement(null);}} />
                <Button className="guide-userDefinition" label="User Definition" icon="pi pi-tags" style={{ color: 'var(--error-100)', verticalAlign: 'center', fontSize: 'xx-small', height: 20, padding: 10, margin: 0 }}  size="small" text onClick={() => setCharacteristicManagerVisible(true)} />
                |
            </div>            
            <div className="flex flex-row p-0 m-0">
                <Button className="guide-docs" label="Docs" icon="fa-solid fa-book-open" style={{ color: 'var(--error-100)', verticalAlign: 'center', fontSize: 'xx-small', height: 20, padding: 10, margin: 0 }}  size="small" text onClick={()=>window.open("docs/index.html")} />
                <Button label="Guided Tour" icon="fa-solid fa-person-chalkboard" style={{ color: 'var(--error-100)', verticalAlign: 'center', fontSize: 'xx-small', height: 20, padding: 10, margin: 0 }}  size="small" text onClick={() =>setGuideVisible(true)} />
                |
            </div>            
        </div>
    )
}
