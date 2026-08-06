# @archlex/diagnostics

Diagnostic utilities for ArchLex architecture diagrams.

## Installation

```bash
npm install @archlex/diagnostics @archlex/model
```

## Usage

```typescript
import { DiagnosticCollector, Severity } from '@archlex/diagnostics';

const collector = new DiagnosticCollector();

// Add diagnostics
collector.error('Invalid service type', { line: 5, column: 10 });
collector.warning('Unused node', { line: 12, column: 5 });
collector.info('Consider adding a label', { line: 8, column: 3 });

// Check for errors
if (collector.hasErrors()) {
  console.error('Validation failed');
  collector.getDiagnostics().forEach(d => {
    console.error(`${d.severity}: ${d.message} at line ${d.location.start.line}`);
  });
}

// Get formatted output
const formatted = collector.formatDiagnostics(source);
console.log(formatted);
```

## Features

- Structured diagnostic messages
- Severity levels (error, warning, info)
- Source location tracking
- Human-readable formatting
- Error recovery suggestions

## Diagnostic Types

```typescript
interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  suggestion?: string;
}
```

## Severity Levels

- `error` - Prevents diagram compilation
- `warning` - Potential issues but valid
- `info` - Helpful suggestions

## Example Output

```
Error: Unknown service type 'ec3' at line 5:10
  Did you mean 'ec2'?

Warning: Node 'unused-db' has no connections at line 12:5

Info: Consider adding a label to improve readability at line 8:3
```

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
