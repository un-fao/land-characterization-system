import React from 'react';
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';
import { Button } from 'primereact/button';
import { Tooltip } from 'primereact/tooltip';

mermaid.initialize({
 startOnLoad: true,
 theme: 'default',
 flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'step' },
 themeVariables: { primaryColor: '#eef2ff', primaryTextColor: '#4b5563', primaryBorderColor: '#6366f1', lineColor: '#F8B229', fontSize: '9px', fontFamily: 'var(--font-family)' },
 securityLevel: 'loose',
 maxTextSize: 9999999,
 maxEdges: 9999999
});

export default class Mermaid extends React.Component {
 componentDidMount() {
  mermaid.contentLoaded();
 }

 componentDidUpdate(prevProps, prevState) {
    if (prevProps.chart !== this.props.chart) {
      document
        .getElementById("mermaid-chart")
        .removeAttribute("data-processed");      
      mermaid.contentLoaded();
    }
  }
  
 render() {
  const downloadChartAsImage = () => {
    html2canvas(document.getElementById("mermaid-chart")).then((canvas) => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'LChS_Legend.png';
      link.click();
    });
  };  
  const handleNodeClick = (event) => {
    const clickedNode = event.target.closest('.node');    
    if (clickedNode) {
      const node = clickedNode.id || clickedNode.getAttribute('data-node-id');
      const regexClass = new RegExp('^A\\d+');
      const regexClassChar = new RegExp('^B\\d+');
      const regexHP = new RegExp('^C_1_\\d+_1_\\d+');
      const regexStratum = new RegExp('^D_1_\\d+_1_\\d+_\\d+');
      const regexProperty = new RegExp('^E_1_\\d+_1_\\d+_\\d+_\\d+');
      const regexCharacteristic = new RegExp('^F_1_\\d+_1_\\d+_\\d+_\\d+_\\d+');
      const regexSeqProperty = new RegExp('^ESeq_1_\\d+_1_\\d+_\\d+_\\d+_seq\\d+');
      const regexSeqCharacteristic = new RegExp('^FSeq_1_\\d+_1_\\d+_\\d+_\\d+_seq\\d+_\\d+');
      const regexExclProperty = new RegExp('^EExcl_1_\\d+_1_\\d+_\\d+_\\d+_excl\\d+');
      const regexExclCharacteristic = new RegExp('^FExcl_1_\\d+_1_\\d+_\\d+_\\d+_excl\\d+_\\d+');
      let nodeID = node.split('-')[1];
      if(nodeID === 'A')
        this.props.setActiveLCElement('A|1');
      else if(regexClass.test(nodeID))
        this.props.setActiveLCElement('A|1|'+nodeID.replace('A',''));
      else if(regexClassChar.test(nodeID))
        this.props.setActiveLCElement('A|1|'+nodeID.replace('B','')+"|CHARACTERISTICS");
      else if(regexHP.test(nodeID))
        this.props.setActiveLCElement('A'+nodeID.replace('C','').replaceAll('_','|'));
      else if(regexStratum.test(nodeID))
        this.props.setActiveLCElement('A'+nodeID.replace('D','').replaceAll('_','|'));
      else if(regexSeqProperty.test(nodeID))
        this.props.setActiveLCElement('A'+nodeID.replace('ESeq','').replaceAll('_','|'));
      else if(regexSeqCharacteristic.test(nodeID)){
        let text = nodeID.replace('FSeq','A').split('_');
        text.pop();
        this.props.setActiveLCElement(text.join('|'));
      }
      else if(regexExclProperty.test(nodeID))
        this.props.setActiveLCElement('A'+nodeID.replace('EExcl','').replaceAll('_','|'));
      else if(regexExclCharacteristic.test(nodeID)){
        let text = nodeID.replace('FExcl','A').split('_');
        text.pop();
        this.props.setActiveLCElement(text.join('|'));
      }
      else if(regexProperty.test(nodeID))
        this.props.setActiveLCElement('A'+nodeID.replace('E','').replaceAll('_','|'));
      else if(regexCharacteristic.test(nodeID)){
        let text = nodeID.replace('F','A').split('_');
        text.pop();
        text = text.join('|');
        this.props.setActiveLCElement(text);
      }
      else
        this.props.setActiveLCElement(null);
    } else {
      this.props.setActiveLCElement(null);
    }
  };    
 return(
      <div className="flex flex-column" style={{ width: '100%', height: '100%' }}>
        <div className="flex align-items-center" style={{ width: '100%', height: '100%' }}>
          <div id="mermaid-chart" className="mermaid" style={{ width: '100%', margin: 'auto', padding: 0, paddingLeft: '10px' }} onClick={handleNodeClick}>
            {this.props.chart}
          </div>
        </div>          
        <div style={{ position: 'absolute', top: '55%' ,width: 'fit-contents', overflow: 'hidden', height: 'fit-contents' }}>
          <div style={{ width: '65px', borderStyle: 'solid', borderWidth: '1px', borderRadius: '5px', borderColor: 'var(--blue-600)', padding: '3px', margin: '2px' }}>
            <Tooltip target=".custom-target-icon" />
            <i className="custom-target-icon pi pi-download align-contents-center justify-contents-center" data-pr-tooltip="Validate the legend to enable export" data-pr-position="right" data-pr-at="right+5 top" data-pr-my="left center-2" style={{ verticalAlign: 'center', fontSize: 'small', width: '55px' }}> 
              <Button label="Legend" onClick={downloadChartAsImage} style={{ position: 'absolute', bottom: 0, left: 0, height: '25px', backgroundColor: '#fff', color: 'var(--error-100)', borderRadius: 'var(--border-radius)', padding: '5px', fontSize: 'xx-small',marginLeft: '20px',top: '3px' }} size="small" text disabled={!this.props.legendValid} />                
            </i>
          </div>
        </div>
      </div>
    );
 }
}