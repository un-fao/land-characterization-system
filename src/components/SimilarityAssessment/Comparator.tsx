import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

import correspondenceMatrix from './correspondence-matrix.json';
import extConfig from './extensiveness-config.json';

type ComparatorProps = {
  UUID: string;
  translator: any;
  legendTemplate: any;
  options: any;
  blocks: React.MutableRefObject<any>;
  blockLookUp: React.MutableRefObject<any>;
  characteristics: React.MutableRefObject<any>;
  characteristicLookUp: React.MutableRefObject<any>;
  fileContent: any[];
  setUploadVisible: (v: boolean) => void;
  setComparatorVisible: (v: boolean) => void;
  method?: 'Element Count' | 'Correspondence';
};

type CorrespondenceMatrix = {
  blocks: {
    block_id: number;
    block_name: string;
    label: string;
  }[];
  matrix: {
    [refBlockId: string]: {
      [subBlockId: string]: number; // 0–1
    };
  };
};

type ExtensivenessConfig = {
  table: {
    [inputCount: string]: {
      [referenceCount: string]: number; // 0–10
    };
  };
  default?: number;
};

type DiagnosticPair = {
  subjectId: number;
  subjectName: string;
  baseId: number;
  baseName: string;
  weight: number;        // 0–1
  contribution: number;  // % of final similarity
};

type DiagnosticState = {
  subjectClassName: string;
  baseClassName: string;
  similarity: number;          // final (semantic * extensiveness), 0–100
  semanticSimilarity: number;  // before extensiveness, 0–100
  extensivenessFactor: number; // 0–10, from config
  pairs: DiagnosticPair[];
};

const corr = correspondenceMatrix as CorrespondenceMatrix;
const ext = extConfig as ExtensivenessConfig;

