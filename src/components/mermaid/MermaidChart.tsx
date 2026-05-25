import React, { useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import * as htmlToImage from 'html-to-image';
import { Button } from 'primereact/button';
import { Tooltip } from 'primereact/tooltip';
import { Toast } from 'primereact/toast';
import { saveAs } from 'file-saver';

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'step' },
    themeVariables: { primaryColor: '#eef2ff', primaryTextColor: '#4b5563', primaryBorderColor: '#6366f1', lineColor: '#F8B229', fontSize: '9px', fontFamily: 'var(--font-family)' },
    securityLevel: 'loose',
    maxTextSize: 9999999,
    maxEdges: 9999999,
    logLevel: 5
});

export const MermaidChart = (props) => {
    const { chart, legendValid, setActiveLCElement, index } = props;
    const chartRef = useRef<HTMLDivElement>(null);
    const toast = useRef(null);

    const handleNodeId = useCallback((nodeID: string) => {
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
            setActiveLCElement('A|1');
        else if (regexClass.test(nodeID))
            setActiveLCElement('A|1|' + nodeID.replace('A', ''));
        else if (regexClassChar.test(nodeID))
            setActiveLCElement('A|1|' + nodeID.replace('B_1_', '') + '|CHARACTERISTICS');
        else if (regexHP.test(nodeID))
            setActiveLCElement('A' + nodeID.replace('C', '').replaceAll('_', '|'));
        else if (regexStratum.test(nodeID))
            setActiveLCElement('A' + nodeID.replace('D', '').replaceAll('_', '|'));
        else if (regexSeqProperty.test(nodeID))
            setActiveLCElement('A' + nodeID.replace('ESeq', '').replaceAll('_', '|'));
        else if (regexSeqCharacteristic.test(nodeID)) {
            const parts = nodeID.replace('FSeq', 'A').split('_');
            parts.pop();
            setActiveLCElement(parts.join('|'));
        } else if (regexExclProperty.test(nodeID))
            setActiveLCElement('A' + nodeID.replace('EExcl', '').replaceAll('_', '|'));
        else if (regexExclCharacteristic.test(nodeID)) {
            const parts = nodeID.replace('FExcl', 'A').split('_');
            parts.pop();
            setActiveLCElement(parts.join('|'));
        } else if (regexProperty.test(nodeID))
            setActiveLCElement('A' + nodeID.replace('E', '').replaceAll('_', '|'));
        else if (regexCharacteristic.test(nodeID)) {
            const parts = nodeID.replace('F', 'A').split('_');
            parts.pop();
            setActiveLCElement(parts.join('|'));
        } else
            setActiveLCElement(null);
    }, [setActiveLCElement]);

    useEffect(() => {
        if (!chartRef.current || !chart) return;
        const container = chartRef.current;
        const renderChart = async () => {
            try {
                const renderId = `mermaid-render-${Date.now()}`;
                const { svg } = await mermaid.render(renderId, chart);
                container.innerHTML = svg;
                container.querySelectorAll<SVGGraphicsElement>('g[id]').forEach(g => {
                    const match = g.id.match(/(?:flowchart|graph)-(.+?)-\d+$/);
                    if (!match) return;
                    const nodeID = match[1];
                    try {
                        const bbox = g.getBBox();
                        if (bbox.width === 0 && bbox.height === 0) return;
                        const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        overlay.setAttribute('x', String(bbox.x));
                        overlay.setAttribute('y', String(bbox.y));
                        overlay.setAttribute('width', String(bbox.width));
                        overlay.setAttribute('height', String(bbox.height));
                        overlay.setAttribute('fill', 'transparent');
                        overlay.style.cursor = 'pointer';
                        overlay.style.pointerEvents = 'all';
                        overlay.addEventListener('click', (e) => { e.stopPropagation(); handleNodeId(nodeID); });
                        g.appendChild(overlay);
                    } catch (_) {
                        g.style.cursor = 'pointer';
                        g.addEventListener('click', () => handleNodeId(nodeID));
                    }
                });
            } catch (err) {
                console.error('Mermaid render error:', err);
            }
        };
        renderChart();
    }, [chart, index, handleNodeId]);

    const altCaptureTabImage = async (idx: string) => {
        const svgElement = document.getElementById(idx)?.querySelector('svg');
        if (svgElement) {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            saveAs(blob, idx + `.svg`);
        }
    };

    const downloadChartAsImage = async () => {
        await htmlToImage.toPng(document.getElementById(index), { cacheBust: true }).then((canvas) => {
            const link = document.createElement('a');
            link.href = canvas;
            link.download = 'LChS_Legend.png';
            link.click();
        }).catch((error) => {
            console.error('Trying Again!', error);
            altCaptureTabImage(index);
            toast.current?.show({ severity: 'info', summary: 'PNG Export Failed', detail: `Export of diagram ${index} failed. Changing format to SVG.`, life: 5000 });
        });
    };

    return (
        <>
            <Toast ref={toast} />
            <div className="flex-column" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                <div
                    id={index}
                    ref={chartRef}
                    className="flex align-items-center justify-content-center"
                    style={{ width: '100%', height: 'fit-content', margin: 'auto', padding: 0, paddingLeft: '10px', overflow: 'auto' }}
                />
                <div style={{ position: 'absolute', top: '55%', width: 'fit-content', overflow: 'hidden', height: 'fit-content' }}>
                    <div style={{ width: '65px', borderStyle: 'solid', borderWidth: '1px', borderRadius: '5px', borderColor: 'var(--blue-600)', padding: '3px', margin: '2px' }}>
                        <Tooltip target=".custom-target-icon" />
                        <i className="custom-target-icon pi pi-download align-contents-center justify-contents-center" data-pr-tooltip="Validate the legend to enable export" data-pr-position="right" data-pr-at="right+5 top" data-pr-my="left center-2" style={{ verticalAlign: 'center', fontSize: 'small', width: '55px' }}>
                            <Button label="Export" onClick={downloadChartAsImage} style={{ position: 'absolute', bottom: 0, left: 0, height: '25px', backgroundColor: '#fff', color: 'var(--error-100)', borderRadius: 'var(--border-radius)', padding: '5px', fontSize: 'xx-small', marginLeft: '20px', top: '3px' }} size="small" text disabled={!legendValid} />
                        </i>
                    </div>
                </div>
            </div>
        </>
    );
};
