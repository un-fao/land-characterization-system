import { MarkerType, Position } from 'reactflow';

export const nodes = [
  {
    id: '1',
    type: 'LC_Legend',
    position: { x: -600, y: 100 },
    data: {
      selects: {
        'handle-0': 'smoothstep',
        'handle-1': 'smoothstep'
      }
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left
  },
  {
    id: '2',
    type: 'LC_ClassCharacteristic',
    data: {
      selects: {
        'handle-2': 'smoothstep',
        'handle-3': 'smoothstep'
      }
    },
    position: { x: -200, y: 0 }
  },
 {
    id: '3',
    type: 'custom',
    data: {
      selects: {
        'handle-4': 'smoothstep',
        'handle-5': 'smoothstep'
      }
    },
    position: { x: -200, y: 250 }
  },
  {
    id: '4',
    type: 'LC_Vegetation',
    data: {
      selects: {
        'handle-6': 'smoothstep',
        'handle-7': 'smoothstep'
      }
    },
    position: { x: 200, y: 100 }
  },
  {
    id: '5',
    type: 'LC_Abiotic',
    data: {
      selects: {
        'handle-8': 'smoothstep',
        'handle-9': 'smoothstep'
      }
    },
    position: { x: 200, y: 400 }
  }
];

export const edges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    sourceHandle: 'handle-0',
    targetHandle: 'handle-2',
    data: {
      selectIndex: 0,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
 {
    id: 'e1-3',
    source: '1',
    target: '3',
    type: 'smoothstep',
    sourceHandle: 'handle-1',
    targetHandle: 'handle-4',
    data: {
      selectIndex: 0,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    type: 'smoothstep',
    sourceHandle: 'handle-4',
    targetHandle: 'handle-6',
    data: {
      selectIndex: 0,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  },
  {
    id: 'e3-5',
    source: '3',
    target: '5',
    type: 'smoothstep',
    sourceHandle: 'handle-5',
    targetHandle: 'handle-8',
    data: {
      selectIndex: 0,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  }
];