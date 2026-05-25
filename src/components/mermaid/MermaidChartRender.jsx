import React, { useState } from 'react';
import mermaid from 'mermaid';
import * as htmlToImage from 'html-to-image';
import { Button } from 'primereact/button';
import { Tooltip } from 'primereact/tooltip';
import { saveAs } from 'file-saver';

mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'stepBefore' },
    themeVariables: { primaryColor: '#eef2ff', primaryTextColor: '#4b5563', primaryBorderColor: '#6366f1', lineColor: '#F8B229', fontSize: '9px', fontFamily: 'var(--font-family)' },
    securityLevel: 'loose',
    maxTextSize: 9999999,
    maxEdges: 9999999,
    logLevel: 5    
   });

export default class MermaidChartRender extends React.Component {
    componentDidMount() {
        mermaid.contentLoaded();
        this.applyUMLMarkers();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.chart !== this.props.chart) {
            document.getElementById(this.props.index).removeAttribute("data-processed");
            mermaid.contentLoaded();
            this.applyUMLMarkers();
        }
    }

    applyUMLMarkers() {
        setTimeout(() => {
        //console.log('=== Applying UML Markers ===');
        const container = document.getElementById(this.props.index);
        //console.log('Container:', container);
        
        const svg = container?.querySelector('svg');
        //console.log('SVG found:', svg);
        if (!svg) {
          //console.warn('No SVG found!');
          return;
        }
        
        // First, inject marker definitions into the Mermaid SVG
        let defs = svg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svg.insertBefore(defs, svg.firstChild);
          //console.log('Created defs element');
        }
        
        // Remove existing UML markers if they exist
        const existingMarkers = defs.querySelectorAll('[id^="uml-"]');
        existingMarkers.forEach(m => m.remove());
        
        // Add composition marker (filled diamond)
        const compositionMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        compositionMarker.setAttribute('id', 'uml-composition');
        compositionMarker.setAttribute('markerWidth', '20');
        compositionMarker.setAttribute('markerHeight', '20');
        compositionMarker.setAttribute('refX', '5');
        compositionMarker.setAttribute('refY', '0');
        compositionMarker.setAttribute('orient', 'auto');
        compositionMarker.setAttribute('markerUnits', 'strokeWidth');
        
        const compositionPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        compositionPath.setAttribute('d', 'M 0,5 L 5,0 L 10,5 L 5,10 Z');
        compositionPath.setAttribute('fill', '#333');
        compositionPath.setAttribute('stroke', '#333');
        compositionPath.setAttribute('stroke-width', '1');
        compositionMarker.appendChild(compositionPath);
        defs.appendChild(compositionMarker);
        
        //console.log('Markers injected into SVG');
        
        // Try multiple selectors to find edges
        const selectors = [
          '.flowchart-link',
          '.edgePath path',
          'g.edgePath > path',
          'path.path',
          'g[class*="edge"] path'
        ];
        
        let edges = null;
        for (const selector of selectors) {
          edges = svg.querySelectorAll(selector);
          if (edges.length > 0) {
            //console.log(`Found ${edges.length} edges using selector: ${selector}`);
            break;
          }
        }
        
        if (!edges || edges.length === 0) {
          //console.warn('No edges found! Checking all paths...');
          edges = svg.querySelectorAll('path');
          //console.log(`Found ${edges.length} total paths in SVG`);
        }
        
        edges.forEach((edge, index) => {
          const classes = edge.className?.baseVal || edge.className || '';
          const strokeWidth = edge.style.strokeWidth || edge.getAttribute('stroke-width');
          const strokeDasharray = edge.getAttribute('stroke-dasharray');
          
          /*console.log(`Edge ${index}:`, {
            tagName: edge.tagName,
            classes: classes,
            strokeWidth: strokeWidth,
            strokeDasharray: strokeDasharray,
            id: edge.id,
            currentMarkerEnd: edge.getAttribute('marker-start'),
            parentClass: edge.parentElement?.className?.baseVal || edge.parentElement?.className
          });*/
          
          // Check for thick arrows by CSS class (Mermaid uses classes, not inline styles!)
          const isThick = classes?.includes('edge-thickness-thick') || false;
          const isNormal = classes?.includes('edge-thickness-normal') || false;
          const isDotted = classes?.includes('edge-pattern-dotted') || false;
          
          if (isDotted) {
            //console.log(`  -> Edge ${index} is DOTTED (keeping default arrow)`);
          } else {
            //console.log(`  -> Ã¢Å“â€œ Applying composition marker to NORMAL edge ${index}`);
            edge.setAttribute('marker-start', 'url(#uml-composition)');
            edge.style.markerStart = 'url(#uml-composition)';
            //console.log(`  -> Ã¢Å“â€œ Marker applied! Verify: ${edge.getAttribute('marker-start')}`);
          }
        });
        
        //console.log('=== UML Markers Applied ===');
        }, 1000);
    }

    //const { chart, legendValid, setActiveLCElement, index } = props;
    render() {
      const altCaptureTabImage = async (index) => {
        const svgElement = document.getElementById(index).querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          saveAs(blob, index+`.svg`);
        }
      };
      // High-resolution export: render the Mermaid SVG onto an oversized canvas
      // rather than screen-capturing the DOM element (which is tiny on small screens).
      const HIGH_RES_SCALE = 4; // Output at 4× the SVG's natural viewport size
      
      const exportSvgToCanvas = (svgElement, scale) => {
        return new Promise((resolve, reject) => {
          const bbox  = svgElement.getBoundingClientRect();
          const vb    = svgElement.viewBox?.baseVal;
          // Prefer viewBox dimensions (true content size); fall back to bounding rect
          const natW  = (vb && vb.width  > 0) ? vb.width  : bbox.width  || 1200;
          const natH  = (vb && vb.height > 0) ? vb.height : bbox.height || 800;
          const outW  = Math.round(natW * scale);
          const outH  = Math.round(natH * scale);

          // Clone SVG and set explicit dimensions so the image renders at full size
          const cloned = svgElement.cloneNode(true);
          cloned.setAttribute('width',  outW);
          cloned.setAttribute('height', outH);
          // Preserve aspect ratio
          if (!cloned.getAttribute('viewBox') || cloned.getAttribute('viewBox') === '') {
            cloned.setAttribute('viewBox', `0 0 ${natW} ${natH}`);
          }

          const svgData = new XMLSerializer().serializeToString(cloned);
          // Use a base64 data URI — blob URLs taint the canvas and block toDataURL.
          const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width  = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, outW, outH);
            ctx.drawImage(img, 0, 0, outW, outH);
            resolve(canvas);
          };
          img.onerror = (err) => reject(err);
          img.src = url;
        });
      };

      const downloadChartAsImage = async (index, type = "PNG") => {
        const container  = document.getElementById(this.props.index);
        const svgElement = container?.querySelector('svg');

        // SVG export — always vector, always crisp
        if (type === "SVG") {
          altCaptureTabImage(index);
          return;
        }

        // PNG / JPG — try SVG→Canvas at HIGH_RES_SCALE first
        if (svgElement) {
          try {
            const canvas = await exportSvgToCanvas(svgElement, HIGH_RES_SCALE);
            const link   = document.createElement('a');
            if (type === "PNG") {
              link.href     = canvas.toDataURL('image/png');
              link.download = 'LChS_Legend.png';
            } else {
              link.href     = canvas.toDataURL('image/jpeg', 0.95);
              link.download = 'LChS_Legend.jpeg';
            }
            link.click();
            return;
          } catch (err) {
            console.warn('SVG→Canvas export failed, falling back to htmlToImage:', err);
          }
        }

        // Fallback: htmlToImage with forced high pixel ratio
        const fallbackOpts = { cacheBust: true, skipFonts: true, pixelRatio: HIGH_RES_SCALE };
        try {
          let dataUrl;
          if (type === "PNG") {
            dataUrl = await htmlToImage.toPng(container, fallbackOpts);
          } else {
            dataUrl = await htmlToImage.toJpeg(container, { ...fallbackOpts, quality: 0.95 });
          }
          const link   = document.createElement('a');
          link.href     = dataUrl;
          link.download = type === "PNG" ? 'LChS_Legend.png' : 'LChS_Legend.jpeg';
          link.click();
        } catch (err) {
          console.error('htmlToImage fallback also failed, saving as SVG:', err);
          altCaptureTabImage(index);
        }
      };  
      
      const handleNodeClick = (event) => {
        const clickedNode = event.target.closest('.node');
        if (!clickedNode) return;
        const node = clickedNode.id || clickedNode.getAttribute('data-node-id');
        if (!node) return;
        const match = node.match(/(?:flowchart|graph)-(.+?)-\d+$/);
        const nodeID = match ? match[1] : null;
        if (!nodeID) return;

        const regexClass = /^A\d+/;
        const regexClassChar = /^B_1_\d+/;
        const regexHP = /^C_1_\d+_1_\d+/;
        const regexStratum = /^D_1_\d+_1_\d+_\d+/;
        const regexProperty = /^E_1_\d+_1_\d+_\d+_\d+/;
        const regexCharacteristic = /^F_1_\d+_1_\d+_\d+_\d+_\d+/;
        const regexSeqProperty = /^ESeq_1_\d+_1_\d+_\d+_\d+_seq\d+/;
        const regexSeqCharacteristic = /^FSeq_1_\d+_1_\d+_\d+_\d+_seq\d+_\d+/;
        const regexExclProperty = /^EExcl_1_\d+_1_\d+_\d+_\d+_excl\d+/;
        const regexExclCharacteristic = /^FExcl_1_\d+_1_\d+_\d+_\d+_excl\d+_\d+/;

        if (nodeID === 'A')
            this.props.setActiveLCElement('A|1');
        else if (regexClass.test(nodeID))
            this.props.setActiveLCElement('A|1|' + nodeID.replace('A', ''));
        else if (regexClassChar.test(nodeID))
            this.props.setActiveLCElement('A|1|' + nodeID.replace('B_1_', '') + '|CHARACTERISTICS');
        else if (regexHP.test(nodeID))
            this.props.setActiveLCElement('A' + nodeID.replace('C', '').replaceAll('_', '|'));
        else if (regexStratum.test(nodeID))
            this.props.setActiveLCElement('A' + nodeID.replace('D', '').replaceAll('_', '|'));
        else if (regexSeqProperty.test(nodeID))
            this.props.setActiveLCElement('A' + nodeID.replace('ESeq', '').replaceAll('_', '|'));
        else if (regexSeqCharacteristic.test(nodeID)) {
            const parts = nodeID.replace('FSeq', 'A').split('_');
            parts.pop();
            this.props.setActiveLCElement(parts.join('|'));
        } else if (regexExclProperty.test(nodeID))
            this.props.setActiveLCElement('A' + nodeID.replace('EExcl', '').replaceAll('_', '|'));
        else if (regexExclCharacteristic.test(nodeID)) {
            const parts = nodeID.replace('FExcl', 'A').split('_');
            parts.pop();
            this.props.setActiveLCElement(parts.join('|'));
        } else if (regexProperty.test(nodeID))
            this.props.setActiveLCElement('A' + nodeID.replace('E', '').replaceAll('_', '|'));
        else if (regexCharacteristic.test(nodeID)) {
            const parts = nodeID.replace('F', 'A').split('_');
            parts.pop();
            this.props.setActiveLCElement(parts.join('|'));
        } else
            this.props.setActiveLCElement(null);
      };

      return (
        <>
          <div className="flex-column gap" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
              <div className="mermaid flex align-items-center justify-content-center" id={this.props.index} onClick={handleNodeClick} style={{ width: '100%', height: 'fit-content', margin: 'auto', padding: 0, paddingLeft: '10px', overflow: 'auto' }}>
                {this.props.chart}
              </div>
              <div style={{ position: 'absolute', left: 0, bottom: '31px', width: 'fit-contents', overflow: 'hidden', height: 'fit-contents' }}>
                  <div style={{ width: '120px', borderStyle: 'solid', borderWidth: '1px', borderRadius: '5px', borderColor: 'var(--blue-600)', padding: '3px', margin: '2px' }}>
                      <Tooltip target=".custom-target-icon" />                
                      <i className="custom-target-icon pi pi-download align-contents-center justify-contents-center" data-pr-tooltip="Validate the legend to enable export" data-pr-position="right" data-pr-at="right+5 top" data-pr-my="left center-2" style={{ verticalAlign: 'center', fontSize: 'small', width: '55px' }}>
                        <select
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            height: '25px',
                            backgroundColor: '#fff',
                            color: 'var(--error-100)',
                            borderRadius: 'var(--border-radius)',
                            padding: '5px',
                            fontSize: 'xx-small',
                            marginLeft: '20px',
                            top: '3px'
                          }}
                          size={1}
                          disabled={!this.props.legendValid}
                          className="hover:bg-blue-200 focus:bg-green-400"
                          onChange={(e) => {
                            const format = e.target.value;
                            if (['PNG', 'JPG', 'SVG'].includes(format)) {
                              downloadChartAsImage(this.props.index, format);
                              e.target.selectedIndex = 0; // reset to default
                            }
                          }}
                        >
                          <option value="">Export diagram</option>
                          <option value="PNG">PNG</option>
                          <option value="JPG">JPG</option>
                          <option value="SVG">SVG</option>
                        </select>                        
                      </i>
                  </div>
              </div>
          </div>
        </>
      );
    }
};