# @archlex/icons

Icon loading and manipulation utilities for ArchLex (Node.js).

## Installation

```bash
npm install @archlex/icons
```

## Usage

```typescript
import { IconLoader, loadIconsFromDirectory } from '@archlex/icons';

// Load icons from a directory
const icons = await loadIconsFromDirectory('./icons');

// Create an icon loader
const loader = new IconLoader({
  searchPaths: ['./icons', './custom-icons']
});

// Load a specific icon
const icon = await loader.load('aws/ec2');

// Batch load icons
const awsIcons = await loader.loadMany(['aws/ec2', 'aws/s3', 'aws/lambda']);
```

## Features

- File system icon loading
- Directory scanning and indexing
- Icon caching for performance
- Custom search paths
- SVG validation and parsing
- Node.js optimized

## Icon Loader

```typescript
const loader = new IconLoader({
  searchPaths: ['./icons'],
  cache: true,
  validate: true
});

// Load with options
const icon = await loader.load('my-icon', {
  optimize: true,
  width: 64,
  height: 64
});
```

## Directory Structure

Organize icons in directories:

```
icons/
├── aws/
│   ├── ec2.svg
│   ├── s3.svg
│   └── lambda.svg
├── gcp/
│   ├── compute-engine.svg
│   └── cloud-storage.svg
└── custom/
    └── my-service.svg
```

## Icon Discovery

```typescript
import { discoverIcons } from '@archlex/icons';

// Discover all icons in a directory
const discovered = await discoverIcons('./icons', {
  recursive: true,
  filter: (path) => path.endsWith('.svg')
});

console.log(`Found ${discovered.length} icons`);
```

## Caching

```typescript
const loader = new IconLoader({
  cache: true,
  cacheDir: './.icon-cache'
});

// First load: reads from disk
const icon1 = await loader.load('aws/ec2');

// Second load: reads from cache
const icon2 = await loader.load('aws/ec2');
```

## Environment

This package is designed for Node.js environments (v22+) and uses Node.js file system APIs. For browser usage, see [@archlex/icons-browser](../icons-browser).

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
