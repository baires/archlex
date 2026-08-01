# Error System

ArchLex's error system provides precise, actionable diagnostics across all surfaces.

## For Library Users

All diagnostics include:
- **Code**: Stable identifier (e.g., `AL-PARSE-MISSING-ENDPOINT`)
- **Severity**: `error`, `warning`, or `info`
- **Message**: Technical description of the issue
- **Remediation**: Actionable fix suggestion
- **Span**: Source location with line/column
- **Elements**: Affected resource/relationship IDs

```typescript
const result = await archlex.render(source);

for (const diagnostic of result.diagnostics) {
  console.log(`${diagnostic.code}: ${diagnostic.message}`);
  console.log(`Fix: ${diagnostic.remediation}`);
}
```

## For Playground Users

### Quick Fixes
1. Click on error in editor
2. Press `Ctrl+.` (or `Cmd+.` on Mac)
3. Select suggested fix from menu

### Hover Information
Hover over any diagnostic marker to see:
- Error code and severity
- Detailed message
- Remediation steps
- Valid example
- Link to full documentation

## For CLI Users

### View Diagnostics
```bash
archlex render diagram.cm
```

Diagnostics shown with:
- Source context
- Line/column pointer
- Remediation inline

### List All Error Codes
```bash
archlex errors list
archlex errors list --category parse
archlex errors list --severity error
```

### View Specific Error
```bash
archlex errors AL-PARSE-MISSING-ENDPOINT
```

## Error Categories

### Parse Errors (AL-PARSE-*)
Lexer and parser failures. Fix by correcting syntax.

### Structural Errors (AL-STRUCT-*)
Directive and declaration issues. Fix by reorganizing or renaming.

### Semantic Errors (AL-SEM-*)
Provider-specific validation. Usually informational.

## Documentation

Full error reference: [docs/errors/index.md](./index.md)
