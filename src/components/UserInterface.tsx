import { useState,useRef,useEffect } from "react";
import { ResizablePanel } from "./ResizeablePanel";
import { VerticalResizer } from "./VerticalResizer";
import { TreeView } from './TreeView';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Sidebar } from 'primereact/sidebar';
import { Timeline } from 'primereact/timeline';
import { MenuBar } from "./MenuBar";
import { SubMenuBar } from "./SubMenuBar";
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { InputText } from "primereact/inputtext";
import { Dropdown,DropdownChangeEvent } from 'primereact/dropdown';
import { InputNumber, InputNumberChangeEvent } from "primereact/inputnumber";
import { Slider, SliderChangeEvent } from "primereact/slider";
import { ColorPicker, ColorPickerChangeEvent } from 'primereact/colorpicker';
import { Controller, useFieldArray, useForm } from 'react-hook-form';


import randomstring from "randomstring";
import { parseString } from 'xml2js';
import * as processors from 'xml2js/lib/processors';
import axios from 'axios';
import Papa from 'papaparse';

import { searchObj } from "../App";
import { searchObjKeyVal } from "../App";
import { fuzzySearchObjKeyVal } from "../App";

import { GuideLegendCreation } from "./Guides/GuideLegendCreation";
import { GuideLegendCreation2 } from "./Guides/GuideLegendCreation2";
import { GuideLegendCreation3 } from "./Guides/GuideLegendCreation3";
import { GuideLegendCreation4 } from "./Guides/GuideLegendCreation4";
import { GuideLegendCreation5 } from "./Guides/GuideLegendCreation5";
import { LCMLEditor } from "./LCMLEditor";
import { Properties } from "./Properties";
import { Characteristics } from "./Characteristics";
import { Toast } from "primereact/toast";
import { LegendLoader } from "./LegendLoader";
import { Export } from "./Export";
import { Flow } from './mermaid/Flow';
import { Guide } from "./Guide";
import { validateLegend } from "./LegendValidator";

import { createLegendImporter, LegendImportConfig, LegendImportResult } from './LegendImporter';

import { LocalStorageManager, UserDefinedBlock, UserDefinedCharacteristic } from './LocalStorageManager';
import { LegendStorageManager } from './LegendStorageManager';
import { UserDefinedBlockManager } from './UserDefinedBlockManager';
import { UserDefinedCharacteristicManager } from './UserDefinedCharacteristicManager';

import SemanticInteroperability from './SemanticInteroperability';
import { SimilarityAssessment } from "./SimilarityAssessment";

import './resizable_panel.css';

