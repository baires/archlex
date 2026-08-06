# @archlex/parser

ArchLex DSL parser for architecture diagrams.

## Installation

```bash
npm install @archlex/parser @archlex/model
```

## Usage

```typescript
import { parse } from '@archlex/parser';

const source = `
aws {
  compute {
    ec2 "web-server" {
      label: "Web Server"
    }
    
    lambda "api" {
      label: "API Handler"
    }
  }
  
  database {
    rds "db" {
      label: "PostgreSQL"
    }
  }
}

web-server -> api
api -> db
`;

const ast = parse(source);
console.log(ast);
```

## Features

- Fast Chevrotain-based parser
- Detailed syntax error messages
- Source location tracking
- Full AST with position information
- Recoverable parsing errors

## Error Handling

```typescript
import { parse } from '@archlex/parser';

try {
  const ast = parse(invalidSource);
} catch (error) {
  if (error.diagnostics) {
    // Syntax errors with location info
    error.diagnostics.forEach(diagnostic => {
      console.error(
        `${diagnostic.severity} at line ${diagnostic.location.start.line}: ${diagnostic.message}`
      );
    });
  }
}
```

## AST Structure

The parser produces an abstract syntax tree with the following node types:

- `Program` - Root node
- `ProviderBlock` - Cloud provider declaration
- `ServiceGroup` - Service group (compute, database, etc.)
- `ServiceNode` - Individual service
- `Connection` - Edge between services
- `Property` - Node properties

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
