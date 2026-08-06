# @archlex/renderer-svg

SVG renderer for ArchLex architecture diagrams.

## Installation

```bash
npm install @archlex/renderer-svg @archlex/model
```

## Usage

```typescript
import { SvgRenderer } from '@archlex/renderer-svg';
import type { Diagram } from '@archlex/model';

const diagram: Diagram = {
  nodes: [
    { id: 'web', type: 'ec2', provider: 'aws', position: { x: 0, y: 0 } },
    { id: 'db', type: 'rds', provider: 'aws', position: { x: 200, y: 0 } }
  ],
  edges: [
    { source: 'web', target: 'db', label: 'queries' }
  ]
};

const renderer = new SvgRenderer();
const svg = renderer.render(diagram);

// Save to file or send to browser
console.log(svg);
```

## Features

- Clean, optimized SVG output
- Responsive sizing
- Customizable styling
- Icon embedding
- Edge routing and labels
- Theme support

## Options

```typescript
const renderer = new SvgRenderer({
  theme: 'dark', // 'light' or 'dark'
  fontSize: 14,
  padding: 20,
  nodeSpacing: 100,
  edgeStyle: 'curved' // 'straight' or 'curved'
});

const svg = renderer.render(diagram, {
  width: 800,
  height: 600,
  backgroundColor: 'transparent'
});
```

## Styling

The renderer supports CSS styling through class names:

- `.archlex-node` - Service nodes
- `.archlex-edge` - Connections
- `.archlex-label` - Text labels
- `.archlex-icon` - Service icons
- `.archlex-container` - Container groups

## Example Output

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <g class="archlex-node" data-id="web">
    <rect class="archlex-node-bg" x="0" y="0" width="120" height="80"/>
    <image class="archlex-icon" href="data:image/svg+xml;base64,..."/>
    <text class="archlex-label">Web Server</text>
  </g>
  <!-- More nodes and edges -->
</svg>
```

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
