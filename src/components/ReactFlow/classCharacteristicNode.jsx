import { LC_String } from '../DataTypes/LC_String';
import { memo } from 'react';
import { Handle, useReactFlow, useStoreApi, Position } from 'reactflow';

const options = [
  {
    value: 'LC_Climate',
    label: 'LC_Climate',
  }
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

function classCharacteristicNode({ id, data }) {
  return (
    <div className="card">
      <div className="custom-node__header">
        Class Characteristics
      </div>
      <div className="custom-node__body">
        
        <div className="p-inputgroup flex-1">
            <span className="p-inputgroup-addon text-xs p-0 m-0">
                <i className="fa-solid fa-water"></i>
            </span>
            <LC_String id="name" name="name" style="p-inputtext-sm text-xs p-0 m-0" placeHolder="Name" />
        </div>
        <div className="p-inputgroup flex-1">
            <span className="p-inputgroup-addon text-xs p-0 m-0">
                <i className="fa-solid fa-water"></i>
            </span>
            <LC_String id="description" name="description" style="p-inputtext-sm text-xs p-0 m-0" placeHolder="Description" />
        </div>
          {Object.keys(data.selects).map((handleId) => (
            <Select key={handleId} nodeId={id} value={data.selects[handleId]} handleId={handleId} sourceId={handleId} targetId={handleId} />
          ))}
      </div>
    </div>
  );
}

export default memo(classCharacteristicNode);