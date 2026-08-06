# @archlex/core

Core architecture diagramming engine for cloud infrastructure.

## Installation

```bash
npm install @archlex/core @archlex/aws @archlex/gcp
```

## Usage

```typescript
import { parse, compile, render } from '@archlex/core';

const source = `
aws {
  compute {
    ec2 "web-server"
    lambda "api"
  }
}
`;

const diagram = compile(parse(source));
const svg = render(diagram);
```

## Features

- Parse ArchLex DSL syntax
- Compile to intermediate representation
- Automatic layout with ELK
- SVG rendering
- Multiple cloud provider support

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
