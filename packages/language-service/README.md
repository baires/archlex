# @archlex/language-service

Editor-neutral language intelligence for ArchLex source code.

## Overview

This package provides DOM-neutral language analysis and completion services for the ArchLex DSL. It works in both browser and Node.js environments without dependencies on Monaco, VSCode, or any specific editor framework.

## Features

- **Document Analysis**: Parse and tokenize ArchLex source into a structured document model
- **Cursor Context**: Detect syntactic position for context-aware completions
- **Catalog Indexing**: Fast O(1) resource lookup and fuzzy search
- **Editor-Neutral**: Works with any editor by converting between editor-specific and universal offsets/ranges

## Installation

```bash
pnpm add @archlex/language-service
```

## Usage

### Analyze a Document

```typescript
import { analyzeLanguageDocument } from "@archlex/language-service";

const document = analyzeLanguageDocument(`provider aws
cluster prod {
  api: lambda
}`);

console.log(document.providerId); // "aws"
console.log(document.symbols); // [{ name: "api", resourceKind: "lambda", ... }]
```

### Determine Cursor Context

```typescript
import { analyzeLanguageDocument, getCursorContext } from "@archlex/language-service";

const document = analyzeLanguageDocument("provider aws\napi: ");
const context = getCursorContext(document, document.source.length);

console.log(context.position); // "resource-kind"
console.log(context.providerId); // "aws"
console.log(context.scopePath); // []
```

### Index and Search Catalog

```typescript
import { createCatalogIndex } from "@archlex/language-service";
import { createArchLex, awsProvider } from "@archlex/core";

const catalog = createArchLex({ providers: [awsProvider()] }).getCatalog();
const index = createCatalogIndex(catalog);

// Resolve by ID or alias
const lambda = index.resolveResource("aws", "lambda");
const lambdaByAlias = index.resolveResource("aws", "function");

// Search by display name or search terms
const results = index.searchResources("aws", "serverless");

// List all resources for a provider
const allResources = index.listResources("aws");
```

## Architecture

- **DOM-Neutral**: No browser or editor dependencies - works in Node.js, browsers, and workers
- **Immutable**: All document and completion objects are readonly
- **Performance**: O(1) alias resolution, multi-word search intersection, catalog index built once

## License

MIT
