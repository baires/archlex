# @archlex/language-service

Editor-neutral language intelligence for ArchLex source code.

## Overview

`@archlex/language-service` provides context-aware code completion for ArchLex diagrams. It analyzes ArchLex source, understands the current cursor position, and suggests relevant completions based on:

- **Catalog metadata** - Service names, relationships, and containment rules from provider catalogs
- **Search terms** - Human-readable names and descriptions for fuzzy matching
- **Document structure** - Current provider, scope hierarchy, and declared symbols
- **Grammar context** - Directive values, resource kinds, relationship types, and scope keywords

This package is DOM-neutral and works in both browser and Node.js environments without dependencies on Monaco, VSCode, or any specific editor framework.

## Installation

```bash
pnpm add @archlex/language-service
```

## Usage

### Basic Example (Non-Monaco)

```typescript
import { createCompletionEngine, analyzeLanguageDocument } from "@archlex/language-service";
import { createArchLex, awsProvider, gcpProvider, k8sProvider } from "@archlex/core";

// Create a completion engine with catalog metadata
const archlex = createArchLex({ providers: [awsProvider(), gcpProvider(), k8sProvider()] });
const catalog = archlex.getCatalog();
const engine = createCompletionEngine(catalog);

// Analyze a document
const source = "provider aws\nservice: elastic kubernetes";
const document = analyzeLanguageDocument(source);

// Get completions at cursor position
const offset = source.length; // cursor at end
const suggestions = engine.complete(document, offset);

// suggestions = [
//   {
//     label: "Amazon EKS",
//     insertText: "eks",
//     kind: "resource",
//     searchTerms: ["elastic", "kubernetes", "eks"],
//     replacement: { startOffset: 21, endOffset: 41 }
//   },
//   ...
// ]
```

### Monaco Integration Example

```typescript
import * as monaco from "monaco-editor";
import { createCompletionEngine, analyzeLanguageDocument } from "@archlex/language-service";
import { createArchLex, awsProvider } from "@archlex/core";

// Create engine
const archlex = createArchLex({ providers: [awsProvider()] });
const catalog = archlex.getCatalog();
const engine = createCompletionEngine(catalog);

// Register Monaco provider
const disposable = monaco.languages.registerCompletionItemProvider("archlex", {
  triggerCharacters: [":", ".", "[", "-"],

  provideCompletionItems(model, position) {
    const source = model.getValue();
    const document = analyzeLanguageDocument(source);
    const offset = model.getOffsetAt(position);

    const completions = engine.complete(document, offset);

    return {
      suggestions: completions.map(c => ({
        label: c.label,
        insertText: c.insertText,
        kind: monaco.languages.CompletionItemKind.Value,
        range: {
          startLineNumber: model.getPositionAt(c.replacement.startOffset).lineNumber,
          startColumn: model.getPositionAt(c.replacement.startOffset).column,
          endLineNumber: model.getPositionAt(c.replacement.endOffset).lineNumber,
          endColumn: model.getPositionAt(c.replacement.endOffset).column,
        }
      }))
    };
  }
});

// Clean up when done
disposable.dispose();
```

## API Reference

### `analyzeLanguageDocument(source: string)`

Parses ArchLex source and extracts structured metadata for completion.

**Returns:** `LanguageDocument`
- `source` - Original source text
- `providerId` - Current provider (`"aws"`, `"gcp"`, `"k8s"`, or `null`)
- `scopePath` - Current containment hierarchy (e.g., `["account", "region", "vpc"]`)
- `symbols` - Array of declared resource symbols with names, kinds, and positions
- `directives` - Parsed directives (provider, direction, validation)

### `createCompletionEngine(catalog: CatalogMetadata)`

Creates a completion engine backed by catalog metadata.

**Parameters:**
- `catalog` - Catalog metadata from `archlex.getCatalog()`

**Returns:** `CompletionEngine`

### `CompletionEngine.complete(document: LanguageDocument, offset: number, options?: CompletionOptions)`

Generates context-aware completions at the given offset.

**Parameters:**
- `document` - Analyzed language document
- `offset` - Cursor position (0-based byte offset)
- `options` - Optional settings
  - `trigger?: "manual" | "automatic"` - How completion was invoked