export const Comparator: React.FC<ComparatorProps> = (props) => {
  const {
    UUID,
    translator,
    legendTemplate,
    options,
    blocks,
    blockLookUp,
    characteristics,
    characteristicLookUp,
    fileContent,
    setUploadVisible,
    setComparatorVisible,
    method = 'Element Count'
  } = props;

  const [diagnostic, setDiagnostic] = useState<DiagnosticState | null>(null);

  // LC blocks lookup
  const lcBlocks: any[] =
    (blocks?.current && (blocks.current as any).LC_Block) || [];

  const getBlockNameById = (id: number): string => {
    const b = lcBlocks.find((x: any) => x.block_id === id);
    return b?.block_reference || `Block ${id}`;
  };

  const computeElementCountSimilarity = (
    subjectIds: number[],
    baseIds: number[]
  ): number => {
    if (!baseIds || !baseIds.length) return 0;
    const intersection = subjectIds.filter((x) => baseIds.includes(x));
    return Math.round((intersection.length / baseIds.length) * 100);
  };

  const getExtensivenessFactor = (
    inputCount: number,
    referenceCount: number
  ): number => {
    const row = ext.table[String(inputCount)];
    const val = row ? row[String(referenceCount)] : undefined;
    if (typeof val === 'number') {
      return val; // 0–10, as in config
    }
    return typeof ext.default === 'number' ? ext.default : 10;
  };

  /**
   * subjectIds & baseIds are UNIQUE LCML basic elements
   * for the subject and reference classes respectively (over all HPs + strata).
   */
  const computeCorrespondenceSimilarity = (
    subjectIds: number[],
    baseIds: number[]
  ): number => {
    if (!baseIds.length || !subjectIds.length) return 0;

    const matrix = corr.matrix;

    let score = 0;
    let hasMatch = false;

    baseIds.forEach((refId) => {
      const row = matrix[String(refId)];
      if (!row) return;

      subjectIds.forEach((subId) => {
        const v = row[String(subId)];
        if (typeof v === 'number' && v > 0) {
          score += v;    // semantic weight 0–1
          hasMatch = true;
        }
      });
    });

    if (!hasMatch || score === 0) {
      return 0;
    }

    // semantic: over all possible element pairs for this class pair
    const semanticDenominator = baseIds.length * subjectIds.length;
    const semanticSim0to1 = score / semanticDenominator;

    // extensiveness: based on total unique elements per class
    const inputCount = subjectIds.length;
    const referenceCount = baseIds.length;
    const extFactor0to10 = getExtensivenessFactor(inputCount, referenceCount);
    const extFactor0to1 = extFactor0to10 / 10.0;

    const final0to1 = Math.max(
      0,
      Math.min(1, semanticSim0to1 * extFactor0to1)
    );

    return Math.round(final0to1 * 100);
  };

  const buildDiagnostics = (
    subjectClassName: string,
    baseClassName: string,
    subjectIds: number[],
    baseIds: number[]
  ) => {
    const matrix = corr.matrix;
    const pairs: DiagnosticPair[] = [];

    if (!baseIds.length || !subjectIds.length) {
      setDiagnostic({
        subjectClassName,
        baseClassName,
        similarity: 0,
        semanticSimilarity: 0,
        extensivenessFactor: 0,
        pairs: []
      });
      return;
    }

    let score = 0;
    let hasMatch = false;

    baseIds.forEach((refId) => {
      const row = matrix[String(refId)];
      if (!row) return;

      subjectIds.forEach((subId) => {
        const v = row[String(subId)] ?? 0;
        if (v <= 0) return;

        hasMatch = true;
        score += v;

        pairs.push({
          subjectId: subId,
          subjectName: getBlockNameById(subId),
          baseId: refId,
          baseName: getBlockNameById(refId),
          weight: v,
          contribution: 0
        });
      });
    });

    if (!hasMatch || score === 0) {
      setDiagnostic({
        subjectClassName,
        baseClassName,
        similarity: 0,
        semanticSimilarity: 0,
        extensivenessFactor: 0,
        pairs: []
      });
      return;
    }

    const semanticDenominator = baseIds.length * subjectIds.length;
    const semanticSim0to1 = score / semanticDenominator;
    const semanticSimPercent = semanticSim0to1 * 100;

    const inputCount = subjectIds.length;
    const referenceCount = baseIds.length;
    const extFactor0to10 = getExtensivenessFactor(inputCount, referenceCount);
    const extFactor0to1 = extFactor0to10 / 10.0;

    const final0to1 = Math.max(
      0,
      Math.min(1, semanticSim0to1 * extFactor0to1)
    );
    const finalPercent = final0to1 * 100;

    const normScore = score || 1;

    const pairsWithContribution = pairs
      .map((p) => ({
        ...p,
        contribution: (p.weight / normScore) * finalPercent
      }))
      .sort((a, b) => b.weight - a.weight);

    setDiagnostic({
      subjectClassName,
      baseClassName,
      similarity: Math.round(finalPercent),
      semanticSimilarity: Math.round(semanticSimPercent),
      extensivenessFactor: extFactor0to10,
      pairs: pairsWithContribution
    });
  };

  const getPercentageDisplay = (
    percentage: number | null
  ): [string, 'lighter' | 'normal' | 'bold' | 'bolder', string] => {
    if (percentage === null || isNaN(percentage)) {
      return ['#F5F5F5', 'lighter', 'grey'];
    }
    if (percentage < 0) {
      return ['#F5F5F5', 'lighter', 'grey'];
    }
    if (percentage >= 0 && percentage <= 10) {
      return ['rgba(255,255,255,0)', 'normal', 'black'];
    }
    if (percentage > 10 && percentage <= 20) {
      return ['#E1F1E8', 'normal', 'black'];
    }
    if (percentage > 20 && percentage <= 40) {
      return ['#C3E5CD', 'normal', 'black'];
    }
    if (percentage > 40 && percentage <= 60) {
      return ['#ACDCBA', 'bold', 'black'];
    }
    if (percentage > 60 && percentage <= 80) {
      return ['#91D1A2', 'bold', 'black'];
    }
    if (percentage >= 80 && percentage <= 100) {
      return ['#63BE7B', 'bolder', 'white'];
    }
    return ['#477F56', 'bolder', 'white'];
  };

  // ---------------------------------------------------------------------------
  // Early exit if no legends
  // ---------------------------------------------------------------------------
  if (!fileContent || fileContent.length === 0) {
    return (
      <>
        <div className="card m-0 p-0" style={{ height: '4vh', minHeight: '20px' }}>
          <img
            alt="Land Characterization Software"
            src="logo.png"
            height={30}
            className="mr-2"
          />
          <img
            alt="Food and Agriculture Organization of the United Nations"
            src="fao-logo.png"
            height={30}
            className="mr-2"
          />
          <div className="card flex justify-content-center">
            <Button
              label="Back"
              icon="pi pi-step-backward"
              onClick={() => {
                setUploadVisible(true);
                setComparatorVisible(false);
              }}
              style={{ minWidth: '100px', borderRadius: 'var(--border-radius)' }}
              className="mr-2 text-xs p-1 m-1"
            />
          </div>
        </div>
        <div className="card flex flex-row gap-2 m-1 p-0">
          <Card title="Assessment Results" style={{ width: '98vw', height: '93vh' }}>
            <p>No legends loaded.</p>
          </Card>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Determine reference legend by filename (contains "reference")
  // ---------------------------------------------------------------------------
  const referenceIndex = (() => {
    let idx = 0;
    fileContent.forEach((file, i) => {
      const key = Object.keys(file)[0] || '';
      if (key.toLowerCase().includes('reference')) {
        idx = i;
      }
    });
    return idx;
  })();

  const reference = Object.entries(fileContent[referenceIndex]);
  const baseHeaderTitle = reference[0][0];
  const baseData: any = reference[0][1];

  const baseHeaderClasses: any[] = baseData['LCT_Class'] || [];
  const baseHPs: any[] = baseData['LCT_HorizontalPatterns'] || [];
  const baseStrata: any[] = baseData['LCT_Strata'] || [];
  const baseProperties: any[] = baseData['LCT_Properties'] || [];

  // ---------------------------------------------------------------------------
  // Build reference-class elements: UNIQUE BlockIDs per class (all HPs + strata)
  // ---------------------------------------------------------------------------
  const baseElements: Record<string, number[]> = {};
  baseHeaderClasses.forEach((clss: any) => {
    const seen = new Set<number>();
    const filteredHPs = baseHPs.filter(
      (HP: any) => HP.class_id === clss['class_id']
    );
    filteredHPs.forEach((HP: any) => {
      const filteredStrata = baseStrata.filter(
        (Strata: any) => Strata.HPID === HP['horizontal_pattern_id']
      );
      filteredStrata.forEach((Strata: any) => {
        const filteredProps = baseProperties.filter(
          (Properties: any) => Properties.StratumID === Strata['stratumID']
        );
        filteredProps.forEach((Properties: any) => {
          if (Properties['BlockID'] != null) {
            seen.add(Properties['BlockID']);
          }
        });
      });
    });
    baseElements[String(clss['class_id'])] = Array.from(seen);
  });

  // ---------------------------------------------------------------------------
  // Build similarity results + export data for all subject legends (including ref)
  // ---------------------------------------------------------------------------
  const uiResults: any[] = [];
  const exportResults: any[] = [];

  fileContent.forEach((file) => {
    const subject = Object.entries(file);
    const subjectHeaderTitle = subject[0][0];
    const subjectData: any = subject[0][1];

    const subjectHeaderClasses: any[] = subjectData['LCT_Class'] || [];
    const subjectHPs: any[] = subjectData['LCT_HorizontalPatterns'] || [];
    const subjectStrata: any[] = subjectData['LCT_Strata'] || [];
    const subjectProperties: any[] = subjectData['LCT_Properties'] || [];

    const subjectElements: Record<
      string,
      { elements: number[]; class_name: string }
    > = {};

    subjectHeaderClasses.forEach((clss: any) => {
      const seen = new Set<number>();
      const filteredHPs = subjectHPs.filter(
        (HP: any) => HP.class_id === clss['class_id']
      );
      filteredHPs.forEach((HP: any) => {
        const filteredStrata = subjectStrata.filter(
          (Strata: any) => Strata.HPID === HP['horizontal_pattern_id']
        );
        filteredStrata.forEach((Strata: any) => {
          const filteredProps = subjectProperties.filter(
            (Properties: any) => Properties.StratumID === Strata['stratumID']
          );
          filteredProps.forEach((Properties: any) => {
            if (Properties['BlockID'] != null) {
              seen.add(Properties['BlockID']);
            }
          });
        });
      });
      subjectElements[String(clss['class_id'])] = {
        elements: Array.from(seen),
        class_name: clss['class_name']
      };
    });

    Object.entries(subjectElements).forEach(([classId, classInfo]) => {
      const test = (classInfo as any).elements as number[];
      const subjectClassName = (classInfo as any).class_name as string;

      const classResultsUI: any[] = [];
      const classResultsExport: any[] = [];

      Object.entries(baseElements).forEach(([baseClassId, baseIds]) => {
        const baseArr = baseIds as number[];

        // Intersection for "Elements" column is unique intersection
        const intersection = test.filter((x) => baseArr.includes(x));

        let percentage: number | null;
        if (method === 'Correspondence') {
          percentage = computeCorrespondenceSimilarity(test, baseArr);
        } else {
          percentage = computeElementCountSimilarity(test, baseArr);
        }

        const [bg, fontWeight, color] = getPercentageDisplay(percentage);

        const baseClassName =
          baseHeaderClasses.find(
            (c: any) => String(c['class_id']) === String(baseClassId)
          )?.class_name || String(baseClassId);

        // UI representation (button) + numeric value for sorting
        classResultsUI.push({
          ['ClassElements' + baseClassId]: intersection.length,
          ['ClassPercentageValue' + baseClassId]: percentage,
          ['ClassPercentage' + baseClassId]: (
            <button
              type="button"
              className="flex align-items-center justify-content-center p-2 m-0"
              style={{
                backgroundColor: bg,
                fontWeight: fontWeight as any,
                color,
                border: 'none',
                width: '100%',
                cursor: method === 'Correspondence' ? 'pointer' : 'default'
              }}
              onClick={() => {
                if (method === 'Correspondence') {
                  buildDiagnostics(
                    subjectClassName,
                    baseClassName,
                    test,
                    baseArr
                  );
                } else {
                  setDiagnostic(null);
                }
              }}
              title={
                method === 'Correspondence'
                  ? 'Click for element-level diagnostics'
                  : ''
              }
            >
              {percentage !== null ? `${percentage}%` : ''}
            </button>
          )
        });

        // Plain export representation (numbers only)
        classResultsExport.push({
          ['ClassElements' + baseClassId]: intersection.length,
          ['ClassPercentage' + baseClassId]: percentage
        });
      });

      let tempUI: any = {};
      classResultsUI.forEach((r) => {
        tempUI = { ...tempUI, ...r };
      });

      let tempExport: any = {};
      classResultsExport.forEach((r) => {
        tempExport = { ...tempExport, ...r };
      });

      uiResults.push({
        file: subjectHeaderTitle,
        class: <b>{subjectClassName}</b>,
        ...tempUI
      });

      exportResults.push({
        file: subjectHeaderTitle,
        class: subjectClassName,
        ...tempExport
      });
    });
  });

  // Self-reference rows sorted to bottom & shaded
  const results = [...uiResults].sort((a, b) => {
    const aSelf = a.file === baseHeaderTitle;
    const bSelf = b.file === baseHeaderTitle;
    if (aSelf === bSelf) return 0;
    return aSelf ? 1 : -1; // self rows last
  });

  const exportResultsSorted = [...exportResults].sort((a, b) => {
    const aSelf = a.file === baseHeaderTitle;
    const bSelf = b.file === baseHeaderTitle;
    if (aSelf === bSelf) return 0;
    return aSelf ? 1 : -1;
  });

  // ---------------------------------------------------------------------------
  // CSV/Excel export helpers – headers aligned to layout
  // ---------------------------------------------------------------------------
  const exportColumns: { key: string; header: string }[] = [
    { key: 'file', header: 'Subject legend' },
    { key: 'class', header: 'Subject class' }
  ];

  baseHeaderClasses.forEach((clss: any) => {
    const id = clss['class_id'];
    const name = clss['class_name'];
    exportColumns.push(
      {
        key: `ClassElements${id}`,
        header: `${name} - Elements`
      },
      {
        key: `ClassPercentage${id}`,
        header: `${name} - Similarity (%)`
      }
    );
  });

  const exportAsCSV = (filename: string) => {
    if (!exportResultsSorted.length) return;

    const headers = exportColumns.map((c) => c.header);

    const escape = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines: string[] = [];
    csvLines.push(headers.join(','));

    exportResultsSorted.forEach((row) => {
      const line = exportColumns
        .map((col) => escape((row as any)[col.key]))
        .join(',');
      csvLines.push(line);
    });

    const csvContent = csvLines.join('\r\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    exportAsCSV('similarity_results.csv');
  };

  // ---------------------------------------------------------------------------
  // Header + row styling
  // ---------------------------------------------------------------------------
  const headerTemplate = (data: any) => {
    return (
      <div
        className="flex align-items-center gap-1"
        style={{ backgroundColor: '#eee', minWidth: '300px' }}
      >
        <span className="font-bold">{data.file}</span>
      </div>
    );
  };

  const rowClassName = (data: any) => {
    return {
      'self-ref-row': data.file === baseHeaderTitle
    };
  };

  // Build columns (no headerColumnGroup, just multi-line headers)
  const rowColumns: JSX.Element[] = [];

  baseHeaderClasses.forEach((clss: any) => {
    const id = clss['class_id'];
    const name = clss['class_name'];

    const elementsHeader = (
      <div className="flex flex-column text-xs text-center">#</div>
    );

    const similarityHeader = (
      <div className="flex flex-column text-xxs text-center" style={{ minWidth: '5vw' }}>
        <div className="font-bold">{name}</div>
      </div>
    );

    rowColumns.push(
      <Column
        key={`E-${id}`}
        header={elementsHeader}
        field={`ClassElements${id}`}
        sortable
      />
    );
    rowColumns.push(
      <Column
        key={`P-${id}`}
        header={similarityHeader}
        field={`ClassPercentageValue${id}`}
        sortable
        body={(rowData) => rowData[`ClassPercentage${id}`]}
      />
    );
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <div
        className="card m-0 p-0"
        style={{ minHeight: '20px' }}
      >        
        <div className="card flex justify-content-center">
          <Button
            label="Back"
            icon="pi pi-step-backward"
            onClick={() => {
              setUploadVisible(true);
              setComparatorVisible(false);
            }}
            style={{ minWidth: '100px', borderRadius: 'var(--border-radius)' }}
            className="mr-2 text-xs p-1 m-1"
          />
          <Button
            label="Export (CSV)"
            icon="pi pi-download"
            className="p-button-sm p-button-success mr-2 text-xs p-1 m-1"
            onClick={handleExportCSV}
          />
        </div>        
      </div>
      <div className="card flex flex-row gap-0 m-0 p-2">
        <div style={{ height: '75vh', overflow: 'hidden' }}>
          <div className="gap-0 m-0 p-0 text-xl font-bold flex justify-content-center">Assessment Results - {baseHeaderTitle} </div>
          
          <DataTable
            value={results}
            rowGroupMode="subheader"
            groupRowsBy="file"
            rowGroupHeaderTemplate={headerTemplate}
            scrollable
            removableSort
            scrollHeight="72vh"
            tableStyle={{ minWidth: '50rem' }}
            rowClassName={rowClassName}
            stripedRows
            style={{ border: '1px solid #aaa' }}
          >
            <Column field="class" header={"CLASSES - ("+baseHeaderTitle+")"} frozen style={{ minWidth: '15vw', backgroundColor: '#def5ffff' }} />
            {rowColumns}
          </DataTable>

          <Dialog
            header="Similarity Diagnostics"
            visible={!!diagnostic && method === 'Correspondence'}
            style={{ width: '70vw', maxHeight: '60vh' }}
            modal
            closable
            onHide={() => setDiagnostic(null)}
          >
            {diagnostic && (
              <>
                <p>
                  <strong>Subject class:</strong> {diagnostic.subjectClassName}
                  <br />
                  <strong>Reference class:</strong> {diagnostic.baseClassName}
                  <br />
                  <strong>Semantic similarity (no extensiveness):</strong>{' '}
                  {diagnostic.semanticSimilarity}%
                  <br />
                  <strong>Extensiveness factor:</strong>{' '}
                  {diagnostic.extensivenessFactor.toFixed(1)}
                  <br />
                  <strong>Final similarity:</strong> {diagnostic.similarity}%
                </p>

                {diagnostic.pairs.length === 0 ? (
                  <p>No contributing element pairs (all matrix weights are zero).</p>
                ) : (
                  <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                    <table className="table-auto w-full text-sm">
                      <thead>
                        <tr>
                          <th className="p-2 border">Subject Block</th>
                          <th className="p-2 border">Reference Block</th>
                          <th className="p-2 border" style={{ textAlign: 'right' }}>Matrix weight (0–1)</th>
                          <th className="p-2 border" style={{ textAlign: 'right' }}>
                            Contribution (% of similarity)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostic.pairs.map((p, idx) => (
                          <tr key={idx}>
                            <td className="p-2 border">
                              {p.subjectName}
                            </td>
                            <td className="p-2 border">
                              {p.baseName}
                            </td>
                            <td
                              className="p-2 border"
                              style={{ textAlign: 'right' }}
                            >
                              {p.weight.toFixed(2)}
                            </td>
                            <td
                              className="p-2 border"
                              style={{ textAlign: 'right' }}
                            >
                              {p.contribution.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </Dialog>
        </div>
      </div>
    </>
  );
};