export default function UserInterface(props) {
    const { UUID,translator,legendTemplate,options,blocks,blockLookUp,characteristics,characteristicLookUp } = props;
    // Add these refs for vertical resizing
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
    
    const [visibleLogin, setLoginVisible] = useState<boolean>(false);
    const [visibleSideBar, setSideBarVisible] = useState<boolean>(false);
    const [visibleGuide1, setGuide1Visible] = useState<boolean>(false);
    const [visibleGuide2, setGuide2Visible] = useState<boolean>(false);
    const [visibleGuide3, setGuide3Visible] = useState<boolean>(false);
    const [visibleGuide4, setGuide4Visible] = useState<boolean>(false);
    const [visibleGuide5, setGuide5Visible] = useState<boolean>(false);
    const [visibleFileUpload, setFileUploadVisible] = useState<boolean>(false);
    const [visibleExport, setExportVisible] = useState<boolean>(false);
    const [visibleGuide, setGuideVisible] = useState<boolean>(false);

    const [triggerFullExport, setFullExport] = useState<boolean>(false);

    const [legendValid,isLegendValid] = useState<boolean>(false);
    const [rerenderTrigger, setRerenderTrigger] = useState<string>('');

    const LC_Legend = useRef<{id:number,legend_name:string,legend_description:string,legend_author:string}>({id:1,legend_name:'Legend',legend_description:'Legend description',legend_author:''});
    const LC_Class = useRef<any>([{legend_id:1,class_id:1,class_name:'Class 1',class_description:'The land characterization class',class_map_code:'LCR1',class_color_code:'EEEEEE'}]);
    const classesNumber = useRef(1);

    const LC_ClassCharacteristics = useRef<any>({});

    const LC_HorizontalPatterns = useRef<any>([]);
    const LC_Strata = useRef<any>([]);
    const horizontalPatternNumber = useRef(1);
    const strataNumber = useRef(1);

    const LC_Properties = useRef<any>([]);
    const stratumPropertyNumber = useRef(1);
    const LC_Characteristics = useRef<any>([]);
    const stratumCharacteristicNumber = useRef(1);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const isNavigationDialogVisible = useRef(false);
    const userChoseToStay = useRef(false); // NEW: Track if user clicked "Stay on Page"

    const safeSetActiveLCElement = (newElement: any) => {
        if (newElement === activeLCElement) {
            return;
        }
        
        if (hasUnsavedChanges) {
            //console.log('ðŸ” Unsaved changes detected! Showing dialog...');
            isNavigationDialogVisible.current = true;
            userChoseToStay.current = false; // Reset flag
            setPendingNavigation(newElement);
            setShowUnsavedDialog(true);
        } else {
            //console.log('ðŸ” No unsaved changes, navigating directly');
            setActiveLCElement(newElement);
        }
    };

    const handleDiscardChanges = () => {
        //console.log('ðŸ” User clicked Discard Changes');
        isNavigationDialogVisible.current = false;
        userChoseToStay.current = false; // User is leaving, allow form reset
        setHasUnsavedChanges(false);
        setShowUnsavedDialog(false);
        if (pendingNavigation !== null) {
            setActiveLCElement(pendingNavigation);
            setPendingNavigation(null);
        }
    };

    const handleStayOnPage = () => {
        //console.log('ðŸ” User clicked Stay on Page');
        userChoseToStay.current = true; // NEW: Set flag immediately
        isNavigationDialogVisible.current = false;
        setShowUnsavedDialog(false);
        setPendingNavigation(null);
        
        // Keep blocking form functions briefly after closing dialog
        setTimeout(() => {
            //console.log('ðŸ”“ Unblocking form functions after Stay on Page');
            userChoseToStay.current = false;
        }, 100); // Wait 100ms before allowing form functions again
    };

    const handleCancelNavigation = () => {
        //console.log('ðŸ” User Navigated Away');
        userChoseToStay.current = true; // NEW: Set flag immediately
        isNavigationDialogVisible.current = false;
        setShowUnsavedDialog(false);
        setPendingNavigation(null);
        
        // Keep blocking form functions briefly after closing dialog
        setTimeout(() => {
            //console.log('ðŸ”“ Unblocking form functions after cancelling navigation');
            userChoseToStay.current = false;
        }, 100); // Wait 100ms before allowing form functions again
    };

    /**
     * Helper: Get max ID from array
     */
    const getMaxId = (array: any[], idField: string): number => {
        if (!array || array.length === 0) return 0;
        return Math.max(...array.map(item => item[idField]));
    };

    /**
     * Helper: Get next unique Class ID
     */
    const getNextClassId = (): number => {
        const maxClassId = getMaxId(LC_Class.current, 'class_id');
        const nextId = Math.max(maxClassId + 1, classesNumber.current);
        return nextId;
    };

    /**
     * Helper: Get next unique Horizontal Pattern ID
     */
    const getNextHPId = (): number => {
        const maxHPId = getMaxId(LC_HorizontalPatterns.current, 'horizontal_pattern_id');
        const nextId = Math.max(maxHPId + 1, horizontalPatternNumber.current);
        return nextId;
    };

    /**
     * Helper: Get next unique Stratum ID
     */
    const getNextStratumId = (): number => {
        const maxStratumId = getMaxId(LC_Strata.current, 'stratumID');
        const nextId = Math.max(maxStratumId + 1, strataNumber.current);
        return nextId;
    };

    /**
     * Create a new horizontal pattern (centralized logic)
     */
    const createHorizontalPattern = (classId: number): number => {
        const hpsForClass = LC_HorizontalPatterns.current.filter(hp => hp.class_id === classId);
        const hpCount = hpsForClass.length + 1;
        
        const newHPId = getNextHPId();
        
        const newHP = {
            class_id: classId,
            horizontal_pattern_id: newHPId,
            name: `Horizontal Pattern ${hpCount}`,
            description: 'The class horizontal pattern',
            cover: [0, 100],
            occurrence: [0, 100],
            type: null
        };
        
        LC_HorizontalPatterns.current = [...LC_HorizontalPatterns.current, newHP];
        horizontalPatternNumber.current = newHPId + 1;
        
        return newHPId;
    };

    /**
     * Create a new stratum (centralized logic)
     */
    const createStratum = (hpId: number): number => {
        const strataForHP = LC_Strata.current.filter(stratum => stratum.HPID === hpId);
        const stratumCount = strataForHP.length + 1;
        
        const newStratumId = getNextStratumId();
        
        const newStratum = {
            HPID: hpId,
            stratumID: newStratumId,
            name: `Stratum ${stratumCount}`,
            description: 'The Horizontal Pattern layer',
            presenceType: 'Fixed',
            portioning: [0, 100],
            onTop: null,
            onTopID: null,
            onTopType: null
        };
        
        LC_Strata.current = [...LC_Strata.current, newStratum];
        strataNumber.current = newStratumId + 1;
        
        return newStratumId;
    };

    /**
     * Add property to a stratum (replacing if block already exists)
     */
    const addPropertyToStratum = (stratumId: number, blockId: number, blockReference: string, propertyDataElements: any): void => {
        // Check if ANY existing instance of this block in this stratum has multi-instance presence type
        const existingInstances = LC_Properties.current.filter(
            prop => prop.StratumID === stratumId && prop.BlockID === blockId
        );
        
        // Check if existing instances have multi-instance presence type OR new element has it
        const hasMultiInstanceType = existingInstances.some(
            inst => inst.elementPresenceType === "Exclusive" || inst.elementPresenceType === "Conditional Temporal" || inst.elementPresenceType === "Temporal Sequence Depending"
        )   || propertyDataElements.elementPresenceType === "Exclusive" 
            || propertyDataElements.elementPresenceType === "Conditional Temporal"
            || propertyDataElements.elementPresenceType === "Temporal Sequence Depending";
        
        if (hasMultiInstanceType && existingInstances.length > 0) {
            // Multiple instances allowed - add new instance
            const instanceIndex = existingInstances.length;
            
            // Add new instance without removing existing
            LC_Properties.current = [
                ...LC_Properties.current,
                {
                    StratumID: stratumId,
                    BlockID: blockId,
                    BlockReference: blockReference,
                    instanceIndex: instanceIndex,
                    ...propertyDataElements
                }
            ];
        } else {
            // Single instance or first instance - replace or add
            const filteredProperties = LC_Properties.current.filter(
                properties => 
                    properties.StratumID !== stratumId || 
                    properties.BlockID !== blockId
            );
            
            LC_Properties.current = [
                ...filteredProperties,
                {
                    StratumID: stratumId,
                    BlockID: blockId,
                    BlockReference: blockReference,
                    instanceIndex: 0,
                    ...propertyDataElements
                }
            ];
        }
        
        stratumPropertyNumber.current++;
    };
    const getHPsForClass = (classId) => LC_HorizontalPatterns.current.filter(hp => hp.class_id === parseInt(classId));
    const getStrataForHP = (hpID: number) => LC_Class.current.filter(stratum => stratum.HPID === hpID);

    // Normalise color coming from legends (string, number, etc.)
    const normalizeColor = (raw: any) => {
        if (raw == null) {
            return '#DDDDDD'; // Default colour
        }

        if (typeof raw === 'string') {
            const trimmed = raw.trim();
            if (!trimmed) {
            return '#DDDDDD';
            }
            // Allow "RRGGBB" or "#RRGGBB"
            return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
        }

        if (typeof raw === 'number') {
            // Treat as an integer colour and convert to 6-digit hex
            const hex = raw.toString(16).padStart(6, '0');
            return `#${hex}`;
        }

        // Unknown type: fall back to default
        return '#DDDDDD';
    };

    const [activeLCElement,setActiveLCElement] = useState<any>(false);
    useEffect(() => {
        if (activeLCElement) {
            setRightPanelCollapsed(false);  // Auto-expand when element selected
        }
    }, [activeLCElement]);
    
    const displayOptions = (optionGroup)=>{
        let displayOptions = [];
        let _1_options = options.current["LC_Options"]?.filter( selectedOptions => selectedOptions.option_name === optionGroup );               
        if(_1_options !== undefined){                    
            Object.keys(_1_options).forEach((key0) => {     
                let Groups = [];       
                Object.keys(_1_options[key0]).forEach((key1) => {
                    if(_1_options[key0] !== "options"){
                        Groups = [...Groups, {[key1]: _1_options[key0][key1]}];
                    }else{
                        let Options = [];
                        Object.keys(_1_options[key0]).forEach((key1) => {                   
                            Options = [...Options, {[key1]: _1_options[key0][key1]}];
                        });
                            Groups = [...Groups, ...Options];
                    }                
                });
                displayOptions = [...displayOptions, {...Groups}];
            });
        }
        return(displayOptions);
    }
    const optionsGenerator = (option_name) => {        
        let optionDisp = [];
        let Options = displayOptions(option_name);
        let ReturnedOptions = [];
        if(Options[0] !== undefined){
            Object.keys(Object.entries(Options[0][4]['options'])).forEach((key0) => {
                optionDisp = [...optionDisp, {label: Options[0][4]['options'][key0]['label']}];
            });
            ReturnedOptions = [...optionDisp].map(options => options);            
        }
        return(ReturnedOptions);
    }
    var OptionsBus = {};
    OptionsBus = {...OptionsBus,
        Artificiality: optionsGenerator('artificiality_types'),
        Boolean: optionsGenerator('Boolean'),
        ClimateTypes: optionsGenerator('climate_types'),
        CoarseMineralFragmentTypes: optionsGenerator('coarse_mineral_fragment_types'),
        ConstructionStatuses: optionsGenerator('construction_statuses'),
        ConstructionUses: optionsGenerator('construction_uses'),
        Directions: optionsGenerator('directions'),
        DumpSiteTypes: optionsGenerator('dump_site_types'),
        DuneTypes: optionsGenerator('duneTypes'),
        ElementHorizontalSpreading: optionsGenerator('element_horizontal_spreading_type'),
        ElementPresenceTypes: optionsGenerator('element_presence_types'),
        ErosionTypes: optionsGenerator('erosion_types'),
        ExtractionTypes: optionsGenerator('extraction_types'),
        FloatStatus: optionsGenerator('float_status'),
        FloatingIceTypes: optionsGenerator('floating_ice_types'),
        GeoAspectTypes: optionsGenerator('geo_aspect_types'),
        GroupOfPlantSpeciesTypes: optionsGenerator('groupOfPlantSpeciesTypes'),
        GrowthFrequencies: optionsGenerator('growth_frequencies'),
        GrowthPeriods: optionsGenerator('length_of_growing_periods'),
        HardpanTypes: optionsGenerator('hardpan_types'),
        HerbaceousLeafPhenologies: optionsGenerator('herbaceous_leaf_phenologies'),
        InorganicDepositTypes: optionsGenerator('inorganicDepositTypes'),
        IrrigationTypes: optionsGenerator('irrigationTypes'),
        LandFormTypes: optionsGenerator('land_form_types'),
        LeafArragements: optionsGenerator('leaf_arrangements'),
        LeafAspects: optionsGenerator('leaf_aspects'),
        LeafCharacterSizeTypes: optionsGenerator('leaf_character_size_types'),
        LeafPhenologies: optionsGenerator('leaf_phenologies'),
        LeafShapes: optionsGenerator('leaf_shapes'),
        LeafTypes: optionsGenerator('leaf_types'),
        LeafVenations: optionsGenerator('leaf_venations'),
        LifeFormSpecilizationTypes: optionsGenerator('life_form_specialization_types'),
        MacropatternTypes: optionsGenerator('macropattern_types'),
        MechanicalErosionControls: optionsGenerator('ploughTypes'),
        NutrientLevels: optionsGenerator('nutrient_levels'),
        OnTopTypes: optionsGenerator('on_top_types'),
        OrganicDepositTypes: optionsGenerator('organicDepositTypes'),
        PeriodUnits: optionsGenerator('period_units'),
        PeriodVariations: optionsGenerator('period_variations'),
        PloughTypes: optionsGenerator('ploughTypes'),
        PresenceTypes: optionsGenerator('presence_types'),
        RockAgeTypes: optionsGenerator('rock_age_types'),
        RootingStatus: optionsGenerator('rooting_status'),
        SinglePlantSpeciesTypes: optionsGenerator('singlePlantSpeciesTypes'),
        SlopeClassTypes: optionsGenerator('slope_class_types'),
        SnowTypes: optionsGenerator('snow_types'),
        TermalZones: optionsGenerator('termal_zones'),
        TerrestrialIceTypes: optionsGenerator('terrestrial_ice_types'),
        UnitsOfMeasureArea: optionsGenerator('units_of_measure_area'),
        VegetationArtificialityTypes: optionsGenerator('vegetationArtificialityTypes'),
        WaterAndIceDynamics: optionsGenerator('water_ice_dynamics'),
        WaterBodyPositions: optionsGenerator('water_body_positions'),
        WaterSalinityTypes: optionsGenerator('water_salinity_types'),
        WoodyLeafPhenologies: optionsGenerator('woody_leaf_phenologies'),
        sequentialTemporalRelationshipTypes: optionsGenerator('sequential_temporal_relationship')
    }

    useEffect(()=>{
        isLegendValid(false);
    },[rerenderTrigger]);
    
    const {
        control,
        formState: { errors },
        register,
        unregister,
        handleSubmit,
        getValues,
        setValue,
        watch,
        reset
    } = useForm({ });
    const { 
        fields, 
        append, 
        remove, 
        move,
        insert
      } = useFieldArray({
        control,
        name: "items"
      });
    const getFormErrorMessage = (name:any) => {
        return errors[name] ? <small className="p-error">This field is required</small> : <small className="p-error">&nbsp;</small>;
    };
    
    const returnStrata = (HPID) => {
        let displayStrata = [];
        let filtered = LC_Strata.current.filter(stratum => stratum.HPID === parseInt(HPID['value']));
        
        Object.values(filtered).forEach((s: any) => {
            const hp = LC_HorizontalPatterns.current.find((h: any) => h.horizontal_pattern_id === s.HPID);
            const cls = LC_Class.current.find((c: any) => c.class_id === hp?.class_id);
            const classLabel = cls?.class_name || `Class ${cls?.class_id ?? "?"}`;
            const hpLabel = hp?.name || `Horizontal Pattern ${hp?.horizontal_pattern_id ?? "?"}`;
            const stratumLabel = s.name || `Stratum ${s.stratumID}`;
            
            displayStrata.push({
                label: `${classLabel} / ${hpLabel} / ${stratumLabel}`,
                value: s.name,
                stratumID: s.stratumID,
                displayName: `${classLabel} / ${hpLabel} / ${stratumLabel}`
            });
        });
        
        return displayStrata;
    }

    const returnFilteredStrata = (currentStratumID) => {        
        let displayStrata = [];
        
        // Find the current stratum to get its HPID
        const currentStratum = LC_Strata.current.find(stratum => stratum.stratumID === parseInt(currentStratumID['value']));
        
        if (!currentStratum) {
            return displayStrata; // Return empty if current stratum not found
        }
        
        const currentHPID = currentStratum.HPID;
        
        // Filter strata from the same Horizontal Pattern, excluding the current stratum
        let filtered = LC_Strata.current.filter(stratum => 
            stratum.HPID === currentHPID && stratum.stratumID !== parseInt(currentStratumID['value'])
        );
        
        Object.values(filtered).forEach((s: any) => {
            const hp = LC_HorizontalPatterns.current.find((h: any) => h.horizontal_pattern_id === s.HPID);
            const cls = LC_Class.current.find((c: any) => c.class_id === hp?.class_id);
            const classLabel = cls?.class_name || `Class ${cls?.class_id ?? "?"}`;
            const hpLabel = hp?.name || `Horizontal Pattern ${hp?.horizontal_pattern_id ?? "?"}`;
            const stratumLabel = s.name || `Stratum ${s.stratumID}`;
            
            displayStrata.push({
                label: `${classLabel} / ${hpLabel} / ${stratumLabel}`,
                value: s.name,
                stratumID: s.stratumID,
                displayName: `${classLabel} / ${hpLabel} / ${stratumLabel}`
            });
        });
        
        return displayStrata;
    }
    
    const formReconfig = (payload:any)=>{
        try{
            // Accept legacy (elementName, selected) tuple or normalized object
            let elementName:string|undefined;
            let selected:any = null;
            let optList:any[] = [];

            if (payload && typeof payload === 'object' && ('elementName' in payload || 'selected' in payload || 'options' in payload)) {
                elementName = payload.elementName;
                selected = payload.selected;
                optList = Array.isArray(payload.options) ? payload.options : [];
            } else if (Array.isArray(payload)) {
                // legacy: [elementName, selected]
                elementName = payload[0];
                selected = payload[1];
            } else {
                // legacy two-arg call kept for compatibility via rest args
                const args = Array.from(arguments);
                elementName = args[0];
                selected = args[1];
            }

            if(!elementName) return;

            // Pull LC_Options entry for this element
            const lcOptions = options.current?.["LC_Options"] || [];
            const entry = lcOptions.find((x:any)=> x?.option_name === elementName);
            if(!entry || !Array.isArray(entry.options)) return;

            // Determine selected label string
            const selectedLabel = (selected && typeof selected === 'object' && 'label' in selected)
                ? selected.label
                : (typeof selected === 'string' ? selected : undefined);
            if(!selectedLabel) return;

            const optionDetails = entry.options.find((o:any)=> o?.label === selectedLabel);
            if(!optionDetails) return;

            const showIds = (optionDetails.show || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
            const hideIds = (optionDetails.hide || '').split(',').map((s:string)=>s.trim()).filter(Boolean);

            // Show targets
            showIds.forEach((id:string)=>{
                const el = document.getElementById(id);
                if (el) el.style.display = '';
            });
            // Hide targets
            hideIds.forEach((id:string)=>{
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }catch(err){
            console.warn('formReconfig failed:', err);
        }
    }


    // Helper function to validate and adjust the range
    const validateRange = ([min, max]: [number, number],[bound_min, bound_max]: [number, number]): [number, number] => {
        // Clamp values within absolute bounds
        const clampedMin = Math.max(bound_min, min);
        const clampedMax = Math.max(bound_min, max);

        // Ensure min <= max
        if (clampedMin > clampedMax)            
            return [Math.min(clampedMin, clampedMax), Math.max(clampedMin, clampedMax)];
        return [clampedMin, clampedMax];
    }

    const displayFormElements = (elements,elementSuffix='')=>{ 
        var ctlr = [];
        for (const [key, value] of Object.entries(elements)) {
            let component = null;
            let required = "";            
            switch(value['element_type']) {
                case "Range":
                    component = <Controller
                                key={"Range"+key}
                                name={value['element_name']+elementSuffix}
                                control={eval('control')}
                                defaultValue={[value['element_rules']['min'],value['element_rules']['max']]}
                                render={({ field, fieldState }) => (
                                    <div className="p-inputgroup flex-1" id={field.name}>
                                        <span className="p-inputgroup-addon text-xs p-2 pl-3 pr-3 m-0">{value['element_label']}:</span>
                                            <div className="card flex flex-column w-full gap-0">                                                
                                                <Slider name={field.name} value={field.value as [number,number]} onChange={(e: SliderChangeEvent) => { field.onChange(validateRange([e.value[0], e.value[1]],[value['element_rules']['min'],value['element_rules']['max']])); }} className="p-inputtext-sm text-xs p-0 m-0 mt-2" range style={{width: '100%', alignSelf: 'center', verticalAlign: 'middle' }} min={value['element_rules']['min']} max={value['element_rules']['max']} required={value['element_rules']['required']} />
                                                <div className="flex flex-row align-content-center justify-content-center p-0 m-0 gap-2" style={{ width: '100px', alignSelf: 'center', verticalAlign: 'middle' }}>
                                                    <input name={"L"+field.name} type="number" value={field.value[0]} className="text-xs p-0 m-0" onChange={(e) => { const newValue = validateRange([Number(e.target.value),field.value[1]],[value['element_rules']['min'],value['element_rules']['max']]); field.onChange(newValue); }} min={value['element_rules']['min']} max={value['element_rules']['max']} required={value['element_rules']['required']} /> - <input name={"U"+field.name} type="number" value={field.value[1]} className="text-xs p-0 m-0" onChange={(e) => { const newValue = validateRange([field.value[0],Number(e.target.value)],[value['element_rules']['min'],value['element_rules']['max']]); field.onChange(newValue); }} min={value['element_rules']['min']} max={value['element_rules']['max']} required={value['element_rules']['required']} />
                                                </div>
                                            </div>
                                        <span className="p-inputgroup-addon text-xs p-2 m-0">{value['element_rules']['symbol']}</span>
                                    </div>
                                    )}
                                />;
                    break;
                case "Dropdown":
                    component = <Controller
                                key={"Dropdown"+key}
                                name={value['element_name']+elementSuffix}
                                control={eval('control')}
                                defaultValue=""
                                rules={{ required:value['element_rules']['required'] }}
                                render={({ field, fieldState }) => (
                                    <div className="p-inputgroup flex-1" id={field.name}>
                                        <span className="p-inputgroup-addon text-s p-0 m-0">
                                            <i className="pi pi-pencil"></i>
                                        </span>
                                        <Dropdown inputId={field.name} name={field.name} value={field.value} onChange={(e: DropdownChangeEvent) => {field.onChange(e.value);formReconfig({ elementName: value['element_rules']['options_name'], selected: e.value, options: (eval(value['element_rules']['list'])||[]) });}} inputRef={field.ref} options={eval(value['element_rules']['list'])} optionLabel="label" placeholder={"Select a "+value['element_label']} className="p-inputtext-sm text-xs p-0 m-0" editable tooltip={value['element_label']} tooltipOptions={{ event: 'both' }} />
                                        <span className="p-inputgroup-addon text-xs p-0 m-0">{value['element_rules']['symbol']}</span>
                                    </div>
                                    )}
                                />;
                    break;
                case "Number":
                    if(value['element_name'] != "class_id"){
                        component = <Controller
                                key={"Number"+key}
                                name={value['element_name']+elementSuffix}
                                control={eval('control')}
                                defaultValue={value['element_rules']['min']}
                                render={({ field, fieldState }) => (
                                    <div className="p-inputgroup flex-1" id={field.name}>
                                        <span className="p-inputgroup-addon text-xs p-0 m-0">
                                            <i className="pi pi-pencil"></i>
                                        </span>
                                        <InputNumber name={field.name} value={field.value} className="p-inputtext-sm text-xs p-1 m-0" onValueChange={(e) => field.onChange(e.target.value)} showButtons buttonLayout="horizontal" style={{ width: '100%' }} min={value['element_rules']['min']} max={value['element_rules']['max']} placeholder={value['element_label']} required={value['element_rules']['required']} tooltip={value['element_label']} tooltipOptions={{ event: 'both' }} />
                                        <span className="p-inputgroup-addon text-xs p-0 m-0">{value['element_rules']['symbol']}</span>
                                    </div>
                                    )}
                                />;
                    }
                    else{
                        component = <Controller
                                key={"Number"+key}
                                name={value['element_name']+elementSuffix}
                                control={eval('control')}
                                defaultValue={value['element_rules']['min']}
                                render={({ field, fieldState }) => (                                    
                                        <input type="hidden" id={field.name} name={field.name} value={field.value} />
                                    )}
                                />;                            
                    }
                    break;
                case "Color":
                    component = <Controller
                        key={"Color"+key}
                        name={value['element_name']+elementSuffix}
                        control={eval('control')}
                        defaultValue={value['element_default'] || "EEEEEE"}
                        render={({ field, fieldState }) => {
                            const raw = (typeof field.value === 'string' ? field.value : '') || (value['element_default'] || 'EEEEEE');
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
                                const val = e?.value;
                                const hexStr = typeof val === 'string' ? val : '';
                                const v = hexOnly(hexStr).slice(0, 6).toUpperCase();
                                field.onChange(v || "000000");
                            };

                            return (
                                <div className="card flex w-full p-inputgroup mt-3 pt-1" id={field.name}>
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
                                        className="p-inputtext-sm text-s p-2 m-0"
                                        style={{ width: '30%' }}
                                        placeholder="FFFFFF"
                                        aria-invalid={!isValid}
                                        aria-describedby={field.name + "-err"}
                                    />
                                    {!isValid && (
                                        <small id={field.name + "-err"} className="p-error" style={{ marginLeft: '0.5rem' }}>
                                            Use 3 or 6 hex digits (0â€“9, Aâ€“F).
                                        </small>
                                    )}
                                </div>
                            );
                        }}
                    />;
                    break;
                    case "Limited":
                    component = <Controller
                                key={"Dropdown"+key}
                                name={value['element_name']+elementSuffix}
                                control={eval('control')}
                                defaultValue=""
                                rules={{ required:value['element_rules']['required'] }}
                                render={({ field, fieldState }) => (
                                    <div className="p-inputgroup flex-1" id={field.name}>
                                        <span className="p-inputgroup-addon text-s p-0 m-0">
                                            <i className="pi pi-pencil"></i>
                                        </span>
                                        <Dropdown inputId={field.name} name={field.name} value={field.value} onChange={(e: DropdownChangeEvent) => {field.onChange(e.value);formReconfig({ elementName: value['element_rules']['options_name'], selected: e.value, options: (eval(value['element_rules']['list'])||[]) });}} inputRef={field.ref} options={eval(value['element_rules']['list'])} optionLabel="label" placeholder={"Select a "+value['element_label']} className="p-inputtext-sm text-xs p-0 m-0" tooltip={value['element_label']} tooltipOptions={{ event: 'both' }} />
                                        <span className="p-inputgroup-addon text-xs p-0 m-0">{value['element_rules']['symbol']}</span>
                                    </div>
                                    )}
                                />;
                    break;
                    case "ReadOnly":
                    component = <Controller
                                key={key}
                                name={value['element_name']+elementSuffix}
                                control={eval('control')}
                                render={({ field, fieldState }) => (
                                    <div className="p-inputgroup flex-1" id={field.name}>
                                        <span className="p-inputgroup-addon text-xs p-0 m-0">
                                            <i className="pi pi-pencil"></i>
                                        </span>
                                        <InputText name={field.name} value={field.value} className="p-inputtext-sm text-xs p-1 m-0" onChange={(e) => field.onChange(e.target.value)} style={{ width: '100%' }} placeholder={value['element_label']} required={value['element_rules']['required']} tooltip={value['element_label']} tooltipOptions={{ event: 'both' }} readOnly={true} />                                        
                                    </div>
                                    )}
                                />;
                    break;
                default:
                    component = <Controller
                                key={key}
                                name={value['element_name']+elementSuffix}
                                control={eval('control')}
                                render={({ field, fieldState }) => (
                                    <div className="p-inputgroup flex-1" id={field.name}>
                                        <span className="p-inputgroup-addon text-xs p-0 m-0">
                                            <i className="pi pi-pencil"></i>
                                        </span>
                                        <InputText name={field.name} value={field.value} className="p-inputtext-sm text-xs p-1 m-0" onChange={(e) => field.onChange(e.target.value)} style={{ width: '100%' }} placeholder={value['element_label']} required={value['element_rules']['required']} tooltip={value['element_label']} tooltipOptions={{ event: 'both' }} />
                                    </div>
                                    )}
                                />;
            }
            ctlr.push(component);
        };        
        return (<>{ctlr}</>);
    }
    
    const customIcons = (
        <>
            <button className="p-sidebar-icon p-link mr-2">
                <span className="pi pi-print" onClick={window.print}/>
            </button>
        </>
    );
    const LCMLHeader = (
        <h2 style={{ margin: 0 }}>Inspect Legend Land Cover MetaLanguage(LCML)</h2>
    );
    const LegendImportHeader = (
        <h2 style={{ margin: 0 }}>Import Land Characterization Legend</h2>        
    );
    const ExportHeader = (
        <h2 style={{ margin: 0 }}>Export your Legend</h2>
    );

    const customizedMarker = (item:any) => {
        return (
            <span className="flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle z-1 shadow-1" style={{ backgroundColor: item.color }}>
                <i className={item.icon}></i>
            </span>
        );
    };
    const customizedContent = (item:any) => {
        return (
            <p className="text-xs">{item.label}</p>
        );
    };
    
    const guideTransition = (step:number) => {
        const events = [
            {id: 1, label: 'Legend', icon: 'pi pi-cog', color: ''}, 
            {id: 2, label: 'Class', icon: 'pi pi-cog', color: ''}, 
            {id: 3, label: 'Horizontal Patterns', icon: 'pi pi-cog', color: ''},
            {id: 4, label: 'Strata', icon: 'pi pi-cog', color: ''}, 
            {id: 5, label: 'Elements', icon: 'pi pi-cog', color: ''}];
        
        events.map(event => {
            if(event.id === step) event.color = "var(--primary-color)";
            if(event.id < step) event.color = "var(--gray-500)";
        })

        return (
            <div className="card flex flex-row gap-1 w-full">            
                <Timeline value={events} layout="horizontal" align="bottom" marker={customizedMarker} content={customizedContent} />
            </div>        
        );
    }

    const rerender = useRef(false);
    const [elements,setElements] = useState<any>([]);
    const [legend,setLegend] = useState<any>({});
    const classCharacteristics = useRef<any>([]);
    useEffect(()=>{
        if(!rerender.current){
            let elements = [];    
            Object.keys(blockLookUp.current).forEach((key0) => { 
                let _1_parents = blockLookUp.current[key0].filter( block => block.parent_id === null );
                Object.keys(_1_parents).forEach((key1) => {
                    let _1_blocks = blocks.current["LC_Block"]?.filter( block => block.block_id === _1_parents[key1]["block_id"] );
                    Object.keys(_1_blocks).forEach((key2) => {
                        let _2_parents = blockLookUp.current[key0].filter( block => block.parent_id === _1_blocks[key2]["block_id"] );
                        let _1_children = [];
                        Object.keys(_2_parents).forEach((key3) => {
                            let _3_parents = blockLookUp.current[key0].filter( block => block.parent_id === _2_parents[key3]["block_id"] );
                            let _2_blocks = blocks.current["LC_Block"]?.filter( block => block.block_id === _2_parents[key3]["block_id"] );                    
                            let _2_children = [];
                            Object.keys(_3_parents).forEach((key4) => {
                                let _4_parents = blockLookUp.current[key0].filter( block => block.parent_id === _3_parents[key4]["block_id"] );
                                let _3_blocks = blocks.current["LC_Block"]?.filter( block => block.block_id === _3_parents[key4]["block_id"] );
                                let _3_children = [];
                                Object.keys(_4_parents).forEach((key5) => {
                                    let _5_parents = blockLookUp.current[key0].filter( block => block.parent_id === _4_parents[key5]["block_id"] );
                                    let _4_blocks = blocks.current["LC_Block"]?.filter( block => block.block_id === _4_parents[key5]["block_id"] );
                                    let _4_children = [];
                                    Object.keys(_5_parents).forEach((key6) => {                                        
                                        let _5_blocks = blocks.current["LC_Block"]?.filter( block => block.block_id === _5_parents[key6]["block_id"] );
                                        _4_children = [..._4_children, { key: _1_blocks[0]["block_id"]+"-"+_2_blocks[0]["block_id"]+"-"+_3_blocks[0]["block_id"]+"-"+_4_blocks[0]["block_id"]+"-"+_5_blocks[0]["block_id"], label: _5_blocks[0]["block_label"], icon: _5_blocks[0]["block_icon"]}];
                                    });
                                    _3_children = [..._3_children, { key: _1_blocks[0]["block_id"]+"-"+_2_blocks[0]["block_id"]+"-"+_3_blocks[0]["block_id"]+"-"+_4_blocks[0]["block_id"], label: _4_blocks[0]["block_label"], icon: _4_blocks[0]["block_icon"], children: _4_children}];
                                });
                                _2_children = [..._2_children, { key: _1_blocks[0]["block_id"]+"-"+_2_blocks[0]["block_id"]+"-"+_3_blocks[0]["block_id"], label: _3_blocks[0]["block_label"], icon: _3_blocks[0]["block_icon"], children: _3_children}];
                            });                                      
                            _1_children = [..._1_children, { key: _1_blocks[0]["block_id"]+"-"+_2_blocks[0]["block_id"], label: _2_blocks[0]["block_label"], icon: _2_blocks[0]["block_icon"], children: _2_children}];
                        });                
                        elements = ([...elements, { key: ""+_1_blocks[0]["block_id"], label: _1_blocks[0]["block_label"], icon: _1_blocks[0]["block_icon"], children: _1_children}]);
                    });            
                });                
            });
            setElements(elements);
            if(legendTemplate.current["LC_ClassCharacteristics"] !== undefined){
                let ClassCharacteristicElements = [];
                legendTemplate.current["LC_ClassCharacteristics"].map((Characteristics)=>{
                    let classCharacteristicElements = {};            
                    Object.entries(Characteristics).forEach((Characteristic)=>{
                        let classDataElements = [];
                        classCharacteristicElements = {...classCharacteristicElements, [Characteristic[0]]: Characteristic[1]};
                        if(Characteristic[0] === "elements"){
                            Object.entries(Characteristic[1]).forEach((characteristicElement)=>{
                                if(characteristicElement[1]["element_type"] === "Number")
                                    classDataElements = {...classDataElements, [characteristicElement[1]["element_name"]]: characteristicElement[1]["element_rules"]['min']};
                                else if(characteristicElement[1]["element_type"] === "Range")
                                    classDataElements = {...classDataElements, [characteristicElement[1]["element_name"]]: [characteristicElement[1]["element_rules"]['min'],characteristicElement[1]["element_rules"]['max']]};
                                else
                                    classDataElements = {...classDataElements, [characteristicElement[1]["element_name"]]: ""};
                            });
                        }
                        classCharacteristicElements = {...classCharacteristicElements, "defaults": {...classDataElements}};
                    });
                    ClassCharacteristicElements.push(classCharacteristicElements);
                });
                classCharacteristics.current = ClassCharacteristicElements;
                setLegend(legendTemplate.current);
            }
        }
        if(elements.length > 0 && legend.toString().length > 0)
            rerender.current = true;
    },[elements,legend]);

    const toast = useRef(null);
    const validationErrors = useRef<any>([]);
    const Validator = () => {
        // Build the validation context from current refs
        const context = {
            legend: LC_Legend.current,
            classes: LC_Class.current,
            horizontalPatterns: LC_HorizontalPatterns.current,
            strata: LC_Strata.current,
            properties: LC_Properties.current,
            characteristics: LC_Characteristics.current
        };

        const results = validateLegend(context);

        // Store only errors for potential future use
        validationErrors.current = results.filter(r => r.severity === "error");

        // One toast per rule
        results.forEach(result => {
            toast.current?.show({
                severity: result.severity,
                summary: result.summary,
                detail: result.detail,
                life: result.severity === "success" ? 3000 : 60000
            });
        });

        // IMPORTANT: return boolean for callers (e.g. export)
        const hasError = results.some(r => r.severity === "error");
        isLegendValid(!hasError);
        return !hasError;  // true = valid, false = has errors
    };

    const LC_Objectfilter = (obj, searchField, searchParameter) =>{
        let match = [];
        if(obj !== undefined){
            Object.keys(obj).forEach((key)=>{
                Object.entries(obj[key]).forEach((entries)=>{
                    if(entries[0] === searchField && entries[1] === parseInt(searchParameter))
                        match = [...match, {objectID: parseInt(key), ...obj[key]}];
                });
            });
        }
        return(match);
    }

    const accept = () => {        
        window.location.reload();        
    }
    const reject = () => {
        toast.current?.show({ severity: 'info', summary: 'Cancelled', detail: 'Action Cancelled', life: 3000 });
    }
    const confirmNewLegend = (message,header,icon,acceptStyle) => {
        confirmDialog({
            message: message,
            header: header,
            icon: icon,
            acceptClassName: acceptStyle,
            accept,
            reject
        });
    };

    const LCMLError = useRef(false);

    const translateLegend = async (Legend: string, LegendType: string, FileName: string = '') => {
        if (Legend === null) return null;

        // Configure the importer with UserInterface-specific settings
        const config: LegendImportConfig = {
            autoCreateCharacteristics: true,  // Enable auto-creation
            maxRecursionDepth: 10,
            defaultPresenceType: 'Fixed',
            includeValidationErrors: true,
            onError: (error) => {
                // Handle errors in real-time if needed
                console.warn('Import error:', error);
            }
        };

        // Create importer instance
        const importer = createLegendImporter(
            translator,
            {
                blocks: blocks,
                characteristics: mergedCharacteristics
            },
            config
        );

        try {
            // Import the legend
            const result: LegendImportResult = await importer.importLegend(
                Legend,
                FileName || 'Untitled',
                LegendType as 'lchs' | 'lccs' | 'xml' | 'csv'
            );

            if (result.legend) {
                // Update state with imported data
                LC_Legend.current = result.legend.LC_Legend;
                LC_Class.current = result.legend.LC_Class;
                LC_ClassCharacteristics.current = result.legend.LC_ClassCharacteristics;
                LC_HorizontalPatterns.current = result.legend.LC_HorizontalPatterns;
                LC_Strata.current = result.legend.LC_Strata;
                LC_Properties.current = result.legend.LC_Properties;
                LC_Characteristics.current = result.legend.LC_Characteristics;

                // Update counters
                classesNumber.current = LC_Class.current.length + 1;
                const maxHPId = LC_HorizontalPatterns.current.length > 0
                    ? Math.max(...LC_HorizontalPatterns.current.map(hp => hp.horizontal_pattern_id))
                    : 0;
                horizontalPatternNumber.current = maxHPId + 1;
                const maxStratumId = LC_Strata.current.length > 0
                    ? Math.max(...LC_Strata.current.map(s => s.stratumID))
                    : 0;
                strataNumber.current = maxStratumId + 1;
                stratumPropertyNumber.current = LC_Properties.current.length + 1;
                stratumCharacteristicNumber.current = LC_Characteristics.current.length + 1;

                // Handle user-defined characteristics
                const createdChars = importer.getCreatedCharacteristics();
                if (createdChars.length > 0) {
                    const updatedUserCharacteristics = LocalStorageManager.getUserCharacteristics();
                    setUserDefinedCharacteristics(updatedUserCharacteristics);

                    toast.current?.show({
                        severity: 'info',
                        summary: 'Auto-Created Characteristics',
                        detail: `Created ${createdChars.length} user-defined characteristics. You can edit these in the User-Defined Characteristics Manager.`,
                        life: 5000
                    });
                }

                // Display any errors (incompatible elements etc.) but still load the file
                if (result.errors.length > 0) {
                    displayImportErrors(result.errors, FileName);
                } else if (result.warnings.length === 0) {
                    toast.current?.show({
                        severity: 'success',
                        summary: 'Import Success',
                        detail: 'The legend import was completed without issues.'
                    });
                }

                // Close upload dialog after delay (longer when there were errors)
                const timeout = result.errors.length > 0 ? 4000 : 2000;
                setTimeout(() => {
                    setFileUploadVisible(false);
                    setRerenderTrigger('Legend Import ' + randomstring.generate(8));
                }, timeout);

            } else {
                // Handle fatal errors (parse failure, missing translation, etc.)
                displayImportErrors(result.errors, FileName);
            }

        } catch (error) {
            console.error('Import error:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Import Failed',
                detail: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    };

    // Helper function to display errors
    const displayImportErrors = (errors: any[], fileName: string) => {
        let errorDisplay = '';

        errors.forEach((error) => {
            if (error.items.length > 0) {
                const itemList = error.items.join(', ');
                let message = '';

                switch (error.type) {
                    case 'format':
                        message = `\\nIncompatible File Format:\\n${itemList}\\nDirectly add these.\\n`;
                        toast.current?.show({
                            severity: 'error',
                            summary: 'File Format Error',
                            detail: message
                        });
                        break;
                    case 'class_characteristic':
                        message = `\\nIncompatible Class Characteristics:\\n${itemList}\\nDirectly add these.\\n`;
                        toast.current?.show({
                            severity: 'error',
                            summary: 'Class Characteristic Error',
                            detail: message
                        });
                        break;
                    case 'block':
                        message = `\\nIncompatible Elements:\\n${itemList}\\nDirectly add these.\\n`;
                        toast.current?.show({
                            severity: 'error',
                            summary: 'Element Error',
                            detail: message
                        });
                        break;
                    case 'characteristic':
                        message = `\\nUnknown Characteristics (not auto-created):\\n${itemList}\\n`;
                        toast.current?.show({
                            severity: 'warn',
                            summary: 'Characteristic Warning',
                            detail: message
                        });
                        break;
                    case 'parsing':
                        message = `\\nParsing Error:\\n${itemList}\\n`;
                        toast.current?.show({
                            severity: 'error',
                            summary: 'Parsing Error',
                            detail: message
                        });
                        break;
                }

                errorDisplay += message;
            }
        });

        // Download error log
        if (errorDisplay) {
            const element = document.createElement('a');
            const file = new Blob([errorDisplay], { type: 'text/plain' });
            element.href = URL.createObjectURL(file);
            element.download = 'LChS_Legend_Import_Issues.log';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
    };

    const [run, setRun] = useState(true);  // Start the tour automatically
    const [stepIndex, setStepIndex] = useState(0);

    const [userDefinedBlocks, setUserDefinedBlocks] = useState<UserDefinedBlock[]>([]);
    const [userDefinedCharacteristics, setUserDefinedCharacteristics] = useState<UserDefinedCharacteristic[]>([]);
    const [visibleStorageManager, setStorageManagerVisible] = useState<boolean>(false);
    const [visibleBlockManager, setBlockManagerVisible] = useState<boolean>(false);
    const [visibleCharacteristicManager, setCharacteristicManagerVisible] = useState<boolean>(false);

    useEffect(() => {
        // Auto-save every 30 seconds
        const autoSaveInterval = setInterval(() => {
            LocalStorageManager.autoSave(
                LC_Legend.current,
                LC_Class.current,
                LC_ClassCharacteristics.current,
                LC_HorizontalPatterns.current,
                LC_Strata.current,
                LC_Properties.current,
                LC_Characteristics.current,
                userDefinedBlocks,
                userDefinedCharacteristics
            );
        }, 30000); // 30 seconds

        return () => clearInterval(autoSaveInterval);
    }, [userDefinedBlocks, userDefinedCharacteristics, rerenderTrigger]);

    /**
     * Adding instanceIndex to Data Structure
     */

    // Ensure all properties have instanceIndex
    if (LC_Properties.current && Array.isArray(LC_Properties.current)) {
        // First pass: Add instanceIndex: 0 to any missing
        LC_Properties.current = LC_Properties.current.map(prop => ({
            ...prop,
            instanceIndex: prop.instanceIndex !== undefined ? prop.instanceIndex : 0
        }));
        
        // Second pass: Group and renumber if multiples exist
        type PropertyGroup = {
            StratumID: number;
            BlockID: number;
            instanceIndex: number;
            [key: string]: any;
        };
        
        const grouped: { [key: string]: PropertyGroup[] } = {};
        
        LC_Properties.current.forEach((prop: PropertyGroup) => {
            const key = `${prop.StratumID}_${prop.BlockID}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(prop);
        });
        
        // Renumber each group
        Object.values(grouped).forEach((group: PropertyGroup[]) => {
            group.forEach((prop: PropertyGroup, index: number) => {
                prop.instanceIndex = index;
            });
        });
    }

    const loadLegendData = (legendData: any) => {
        
        try {
            LC_Legend.current = legendData.LC_Legend;
            LC_Class.current = legendData.LC_Class;
            // Set counter to max class_id + 1
            const maxClassId = legendData.LC_Class.length > 0 
                ? Math.max(...legendData.LC_Class.map(c => c.class_id)) 
                : 0;
            classesNumber.current = maxClassId + 1;
            LC_ClassCharacteristics.current = legendData.LC_ClassCharacteristics;
            LC_HorizontalPatterns.current = legendData.LC_HorizontalPatterns;
            // Set counter to max horizontal_pattern_id + 1
            const maxHPId = legendData.LC_HorizontalPatterns.length > 0 
                ? Math.max(...legendData.LC_HorizontalPatterns.map(hp => hp.horizontal_pattern_id)) 
                : 0;
            horizontalPatternNumber.current = maxHPId + 1;
            LC_Strata.current = legendData.LC_Strata;
            LC_Properties.current = legendData.LC_Properties;
            stratumPropertyNumber.current = legendData.LC_Properties.length + 1;
            LC_Characteristics.current = legendData.LC_Characteristics;
            stratumCharacteristicNumber.current = legendData.LC_Characteristics.length + 1;
            
            if (legendData.userDefinedBlocks) {
                setUserDefinedBlocks(legendData.userDefinedBlocks);
            }
            
            // Load user-defined characteristics with group structure
            if (legendData.userDefinedCharacteristics) {
                //console.log('Loading user-defined characteristics:', legendData.userDefinedCharacteristics.length);
                
                // Ensure all have the group reference
                const charsWithGroup = legendData.userDefinedCharacteristics.map(char => ({
                    ...char,
                    characteristic_group: 900000 // Ensure they're in the User Defined group
                }));
                
                setUserDefinedCharacteristics(charsWithGroup);
                
                // Also save them to local storage
                charsWithGroup.forEach(characteristic => {
                    LocalStorageManager.saveUserCharacteristic(characteristic);
                });
            }
            setRerenderTrigger('Legend Reload'+randomstring.generate(8));
            //console.log('Legend data loaded successfully');
        } catch (error) {
            console.error('Error loading legend data:', error);
            alert('Error loading legend data. Please check the console for details.');
        }
    };

    useEffect(() => {
        // Load user-defined blocks
        const savedBlocks = LocalStorageManager.getUserBlocks();
        setUserDefinedBlocks(savedBlocks);
        
        // Load user-defined characteristics
        const savedCharacteristics = LocalStorageManager.getUserCharacteristics();
        setUserDefinedCharacteristics(savedCharacteristics);
        
        // Load auto-save if available
        const autoSave = LocalStorageManager.loadAutoSave();
        if (autoSave) {
            confirmDialog({
                message: `An auto-save from ${new Date(autoSave.timestamp).toLocaleString()} was found. Would you like to restore it?`,
                header: 'Auto-Save Found',
                icon: 'pi pi-info-circle',
                accept: () => {
                    loadLegendData(autoSave);
                },
                reject: () => {
                    // User declined - do nothing
                }
            });
        }
    }, []);

    const mergedBlocks = useRef<any>(null);
    const [mergedBlockLookUp, setMergedBlockLookUp] = useState<any>([]);
    useEffect(() => {
        // Merge system blocks with user-defined blocks
        if (blocks.current && blocks.current.LC_Block) {
            const systemBlocks = blocks.current.LC_Block;
            let allBlocks = [...systemBlocks, ...userDefinedBlocks];
            
            // Add the "User Defined" block (ID 900000) if there are user-defined characteristics
            if (userDefinedCharacteristics.length > 0) {
                // Check if block 900000 already exists
                const hasUserDefinedBlock = allBlocks.some(block => block.block_id === 900000);
                
                if (!hasUserDefinedBlock) {
                    const userDefinedBlock = {
                        block_id: 900000,
                        block_name: "user_defined",
                        block_label: "User Defined",
                        block_description: "User Defined Characteristics Block",
                        block_icon: "text-xs p-0 m-1 fa-solid fa-user-gear",
                        block_reference: "LC_UserDefinedBlock",
                        elements: [
                            {
                                display_default: "",
                                element_name: "elementPresenceType",
                                element_label: "Element Presence Type",
                                element_type: "Dropdown",
                                element_rules: {
                                    required: true,
                                    order: 0,
                                    min: 0,
                                    max: 0,
                                    unit: "",
                                    symbol: "",
                                    list: "OptionsBus['ElementPresenceTypes']",
                                    options_name: "element_presence_types"
                                }
                            }
                        ],
                        isUserDefined: true
                    };
                    allBlocks = [...allBlocks, userDefinedBlock];
                }
            }
            
            mergedBlocks.current = { LC_Block: allBlocks };
        }
    }, [userDefinedBlocks, userDefinedCharacteristics, blocks]);
    // Add this useEffect to create merged block lookup
    useEffect(() => {
        if (!blockLookUp.current) return;
        
        const baseLookup = blockLookUp.current['LC_Block-LC_Block'] || [];
        
        if (userDefinedBlocks.length > 0 || userDefinedCharacteristics.length > 0) {
            // For each user-defined block, create entries that allow it to work with other blocks
            const userBlockEntries = [];
            
            // Get all existing system blocks
            const existingBlocks = blocks.current?.['LC_Block'] || [];
            
            // Add entries for the User Defined block (900000) if user-defined characteristics exist
            if (userDefinedCharacteristics.length > 0) {
                userBlockEntries.push({
                    block_id: 900000,
                    parent_id: null,
                    description: "User Defined",
                    isUserDefined: true
                });
            }
            
            userDefinedBlocks.forEach(userBlock => {
                // Allow user block to be parent/child of all system blocks
                existingBlocks.forEach(systemBlock => {
                    // User block as parent, system block as child
                    userBlockEntries.push({
                        parent_block_id: userBlock.block_id,
                        child_block_id: systemBlock.block_id,
                        description: `${userBlock.block_label} - ${systemBlock.block_label}`,
                        isUserDefined: true
                    });
                    
                    // System block as parent, user block as child
                    userBlockEntries.push({
                        parent_block_id: systemBlock.block_id,
                        child_block_id: userBlock.block_id,
                        description: `${systemBlock.block_label} - ${userBlock.block_label}`,
                        isUserDefined: true
                    });
                });
                
                // Allow user blocks to work with other user blocks
                userDefinedBlocks.forEach(otherUserBlock => {
                    if (userBlock.block_id !== otherUserBlock.block_id) {
                        userBlockEntries.push({
                            parent_block_id: userBlock.block_id,
                            child_block_id: otherUserBlock.block_id,
                            description: `${userBlock.block_label} - ${otherUserBlock.block_label}`,
                            isUserDefined: true
                        });
                    }
                });
            });
            
            setMergedBlockLookUp({ 'LC_Block-LC_Block': [...baseLookup, ...userBlockEntries] });
        } else {
            setMergedBlockLookUp(blockLookUp.current);
        }
    }, [userDefinedBlocks, userDefinedCharacteristics, rerenderTrigger]);

    const mergedCharacteristics = useRef<any>(null);
    const [mergedCharacteristicLookUp, setMergedCharacteristicLookUp] = useState<any>([]);
    useEffect(() => {
        if (characteristics.current && characteristics.current.LC_Characteristics) {
            const systemCharacteristics = characteristics.current.LC_Characteristics;
            
            if (userDefinedCharacteristics.length > 0) {                
                // Merge: system characteristics + user characteristics
                const allCharacteristics = [
                    ...systemCharacteristics,
                    ...userDefinedCharacteristics
                ];
                
                mergedCharacteristics.current = { LC_Characteristics: allCharacteristics };
            } else {
                mergedCharacteristics.current = characteristics.current;
            }
        }
    }, [userDefinedCharacteristics, characteristics, rerenderTrigger]);
    // Merged characteristic lookup with user-defined entries
    useEffect(() => {
        if (!characteristicLookUp.current) return;
        
        const baseLookup = characteristicLookUp.current['LC_Block-LC_Characteristic'] || [];
        
        if (userDefinedBlocks.length > 0 || userDefinedCharacteristics.length > 0) {
            const userEntries = [];
            
            // User-defined blocks with ALL characteristics (system + user)
            /*userDefinedBlocks.forEach(block => {
                const systemChars = characteristics.current?.['LC_Characteristics'] || [];
                systemChars.forEach(char => {
                    // Only add if characteristic has elements (not just a group)
                    if (char.elements && char.elements.length > 0) {
                        userEntries.push({
                            block_id: block.block_id,
                            characteristic_id: char.characteristic_id,
                            description: `${block.block_label} - ${char.characteristic_label}`,
                            isUserDefined: true
                        });
                    }
                });
                
                // User-defined blocks with user-defined characteristics
                userDefinedCharacteristics.forEach(char => {
                    userEntries.push({
                        block_id: block.block_id,
                        characteristic_id: char.characteristic_id,
                        description: `${block.block_label} - ${char.characteristic_label}`,
                        isUserDefined: true
                    });
                });
            });*/
            
            // ONLY create lookup entries for block 900000 (User Defined block) with user-defined characteristics
            // This ensures user-defined characteristics appear ONLY under the "User Defined" block in the TreeView
            if (userDefinedCharacteristics.length > 0) {
                userDefinedCharacteristics.forEach(char => {
                    userEntries.push({
                        block_id: 900000, // User Defined block ID
                        characteristic_id: char.characteristic_id,
                        description: `User Defined - ${char.characteristic_label}`,
                        isUserDefined: true
                    });
                });
            }
            
            setMergedCharacteristicLookUp({ 'LC_Block-LC_Characteristic': [...baseLookup, ...userEntries] });
        } else {
            setMergedCharacteristicLookUp(characteristicLookUp.current);
        }
    }, [userDefinedBlocks, userDefinedCharacteristics, rerenderTrigger]);

    // Add Semantic Functionality States
    const [similarityAssessmentVisible, setSimilarityAssessmentVisible] = useState(false);
    const [semanticInteroperabilityVisible, setSemanticInteroperabilityVisible] = useState(false);

    return (
        <div className="m-0 p-0 overflow-auto">
            {visibleGuide && <Guide setGuideVisible={setGuideVisible} />}
            <Toast ref={toast} />            
            <ConfirmDialog />
            <ConfirmDialog 
                visible={showUnsavedDialog} 
                onHide={handleCancelNavigation} 
                message="You have unsaved changes. Are you sure you want to discard them?" 
                header="Unsaved Changes" 
                icon="pi pi-exclamation-triangle" 
                acceptClassName='p-button-info'
                acceptLabel="Stay on Page"
                rejectLabel="Discard Changes"
                accept={handleStayOnPage} 
                reject={handleDiscardChanges} 
            />
            <div className="card m-0 p-0 guide-menu" style={{ minHeight: '30px' }}>
                <MenuBar 
                    setLoginVisible={setLoginVisible} 
                    setGuide1Visible={setGuide1Visible}
                    setFileUploadVisible={setFileUploadVisible} 
                    
                    confirm={confirmNewLegend}

                    legendValid={legendValid}
                    setExportVisible={setExportVisible}
                    setGuideVisible={setGuideVisible}

                    setStorageManagerVisible={setStorageManagerVisible}
                    setBlockManagerVisible={setBlockManagerVisible}
                    setCharacteristicManagerVisible={setCharacteristicManagerVisible}

                    setActiveLCElement={safeSetActiveLCElement}

                    setSimilarityAssessmentVisible={setSimilarityAssessmentVisible}
                    setSemanticInteroperabilityVisible={setSemanticInteroperabilityVisible}
                    />
            </div>
            <div className="card flex align-items-top m-0 p-0">
                <SubMenuBar
                    setFileUploadVisible={setFileUploadVisible} 
                    setGuide1Visible={setGuide1Visible}
                    Validator={Validator}
                    
                    blocks={mergedBlocks}
                    characteristics={mergedCharacteristics}
                    elements={elements}
                    LC_Legend={LC_Legend}
                    LC_Class={LC_Class}
                    LC_ClassCharacteristics={LC_ClassCharacteristics}
                    LC_HorizontalPatterns={LC_HorizontalPatterns}
                    LC_Strata={LC_Strata}
                    LC_Properties={LC_Properties}
                    LC_Characteristics={LC_Characteristics}

                    confirm={confirmNewLegend}

                    legendValid={legendValid}
                    setExportVisible={setExportVisible}
                    setGuideVisible={setGuideVisible}

                    setStorageManagerVisible={setStorageManagerVisible}
                    setCharacteristicManagerVisible={setCharacteristicManagerVisible}

                    setActiveLCElement={safeSetActiveLCElement}
                    />
            </div>
            
            {/* New Layout with Resizable Panels */}
            <div style={{ 
                display: 'flex', 
                height: '96vh',
                minHeight: '600px',
                overflow: 'hidden',
                position: 'relative',
                margin: 0,
                padding: 0
            }}>
                {/* Left Panel - Two TreeViews Stacked */}
                <ResizablePanel 
                    position="left"
                    defaultWidth={350}
                    minWidth={250}
                    maxWidth={600}
                    collapsible={true}
                >
                    <div 
                        ref={leftPanelRef}
                        className="vertical-split-panel"
                    >
                        {/* TOP SECTION - Tree 1 */}
                        <div className="resizable-section" style={{ flex: '1 1 50%' }}>
                            <div className="tree-section-content">
                                <TreeView 
                                    UUID={UUID}
                                    legend={legend}
                                    searchObj={searchObj}
                                    rerenderTrigger={rerenderTrigger}
                                    setRerenderTrigger={setRerenderTrigger}

                                    blocks={mergedBlocks}
                                    blockLookUp={{ current: mergedBlockLookUp }}
                                    elements={elements}
                                    LC_Legend={LC_Legend}
                                    LC_Class={LC_Class}
                                    LC_ClassCharacteristics={LC_ClassCharacteristics}
                                    LC_HorizontalPatterns={LC_HorizontalPatterns}
                                    LC_Strata={LC_Strata}
                                    horizontalPatternNumber={horizontalPatternNumber}
                                    strataNumber={strataNumber}
                                    LC_Properties={LC_Properties}
                                    stratumPropertyNumber={stratumPropertyNumber}
                                    LC_Characteristics={LC_Characteristics}

                                    getMaxId={getMaxId}
                                    getNextHPId={getNextHPId}
                                    getNextStratumId={getNextStratumId}
                                    createHorizontalPattern={createHorizontalPattern}
                                    createStratum={createStratum}
                                    addPropertyToStratum={addPropertyToStratum}

                                    activeLCElement={activeLCElement}
                                    setActiveLCElement={safeSetActiveLCElement}
                                    
                                    whichTree="LCMLElements"
                                />
                            </div>
                        </div>

                        <VerticalResizer
                            topMinHeight={150}
                            bottomMinHeight={150}
                            containerRef={leftPanelRef}
                        />

                        {/* BOTTOM SECTION - Tree 2 */}
                        <div className="resizable-section" style={{ flex: '1 1 50%' }}>
                            <div className="tree-section-content">
                                <TreeView 
                                    UUID={UUID}
                                    legend={legend}
                                    searchObj={searchObj}
                                    rerenderTrigger={rerenderTrigger}
                                    setRerenderTrigger={setRerenderTrigger}

                                    blocks={mergedBlocks}
                                    blockLookUp={{ current: mergedBlockLookUp }}
                                    elements={elements}
                                    LC_Legend={LC_Legend}
                                    LC_Class={LC_Class}
                                    LC_ClassCharacteristics={LC_ClassCharacteristics}
                                    LC_HorizontalPatterns={LC_HorizontalPatterns}
                                    LC_Strata={LC_Strata}
                                    horizontalPatternNumber={horizontalPatternNumber}
                                    strataNumber={strataNumber}
                                    LC_Properties={LC_Properties}
                                    stratumPropertyNumber={stratumPropertyNumber}
                                    LC_Characteristics={LC_Characteristics}

                                    getMaxId={getMaxId}
                                    getNextHPId={getNextHPId}
                                    getNextStratumId={getNextStratumId}
                                    createHorizontalPattern={createHorizontalPattern}
                                    createStratum={createStratum}
                                    addPropertyToStratum={addPropertyToStratum}

                                    activeLCElement={activeLCElement}
                                    setActiveLCElement={safeSetActiveLCElement}
                                    
                                    whichTree="Legend"
                                />
                            </div>
                        </div>
                    </div>
                </ResizablePanel>

                {/* Middle Panel - Mermaid Chart */}
                <div style={{ 
                    flex: 1, 
                    overflow: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeft: '1px solid var(--surface-border)',
                    borderRight: '1px solid var(--surface-border)',
                    position: 'relative',
                    backgroundColor: 'var(--surface-card)'
                }}>
                    <Flow 
                        rerenderTrigger={rerenderTrigger}
                        translator={translator}
                        setRerenderTrigger={setRerenderTrigger}
                        blocks={mergedBlocks}
                        blockLookUp={{ current: mergedBlockLookUp }}
                        options={options}
                        normalizeColor={normalizeColor}
                        
                        legend={legend}
                        characteristicLookUp={{ current: mergedCharacteristicLookUp }}
                        characteristics={mergedCharacteristics}
                        
                        LC_Legend={LC_Legend}
                        LC_Class={LC_Class}
                        LC_ClassCharacteristics={LC_ClassCharacteristics}
                        LC_HorizontalPatterns={LC_HorizontalPatterns}
                        LC_Strata={LC_Strata}
                        LC_Properties={LC_Properties}
                        LC_Characteristics={LC_Characteristics}
                        
                        legendValid={legendValid}

                        activeLCElement={activeLCElement}
                        setActiveLCElement={safeSetActiveLCElement}

                        triggerFullExport={triggerFullExport}
                        setFullExport={setFullExport}
                    />
                </div>

                {/* Right Panel - Properties and Characteristics Stacked */}
                <ResizablePanel 
                    position="right"
                    collapsed={rightPanelCollapsed}
                    onCollapsedChange={setRightPanelCollapsed}
                    defaultWidth={500}
                    minWidth={350}
                    maxWidth={900}
                    collapsible={true}
                >
                    <div 
                        ref={rightPanelRef}
                        className="vertical-split-panel"
                    >
                        {/* TOP SECTION - Properties */}
                        <div className="resizable-section guide-properties" style={{ flex: '1 1 50%', backgroundColor: 'var(--highlight-bg)' }}>
                            <div className="section-content-wrapper">                                
                                <div style={{ zIndex: 99, position: 'fixed', backgroundColor: '#eee', color: '#333', opacity: 0.8, width: '100%', padding: '2px' }}>Properties:</div>
                                <div>&nbsp;</div>
                                <Properties
                                    UUID={UUID}
                                    legend={legend}
                                    rerenderTrigger={rerenderTrigger}
                                    setRerenderTrigger={setRerenderTrigger}
                                    
                                    blocks={mergedBlocks}
                                    elements={elements}
                                    options={options}
                                    
                                    LC_Legend={LC_Legend}
                                    LC_Class={LC_Class}
                                    classesNumber={classesNumber}
                                    LC_ClassCharacteristics={LC_ClassCharacteristics}
                                    LC_HorizontalPatterns={LC_HorizontalPatterns}
                                    horizontalPatternNumber={horizontalPatternNumber}
                                    LC_Strata={LC_Strata}
                                    strataNumber={strataNumber}

                                    LC_Properties={LC_Properties}
                                    stratumPropertyNumber={stratumPropertyNumber}
                                    LC_Characteristics={LC_Characteristics}
                                    stratumCharacteristicNumber={stratumCharacteristicNumber}

                                    getMaxId={getMaxId}
                                    getNextClassId={getNextClassId}
                                    getNextHPId={getNextHPId}
                                    getNextStratumId={getNextStratumId}
                                    createHorizontalPattern={createHorizontalPattern}
                                    createStratum={createStratum}

                                    activeLCElement={activeLCElement}
                                    setActiveLCElement={setActiveLCElement}

                                    displayFormElements={displayFormElements}
                                    control={control}
                                    errors={errors}
                                    handleSubmit={handleSubmit}
                                    getValues={getValues}
                                    fields={fields}
                                    append={append}
                                    remove={remove}
                                    move={move}
                                    insert={insert}
                                    setValue={setValue}
                                    watch={watch}
                                    reset={reset}

                                    LC_Objectfilter={LC_Objectfilter}

                                    formReconfig={formReconfig}

                                    isNavigationDialogVisible={isNavigationDialogVisible}
                                    userChoseToStay={userChoseToStay}
                                    onFormDirtyChange={setHasUnsavedChanges}
                                />
                            </div>
                        </div>

                        <VerticalResizer
                            topMinHeight={150}
                            bottomMinHeight={150}
                            containerRef={rightPanelRef}
                        />

                        {/* BOTTOM SECTION - Characteristics */}
                        <div className="resizable-section guide-characteristics" style={{ flex: '1 1 50%', backgroundColor: 'var(--highlight-bg)' }}>
                            <div className="section-content-wrapper">
                                <div style={{ zIndex: 99, position: 'fixed', backgroundColor: '#eee', color: '#333', opacity: 0.8, width: '100%', padding: '2px' }}>Characteristics:</div>
                                <div style={{ backgroundColor: 'white' }}>&nbsp;</div>
                                <Characteristics
                                    UUID={UUID}
                                    legend={legend}
                                    rerenderTrigger={rerenderTrigger}
                                    setRerenderTrigger={setRerenderTrigger}

                                    blocks={mergedBlocks}
                                    elements={elements}
                                    options={options}
                                    characteristics={mergedCharacteristics}
                                    characteristicLookUp={{ current: mergedCharacteristicLookUp }}
                                    
                                    LC_Legend={LC_Legend}
                                    LC_Class={LC_Class}
                                    LC_ClassCharacteristics={LC_ClassCharacteristics}
                                    LC_HorizontalPatterns={LC_HorizontalPatterns}
                                    LC_Strata={LC_Strata}
                                    
                                    LC_Properties={LC_Properties}
                                    stratumPropertyNumber={stratumPropertyNumber}
                                    LC_Characteristics={LC_Characteristics}
                                    stratumCharacteristicNumber={stratumCharacteristicNumber}

                                    activeLCElement={activeLCElement}
                                    setActiveLCElement={setActiveLCElement}

                                    displayFormElements={displayFormElements}
                                    control={control}
                                    errors={errors}
                                    unregister={unregister}
                                    handleSubmit={handleSubmit}
                                    getValues={getValues}
                                    setValue={setValue}
                                    watch={watch}
                                    reset={reset}

                                    LC_Objectfilter={LC_Objectfilter}

                                    OptionsBus={OptionsBus}
                                    formReconfig={formReconfig}

                                    onFormDirtyChange={setHasUnsavedChanges}
                                    isNavigationDialogVisible={isNavigationDialogVisible}
                                    userChoseToStay={userChoseToStay}                                    
                                />
                            </div>
                        </div>
                    </div>
                </ResizablePanel>
            </div>

            <div className="card flex justify-content-center">
                <Button icon="pi pi-eye-slash" label="<LCML />" onClick={() => setSideBarVisible(true)} style={{ position: 'absolute', bottom: 0, right: 0, height: '25px', backgroundColor: 'var(--highlight-bg)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)', padding: '5px', fontSize: 'xx-small' }} size="small" />
                
                <Sidebar header={LCMLHeader} visible={visibleSideBar} onHide={() => setSideBarVisible(false)} icons={customIcons} className="p-sidebar-lg" >
                    <LCMLEditor
                        rerenderTrigger={rerenderTrigger}
                        blocks={mergedBlocks}
                        LC_Legend={LC_Legend}
                        LC_Class={LC_Class}
                        LC_ClassCharacteristics={LC_ClassCharacteristics}
                        LC_HorizontalPatterns={LC_HorizontalPatterns}
                        LC_Strata={LC_Strata}
                        LC_Properties={LC_Properties}
                        LC_Characteristics={LC_Characteristics}

                        legendValid={legendValid}
                        />
                </Sidebar>         
            </div>

            <div className="card flex justify-content-center">
                <Dialog header={guideTransition(1)} maximizable visible={visibleGuide1} style={{ width: '50vw' }} onHide={() => {setGuide1Visible(false);setRerenderTrigger('Legend');}} >
                    <GuideLegendCreation 
                        UUID={UUID} 
                        legend={legend}
                        setRerenderTrigger={setRerenderTrigger}

                        setGuide1Visible={setGuide1Visible} 
                        setGuide2Visible={setGuide2Visible} 
                        
                        LC_Legend={LC_Legend}
                        />
                </Dialog>
                <Dialog header={guideTransition(2)} maximizable visible={visibleGuide2} style={{ width: '50vw' }} onHide={() => {setGuide2Visible(false);setRerenderTrigger('Class');}} >
                    <GuideLegendCreation2 
                        UUID={UUID}
                        legend={legend}
                        classCharacteristics={classCharacteristics}
                        setRerenderTrigger={setRerenderTrigger}

                        setGuide1Visible={setGuide1Visible} 
                        setGuide2Visible={setGuide2Visible} 
                        setGuide3Visible={setGuide3Visible}
                        
                        LC_Legend={LC_Legend}
                        LC_Class={LC_Class}
                        classesNumber={classesNumber}
                        getNextClassId={getNextClassId}
                        LC_ClassCharacteristics={LC_ClassCharacteristics}
                        LC_HorizontalPatterns={LC_HorizontalPatterns}
                        LC_Strata={LC_Strata}
                        horizontalPatternNumber={horizontalPatternNumber}
                        strataNumber={strataNumber}
                        LC_Properties={LC_Properties}
                        stratumPropertyNumber={stratumPropertyNumber}
                        LC_Characteristics={LC_Characteristics}
                        stratumCharacteristicNumber={stratumCharacteristicNumber}
                        
                        displayFormElements={displayFormElements}
                        control={control}
                        errors={errors}
                        register={register}
                        unregister={unregister}
                        handleSubmit={handleSubmit}
                        getValues={getValues}
                        setValue={setValue}
                        watch={watch}
                        reset={reset}
                        normalizeColor={normalizeColor}

                        searchObjKeyVal={searchObjKeyVal}
                        OptionsBus={OptionsBus}
                        />
                </Dialog>
                <Dialog header={guideTransition(3)} maximizable visible={visibleGuide3} style={{ width: '50vw' }} onHide={() => {setGuide3Visible(false);setRerenderTrigger('Strata');}} >
                    <GuideLegendCreation3 
                        UUID={UUID}
                        setRerenderTrigger={setRerenderTrigger}

                        setGuide2Visible={setGuide2Visible} 
                        setGuide3Visible={setGuide3Visible} 
                        setGuide4Visible={setGuide4Visible}

                        LC_Class={LC_Class}
                        LC_HorizontalPatterns={LC_HorizontalPatterns}
                        LC_Strata={LC_Strata}
                        horizontalPatternNumber={horizontalPatternNumber}
                        getNextHPId={getNextHPId}
                        strataNumber={strataNumber}

                        LC_Properties={LC_Properties}
                        stratumPropertyNumber={stratumPropertyNumber}
                        LC_Characteristics={LC_Characteristics}
                        stratumCharacteristicNumber={stratumCharacteristicNumber}

                        OptionsBus={OptionsBus}

                        validateRange={validateRange}
                        />
                </Dialog>                
                <Dialog header={guideTransition(4)} maximizable visible={visibleGuide4} style={{ width: '50vw' }} onHide={() => {setGuide4Visible(false);setRerenderTrigger('HP');}} >
                    <GuideLegendCreation4
                        UUID={UUID}
                        setRerenderTrigger={setRerenderTrigger}

                        setGuide3Visible={setGuide3Visible} 
                        setGuide4Visible={setGuide4Visible}
                        setGuide5Visible={setGuide5Visible}

                        LC_Class={LC_Class}
                        LC_HorizontalPatterns={LC_HorizontalPatterns}
                        LC_Strata={LC_Strata}
                        horizontalPatternNumber={horizontalPatternNumber}
                        strataNumber={strataNumber}
                        getNextStratumId={getNextStratumId}

                        LC_Properties={LC_Properties}
                        stratumPropertyNumber={stratumPropertyNumber}
                        LC_Characteristics={LC_Characteristics}
                        stratumCharacteristicNumber={stratumCharacteristicNumber}

                        OptionsBus={OptionsBus}

                        validateRange={validateRange}
                        />
                </Dialog>
                <Dialog header={guideTransition(5)} maximizable visible={visibleGuide5} style={{ width: '50vw' }} onHide={() => {setGuide5Visible(false);setRerenderTrigger('Elements');}} >
                    <GuideLegendCreation5
                        UUID={UUID}
                        searchObjKeyVal={searchObjKeyVal}
                        setRerenderTrigger={setRerenderTrigger}

                        setGuide4Visible={setGuide4Visible} 
                        setGuide5Visible={setGuide5Visible}

                        blockLookUp={{ current: mergedBlockLookUp }}
                        blocks={mergedBlocks}
                        characteristicLookUp={{ current: mergedCharacteristicLookUp }}
                        characteristics={mergedCharacteristics}
                        elements={elements}

                        LC_Class={LC_Class}
                        LC_HorizontalPatterns={LC_HorizontalPatterns}
                        LC_Strata={LC_Strata}

                        LC_Properties={LC_Properties}
                        stratumPropertyNumber={stratumPropertyNumber}
                        LC_Characteristics={LC_Characteristics}
                        stratumCharacteristicNumber={stratumCharacteristicNumber}

                        OptionsBus={OptionsBus}
                        options={options}

                        validateRange={validateRange}
                        />
                </Dialog>
            </div>
            <div className="card flex justify-content-center m-0 p-0">
                <Dialog header={LegendImportHeader} visible={visibleFileUpload} style={{ width: '50vw' }} onHide={() =>{setFileUploadVisible(false);setRerenderTrigger('Legend Import');}}>
                    <LegendLoader 
                        UUID={UUID}
                        translator={translator}
                        legend={legend}
                        searchObj={searchObj}
                        searchObjKeyVal={searchObjKeyVal}
                        setRerenderTrigger={setRerenderTrigger}

                        setFileUploadVisible={setFileUploadVisible}

                        blocks={mergedBlocks}
                        characteristics={mergedCharacteristics}
                        characteristicLookUp={{ current: mergedCharacteristicLookUp }}
                        elements={elements}
                        LC_Legend={LC_Legend}
                        LC_Class={LC_Class}
                        classesNumber={classesNumber}
                        LC_ClassCharacteristics={LC_ClassCharacteristics}
                        LC_HorizontalPatterns={LC_HorizontalPatterns}
                        LC_Strata={LC_Strata}
                        horizontalPatternNumber={horizontalPatternNumber}
                        strataNumber={strataNumber}
                        LC_Properties={LC_Properties}
                        stratumPropertyNumber={stratumPropertyNumber}
                        LC_Characteristics={LC_Characteristics}
                        stratumCharacteristicNumber={stratumCharacteristicNumber}

                        translateLegend={translateLegend}
                        />
                </Dialog>
                <Sidebar header={ExportHeader} visible={visibleExport} onHide={() => setExportVisible(false)} className="p-sidebar-s" >
                    <Export
                        UUID={UUID}
                        translator={translator}
                        Validator={Validator}
                        searchObj={searchObj}
                        searchObjKeyVal={searchObjKeyVal}

                        blocks={mergedBlocks}
                        characteristics={mergedCharacteristics}
                        characteristicLookUp={{ current: mergedCharacteristicLookUp }}
                        legend={legend}

                        LC_Legend={LC_Legend}
                        LC_Class={LC_Class}
                        LC_ClassCharacteristics={LC_ClassCharacteristics}
                        LC_HorizontalPatterns={LC_HorizontalPatterns}
                        LC_Strata={LC_Strata}
                        LC_Properties={LC_Properties}
                        LC_Characteristics={LC_Characteristics}

                        legendValid={legendValid}
                        setExportVisible={setExportVisible}
                        setFullExport={setFullExport}
                        />
                </Sidebar>

                {/* Storage Manager */}
                <LegendStorageManager
                    visible={visibleStorageManager}
                    setVisible={setStorageManagerVisible}
                    LC_Legend={LC_Legend}
                    LC_Class={LC_Class}
                    LC_ClassCharacteristics={LC_ClassCharacteristics}
                    LC_HorizontalPatterns={LC_HorizontalPatterns}
                    LC_Strata={LC_Strata}
                    LC_Properties={LC_Properties}
                    LC_Characteristics={LC_Characteristics}
                    userDefinedBlocks={userDefinedBlocks}
                    userDefinedCharacteristics={userDefinedCharacteristics}
                    onLoadLegend={loadLegendData}
                    setRerenderTrigger={setRerenderTrigger}
                />
                
                {/* User-Defined Blocks Manager */}
                <UserDefinedBlockManager
                    visible={visibleBlockManager}
                    setVisible={setBlockManagerVisible}
                    userDefinedBlocks={userDefinedBlocks}
                    onBlocksUpdate={setUserDefinedBlocks}
                    setRerenderTrigger={setRerenderTrigger}
                />
                
                {/* User-Defined Characteristics Manager */}
                <UserDefinedCharacteristicManager
                    visible={visibleCharacteristicManager}
                    setVisible={setCharacteristicManagerVisible}
                    userDefinedCharacteristics={userDefinedCharacteristics}
                    onCharacteristicsUpdate={setUserDefinedCharacteristics}
                    setRerenderTrigger={setRerenderTrigger}
                />

                {/* New Symantic Interoperability */}
                <Dialog
                    visible={similarityAssessmentVisible}
                    onHide={() => setSimilarityAssessmentVisible(false)}
                    maximizable
                    modal
                    header="Similarity Assessment"
                    style={{ width: '95vw', height: '95vh' }}
                    contentStyle={{ height: '100%', padding: 0 }}
                >
                    <SimilarityAssessment
                        UUID={UUID}
                        translator={translator}
                        legendTemplate={legendTemplate}

                        blocks={blocks}
                        elements={elements}
                        options={options}
                        characteristics={characteristics}
                        characteristicLookUp={characteristicLookUp}

                        setSimilarityAssessmentVisible={setSimilarityAssessmentVisible}
                    />
                </Dialog>
                <Dialog
                    visible={semanticInteroperabilityVisible}
                    onHide={() => setSemanticInteroperabilityVisible(false)}
                    maximizable
                    modal
                    header="Legend Connector"
                    style={{ width: '95vw', height: '95vh' }}
                    contentStyle={{ height: '100%', padding: 0 }}
                >
                    <SemanticInteroperability
                        legend={legend}
                        blocks={mergedBlocks.current}
                        blockLookUp={mergedBlockLookUp}
                        characteristics={mergedCharacteristics.current}
                        characteristicLookUp={mergedCharacteristicLookUp}
                        onComplete={() => setSemanticInteroperabilityVisible(false)}
                        onCancel={() => setSemanticInteroperabilityVisible(false)}
                    />
                </Dialog>
            </div>
        </div>
    );
}