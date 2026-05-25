/**
 * LegendImporter.tsx
 * 
 * Unified legend import and translation system for LChS.
 * Consolidates import logic from UserInterface.tsx, StepUpload.tsx, and Upload.tsx
 * into a single, maintainable component.
 * 
 * Features:
 * - Supports LCHS, LCCS/XML, and CSV legend formats
 * - Recursive processing of properties and characteristics
 * - User-defined characteristic creation (configurable)
 * - Comprehensive error handling and validation
 * - Configurable for different subsystem requirements
 */

import { parseString, processors } from 'xml2js';
import Papa from 'papaparse';
import { searchObjKeyVal, fuzzySearchObjKeyVal } from '../App';
import { LocalStorageManager, UserDefinedCharacteristic } from './LocalStorageManager';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LegendImportConfig {
    /** Enable user-defined characteristic auto-creation */
    autoCreateCharacteristics?: boolean;
    /** Maximum recursion depth for nested structures */
    maxRecursionDepth?: number;
    /** Presence type for CSV imports (default: 'Fixed') */
    defaultPresenceType?: string;
    /** Include validation errors in result */
    includeValidationErrors?: boolean;
    /** Custom error handler */
    onError?: (error: LegendImportError) => void;
}

export interface LegendImportResult {
    success: boolean;
    legend?: LegendData;
    errors: LegendImportError[];
    warnings: string[];
}

export interface LegendImportError {
    type: 'format' | 'class_characteristic' | 'block' | 'characteristic' | 'parsing';
    items: string[];
    message?: string;
}

export interface LegendData {
    LC_Legend: any;
    LC_Class: any[];
    LC_ClassCharacteristics: any;
    LC_HorizontalPatterns: any[];
    LC_Strata: any[];
    LC_Properties: any[];
    LC_Characteristics: any[];
}

export interface TranslationData {
    lchs?: any;
    lccs?: any;
    xml?: any;
    csv?: any;
}

export interface ReferenceData {
    blocks: { current: any };
    characteristics: { current: any };
}

// ============================================================================
// MAIN LEGEND IMPORTER CLASS
// ============================================================================

export class LegendImporter {
    private translator: TranslationData;
    private referenceData: ReferenceData;
    private config: Required<LegendImportConfig>;
    private errors: LegendImportError[] = [];
    private warnings: string[] = [];
    private createdCharacteristics: UserDefinedCharacteristic[] = [];
    
    // Counters for generating IDs
    private classesNumber = 1;
    private horizontalPatternNumber = 1;
    private strataNumber = 1;
    private stratumPropertyNumber = 1;
    private stratumCharacteristicNumber = 1;