**Returns:** `LanguageCompletion[]`

### `LanguageCompletion`

```typescript
interface LanguageCompletion {
  label: string;           // Display label (e.g., "Amazon EKS")
  insertText: string;      // Text to insert (e.g., "eks")
  kind: CompletionKind;    // "directive" | "resource" | "relationship" | "scope"
  searchTerms: string[];   // Terms for fuzzy matching
  replacement: {
    startOffset: number;   // Start of range to replace
    endOffset: number;     // End of range to replace
  };
}
```

### `getCursorContext(document: LanguageDocument, offset: number)`

Determines the syntactic position at the cursor for context-aware completions.

**Returns:** `CursorContext`
- `position` - Grammar position (`"directive-name"`, `"resource-kind"`, `"relationship-type"`, etc.)
- `providerId` - Current provider
- `scopePath` - Current scope hierarchy
- `partialText` - Text being typed at cursor

### `createCatalogIndex(catalog: CatalogMetadata)`

Creates a fast lookup index for catalog resources and relationships.

**Returns:** `CatalogIndex`
- `resolveResource(provider, kindOrAlias)` - O(1) resource lookup
- `searchResources(provider, query)` - Fuzzy search by human names
- `listResources(provider)` - All resources for a provider
- `getRelationships(provider, sourceKind, targetKind)` - Valid relationships

## Features

### Catalog-Driven Completions

All service names, relationships, and containment rules come from provider catalogs:
- **194 AWS services** with relationships and containment
- **185 GCP services** with relationships and containment
- **62 Kubernetes resources** with relationships and containment

### Human-Readable Search

Completions include searchable terms from service descriptions:
- Typing "elastic kubernetes" suggests `eks` (Amazon EKS)
- Typing "relational" suggests `rds` (Amazon RDS) and `aurora` (Amazon Aurora)
- Typing "forward" suggests `forwards` relationship

### Context-Aware Filtering

The engine filters suggestions based on:
- **Current provider** - Only shows AWS services when `provider aws` is set
- **Scope hierarchy** - Only shows resources valid in current containment (e.g., `ecs` inside `cluster`)
- **Symbol visibility** - Suggests declared resource identifiers for relationships
- **Grammar position** - Different suggestions after `:`, `[`, or in directive positions

### Semantic Ranking

Results are ranked by:
1. **Exact prefix match** - `lam` → `lambda` ranks higher
2. **Search term relevance** - Fuzzy match quality against human names
3. **Relationship compatibility** - Valid relationships for source/target resources

### Canonical Insertion

Completions always insert canonical syntax:
- Service kinds use lowercase kebab-case: `eks`, `cloud-run`, `statefulset`
- Relationships use lowercase: `connects`, `writes`, `publishes`
- Directives preserve required format: `provider aws`, `direction LR`

## Grammar Context Detection

The engine understands cursor position in the grammar:

| Context | Example | Completions |
|---------|---------|-------------|
| **Directive name** | `prov█` | `provider`, `direction`, `validation` |
| **Directive value** | `provider █` | `aws`, `gcp`, `k8s` |
| **Resource kind** | `service: █` | AWS/GCP/K8s services |
| **Resource name** | `█: lambda` | Identifier suggestions |
| **Relationship type** | `a -[█` | `connects`, `writes`, etc. |
| **Relationship target** | `a -[writes]-> █` | Declared identifiers |

## Performance

- **Document caching** - WeakMap-based cache for repeated completions
- **Incremental updates** - Only re-parses when document version changes
- **Fast lookups** - O(1) catalog access, O(log n) search term matching
- **Browser tested** - Meets <50ms p95 latency on 100+ declaration documents

## Architecture

- **DOM-Neutral**: No browser or editor dependencies - works in Node.js, browsers, and workers
- **Immutable**: All document and completion objects are readonly
- **Editor-agnostic**: Works with Monaco, VSCode, CodeMirror, or any editor supporting offsets

## TypeScript Support

Fully typed with exported interfaces:
- `LanguageDocument`
- `CompletionEngine`
- `LanguageCompletion`
- `CompletionKind`
- `CursorContext`
- `CatalogIndex`

## License

MIT
