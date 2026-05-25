import { TabsComponent } from './TabsComponent';

export const Flow = (props) => {
    const { rerenderTrigger, translator, blocks, blockLookUp, options, normalizeColor, legend, LC_Legend, LC_Class, LC_ClassCharacteristics, LC_HorizontalPatterns, LC_Strata, LC_Properties, characteristics, characteristicLookUp, LC_Characteristics, legendValid, activeLCElement, setActiveLCElement, triggerFullExport, setFullExport } = props;
    
    const displayTab = (tabName) => {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tablink");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].style.backgroundColor = "";
        }
        document.getElementById(tabName).style.display = "block";
        document.getElementById('btn'+tabName).style.backgroundColor = "#fff";
    }

    return (        
            <TabsComponent 
                rerenderTrigger={rerenderTrigger}
                translator={translator}
                blocks={blocks}
                blockLookUp={blockLookUp}
                options={options}
                normalizeColor={normalizeColor}
                
                legend={legend}
                characteristicLookUp={characteristicLookUp}
                characteristics={characteristics}
                
                LC_Legend={LC_Legend}
                LC_Class={LC_Class}
                LC_ClassCharacteristics={LC_ClassCharacteristics}
                LC_HorizontalPatterns={LC_HorizontalPatterns}
                LC_Strata={LC_Strata}
                LC_Properties={LC_Properties}
                LC_Characteristics={LC_Characteristics}
                
                legendValid={legendValid}

                activeLCElement={activeLCElement}
                setActiveLCElement={setActiveLCElement}

                triggerFullExport={triggerFullExport}
                setFullExport={setFullExport}
                />        
    )
}