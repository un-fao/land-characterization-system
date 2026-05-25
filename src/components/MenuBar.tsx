import { Menubar } from 'primereact/menubar';
import { MenuItem } from 'primereact/menuitem';
import { Button } from 'primereact/button';

import '../css/MenuBar.css';

export const MenuBar = (props:any) => {
    const {setLoginVisible,setGuide1Visible,confirm,legendValid,setExportVisible,setFileUploadVisible,setGuideVisible,setStorageManagerVisible,setBlockManagerVisible,setCharacteristicManagerVisible,setActiveLCElement,setSimilarityAssessmentVisible,setSemanticInteroperabilityVisible} = props;
    const items: MenuItem[] = [
        {
            label: 'File',
            icon: 'pi pi-fw pi-file',
            items: [
                {
                    label: 'New',
                    icon: 'pi pi-fw pi-file-edit',
                    command: () => {
                                confirm('Are you sure you want to create a new Legend? This will wipe your current Legend.','Clear Legend Confirmation','pi pi-info-circle','p-button-danger');
                            }            
                },
                {
                    label: 'Import',
                    icon: 'pi pi-fw pi-file-import',
                    command: () => {
                                setFileUploadVisible(true);
                            }
                },
                {
                    label: 'Export',
                    icon: 'pi pi-fw pi-file-export',
                    disabled: !legendValid,
                    command: () => {
                                setExportVisible(true);
                            }
                },
                {
                    separator: true
                },
                {
                    label: 'Delete',
                    icon: 'pi pi-fw pi-trash',
                    command: () => {
                                confirm('Are you sure you want to delete your Legend?','Delete Confirmation','pi pi-info-circle','p-button-danger');
                            }
                },
                {
                    label: 'Storage',
                    icon: 'pi pi-database',
                    items: [
                        {
                            label: 'Manage Saved Work',
                            icon: 'pi pi-folder-open',
                            command: () => setStorageManagerVisible(true)
                        },
                        {
                            separator: true
                        },
                        /*{
                            label: 'User-Defined Blocks',
                            icon: 'pi pi-box',
                            command: () => setBlockManagerVisible(true)
                        },*/
                        {
                            label: 'User-Defined Characteristics',
                            icon: 'pi pi-tags',
                            command: () => setCharacteristicManagerVisible(true)
                        }
                    ]
                }
            ]
        },
        {
            label: 'Wizards',
            icon: 'fa-solid fa-wand-magic-sparkles',
            items: [
                {
                    label: 'Legend Generation',
                    icon: 'fa-regular fa-pen-to-square',
                    command: () => {
                                setGuide1Visible(true);
                                setActiveLCElement(null);
                            }
                },
                {
                    label: 'User-Defined Characteristics',
                    icon: 'pi pi-tags',
                    command: () => setCharacteristicManagerVisible(true)
                }
            ]
        },
        {
            label: 'Resources',
            icon: 'pi pi-fw pi-user',
            items: [
                {
                    label: 'Land Cover Registry',
                    icon: 'fa-solid fa-landmark-dome',
                    url: 'https://data.apps.fao.org/lclr-tool/en/',
                    target: '_blank'
                },
                {
                    label: 'Semantic Interoperability',
                    icon: 'fa-solid fa-language',
                    items: [
                        {
                            label: 'Similarity Assessment',
                            icon: 'fa-solid fa-code-compare',
                            command: () => setSimilarityAssessmentVisible(true)
                        },
                        {
                            label: 'Legend Connector',
                            icon: 'fa-brands fa-connectdevelop',
                            command: () => setSemanticInteroperabilityVisible(true)
                        }
                        /*{
                            label: 'Similarity Assessment',
                            icon: 'fa-solid fa-code-compare',
                            url: '?tool=LCMLUtils',
                            target: '_blank'
                        }*/
                    ]
                },
                {
                    label: 'Guided Tour',
                    icon: 'fa-solid fa-person-chalkboard',
                    command: () => {
                        setGuideVisible(true);
                    }
                },
                {
                    label: 'Documentation',
                    icon: 'fa-solid fa-book-open',
                    items: [
                        {
                            label: 'Land Cover MetaLanguage',
                            icon: 'fa-solid fa-file-code',
                            url: 'https://www.iso.org/standard/81259.html',
                            target: '_blank'
                        },
                        {
                            label: 'Land CHaracterization Software',
                            icon: 'fa-solid fa-laptop-code',
                            url: 'docs/index.html',
                            target: '_blank'
                        }
                    ]
                },
                {
                    label: 'FAO',
                    icon: 'fa-solid fa-warehouse',
                    items: [
                        {
                            label: 'Land Cover Classification System tool (LCCS)',
                            icon: 'fa-solid fa-laptop-code',
                            url: 'http://www.geovis.net/Downloads.htm',
                            target: '_blank'
                        },
                        {
                            label: 'Land Cover Toolbox',
                            icon: 'fa-solid fa-toolbox',
                            url: 'https://www.fao.org/land-water/land/land-governance/land-resources-planning-toolbox/category/details/en/c/1036361/',
                            target: '_blank'
                        },
                        {
                            label: 'Advisory Group 13 on Land Cover and Land Use',
                            icon: 'fa-solid fa-users-gear',
                            url: 'https://www.fao.org/geospatial/events/events-detail/TC211-Advisory-Group-13-Land-Cover-Land-Use/en#:~:text=International%20Organization%20for%20Standardization%20(ISO)%20/%20Technical,Land%20Cover%20and%20Land%20Use%20in%20collaboration',
                            target: '_blank'
                        }                      
                    ]
                },
                {
                    label: 'External',
                    icon: 'pi pi-fw pi-users',
                    items: [
                        {
                            label: 'International Standards Organization (ISO)',
                            icon: 'fa-solid fa-file-code',
                            url: 'https://www.iso.org/committee/54904.html',
                            target: '_blank'
                        }
                    ]
                }
            ]
        }               
    ];

    const start = (
        <>
            <img alt="Land CHaracterization Software" src="logo.png" height="30" className="mr-2"></img>            
            <img alt="Food and Agriculture Organization of the United Nations" src="fao-logo.png" height="30" className="mr-2"></img>
        </>);
    //const end = <Button label="Login" className="mr-2 text-xs p-1 m-1" style={{ backgroundColor: 'var(--highlight-bg)', color: 'var(--error-100)', borderRadius: 'var(--border-radius)' }} icon="pi pi-fw pi-sign-in" onClick={() => setLoginVisible(true)} />;
    const end = null;
    return (
        <Menubar model={items} start={start} end={end} className="text-xs p-0 m-0" />
    );
}
