# @archlex/icons-core

Core icon utilities for ArchLex architecture diagrams.

## Installation

```bash
npm install @archlex/icons-core
```

## Usage

```typescript
import { IconRegistry, parseIconSvg, optimizeIcon } from '@archlex/icons-core';

// Create an icon registry
const registry = new IconRegistry();

// Register an icon
registry.register('my-service', {
  id: 'my-service',
  name: 'My Service',
  svg: '<svg>...</svg>',
  category: 'custom'
});

// Get an icon
const icon = registry.get('my-service');

// Parse and optimize SVG
const parsed = parseIconSvg('<svg width="100" height="100">...</svg>');
const optimized = optimizeIcon(parsed);
```

## Features

- SVG parsing and manipulation
- Icon optimization and normalization
- Registry pattern for icon management
- Type-safe icon definitions
- Supports both Node.js and browser environments

## Icon Definition

```typescript
interface IconDefinition {
  id: string;
  name: string;
  svg: string;
  category?: string;
  tags?: string[];
  viewBox?: string;
}
```

## Icon Registry

```typescript
const registry = new IconRegistry();

// Register multiple icons
registry.registerMany([
  { id: 'icon1', name: 'Icon 1', svg: '...' },
  { id: 'icon2', name: 'Icon 2', svg: '...' }
]);

// Check if icon exists
if (registry.has('icon1')) {
  const icon = registry.get('icon1');
}

// List all icons
const allIcons = registry.list();

// Search icons
const computeIcons = registry.search('compute');
```

## SVG Utilities

```typescript
import { parseIconSvg, optimizeIcon, embedIcon } from '@archlex/icons-core';

// Parse SVG string
const parsed = parseIconSvg(svgString);

// Optimize SVG (remove unnecessary attributes, minify)
const optimized = optimizeIcon(parsed);

// Embed as data URI
const dataUri = embedIcon(optimized);
```

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
