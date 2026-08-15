# @archlex/language-service

Editor-neutral language intelligence for ArchLex source code.

## Overview

This package provides DOM-neutral language analysis and completion services for the ArchLex DSL. It works in both browser and Node.js environments without dependencies on Monaco, VSCode, or any specific editor framework.

## Features

- **Document Analysis**: Parse and tokenize ArchLex source into a structured document model
- **Completion Engine**: Generate context-aware completions for resources, directives, scopes, and relationships
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

### Generate Completions

```typescript
import { createCompletionEngine } from "@archlex/language-service";
import { createArchLex, awsProvider } from "@archlex/core";

const catalog = createArchLex({ providers: [awsProvider()] }).getCatalog();
const engine = createCompletionEngine(catalog);

const document = analyzeLanguageDocument("provider aws\napi: ");
const completions = engine.complete(document, document.source.length);

console.log(completions[0]); // { label: "AWS Lambda", insertText: "lambda", ... }
```

## Architecture

- **DOM-Neutral**: No browser or editor dependencies - works in Node.js, browsers, and workers
- **Immutable**: All document and completion objects are readonly
- **Performance**: Catalog index built once, document analysis cached by editor integrations

## License

MIT
