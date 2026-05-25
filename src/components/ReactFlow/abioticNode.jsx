import { memo } from 'react';
import { Handle, useReactFlow, useStoreApi, Position , NodeToolbar } from 'reactflow';
import { Button } from 'primereact/button';
import { LC_String } from '../DataTypes/LC_String';
import { LC_Number } from '../DataTypes/LC_Number';
import { LC_MinMax } from '../DataTypes/LC_MinMax';

const options = [
  {
    value: 'Artificial Surface',
    label: 'Artificial Surface',
  },
  {
    value: 'Water Body & Associated Surface',
    label: 'Water Body & Associated Surface',
  },
  {
    value: 'Water Body',
    label: 'Water Body',
  },
  {
    value: 'Water Salinity',
    label: 'Water Salinity',
  },
];

function Select({ value, handleId, sourceId, targetId, nodeId }) {
  const { setNodes } = useReactFlow();
  const store = useStoreApi();

  const onChange = (evt) => {
    const { nodeInternals } = store.getState();
    setNodes(
      Array.from(nodeInternals.values()).map((node) => {
        if (node.id === nodeId) {
          node.data = {
            ...node.data,
            selects: {
              ...node.data.selects,
              [handleId]: evt.target.value,
            },
          };
        }

        return node;
      })
    );
  };

  return (
    <div className="custom-node__select">      
      <div>Elements</div>
      <select className="nodrag" onChange={onChange} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Handle type="source" className="react-flow__handleR" position={Position.Right} id={sourceId} />
      <Handle type="target" className="react-flow__handleL" position={Position.Left} id={targetId} />
    </div>
  );
}

function abioticNode({ id, data }) {
  return (
    <div className="card">
      <NodeToolbar position="top">
        <div className="card flex justify-content-center">
            <span className="p-buttonset">
                <Button label="Add" icon="pi pi-plus" outlined size="small" style={{ verticalAlign: 'center', fontSize: 'xx-small', height: 20 }} />
                <Button label="Delete" icon="pi pi-trash" outlined size="small" style={{ verticalAlign: 'center', fontSize: 'xx-small', height: 20 }} />                
            </span>
        </div>
      </NodeToolbar>
      <div className="abiotic-node__header">
        LC_AbioticSurface
      </div>
      <div className="element-node__body">
        {Object.keys(data.selects).map((handleId) => (
          <Select key={handleId} nodeId={id} value={data.selects[handleId]} handleId={handleId} sourceId={handleId} targetId={handleId} />
        ))}
      </div>
    </div>
  );
}

export default memo(abioticNode);