    constructor(
        translator: TranslationData,
        referenceData: ReferenceData,
        config: LegendImportConfig = {}
    ) {
        this.translator = translator;
        this.referenceData = referenceData;
        
        // Set default configuration
        this.config = {
            autoCreateCharacteristics: config.autoCreateCharacteristics ?? true,
            maxRecursionDepth: config.maxRecursionDepth ?? 10,
            defaultPresenceType: config.defaultPresenceType ?? 'Fixed',
            includeValidationErrors: config.includeValidationErrors ?? true,
            onError: config.onError ?? (() => {})
        };
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Import a legend from file content
     */
    async importLegend(
        content: string,
        filename: string,
        fileType: 'lchs' | 'lccs' | 'xml' | 'csv'
    ): Promise<LegendImportResult> {
        this.resetState();

        try {
            let legendData: LegendData;

            switch (fileType) {
                case 'lchs':
                case 'lccs':
                case 'xml':
                    legendData = await this.parseLCMLFile(content, filename, fileType);
                    break;
                case 'csv':
                    legendData = await this.parseCSVFile(content, filename);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }

            return {
                success: this.errors.length === 0,
                legend: legendData,
                errors: this.errors,
                warnings: this.warnings
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.addError('parsing', [errorMessage]);
            return {
                success: false,
                errors: this.errors,
                warnings: this.warnings
            };
        }
    }

    /**
     * Get list of characteristics created during import
     */
    getCreatedCharacteristics(): UserDefinedCharacteristic[] {
        return [...this.createdCharacteristics];
    }

    // ========================================================================
    // PRIVATE: STATE MANAGEMENT
    // ========================================================================

    private resetState(): void {
        this.errors = [];
        this.warnings = [];
        this.createdCharacteristics = [];
        this.classesNumber = 1;
        this.horizontalPatternNumber = 1;
        this.strataNumber = 1;
        this.stratumPropertyNumber = 1;
        this.stratumCharacteristicNumber = 1;
    }

    private addError(type: LegendImportError['type'], items: string[], message?: string): void {
        const error: LegendImportError = { type, items, message };
        this.errors.push(error);
        this.config.onError(error);
    }

    // ========================================================================
    // PRIVATE: LCML FILE PARSING (LCHS, LCCS, XML)
    // ========================================================================

    private async parseLCMLFile(
        content: string,
        filename: string,
        fileType: 'lchs' | 'lccs' | 'xml'
    ): Promise<LegendData> {
        return new Promise((resolve, reject) => {
            parseString(
                content,
                {
                    trim: true,
                    explicitArray: false,
                    attrValueProcessors: [processors.parseBooleans, processors.parseNumbers],
                    valueProcessors: [processors.parseBooleans, processors.parseNumbers]
                },
                (err, result) => {
                    if (err) {
                        reject(new Error(`XML parsing error: ${err.message}`));
                        return;
                    }

                    try {
                        let legendData: LegendData;

                        if (fileType === 'lchs') {
                            legendData = this.parseLCHSFormat(result);
                        } else {
                            legendData = this.parseLCCSFormat(result, filename, fileType);
                        }

                        resolve(legendData);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Parse LCHS native format (no translation needed)
     */
    private parseLCHSFormat(result: any): LegendData {
        const legendRoot = result['LC_Legend'];
        
        // Parse class characteristics
        let ClassXteristic: any = {};
        if (legendRoot['objects']?.['LC_ClassCharacteristics']) {
            Object.entries(legendRoot['objects']['LC_ClassCharacteristics']).forEach(
                ([key, value]: [string, any]) => {
                    ClassXteristic = { ...ClassXteristic, [key.replace("_", "")]: value };
                }
            );
        }

        // Extract and normalize arrays
        const LC_Class = this.ensureArray(legendRoot['objects']?.['LC_Class'] || []);
        const LC_HorizontalPatterns = this.ensureArray(
            legendRoot['objects']?.['LC_HorizontalPatterns'] || []
        );
        const LC_Strata = this.ensureArray(legendRoot['objects']?.['LC_Strata'] || []);
        const LC_Properties = this.ensureArray(legendRoot['objects']?.['LC_Properties'] || []);
        const LC_Characteristics = this.ensureArray(
            legendRoot['objects']?.['LC_Characteristics'] || []
        );

        // Update counters
        this.classesNumber = LC_Class.length + 1;
        this.horizontalPatternNumber = this.getMaxId(LC_HorizontalPatterns, 'horizontal_pattern_id') + 1;
        this.strataNumber = this.getMaxId(LC_Strata, 'stratumID') + 1;
        this.stratumPropertyNumber = LC_Properties.length + 1;
        this.stratumCharacteristicNumber = LC_Characteristics.length + 1;

        return {
            LC_Legend: legendRoot['$'],
            LC_Class,
            LC_ClassCharacteristics: ClassXteristic,
            LC_HorizontalPatterns,
            LC_Strata,
            LC_Properties,
            LC_Characteristics
        };
    }

    /**
     * Parse LCCS/XML format (requires translation)
     */
    private parseLCCSFormat(result: any, filename: string, fileType: string): LegendData {
        const translation = this.translator[fileType];
        if (!translation) {
            throw new Error(`No translation available for ${fileType} files`);
        }

        // Initialize legend data
        const legendData: LegendData = {
            LC_Legend: {
                id: 1,
                legend_name: filename,
                legend_description: 'LCHS LCCS Translator',
                legend_author: filename
            },
            LC_Class: [],
            LC_ClassCharacteristics: {},
            LC_HorizontalPatterns: [],
            LC_Strata: [],
            LC_Properties: [],
            LC_Characteristics: []
        };

        // Extract classes from LCCS structure
        let classesData =
            result.elements?.LC_LandCoverClass ||
            result['LC_Legend']?.elements?.LC_LandCoverClass ||
            [];
        classesData = this.ensureArray(classesData);

        // Track maximum IDs
        let MaxClassID = 0;
        let MaxHPID = 0;
        let MaxStratumID = 0;

        // Process each class
        classesData.forEach((clss: any) => {
            const classResult = this.processLCCSClass(
                clss,
                translation,
                MaxClassID,
                MaxHPID,
                MaxStratumID
            );

            legendData.LC_Class.push(classResult.classData);
            legendData.LC_ClassCharacteristics[classResult.classData.class_id] =
                classResult.classCharacteristics;
            legendData.LC_HorizontalPatterns.push(...classResult.horizontalPatterns);
            legendData.LC_Strata.push(...classResult.strata);
            legendData.LC_Properties.push(...classResult.properties);
            legendData.LC_Characteristics.push(...classResult.characteristics);

            // Update max IDs
            MaxClassID = Math.max(MaxClassID, classResult.classData.class_id);
            MaxHPID = Math.max(MaxHPID, ...classResult.horizontalPatterns.map(hp => hp.horizontal_pattern_id));
            MaxStratumID = Math.max(MaxStratumID, ...classResult.strata.map(s => s.stratumID));
        });

        // Update counters
        this.classesNumber = MaxClassID + 1;
        this.horizontalPatternNumber = MaxHPID + 1;
        this.strataNumber = MaxStratumID + 1;

        return legendData;
    }

    /**
     * Process a single LCCS class
     */
    private processLCCSClass(
        clss: any,
        translation: any,
        startClassId: number,
        startHPId: number,
        startStratumId: number
    ): {
        classData: any;
        classCharacteristics: any;
        horizontalPatterns: any[];
        strata: any[];
        properties: any[];
        characteristics: any[];
    } {
        let classId = 0;
        let className = '';
        let classDescription = '';
        let classMapCode = '';
        let classColorCode = 'BDBDBD';
        const classCharacteristics: any = {};

        // Extract basic class information
        Object.entries(clss).forEach(([key, value]: [string, any]) => {
            if (key === '$') {
                classId = parseInt(value['id'], 16);
                if (value['name']) className = value['name'];
                if (value['description']) classDescription = value['description'];
                if (value['code']) classMapCode = value['code'];
                if (value['color']) classColorCode = value['color'];
            } else if (key === 'name') {
                className = value;
            } else if (key === 'description') {
                classDescription = value;
            } else if (key === 'map_code' || key === 'code') {
                classMapCode = value;
            } else if (key === 'color') {
                classColorCode = value;
            }
        });

        const classData = {
            legend_id: 1,
            class_id: classId || startClassId + 1,
            class_name: className || `Class ${classId || startClassId + 1}`,
            class_description: classDescription || '',
            class_map_code: classMapCode || `C${classId || startClassId + 1}`,
            class_color_code: classColorCode
        };

        // Process class characteristics and patterns
        const horizontalPatterns: any[] = [];
        const strata: any[] = [];
        const properties: any[] = [];
        const characteristics: any[] = [];

        Object.entries(clss).forEach(([key, value]: [string, any]) => {
            if (key === 'elements') {
                // Process class-level characteristics
                const classChars = this.ensureArray(value['LC_Characteristic'] || []);
                classChars.forEach((char: any) => {
                    this.processClassCharacteristic(
                        char,
                        translation,
                        classCharacteristics
                    );
                });

                // Process horizontal patterns
                const patterns = this.ensureArray(value['LC_HorizontalPattern'] || []);
                patterns.forEach((pattern: any) => {
                    const patternResult = this.processLCCSHorizontalPattern(
                        pattern,
                        classData.class_id,
                        translation,
                        startHPId + horizontalPatterns.length,
                        startStratumId + strata.length
                    );

                    horizontalPatterns.push(patternResult.patternData);
                    strata.push(...patternResult.strata);
                    properties.push(...patternResult.properties);
                    characteristics.push(...patternResult.characteristics);
                });
            }
        });

        return {
            classData,
            classCharacteristics,
            horizontalPatterns,
            strata,
            properties,
            characteristics
        };
    }

    /**
     * Process class-level characteristic
     */
    private processClassCharacteristic(
        char: any,
        translation: any,
        classCharacteristics: any
    ): void {
        const xsiType = char['$']?.['xsi:type'];
        if (!xsiType) return;

        let charRef = xsiType;
        const translatedChar = searchObjKeyVal(
            translation['LC_ClassCharacteristics'],
            'Translation',
            xsiType
        );
        if (translatedChar[0]) {
            charRef = translatedChar[0]['LChS_EquivalentElement'];
        }

        Object.entries(char).forEach(([key, value]: [string, any]) => {
            if (key !== '$') {
                const transKey = searchObjKeyVal(
                    translation['LC_ClassCharacteristicElements'],
                    'Translation',
                    `['${xsiType}']['${key}']`
                );

                const finalKey = transKey[0]?.['LChS_EquivalentElement'] || key;

                if (typeof value === 'object' && !Array.isArray(value)) {
                    const range = this.extractRange(value);
                    if (range) {
                        classCharacteristics[charRef] = {
                            ...classCharacteristics[charRef],
                            [finalKey]: range
                        };
                    }
                } else {
                    classCharacteristics[charRef] = {
                        ...classCharacteristics[charRef],
                        [finalKey]: value
                    };
                }
            }
        });
    }

    /**
     * Process a horizontal pattern from LCCS format
     */
    private processLCCSHorizontalPattern(
        pattern: any,
        classId: number,
        translation: any,
        startHPId: number,
        startStratumId: number
    ): {
        patternData: any;
        strata: any[];
        properties: any[];
        characteristics: any[];
    } {
        let HPID = startHPId;
        const patternData: any = {
            class_id: classId,
            horizontal_pattern_id: HPID
        };

        const strata: any[] = [];
        const properties: any[] = [];
        const characteristics: any[] = [];

        // Extract pattern metadata and properties
        Object.entries(pattern).forEach(([key, value]: [string, any]) => {
            if (key === '$') {
                HPID = parseInt(value['id'], 16) || HPID;
                patternData.horizontal_pattern_id = HPID;
            } else if (key !== 'elements') {
                const transPattern = searchObjKeyVal(
                    translation['LC_HorizontalPatternElements'],
                    'Translation',
                    key
                );
                const finalKey = transPattern[0]?.['LChS_EquivalentElement'] || key;

                const range = this.extractRange(value);
                patternData[finalKey] = range || value;
            } else if (key === 'elements') {
                // Process strata
                const strataItems = this.ensureArray(value['LC_Stratum'] || []);
                strataItems.forEach((stratum: any) => {
                    const stratumResult = this.processLCCSStratum(
                        stratum,
                        HPID,
                        translation,
                        startStratumId + strata.length
                    );

                    strata.push(stratumResult.stratumData);
                    properties.push(...stratumResult.properties);
                    characteristics.push(...stratumResult.characteristics);
                });
            }
        });

        return { patternData, strata, properties, characteristics };
    }

    /**
     * Process a stratum from LCCS format
     */
    private processLCCSStratum(
        stratum: any,
        HPID: number,
        translation: any,
        startStratumId: number
    ): {
        stratumData: any;
        properties: any[];
        characteristics: any[];
    } {
        let StratumID = startStratumId;
        const stratumData: any = {
            HPID,
            stratumID: StratumID
        };

        const properties: any[] = [];
        const characteristics: any[] = [];

        // Extract stratum metadata and properties
        Object.entries(stratum).forEach(([key, value]: [string, any]) => {
            if (key === '$') {
                StratumID = parseInt(value['id'], 16) || StratumID;
                stratumData.stratumID = StratumID;
            } else if (key !== 'elements') {
                const transStratum = searchObjKeyVal(
                    translation['LC_StratumElements'],
                    'Translation',
                    key
                );
                const finalKey = transStratum[0]?.['LChS_EquivalentElement'] || key;

                const range = this.extractRange(value);
                stratumData[finalKey] = range || value;
            } else if (key === 'elements') {
                // Process land cover elements (properties)
                const elements = this.ensureArray(value['LC_LandCoverElement'] || []);
                
                // Track instance index for multiple elements
                let instanceIndex = 0;
                
                elements.forEach((element: any) => {
                    const elementResult = this.processLCCSLandCoverElement(
                        element,
                        StratumID,
                        translation
                    );

                    if (elementResult.propertyData) {
                        // Add instance index if there are multiple elements
                        if (elements.length > 1) {
                            elementResult.propertyData.instanceIndex = instanceIndex;
                            instanceIndex++;
                        }
                        
                        properties.push(elementResult.propertyData);
                    }
                    characteristics.push(...elementResult.characteristics);
                });
            }
        });

        return { stratumData, properties, characteristics };
    }

    /**
     * Process a land cover element (block/property) from LCCS format
     */
    private processLCCSLandCoverElement(
        element: any,
        StratumID: number,
        translation: any
    ): {
        propertyData: any | null;
        characteristics: any[];
    } {
        let BlockID: number | null = null;
        let BlockReference: string | null = null;
        const propertyData: any = { StratumID };
        const characteristics: any[] = [];

        // Extract block reference
        if (element['$']) {
            let blockRef = element['$']['xsi:type'];
            const translatedBlock = searchObjKeyVal(
                translation['LC_Blocks'],
                'Translation',
                blockRef
            );
            if (translatedBlock[0]) {
                blockRef = translatedBlock[0]['LChS_EquivalentElement'];
            }

            const refBlock = this.referenceData.blocks.current['LC_Block']?.filter(
                (block: any) => block.block_reference === blockRef
            );

            if (refBlock?.[0]) {
                BlockID = refBlock[0]['block_id'];
                BlockReference = refBlock[0]['block_reference'];
                propertyData.BlockID = BlockID;
                propertyData.BlockReference = BlockReference;
            } else {
                this.addError('block', [blockRef]);
                return { propertyData: null, characteristics: [] };
            }
        }

        // Process properties and characteristics
        Object.entries(element).forEach(([key, value]: [string, any]) => {
            if (key !== '$' && key !== 'elements' && key !== 'n' && key !== 'description') {
                // Handle nested structures (e.g., sequential_temporal_relationship, periodic_variation, containers)
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // Check if this is a generic LCCS container (has xsi:type AND elements)
                    if (value['$'] && value['$']['xsi:type'] && value['elements']) {
                        this.processLCCSContainer(value, propertyData, translation);
                    }
                    // Check if this is a nested structure we need to flatten
                    else if (key === 'sequential_temporal_relationship') {
                        this.processSequentialTemporalRelationship(value, propertyData, translation);
                    } else if (key === 'periodic_variation') {
                        this.processPeriodicVariation(value, propertyData, translation);
                    } else if (key === 'presence_type') {
                        // Direct property mapping
                        propertyData['elementPresenceType'] = value;
                    } else {
                        // Try to find translation for this property
                        const transProperty = searchObjKeyVal(
                            translation['LC_BlockElements'],
                            'Translation',
                            key
                        );
                        const finalKey = transProperty[0]?.['LChS_EquivalentElement'] || key;

                        const range = this.extractRange(value);
                        propertyData[finalKey] = range || value;
                    }
                } else {
                    // Simple property - translate and assign with context-aware lookup
                    
                    let finalKey: string | null = null;
                    
                    // Step 1: Try context-aware lookup FIRST (check xsi:type specific translations)
                    // This allows block-level properties (like 'type') to be translated based on
                    // their parent block type (xsi:type), enabling proper mapping of:
                    // - LC_OrganicDeposits/type -> organicDepositType
                    // - LC_InorganicDeposits/type -> inorganicDepositType
                    // - LC_Dune/type -> duneType
                    if (element['$']?.['xsi:type']) {
                        const blockType = element['$']['xsi:type'];
                        
                        // Search in BOTH LC_BlockElements and LC_CharacteristicElements for context-specific matches
                        // Try LC_BlockElements first for block-level properties
                        let contextProperties = searchObjKeyVal(
                            translation['LC_BlockElements'],
                            'Source_ElementDefinition',
                            blockType
                        );
                        
                        let contextProperty = searchObjKeyVal(
                            contextProperties,
                            'Translation',
                            key
                        );
                        
                        if (contextProperty[0]) {
                            finalKey = contextProperty[0]?.['LChS_EquivalentElement'];
                        }
                        
                        // If not found in LC_BlockElements, try LC_CharacteristicElements
                        if (!finalKey) {
                            contextProperties = searchObjKeyVal(
                                translation['LC_CharacteristicElements'],
                                'Source_ElementDefinition',
                                blockType
                            );
                            
                            contextProperty = searchObjKeyVal(
                                contextProperties,
                                'Translation',
                                key
                            );
                            
                            finalKey = contextProperty[0]?.['LChS_EquivalentElement'] || null;
                        }
                    }
                    
                    // Step 2: If no context-specific match, try generic lookup in LC_BlockElements
                    if (!finalKey) {
                        const transProperty = searchObjKeyVal(
                            translation['LC_BlockElements'],
                            'Translation',
                            key
                        );
                        
                        finalKey = transProperty[0]?.['LChS_EquivalentElement'] || null;
                    }
                    
                    // Step 3: Fall back to original key if no translation found
                    if (!finalKey) {
                        finalKey = key;
                    }

                    const range = this.extractRange(value);
                    propertyData[finalKey] = range || value;
                }
            } else if (key === 'elements') {
                // Process characteristics recursively
                const chars = this.ensureArray(value['LC_Characteristic'] || []);
                const processedChars = this.processCharacteristicsRecursively(
                    chars,
                    StratumID,
                    BlockID!,
                    BlockReference!,
                    translation,
                    0
                );
                characteristics.push(...processedChars);
            }
        });

        return { propertyData, characteristics };
    }

    /**
     * Process sequential temporal relationship nested structure
     */
    private processSequentialTemporalRelationship(
        sequentialTemporal: any,
        propertyData: any,
        translation: any
    ): void {
        // Extract type
        if (sequentialTemporal['type']) {
            propertyData['temporalType'] = sequentialTemporal['type'];
        }

        // Extract length with min/max
        if (sequentialTemporal['length']) {
            const length = sequentialTemporal['length'];
            if (typeof length === 'object' && length !== null) {
                // Check for xml2js format
                if (length['$']) {
                    const min = parseFloat(length['$']['min']) || 0;
                    const max = parseFloat(length['$']['max']) || 0;
                    propertyData['lengthOfTemporalRelationship'] = [min, max];
                } else if ('min' in length && 'max' in length) {
                    const min = parseFloat(length['min']) || 0;
                    const max = parseFloat(length['max']) || 0;
                    propertyData['lengthOfTemporalRelationship'] = [min, max];
                }
            }
        }

        // Infer units (typically "Month" for temporal relationships)
        if (!propertyData['lengthOfTemporalRelationshipUnits']) {
            propertyData['lengthOfTemporalRelationshipUnits'] = 'Month';
        }
    }

    /**
     * Process periodic variation nested structure
     */
    private processPeriodicVariation(
        periodicVariation: any,
        propertyData: any,
        translation: any
    ): void {
        // periodic_variation contains LC_PeriodicVariations which contains elements with LC_PeriodicVariation
        let periodicVariationItems: any[] = [];

        // Navigate nested structure
        if (periodicVariation['elements'] && periodicVariation['elements']['LC_PeriodicVariation']) {
            periodicVariationItems = this.ensureArray(
                periodicVariation['elements']['LC_PeriodicVariation']
            );
        } else if (periodicVariation['LC_PeriodicVariation']) {
            periodicVariationItems = this.ensureArray(periodicVariation['LC_PeriodicVariation']);
        } else if (Array.isArray(periodicVariation)) {
            periodicVariationItems = periodicVariation;
        } else {
            // Single periodic variation object
            periodicVariationItems = [periodicVariation];
        }

        // Process the first periodic variation (if multiple exist, first one is used)
        if (periodicVariationItems.length > 0) {
            const pvItem = periodicVariationItems[0];

            // Extract persistence_units
            if (pvItem['persistence_units']) {
                propertyData['persistenceUnits'] = this.standardizeUnit(
                    pvItem['persistence_units']
                );
            }

            // Extract period_type
            if (pvItem['period_type']) {
                propertyData['periodVariationType'] = pvItem['period_type'];
            }

            // Extract period_description
            if (pvItem['period_description']) {
                propertyData['periodVariationDescription'] = pvItem['period_description'];
            }

            // Extract persistence_period with min/max
            if (pvItem['persistence_period']) {
                const period = pvItem['persistence_period'];
                if (typeof period === 'object' && period !== null) {
                    // Check for xml2js format
                    if (period['$']) {
                        const min = parseFloat(period['$']['min']) || 0;
                        const max = parseFloat(period['$']['max']) || 0;
                        propertyData['persistencePeriod'] = [min, max];
                    } else if ('min' in period && 'max' in period) {
                        const min = parseFloat(period['min']) || 0;
                        const max = parseFloat(period['max']) || 0;
                        propertyData['persistencePeriod'] = [min, max];
                    }
                }
            }
        }
    }

    /**
     * Standardize unit names (e.g., "Months" → "Month")
     */
    private standardizeUnit(unit: string): string {
        const unitMap: { [key: string]: string } = {
            Months: 'Month',
            Years: 'Year',
            Days: 'Day',
            Weeks: 'Week',
            months: 'Month',
            years: 'Year',
            days: 'Day',
            weeks: 'Week'
        };

        return unitMap[unit] || unit;
    }

    /**
     * Process generic LCCS container structures (leaf type, leaf phenology, etc.)
     * Containers have: xsi:type attribute AND elements child with typed content
     * Examples: LC_WoodyGrowthLeafType, LC_WoodyGrowthLeafPhenology, LC_HerbaceousGrowthLeafType
     */
    private processLCCSContainer(
        container: any,
        propertyData: any,
        translation: any
    ): void {
        const containerType = container['$']['xsi:type'];
        
        // Derive the LChS property name from container type
        // LC_WoodyGrowthLeafType -> woodyLeafType
        // LC_HerbaceousGrowthLeafPhenology -> herbaceousLeafPhenology
        let containerPropName = containerType.replace(/^LC_/, '').replace(/Growth/, '');
        containerPropName = containerPropName.charAt(0).toLowerCase() + containerPropName.slice(1);
        
        // Get all child elements - they could be under different keys
        // (LC_WoodyLeafType, LC_WoodyLeafPhenology, LC_HerbaceousLeafType, etc.)
        const containerElements: any[] = [];
        Object.entries(container['elements']).forEach(([elementKey, elementValue]) => {
            if (elementKey.startsWith('LC_')) {
                const elements = this.ensureArray(elementValue);
                containerElements.push(...elements);
            }
        });
        
        // Process each element in the container
        containerElements.forEach((containerElement) => {
            if (containerElement && containerElement['$']) {
                let elementType = containerElement['$']['xsi:type'];
                
                // Translate the element type (e.g., LC_Broadleaved -> BroadLeaf)
                const TranslatedElementType = searchObjKeyVal(
                    translation['LC_Blocks'],
                    'Translation',
                    elementType
                );
                if (TranslatedElementType && TranslatedElementType[0]) {
                    elementType = TranslatedElementType[0]['LChS_EquivalentElement'];
                }
                
                // Set the main container property value (e.g., woodyLeafType: "BroadLeaf")
                propertyData[containerPropName] = elementType;
                
                // Process all nested properties of the element
                Object.entries(containerElement).forEach(([key, value]) => {
                    if (key !== '$' && key !== 'n' && key !== 'description' && key !== 'id' && key !== 'uuid') {
                        // Translate nested properties using LC_CharacteristicElements
                        const transElementProps = searchObjKeyVal(
                            translation['LC_CharacteristicElements'],
                            'Source_ElementDefinition',
                            containerElement['$']['xsi:type']
                        );
                        const transElementProp = searchObjKeyVal(
                            transElementProps,
                            'Translation',
                            key
                        );
                        if (transElementProp && transElementProp[0]) {
                            const propName = transElementProp[0]['LChS_EquivalentElement'];
                            const range = this.extractRange(value);
                            propertyData[propName] = range || value;
                        }
                    }
                });
            }
        });
    }

    // ========================================================================
    // PRIVATE: RECURSIVE CHARACTERISTIC PROCESSING
    // ========================================================================

    /**
     * Recursively process characteristics (supports nested characteristics)
     */
    private processCharacteristicsRecursively(
        characteristicItems: any[],
        StratumID: number,
        BlockID: number,
        BlockReference: string,
        translation: any,
        depth: number = 0
    ): any[] {
        const characteristics: any[] = [];

        if (!characteristicItems || !Array.isArray(characteristicItems)) {
            return characteristics;
        }

        if (depth > this.config.maxRecursionDepth) {
            this.warnings.push(`Maximum recursion depth ${this.config.maxRecursionDepth} reached`);
            return characteristics;
        }

        characteristicItems.forEach((item) => {
            let buildCharacteristic: any = {};
            let CharacteristicID: number | null = null;
            let CharacteristicReference: string | null = null;
            let CharacteristicLabel: string | null = null;
            let CharacteristicRef: string | null = null;

            Object.entries(item).forEach(([key, value]: [string, any]) => {
                if (key === '$') {
                    const xsiType = value['xsi:type'];
                    let XterRef = xsiType;

                    // Translate the xsi:type
                    const TranslatedXterRef = searchObjKeyVal(
                        translation['LC_Blocks'],
                        'Translation',
                        xsiType
                    );

                    if (TranslatedXterRef[0]) {
                        XterRef = TranslatedXterRef[0]['LChS_EquivalentElement'];
                    }

                    // Check if characteristic exists
                    const refCharacteristic = this.referenceData.characteristics.current[
                        'LC_Characteristics'
                    ]?.filter((xteristic: any) => xteristic.characteristic_reference === XterRef);

                    if (refCharacteristic?.[0]) {
                        // Use existing characteristic
                        CharacteristicID = refCharacteristic[0]['characteristic_id'];
                        CharacteristicReference = refCharacteristic[0]['characteristic_reference'];
                        CharacteristicLabel = refCharacteristic[0]['characteristic_label'];
                        CharacteristicRef = xsiType;
                    } else if (this.config.autoCreateCharacteristics) {
                        // Create user-defined characteristic
                        const newChar = this.createUserDefinedCharacteristic(
                            XterRef,
                            xsiType,
                            item
                        );

                        CharacteristicID = newChar.characteristic_id;
                        CharacteristicReference = newChar.characteristic_reference;
                        CharacteristicLabel = newChar.characteristic_label;
                        CharacteristicRef = xsiType;

                        this.createdCharacteristics.push(newChar);
                        this.warnings.push(`Auto-created characteristic: ${CharacteristicLabel}`);
                    } else {
                        // Characteristic not found and auto-create is disabled - skip with warning
                        this.warnings.push(`Characteristic '${XterRef}' not found in reference data, skipping`);
                        return;  // Skip this characteristic instead of erroring
                    }

                    buildCharacteristic = {
                        ...buildCharacteristic,
                        StratumID,
                        BlockID,
                        BlockReference,
                        CharacteristicID,
                        CharacteristicReference,
                        CharacteristicLabel
                    };
                } else if (key === 'elements') {
                    // Recursive call for nested characteristics
                    const nestedChars = this.ensureArray(value['LC_Characteristic'] || []);
                    const nestedResults = this.processCharacteristicsRecursively(
                        nestedChars,
                        StratumID,
                        BlockID,
                        BlockReference,
                        translation,
                        depth + 1
                    );

                    characteristics.push(...nestedResults);
                } else if (key !== 'n' && key !== 'description') {
                    // Translate property key
                    const transCharacteristics = searchObjKeyVal(
                        translation['LC_CharacteristicElements'],
                        'Source_ElementDefinition',
                        CharacteristicRef
                    );

                    const transCharacteristic = searchObjKeyVal(
                        transCharacteristics,
                        'Translation',
                        key
                    );

                    const translatedKey = transCharacteristic[0]?.['LChS_EquivalentElement'] || key;

                    const range = this.extractRange(value);
                    buildCharacteristic = {
                        ...buildCharacteristic,
                        [translatedKey]: range || value
                    };
                }
            });

            if (CharacteristicID !== null) {
                characteristics.push(buildCharacteristic);
            }
        });

        return characteristics;
    }

    // ========================================================================
    // PRIVATE: CSV FILE PARSING
    // ========================================================================

    private async parseCSVFile(content: string, filename: string): Promise<LegendData> {
        const translation = this.translator['csv'];
        if (!translation) {
            throw new Error('No translation available for CSV files');
        }

        const legendData: LegendData = {
            LC_Legend: {
                id: 1,
                legend_name: filename,
                legend_description: 'LChS CSV Translator',
                legend_author: filename
            },
            LC_Class: [],
            LC_ClassCharacteristics: {},
            LC_HorizontalPatterns: [],
            LC_Strata: [],
            LC_Properties: [],
            LC_Characteristics: []
        };

        const importedClasses = Papa.parse(content, { header: true });

        if (!importedClasses.data || importedClasses.data.length === 0) {
            throw new Error('CSV file is empty or invalid');
        }

        // Translate headers
        const headerTranslation: { [key: string]: string } = {};
        Object.keys(importedClasses.data[0]).forEach((header) => {
            let headerReference = header;
            const translatedHeader = searchObjKeyVal(
                translation['LC_ClassElements'],
                'Translation',
                header
            );
            if (translatedHeader.length > 0) {
                headerReference = translatedHeader[0]['LChS_EquivalentElement'];
            }
            if (headerReference !== header) {
                headerTranslation[headerReference] = header;
            }
        });

        // Process each row
        importedClasses.data.forEach((row: any) => {
            if (row['ID']) {
                // Apply header translations
                Object.entries(headerTranslation).forEach(([newKey, oldKey]) => {
                    row[newKey] = row[oldKey];
                });

                if (row['ID'] && row['Class Name'] && row['Elements']) {
                    // Create class
                    legendData.LC_Class.push({
                        legend_id: 1,
                        class_id: parseInt(row['ID']),
                        class_name: row['Class Name'],
                        class_description: row['Class Description'] || '',
                        class_map_code: row['Class Code'] || `C${row['ID']}`,
                        class_color_code: row['Color Code(Hex)'] || 'BDBDBD'
                    });

                    // Create horizontal pattern
                    legendData.LC_HorizontalPatterns.push({
                        class_id: parseInt(row['ID']),
                        horizontal_pattern_id: this.horizontalPatternNumber,
                        name: `Horizontal Pattern ${this.horizontalPatternNumber}`,
                        description: 'Class Horizontal Pattern',
                        cover: [0, 100],
                        occurrence: [0, 100],
                        type: null
                    });

                    // Create stratum
                    legendData.LC_Strata.push({
                        HPID: this.horizontalPatternNumber,
                        stratumID: this.strataNumber,
                        name: `Stratum ${this.strataNumber}`,
                        description: `Horizontal Pattern ${this.horizontalPatternNumber} Stratum`,
                        presence_type: this.config.defaultPresenceType,
                        on_top: null
                    });

                    // Parse and translate elements
                    const elements = row['Elements'].split(';').filter((e: string) => e.trim());
                    elements.forEach((element: string) => {
                        element = element.trim();
                        if (element) {
                            let translatedElement = fuzzySearchObjKeyVal(
                                translation['LC_Blocks'],
                                'Translation',
                                element
                            );
                            if (translatedElement.length > 0) {
                                element = translatedElement[0]['LChS_EquivalentElement'];
                            }

                            const refBlock = this.referenceData.blocks.current['LC_Block']?.filter(
                                (block: any) => block.block_reference === element
                            );

                            if (refBlock?.[0]) {
                                legendData.LC_Properties.push({
                                    StratumID: this.strataNumber,
                                    BlockID: parseInt(refBlock[0]['block_id']),
                                    BlockReference: refBlock[0]['block_reference']
                                });
                            } else {
                                this.addError('block', [element]);
                            }
                        }
                    });

                    this.horizontalPatternNumber++;
                    this.strataNumber++;
                } else {
                    this.addError('format', [filename]);
                }
            }
        });

        this.classesNumber = legendData.LC_Class.length + 1;

        return legendData;
    }

    // ========================================================================
    // PRIVATE: USER-DEFINED CHARACTERISTIC CREATION
    // ========================================================================

    private createUserDefinedCharacteristic(
        characteristicRef: string,
        xsiType: string,
        characteristicData: any = null
    ): UserDefinedCharacteristic {
        // Check if already exists in reference data
        const existingChar = this.referenceData.characteristics.current[
            'LC_Characteristics'
        ]?.find((c: any) => c.characteristic_reference === characteristicRef);

        if (existingChar) {
            return existingChar;
        }

        // Generate user-friendly label
        const label = xsiType
            .replace(/^LC_/, '')
            .replace(/([A-Z])/g, ' $1')
            .trim();

        // Generate internal name
        const internalName = xsiType.startsWith('LC_') ? xsiType : `LC_${xsiType}`;

        // Get next available ID
        const newCharacteristicId = LocalStorageManager.getNextCharacteristicId();

        // Extract elements from characteristic data
        const extractedElements = this.extractElementsFromCharacteristic(
            characteristicData,
            xsiType
        );

        // Create the characteristic
        const newCharacteristic: UserDefinedCharacteristic = {
            characteristic_id: newCharacteristicId,
            characteristic_name: internalName,
            characteristic_label: label,
            characteristic_description: `Auto-created from import: ${label}`,
            characteristic_icon: 'text-xs p-0 m-1 fa-solid fa-robot',
            characteristic_reference: characteristicRef,
            characteristic_group: 900000,
            isUserDefined: true,
            createdAt: new Date().toISOString(),
            elements: extractedElements.length > 0 ? extractedElements : [
                {
                    display_default: '',
                    element_name: 'description',
                    element_label: 'Description',
                    element_type: 'Text',
                    element_rules: {
                        required: false,
                        order: 1,
                        min: 0,
                        max: 255,
                        unit: '',
                        symbol: '',
                        list: '',
                        options_name: ''
                    }
                }
            ]
        };

        // Save to local storage
        LocalStorageManager.saveUserCharacteristic(newCharacteristic);

        // Add to reference data for future lookups in this import session
        if (!this.referenceData.characteristics.current['LC_Characteristics']) {
            this.referenceData.characteristics.current['LC_Characteristics'] = [];
        }
        this.referenceData.characteristics.current['LC_Characteristics'].push(newCharacteristic);

        return newCharacteristic;
    }

    private extractElementsFromCharacteristic(characteristicData: any, xsiType: string): any[] {
        const elements: any[] = [];
        let order = 1;

        if (!characteristicData) {
            return elements;
        }

        Object.entries(characteristicData).forEach(([key, value]) => {
            // Skip special keys
            if (key === '$' || key === 'n' || key === 'description' || key === 'elements') {
                return;
            }

            // Generate element label
            const elementLabel = key
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .trim()
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            let elementType = 'Text';
            let min = 0;
            let max = 255;
            let unit = '';
            let symbol = '';

            // Determine element type based on value
            const range = this.extractRange(value);
            if (range) {
                elementType = 'Range';
                min = range[0];
                max = range[1];

                // Infer units from key name
                if (key.includes('period') || key.includes('time')) {
                    unit = 'time units';
                } else if (key.includes('percentage') || key.includes('percent')) {
                    symbol = '%';
                    unit = 'percent';
                } else if (key.includes('length') || key.includes('height') || key.includes('depth')) {
                    unit = 'length units';
                } else if (key.includes('temperature') || key.includes('temp')) {
                    symbol = '°C';
                    unit = 'Celsius';
                }
            } else if (typeof value === 'number') {
                elementType = 'Range';
                min = 0;
                max = value * 2;
            }

            if (elementType === 'Range' || (elementType === 'Text' && typeof value === 'string')) {
                elements.push({
                    display_default: '',
                    element_name: key,
                    element_label: elementLabel,
                    element_type: elementType,
                    element_rules: {
                        required: false,
                        order: order++,
                        min,
                        max,
                        unit,
                        symbol,
                        list: '',
                        options_name: ''
                    }
                });
            }
        });

        return elements;
    }

    // ========================================================================
    // PRIVATE: UTILITY FUNCTIONS
    // ========================================================================

    /**
     * Ensure value is an array
     */
    private ensureArray(value: any): any[] {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    }

    /**
     * Extract range from object (handles both xml2js formats)
     */
    private extractRange(value: any): [number, number] | null {
        if (typeof value !== 'object' || value === null) {
            return null;
        }

        // Check for xml2js format with $ attributes
        if (value['$'] && typeof value['$'] === 'object') {
            const attrs = value['$'];
            if ('min' in attrs && 'max' in attrs) {
                return [parseFloat(attrs.min) || 0, parseFloat(attrs.max) || 0];
            }
        }

        // Check for direct min/max properties
        if ('min' in value && 'max' in value) {
            return [parseFloat(value.min) || 0, parseFloat(value.max) || 0];
        }

        // Check nested objects
        const firstEntry = Object.values(value)[0];
        if (
            firstEntry &&
            typeof firstEntry === 'object' &&
            'min' in firstEntry &&
            'max' in firstEntry
        ) {
            return [
                parseFloat((firstEntry as any).min) || 0,
                parseFloat((firstEntry as any).max) || 0
            ];
        }

        return null;
    }

    /**
     * Get maximum ID from array of objects
     */
    private getMaxId(arr: any[], idField: string): number {
        if (!arr || arr.length === 0) return 0;
        return Math.max(...arr.map((item) => item[idField] || 0));
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a legend importer instance
 */
export function createLegendImporter(
    translator: TranslationData,
    referenceData: ReferenceData,
    config?: LegendImportConfig
): LegendImporter {
    return new LegendImporter(translator, referenceData, config);
}

/**
 * Import a legend file (convenience wrapper)
 */
export async function importLegendFile(
    content: string,
    filename: string,
    fileType: 'lchs' | 'lccs' | 'xml' | 'csv',
    translator: TranslationData,
    referenceData: ReferenceData,
    config?: LegendImportConfig
): Promise<LegendImportResult> {
    const importer = createLegendImporter(translator, referenceData, config);
    return importer.importLegend(content, filename, fileType);
}