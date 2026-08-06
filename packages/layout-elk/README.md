# @archlex/layout-elk

ELK-based layout engine for ArchLex architecture diagrams.

## Installation

```bash
npm install @archlex/layout-elk @archlex/model
```

## Usage

```typescript
import { ElkLayoutEngine } from '@archlex/layout-elk';
import type { Diagram } from '@archlex/model';

const diagram: Diagram = {
  nodes: [
    { id: 'web', type: 'ec2', provider: 'aws' },
    { id: 'api', type: 'lambda', provider: 'aws' },
    { id: 'db', type: 'rds', provider: 'aws' }
  ],
  edges: [
    { source: 'web', target: 'api' },
    { source: 'api', target: 'db' }
  ]
};

const layoutEngine = new ElkLayoutEngine();
const layoutedDiagram = await layoutEngine.layout(diagram);

// Nodes now have positions
console.log(layoutedDiagram.nodes[0].position); // { x: 0, y: 0 }
```

## Features

- Automatic graph layout using ELK (Eclipse Layout Kernel)
- Multiple layout directions (TB, BT, LR, RL)
- Hierarchical layout support
- Container and group handling
- Configurable spacing and alignment

## Layout Options

```typescript
const layoutEngine = new ElkLayoutEngine({
  direction: 'TB', // Top to Bottom
  spacing: {
    node: 80,
    edge: 20,
    layer: 60
  },
  alignment: 'center',
  separateComponents: true
});

const result = await layoutEngine.layout(diagram);
```

## Layout Directions

- `TB` - Top to Bottom (default)
- `BT` - Bottom to Top
- `LR` - Left to Right
- `RL` - Right to Left

## Advanced Features

### Container Layout

```typescript
// Nodes with children are automatically handled
const diagram: Diagram = {
  nodes: [
    { id: 'vpc', type: 'vpc', provider: 'aws', children: ['web', 'db'] },
    { id: 'web', type: 'ec2', provider: 'aws', parent: 'vpc' },
    { id: 'db', type: 'rds', provider: 'aws', parent: 'vpc' }
  ],
  edges: [{ source: 'web', target: 'db' }]
};
```

### Edge Routing

ELK automatically calculates edge routing and bend points for clean, non-overlapping connections.

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
