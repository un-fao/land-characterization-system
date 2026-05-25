// ============================================================================
// WIZARD STEP 2: APPOINTED LEGEND UPLOAD
// ============================================================================

import React, { useRef, useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { FileUpload, FileUploadHandlerEvent } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { useSemanticStore } from '../SemanticStore';
import { Legend } from '../semantic-types';
import { parseString, processors } from 'xml2js';
import Papa from 'papaparse';
import { searchObjKeyVal, fuzzySearchObjKeyVal } from '../../../App';
import { createLegendImporter, LegendImportConfig, LegendImportResult, LegendData } from '../../LegendImporter';
import axios from 'axios';

export const StepUpload: React.FC = () => {
  const { state, setAppointedLegend, dispatch } = useSemanticStore();
  const toast = useRef<Toast>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  // Load reference data needed for translation
  const [translator, setTranslator] = useState<any>(null);
  const [blocks, setBlocks] = useState<any>(null);
  const [characteristics, setCharacteristics] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Registry catalog
  interface CatalogItem {
    itemIdentifier: number;
    date: string;
    name: string;
    alphaCode: string;
    status: string;
    '.lccs': string;
    // Add other fields as needed
  }
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  
  useEffect(() => {
    // Load the necessary data files
    Promise.all([
      fetch('components/DataSources/Legend_Translator.json').then(r => r.json()),
      fetch('components/DataSources/LC_Blocks.json').then(r => r.json()),
      fetch('components/DataSources/LC_Characteristics.json').then(r => r.json())
    ]).then(([translatorData, blocksData, characteristicsData]) => {
      setTranslator(translatorData);
      setBlocks({ current: blocksData });
      setCharacteristics({ current: characteristicsData });
      setIsDataLoaded(true);
    }).catch(error => {
      console.error('Failed to load reference data:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load reference data files'
      });
    });
    
    // Fetch registry catalog
    fetchRegistryCatalog();
  }, []);
  
  const fetchRegistryCatalog = async () => {
    try {
      const response = await axios.get('https://us-central1-fao-maps-review.cloudfunctions.net/getLandCoverLegend');
      setCatalog(response.data.filter((legend: CatalogItem) => legend.status === 'valid'));
    } catch (error) {
      console.error('Error fetching registry catalog:', error);
      toast.current?.show({
        severity: 'warn',
        summary: 'Registry Unavailable',
        detail: 'Could not connect to Land Cover Registry. You can still upload files.',
        life: 5000
      });
    }
  };
  
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };
  
  const handleLoadFromRegistry = async (lccsFilename: string, legendName: string) => {
    if (!isDataLoaded) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Loading',
        detail: 'Reference data still loading, please wait...'
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      toast.current?.show({
        severity: 'info',
        summary: 'Downloading',
        detail: `Downloading ${legendName} from registry...`
      });

      // Download LCCS file from FAO registry
      const response = await axios.get(
        `https://storage.googleapis.com/fao-hih-gs-website-review/resources/lclr/legend/${lccsFilename}`
      );
      
      const lccsContent = response.data;
      setUploadProgress(30);

      toast.current?.show({
        severity: 'info',
        summary: 'Processing',
        detail: `Processing ${legendName}...`
      });

      // Configure importer (same as file upload)
      const config: LegendImportConfig = {
        autoCreateCharacteristics: false,
        maxRecursionDepth: 10,
        defaultPresenceType: 'Mandatory',
        includeValidationErrors: true
      };

      // Create importer and process the LCCS content
      const importer = createLegendImporter(
        translator,
        {
          blocks: blocks,
          characteristics: characteristics
        },
        config
      );

      const result: LegendImportResult = await importer.importLegend(
        lccsContent,
        lccsFilename,
        'lccs'
      );

      setUploadProgress(90);

      if (result.success && result.legend) {
        // Convert to Legend type for semantic store
        const legend: Legend = {
          id: result.legend.LC_Legend.id,
          legend_name: result.legend.LC_Legend.legend_name,
          legend_description: result.legend.LC_Legend.legend_description,
          legend_author: result.legend.LC_Legend.legend_author,
          LCT_Class: result.legend.LC_Class,
          LCT_HorizontalPatterns: result.legend.LC_HorizontalPatterns,
          LCT_Strata: result.legend.LC_Strata,
          LCT_Properties: result.legend.LC_Properties,
          LCT_Characteristics: result.legend.LC_Characteristics
        };

        validateLegend(legend);
        setAppointedLegend(legend, []);
        setUploadProgress(100);

        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: `Loaded ${legend.legend_name} with ${legend.LCT_Class.length} classes`
        });

        // Display warnings if any
        if (result.warnings.length > 0) {
          toast.current?.show({
            severity: 'warn',
            summary: 'Import Warnings',
            detail: result.warnings.join('\n'),
            life: 5000
          });
        }
      } else {
        // Handle errors
        const errorMessages = result.errors
          .map(err => `${err.type}: ${err.items.join(', ')}`)
          .join('\n');
        throw new Error(errorMessages);
      }

    } catch (error) {
      console.error('Registry download error:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to load legend from registry: ${message}`
      });
      dispatch({ type: 'ADD_ERROR', payload: message });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };
  
  const handleUpload = async (event: FileUploadHandlerEvent) => {
    if (!isDataLoaded) {
        toast.current?.show({
            severity: 'warn',
            summary: 'Loading',
            detail: 'Reference data still loading, please wait...'
        });
        return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
        const file = event.files[0];
        const extension = file.name.split('.').pop()?.toLowerCase();

        toast.current?.show({
            severity: 'info',
            summary: 'Processing',
            detail: `Reading ${file.name}...`
        });

        const content = await readFileContent(file);
        setUploadProgress(30);

        // Validate file type
        if (!['lchs', 'lccs', 'xml', 'csv'].includes(extension || '')) {
            throw new Error(`Unsupported file type: ${extension}`);
        }

        // Configure importer (enable auto-create for semantic interoperability)
        const config: LegendImportConfig = {
            autoCreateCharacteristics: false,   // Auto-create missing characteristics as user-defined
            maxRecursionDepth: 10,
            defaultPresenceType: 'Mandatory',
            includeValidationErrors: true
        };

        // Create importer and process file
        const importer = createLegendImporter(
            translator,
            {
                blocks: blocks,
                characteristics: characteristics
            },
            config
        );

        const result: LegendImportResult = await importer.importLegend(
            content,
            file.name,
            extension as 'lchs' | 'lccs' | 'xml' | 'csv'
        );

        setUploadProgress(90);

        if (result.success && result.legend) {
            // Convert to Legend type for semantic store
            const legend: Legend = {
                id: result.legend.LC_Legend.id,
                legend_name: result.legend.LC_Legend.legend_name,
                legend_description: result.legend.LC_Legend.legend_description,
                legend_author: result.legend.LC_Legend.legend_author,
                LCT_Class: result.legend.LC_Class,
                LCT_HorizontalPatterns: result.legend.LC_HorizontalPatterns,
                LCT_Strata: result.legend.LC_Strata,
                LCT_Properties: result.legend.LC_Properties,
                LCT_Characteristics: result.legend.LC_Characteristics
            };

            // Validate legend structure
            validateLegend(legend);

            setAppointedLegend(legend, [file]);
            setUploadProgress(100);

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `Loaded ${legend.legend_name} with ${legend.LCT_Class.length} classes, ${legend.LCT_Properties.length} properties, ${legend.LCT_Characteristics.length} characteristics`
            });

            // Display warnings if any
            if (result.warnings.length > 0) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Import Warnings',
                    detail: result.warnings.join('\\n'),
                    life: 5000
                });
            }

        } else {
            // Handle errors
            const errorMessages = result.errors
                .map(err => `${err.type}: ${err.items.join(', ')}`)
                .join('\\n');
            throw new Error(errorMessages);
        }

    } catch (error) {
        console.error('Upload error:', error);
        const message = error instanceof Error ? error.message : String(error);
        toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: message
        });
        dispatch({ type: 'ADD_ERROR', payload: message });
    } finally {
        setIsProcessing(false);
        setTimeout(() => setUploadProgress(0), 1000);
    }
};
  
  const validateLegend = (legend: Legend) => {
    if (!legend.LCT_Class || legend.LCT_Class.length === 0) {
      throw new Error('Legend must contain at least one class');
    }
    
    // Additional validation...
  };
  
  return (
    <div className="step-upload">
      <Toast ref={toast} />
      
      {!isDataLoaded ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <i 
              className="pi pi-spin pi-spinner" 
              style={{ fontSize: '3rem', color: 'var(--primary-color)', marginBottom: '1rem' }}
            />
            <h4>Loading Reference Data...</h4>
            <p style={{ color: 'var(--text-color-secondary)' }}>
              Please wait while we load the translation dictionaries and reference data.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <h3>Load Appointed Legend</h3>
          <p style={{ color: 'var(--text-color-secondary)', marginBottom: '1.5rem' }}>
            Upload a legend file or select from registry to be mapped against the reference classification:
            <strong> {state.selectedReference?.metadata.name}</strong>
          </p>
          
          {isProcessing && uploadProgress > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <ProgressBar value={uploadProgress} />
            </div>
          )}
          
          {!state.appointedLegend ? (
            <TabView activeIndex={activeTabIndex} onTabChange={(e) => setActiveTabIndex(e.index)}>
              {/* Upload Tab */}
              <TabPanel header="Upload File" leftIcon="pi pi-upload mr-2">
                <FileUpload
                  name="legend"
                  accept=".lchs,.lccs,.xml,.csv"
                  maxFileSize={10000000}
                  customUpload
                  uploadHandler={handleUpload}
                  auto
                  chooseLabel="Select Legend File"
                  emptyTemplate={
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <i 
                        className="pi pi-cloud-upload" 
                        style={{ fontSize: '3rem', color: 'var(--text-color-secondary)', marginBottom: '1rem' }}
                      />
                      <p style={{ color: 'var(--text-color-secondary)' }}>
                        Drag and drop legend file here, or click to browse
                      </p>
                    </div>
                  }
                />
                
                <div style={{ marginTop: '2rem' }}>
                  <h4>Supported Formats</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <Card>
                      <h5><Tag value="LChS" severity="success" /> LChS Files</h5>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                        Native Land Characterization System format. Fully supported with all features including properties and characteristics.
                      </p>
                    </Card>
                    
                    <Card>
                      <h5><Tag value="LCCS" severity="success" /> LCCS Files</h5>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                        Land Cover Classification System (LCCS 3) and Land Cover Registry (LCLR) formats. Full extraction of all elements.
                      </p>
                    </Card>
                    
                    <Card>
                      <h5><Tag value="CSV" severity="info" /> CSV Files</h5>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)' }}>
                        Simplified format. Required columns: ID, Class Code, Class Name, Elements (semicolon-separated)
                      </p>
                    </Card>
                  </div>
                </div>
              </TabPanel>
              
              {/* Registry Tab */}
              <TabPanel header="Land Cover Registry (LCLR)" leftIcon="pi pi-database mr-2">
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ color: 'var(--text-color-secondary)' }}>
                    Download legends from the FAO Land Cover Registry to use for semantic mapping.
                  </p>
                </div>
                
                {catalog.length === 0 ? (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <i 
                        className="pi pi-spin pi-spinner" 
                        style={{ fontSize: '3rem', color: 'var(--primary-color)', marginBottom: '1rem' }}
                      />
                      <h4>Loading Registry...</h4>
                      <p style={{ color: 'var(--text-color-secondary)' }}>
                        Fetching available legends from the Land Cover Registry.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <DataTable
                    value={catalog}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    stripedRows
                    emptyMessage="No legends found in registry"
                  >
                    <Column 
                      field="itemIdentifier" 
                      header="ID" 
                      style={{ width: '80px' }}
                    />
                    <Column 
                      field="name" 
                      header="Legend Name" 
                      sortable
                      filter
                      filterPlaceholder="Search by name"
                      style={{ minWidth: '300px' }}
                      body={(rowData) => (
                        <p onClick={() => handleLoadFromRegistry(rowData['.lccs'], rowData.name)} style={{ cursor: 'pointer' }}>{rowData.name}</p>
                      )}
                    />
                    <Column 
                      field="date" 
                      header="Date" 
                      sortable
                      body={(rowData) => new Date(rowData.date).toLocaleDateString()}
                    />                    
                    <Column
                      header="Actions"
                      body={(rowData) => (
                        <i className="pi pi-download" onClick={() => handleLoadFromRegistry(rowData['.lccs'], rowData.name)} style={{ cursor: 'pointer' }}></i>                        
                      )}
                    />
                  </DataTable>
                )}
              </TabPanel>
            </TabView>
          ) : (
            <div>
              <Card style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, color: 'var(--green-900)' }}>
                      <i className="pi pi-check-circle" style={{ marginRight: '0.5rem' }} />
                      {state.appointedLegend.legend_name}
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem', 
                      marginTop: '1rem', 
                      fontSize: '0.875rem' 
                    }}>
                      <div>
                        <i className="pi pi-tags" style={{ marginRight: '0.25rem' }} />
                        <strong>{state.appointedLegend.LCT_Class.length}</strong> classes
                      </div>
                      <div>
                        <i className="pi pi-sitemap" style={{ marginRight: '0.25rem' }} />
                        <strong>{state.appointedLegend.LCT_HorizontalPatterns.length}</strong> patterns
                      </div>
                      <div>
                        <i className="pi pi-th-large" style={{ marginRight: '0.25rem' }} />
                        <strong>{state.appointedLegend.LCT_Strata.length}</strong> strata
                      </div>
                      <div>
                        <i className="pi pi-list" style={{ marginRight: '0.25rem' }} />
                        <strong>{state.appointedLegend.LCT_Properties.length}</strong> properties
                      </div>
                      <div>
                        <i className="pi pi-sliders-h" style={{ marginRight: '0.25rem' }} />
                        <strong>{state.appointedLegend.LCT_Characteristics.length}</strong> characteristics
                      </div>
                    </div>
                  </div>
                  <button
                    className="p-button p-button-text p-button-rounded"
                    onClick={() => setAppointedLegend(null, [])}
                    style={{ marginLeft: '1rem' }}
                  >
                    <i className="pi pi-trash" />
                  </button>
                </div>
              </Card>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};