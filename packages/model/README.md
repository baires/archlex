# @archlex/model

Type definitions and data models for ArchLex architecture diagrams.

## Installation

```bash
npm install @archlex/model
```

## Usage

```typescript
import type { 
  Diagram, 
  Node, 
  Edge, 
  Provider, 
  ServiceDefinition 
} from '@archlex/model';

// Use types in your application
const node: Node = {
  id: 'web-server',
  type: 'ec2',
  provider: 'aws',
  label: 'Web Server',
  position: { x: 0, y: 0 }
};

const edge: Edge = {
  source: 'web-server',
  target: 'database',
  label: 'queries'
};
```

## Exported Types

### Core Types
- `Diagram` - Complete diagram structure
- `Node` - Service node in the diagram
- `Edge` - Connection between nodes
- `Position` - X/Y coordinates

### Provider Types
- `Provider` - Cloud provider identifier
- `ServiceDefinition` - Service metadata
- `IconDefinition` - Icon data and metadata

### AST Types
- `Program` - Root AST node
- `Statement` - AST statement types
- `Expression` - AST expression types

## Features

- Full TypeScript type definitions
- Zero runtime dependencies
- Comprehensive JSDoc documentation
- Strict type checking support

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
