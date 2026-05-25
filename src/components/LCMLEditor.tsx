import { Builder } from 'xml2js';
import XMLViewer from 'react-xml-viewer';

export const LCMLEditor = (props) => {
   const {rerenderTrigger,blocks,LC_Legend,LC_Class,LC_ClassCharacteristics,LC_HorizontalPatterns,LC_Strata,LC_Properties,LC_Characteristics} = props;

   let ClassXteristic = {};
   Object.entries(LC_ClassCharacteristics.current).forEach((Xteristic)=>{
         ClassXteristic = {...ClassXteristic, ["_"+Xteristic[0]]:Xteristic[1]};
   });   
   let Legend = {LC_Legend: {
                        $: {...LC_Legend.current},
                        objects: {
                           LC_Class: LC_Class.current,
                           LC_ClassCharacteristics: ClassXteristic,
                           LC_HorizontalPatterns: LC_HorizontalPatterns.current,
                           LC_Strata: LC_Strata.current,
                           LC_Properties: LC_Properties.current,
                           LC_Characteristics: LC_Characteristics.current
                        }   
                     }
               };
   const builder = new Builder();
   const legend = builder.buildObject(Legend);
   const customTheme = {
      attributeKeyColor: "#0074D9",
      attributeValueColor: "#2ECC40"
   };
   return (
      <XMLViewer xml={legend} theme={customTheme} initalCollapsedDepth={10} collapsible />
   );
}
