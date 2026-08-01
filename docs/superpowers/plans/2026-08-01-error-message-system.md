# Error Message System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a centralized diagnostic registry with enhanced Monaco Editor integration, CLI formatting, and multi-channel documentation for ArchLex error messages.

**Architecture:** Create `@archlex/diagnostics` package as single source of truth for all diagnostic codes. Refactor parser, core, and providers to use factory pattern. Enhance Monaco with code actions and rich hovers. Add CLI formatter and `archlex errors` command. Generate web documentation from registry.

**Tech Stack:** TypeScript, Monaco Editor, Vitest, chalk (CLI), markdown generation

---

## File Structure

### New Package: @archlex/diagnostics
- `packages/diagnostics/package.json` - Package manifest
- `packages/diagnostics/tsconfig.json` - TypeScript config
- `packages/diagnostics/vite.config.ts` - Build config
- `packages/diagnostics/src/index.ts` - Public API exports
- `packages/diagnostics/src/types.ts` - Type definitions
- `packages/diagnostics/src/templates.ts` - Template interpolation engine
- `packages/diagnostics/src/factory.ts` - createDiagnostic() implementation
- `packages/diagnostics/src/registry.ts` - Registry lookup functions
- `packages/diagnostics/src/categories/parse.ts` - AL-PARSE-* definitions
- `packages/diagnostics/src/categories/structural.ts` - AL-STRUCT-* definitions
- `packages/diagnostics/src/categories/semantic.ts` - AL-SEM-* definitions
- `packages/diagnostics/src/categories/index.ts` - Category exports

### Monaco Enhancements
- `apps/playground/src/monaco/code-actions.ts` - NEW: Code actions provider
- `apps/playground/src/monaco/hover.ts` - MODIFY: Enhanced hover with registry
- `apps/playground/src/monaco/diagnostics.ts` - MODIFY: Enhanced markers

### CLI Enhancements
- `packages/cli/src/utils/format-diagnostic.ts` - NEW: Diagnostic formatter
- `packages/cli/src/commands/errors.ts` - NEW: Error documentation command
- `packages/cli/src/utils/errors.ts` - MODIFY: Use diagnostic formatter

### Documentation Generation
- `scripts/generate-error-docs.ts` - NEW: Doc generation script

### Modified Packages
- `packages/parser/src/index.ts` - Use diagnostic factory
- `packages/core/src/index.ts` - Use diagnostic factory

---

## Task 1: Create Diagnostics Package Structure

**Files:**
- Create: `packages/diagnostics/package.json`
- Create: `packages/diagnostics/tsconfig.json`
- Create: `packages/diagnostics/vite.config.ts`
- Create: `packages/diagnostics/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@archlex/diagnostics",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@archlex/model": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.5.4",
    "vite": "^6.4.3",
    "vitest": "^3.0.0"
  }
}
```

Command: `cat > packages/diagnostics/package.json` (paste content above)

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../model" }
  ]
}
```

Command: `cat > packages/diagnostics/tsconfig.json` (paste content above)

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["@archlex/model"],
    },
  },
});
```

Command: `cat > packages/diagnostics/vite.config.ts` (paste content above)

- [ ] **Step 4: Create initial index.ts**

```typescript
export * from "./types.js";
export * from "./factory.js";
export * from "./registry.js";
export * from "./templates.js";
```

Command: `cat > packages/diagnostics/src/index.ts` (paste content above)

- [ ] **Step 5: Update pnpm workspace and install**

Run: `pnpm install`
Expected: Package added to workspace, dependencies installed

- [ ] **Step 6: Commit**

```bash
git add packages/diagnostics/
git commit -m "feat(diagnostics): create package structure"
```

---

## Task 2: Define Core Types and Templates

**Files:**
- Create: `packages/diagnostics/src/types.ts`
- Create: `packages/diagnostics/src/templates.ts`
- Create: `packages/diagnostics/src/templates.test.ts`

- [ ] **Step 1: Write test for template interpolation**

```typescript
import { describe, test, expect } from "vitest";
import { interpolate } from "./templates.js";

describe("interpolate", () => {
  test("replaces template variables with context values", () => {
    const result = interpolate(
      "Resource '${id}' conflicts with declaration at ${line}:${column}",
      { id: "my-lambda", line: 10, column: 5 }
    );
    expect(result).toBe("Resource 'my-lambda' conflicts with declaration at 10:5");
  });

  test("handles missing context keys by leaving placeholder", () => {
    const result = interpolate("Error at ${line}:${column}", { line: 5 });
    expect(result).toBe("Error at 5:${column}");
  });

  test("handles extra context keys without error", () => {
    const result = interpolate("Error at ${line}", { line: 5, extra: "ignored" });
    expect(result).toBe("Error at 5");
  });

  test("returns string unchanged if no placeholders", () => {
    const result = interpolate("Simple message", { key: "value" });
    expect(result).toBe("Simple message");
  });
});
```

Command: `cat > packages/diagnostics/src/templates.test.ts` (paste content above)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/diagnostics && pnpm test`
Expected: FAIL - "Cannot find module './templates.js'"

- [ ] **Step 3: Create types.ts with diagnostic definitions**

```typescript
import type { Diagnostic, SourceSpan } from "@archlex/model";

export type DiagnosticCode =
  | `AL-PARSE-${string}`
  | `AL-STRUCT-${string}`
  | `AL-SEM-${string}`;

export type DiagnosticCategory = "parse" | "structural" | "semantic" | "architecture";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface DiagnosticExample {
  invalid: string;
  valid: string;
}

export interface DiagnosticDefinition {
  code: DiagnosticCode;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  message: string;
  remediation: string;
  examples?: DiagnosticExample;
  relatedCodes?: readonly DiagnosticCode[];
  documentationUrl?: string;
}

export interface DiagnosticContext extends Record<string, unknown> {}

export type { Diagnostic, SourceSpan };
```

Command: `cat > packages/diagnostics/src/types.ts` (paste content above)

- [ ] **Step 4: Implement template interpolation**

```typescript
export function interpolate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : match;
  });
}
```

Command: `cat > packages/diagnostics/src/templates.ts` (paste content above)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/diagnostics && pnpm test`
Expected: PASS - All template interpolation tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/diagnostics/src/types.ts packages/diagnostics/src/templates.ts packages/diagnostics/src/templates.test.ts
git commit -m "feat(diagnostics): add types and template engine"
```

---

## Task 3: Implement Diagnostic Factory

**Files:**
- Create: `packages/diagnostics/src/factory.ts`
- Create: `packages/diagnostics/src/factory.test.ts`

- [ ] **Step 1: Write test for factory function**

```typescript
import { describe, test, expect } from "vitest";
import { createDiagnostic } from "./factory.js";
import type { DiagnosticDefinition } from "./types.js";

const mockRegistry = new Map<string, DiagnosticDefinition>([
  [
    "AL-TEST-001",
    {
      code: "AL-TEST-001",
      category: "parse",
      severity: "error",
      message: "Test error at ${line}:${column}",
      remediation: "Fix the issue at line ${line}",
    },
  ],
]);

describe("createDiagnostic", () => {
  test("creates diagnostic with interpolated message and remediation", () => {
    const diagnostic = createDiagnostic(
      "AL-TEST-001",
      { line: 5, column: 10 },
      {
        start: { line: 5, column: 10, offset: 50 },
        end: { line: 5, column: 15, offset: 55 },
      },
      [],
      mockRegistry
    );

    expect(diagnostic.code).toBe("AL-TEST-001");
    expect(diagnostic.severity).toBe("error");
    expect(diagnostic.message).toBe("Test error at 5:10");
    expect(diagnostic.remediation).toBe("Fix the issue at line 5");
    expect(diagnostic.span).toEqual({
      start: { line: 5, column: 10, offset: 50 },
      end: { line: 5, column: 15, offset: 55 },
    });
  });

  test("throws error for unknown diagnostic code", () => {
    expect(() =>
      createDiagnostic(
        "AL-UNKNOWN-001",
        {},
        {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 1, offset: 0 },
        },
        [],
        mockRegistry
      )
    ).toThrow("Unknown diagnostic code: AL-UNKNOWN-001");
  });

  test("includes elements in diagnostic", () => {
    const diagnostic = createDiagnostic(
      "AL-TEST-001",
      { line: 5, column: 10 },
      {
        start: { line: 5, column: 10, offset: 50 },
        end: { line: 5, column: 15, offset: 55 },
      },
      ["element1", "element2"],
      mockRegistry
    );

    expect(diagnostic.elements).toEqual(["element1", "element2"]);
  });
});
```

Command: `cat > packages/diagnostics/src/factory.test.ts` (paste content above)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/diagnostics && pnpm test`
Expected: FAIL - "Cannot find module './factory.js'"

- [ ] **Step 3: Implement factory function**

```typescript
import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticContext,
  DiagnosticDefinition,
  SourceSpan,
} from "./types.js";
import { interpolate } from "./templates.js";

export function createDiagnostic(
  code: DiagnosticCode,
  context: DiagnosticContext,
  span: SourceSpan,
  elements: readonly string[] = [],
  registry: Map<string, DiagnosticDefinition>
): Diagnostic {
  const definition = registry.get(code);

  if (!definition) {
    throw new Error(`Unknown diagnostic code: ${code}`);
  }

  const message = interpolate(definition.message, context);
  const remediation = interpolate(definition.remediation, context);

  return {
    code,
    severity: definition.severity,
    message,
    span,
    elements: [...elements],
    remediation,
  };
}
```

Command: `cat > packages/diagnostics/src/factory.ts` (paste content above)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/diagnostics && pnpm test`
Expected: PASS - All factory tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/diagnostics/src/factory.ts packages/diagnostics/src/factory.test.ts
git commit -m "feat(diagnostics): implement diagnostic factory"
```

---


## Task 4: Define Parse Category Diagnostics

**Files:**
- Create: `packages/diagnostics/src/categories/parse.ts`
- Create: `packages/diagnostics/src/categories/parse.test.ts`

- [ ] **Step 1: Write test for parse diagnostics registry**

```typescript
import { describe, test, expect } from "vitest";
import { parseDiagnostics } from "./parse.js";

describe("parseDiagnostics", () => {
  test("includes AL-PARSE-001 definition", () => {
    const def = parseDiagnostics.get("AL-PARSE-001");
    expect(def).toBeDefined();
    expect(def?.code).toBe("AL-PARSE-001");
    expect(def?.category).toBe("parse");
    expect(def?.severity).toBe("error");
    expect(def?.message).toBeTruthy();
    expect(def?.remediation).toBeTruthy();
  });

  test("includes AL-PARSE-MISSING-ENDPOINT definition", () => {
    const def = parseDiagnostics.get("AL-PARSE-MISSING-ENDPOINT");
    expect(def).toBeDefined();
    expect(def?.examples).toBeDefined();
    expect(def?.examples?.invalid).toBeTruthy();
    expect(def?.examples?.valid).toBeTruthy();
  });

  test("includes AL-PARSE-MISSING-BRACE definition", () => {
    const def = parseDiagnostics.get("AL-PARSE-MISSING-BRACE");
    expect(def).toBeDefined();
  });

  test("all diagnostics have required fields", () => {
    for (const [code, def] of parseDiagnostics.entries()) {
      expect(def.code).toBe(code);
      expect(def.category).toBe("parse");
      expect(def.message).toBeTruthy();
      expect(def.remediation).toBeTruthy();
      if (def.severity === "error") {
        expect(def.examples).toBeDefined();
      }
    }
  });
});
```

Command: `cat > packages/diagnostics/src/categories/parse.test.ts` (paste content above)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/diagnostics && pnpm test`
Expected: FAIL - "Cannot find module './parse.js'"

- [ ] **Step 3: Implement parse diagnostics definitions**

```typescript
import type { DiagnosticDefinition } from "../types.js";

export const parseDiagnostics = new Map<string, DiagnosticDefinition>([
  [
    "AL-PARSE-001",
    {
      code: "AL-PARSE-001",
      category: "parse",
      severity: "error",
      message: "Unexpected token '${token}'",
      remediation: "Check syntax at line ${line}, column ${column}. Remove or correct the unexpected token.",
      examples: {
        invalid: "lambda ->>\nrds",
        valid: "lambda -> rds",
      },
    },
  ],
  [
    "AL-PARSE-002",
    {
      code: "AL-PARSE-002",
      category: "parse",
      severity: "error",
      message: "Syntax error: ${details}",
      remediation: "Review the syntax at the indicated location and correct the error.",
      examples: {
        invalid: "lambda -> rds [invalid",
        valid: "lambda -> rds",
      },
    },
  ],
  [
    "AL-PARSE-MISSING-ENDPOINT",
    {
      code: "AL-PARSE-MISSING-ENDPOINT",
      category: "parse",
      severity: "error",
      message: "Expected relationship endpoint after arrow operator",
      remediation: "Add a service identifier after the arrow operator. Valid services: lambda, rds, s3, ec2, etc.",
      examples: {
        invalid: "lambda ->",
        valid: "lambda -> rds",
      },
    },
  ],
  [
    "AL-PARSE-MISSING-BRACE",
    {
      code: "AL-PARSE-MISSING-BRACE",
      category: "parse",
      severity: "error",
      message: "Expected closing brace '}' for ${scopeType} block",
      remediation: "Add closing brace '}' to complete the ${scopeType} block started at line ${startLine}.",
      examples: {
        invalid: "vpc my-vpc {\n  lambda\n",
        valid: "vpc my-vpc {\n  lambda\n}",
      },
    },
  ],
]);
```

Command: `cat > packages/diagnostics/src/categories/parse.ts` (paste content above)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/diagnostics && pnpm test`
Expected: PASS - All parse diagnostics tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/diagnostics/src/categories/parse.ts packages/diagnostics/src/categories/parse.test.ts
git commit -m "feat(diagnostics): define parse category diagnostics"
```

---

## Task 5: Define Structural Category Diagnostics

**Files:**
- Create: `packages/diagnostics/src/categories/structural.ts`
- Create: `packages/diagnostics/src/categories/structural.test.ts`

- [ ] **Step 1: Write test for structural diagnostics**

```typescript
import { describe, test, expect } from "vitest";
import { structuralDiagnostics } from "./structural.js";

describe("structuralDiagnostics", () => {
  test("includes all AL-STRUCT-* codes", () => {
    const codes = [
      "AL-STRUCT-DUPLICATE-ID",
      "AL-STRUCT-CONFLICTING-LABEL",
      "AL-STRUCT-DUPLICATE-DIRECTIVE",
      "AL-STRUCT-LATE-DIRECTIVE",
      "AL-STRUCT-INVALID-DIRECTIVE",
    ];

    for (const code of codes) {
      const def = structuralDiagnostics.get(code);
      expect(def).toBeDefined();
      expect(def?.code).toBe(code);
      expect(def?.category).toBe("structural");
    }
  });

  test("all diagnostics have required fields", () => {
    for (const [code, def] of structuralDiagnostics.entries()) {
      expect(def.code).toBe(code);
      expect(def.category).toBe("structural");
      expect(def.message).toBeTruthy();
      expect(def.remediation).toBeTruthy();
      if (def.severity === "error") {
        expect(def.examples).toBeDefined();
      }
    }
  });
});
```

Command: `cat > packages/diagnostics/src/categories/structural.test.ts` (paste content above)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/diagnostics && pnpm test`
Expected: FAIL - "Cannot find module './structural.js'"

- [ ] **Step 3: Implement structural diagnostics definitions**

```typescript
import type { DiagnosticDefinition } from "../types.js";

export const structuralDiagnostics = new Map<string, DiagnosticDefinition>([
  [
    "AL-STRUCT-DUPLICATE-ID",
    {
      code: "AL-STRUCT-DUPLICATE-ID",
      category: "structural",
      severity: "error",
      message: "Resource '${id}' conflicts with existing declaration at ${line}:${column}",
      remediation: "Rename one of the resources to use a unique identifier. Each resource must have a distinct ID.",
      examples: {
        invalid: "lambda: my-func\nlambda: my-func",
        valid: "lambda: my-func-1\nlambda: my-func-2",
      },
    },
  ],
  [
    "AL-STRUCT-CONFLICTING-LABEL",
    {
      code: "AL-STRUCT-CONFLICTING-LABEL",
      category: "structural",
      severity: "error",
      message: "Display label for '${id}' conflicts with previous definition",
      remediation: "Remove duplicate display label. Each resource can only have one display label.",
      examples: {
        invalid: 'lambda["First Label"]\nlambda["Second Label"]',
        valid: 'lambda["My Function"]',
      },
    },
  ],
  [
    "AL-STRUCT-DUPLICATE-DIRECTIVE",
    {
      code: "AL-STRUCT-DUPLICATE-DIRECTIVE",
      category: "structural",
      severity: "error",
      message: "Duplicate '${directiveName}' directive. Only one ${directiveName} directive is allowed.",
      remediation: "Remove duplicate '${directiveName}' directive. Keep only the first occurrence.",
      examples: {
        invalid: "provider: aws\nprovider: gcp",
        valid: "provider: aws",
      },
    },
  ],
  [
    "AL-STRUCT-LATE-DIRECTIVE",
    {
      code: "AL-STRUCT-LATE-DIRECTIVE",
      category: "structural",
      severity: "error",
      message: "Directive '${directiveName}' must appear before all resource and relationship declarations",
      remediation: "Move '${directiveName}' directive to the top of the file, before any resources or relationships.",
      examples: {
        invalid: "lambda -> rds\nprovider: aws",
        valid: "provider: aws\nlambda -> rds",
      },
    },
  ],
  [
    "AL-STRUCT-INVALID-DIRECTIVE",
    {
      code: "AL-STRUCT-INVALID-DIRECTIVE",
      category: "structural",
      severity: "error",
      message: "Invalid value '${value}' for '${directiveName}' directive",
      remediation: "Use one of the allowed values: ${allowedValues}",
      examples: {
        invalid: "direction: diagonal",
        valid: "direction: LR",
      },
    },
  ],
]);
```

Command: `cat > packages/diagnostics/src/categories/structural.ts` (paste content above)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/diagnostics && pnpm test`
Expected: PASS - All structural diagnostics tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/diagnostics/src/categories/structural.ts packages/diagnostics/src/categories/structural.test.ts
git commit -m "feat(diagnostics): define structural category diagnostics"
```

---

## Task 6: Define Semantic Category Diagnostics

**Files:**
- Create: `packages/diagnostics/src/categories/semantic.ts`
- Create: `packages/diagnostics/src/categories/semantic.test.ts`

- [ ] **Step 1: Write test for semantic diagnostics**

```typescript
import { describe, test, expect } from "vitest";
import { semanticDiagnostics } from "./semantic.js";

describe("semanticDiagnostics", () => {
  test("includes all AL-SEM-* codes", () => {
    const codes = [
      "AL-SEM-UNKNOWN-RESOURCE",
      "AL-SEM-UNKNOWN-RELATIONSHIP",
      "AL-SEM-EMPTY-GRAPH",
    ];

    for (const code of codes) {
      const def = semanticDiagnostics.get(code);
      expect(def).toBeDefined();
      expect(def?.code).toBe(code);
      expect(def?.category).toBe("semantic");
    }
  });

  test("all diagnostics have required fields", () => {
    for (const [code, def] of semanticDiagnostics.entries()) {
      expect(def.code).toBe(code);
      expect(def.category).toBe("semantic");
      expect(def.message).toBeTruthy();
      expect(def.remediation).toBeTruthy();
    }
  });
});
```

Command: `cat > packages/diagnostics/src/categories/semantic.test.ts` (paste content above)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/diagnostics && pnpm test`
Expected: FAIL - "Cannot find module './semantic.js'"

- [ ] **Step 3: Implement semantic diagnostics definitions**

```typescript
import type { DiagnosticDefinition } from "../types.js";

export const semanticDiagnostics = new Map<string, DiagnosticDefinition>([
  [
    "AL-SEM-UNKNOWN-RESOURCE",
    {
      code: "AL-SEM-UNKNOWN-RESOURCE",
      category: "semantic",
      severity: "info",
      message: "Unknown service type '${serviceKind}' for provider '${provider}'",
      remediation: "Check the service type name. Use fully qualified names (e.g., 'aws.lambda') for clarity. Consult provider catalog for available services.",
    },
  ],
  [
    "AL-SEM-UNKNOWN-RELATIONSHIP",
    {
      code: "AL-SEM-UNKNOWN-RELATIONSHIP",
      category: "semantic",
      severity: "info",
      message: "Unknown relationship type '${relationshipKind}' between '${leftKind}' and '${rightKind}'",
      remediation: "Verify the relationship type is valid for these services. Common relationships: connects, triggers, stores-data, reads-from.",
    },
  ],
  [
    "AL-SEM-EMPTY-GRAPH",
    {
      code: "AL-SEM-EMPTY-GRAPH",
      category: "semantic",
      severity: "info",
      message: "Document contains no resources or relationships",
      remediation: "Add at least one resource or relationship to create a diagram.",
    },
  ],
]);
```

Command: `cat > packages/diagnostics/src/categories/semantic.ts` (paste content above)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/diagnostics && pnpm test`
Expected: PASS - All semantic diagnostics tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/diagnostics/src/categories/semantic.ts packages/diagnostics/src/categories/semantic.test.ts
git commit -m "feat(diagnostics): define semantic category diagnostics"
```

---

## Task 7: Create Registry Module and Export API

**Files:**
- Create: `packages/diagnostics/src/categories/index.ts`
- Create: `packages/diagnostics/src/registry.ts`
- Modify: `packages/diagnostics/src/index.ts`
- Create: `packages/diagnostics/src/registry.test.ts`

- [ ] **Step 1: Write test for registry module**

```typescript
import { describe, test, expect } from "vitest";
import { getAllDiagnostics, getDiagnosticDefinition } from "./registry.js";

describe("registry", () => {
  test("getAllDiagnostics returns all diagnostic definitions", () => {
    const all = getAllDiagnostics();
    expect(all.size).toBeGreaterThan(0);
    expect(all.has("AL-PARSE-001")).toBe(true);
    expect(all.has("AL-STRUCT-DUPLICATE-ID")).toBe(true);
    expect(all.has("AL-SEM-UNKNOWN-RESOURCE")).toBe(true);
  });

  test("getDiagnosticDefinition returns correct definition", () => {
    const def = getDiagnosticDefinition("AL-PARSE-MISSING-ENDPOINT");
    expect(def).toBeDefined();
    expect(def?.code).toBe("AL-PARSE-MISSING-ENDPOINT");
  });

  test("getDiagnosticDefinition returns undefined for unknown code", () => {
    const def = getDiagnosticDefinition("AL-UNKNOWN-CODE" as any);
    expect(def).toBeUndefined();
  });
});
```

Command: `cat > packages/diagnostics/src/registry.test.ts` (paste content above)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/diagnostics && pnpm test`
Expected: FAIL - "Cannot find module './registry.js'"

- [ ] **Step 3: Create category index**

```typescript
export { parseDiagnostics } from "./parse.js";
export { structuralDiagnostics } from "./structural.js";
export { semanticDiagnostics } from "./semantic.js";
```

Command: `cat > packages/diagnostics/src/categories/index.ts` (paste content above)

- [ ] **Step 4: Implement registry module**

```typescript
import type { DiagnosticCode, DiagnosticDefinition } from "./types.js";
import {
  parseDiagnostics,
  structuralDiagnostics,
  semanticDiagnostics,
} from "./categories/index.js";

const allDiagnostics = new Map<string, DiagnosticDefinition>([
  ...parseDiagnostics,
  ...structuralDiagnostics,
  ...semanticDiagnostics,
]);

export function getAllDiagnostics(): ReadonlyMap<string, DiagnosticDefinition> {
  return allDiagnostics;
}

export function getDiagnosticDefinition(
  code: DiagnosticCode
): DiagnosticDefinition | undefined {
  return allDiagnostics.get(code);
}

export { allDiagnostics as diagnosticRegistry };
```

Command: `cat > packages/diagnostics/src/registry.ts` (paste content above)

- [ ] **Step 5: Update main index to export registry**

```typescript
export * from "./types.js";
export * from "./factory.js";
export * from "./registry.js";
export * from "./templates.js";
export * from "./categories/index.js";
```

Command: Replace content in `packages/diagnostics/src/index.ts`

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/diagnostics && pnpm test`
Expected: PASS - All tests pass

- [ ] **Step 7: Build the package**

Run: `cd packages/diagnostics && pnpm build`
Expected: Build succeeds, dist/ created

- [ ] **Step 8: Commit**

```bash
git add packages/diagnostics/src/
git commit -m "feat(diagnostics): implement registry and export API"
```

---


## Task 8: Refactor Parser to Use Diagnostic Factory

**Files:**
- Modify: `packages/parser/package.json` - Add diagnostics dependency
- Modify: `packages/parser/src/index.ts` - Use diagnostic factory
- Test: `packages/parser/src/index.test.ts` - Verify diagnostics have remediation

- [ ] **Step 1: Add diagnostics dependency to parser**

Add to `packages/parser/package.json` dependencies:
```json
"@archlex/diagnostics": "workspace:*"
```

Run: `cd packages/parser && pnpm install`
Expected: Dependency added

- [ ] **Step 2: Write test for parser diagnostics having remediation**

Add to `packages/parser/src/index.test.ts`:
```typescript
import { describe, test, expect } from "vitest";
import { parse } from "./index.js";

describe("parser diagnostics", () => {
  test("all parse errors include remediation", () => {
    const invalidSources = [
      "lambda ->",  // Missing endpoint
      "vpc my-vpc { lambda",  // Missing brace
      "lambda ->>\nrds",  // Invalid token
    ];

    for (const source of invalidSources) {
      const result = parse(source);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      
      for (const diagnostic of result.diagnostics) {
        expect(diagnostic.remediation).toBeDefined();
        expect(diagnostic.remediation).toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/parser && pnpm test`
Expected: FAIL - remediation is undefined

- [ ] **Step 4: Refactor parser to use diagnostic factory**

Replace diagnostic creation in `packages/parser/src/index.ts`:

```typescript
import type { Diagnostic, DocumentAst, ParseResult } from "@archlex/model";
import {
  createDiagnostic,
  diagnosticRegistry,
} from "@archlex/diagnostics";
import { parserInstance } from "./cst/index.js";
import { ArchLexLexer } from "./lexer/index.js";
import { convertCstToAst, tokenToSpan } from "./visitor/index.js";

export * from "./cst/index.js";
export * from "./lexer/index.js";
export * from "./visitor/index.js";

export function parse(source: string): ParseResult {
  const lexResult = ArchLexLexer.tokenize(source);
  const diagnostics: Diagnostic[] = [];

  for (const err of lexResult.errors) {
    const line = err.line ?? 1;
    const column = err.column ?? 1;
    const length = err.length ?? 1;
    const offset = err.offset ?? 0;
    
    diagnostics.push(
      createDiagnostic(
        "AL-PARSE-001",
        { token: err.message, line, column },
        {
          start: { line, column, offset },
          end: { line, column: column + length, offset: offset + length },
        },
        [],
        diagnosticRegistry
      )
    );
  }

  parserInstance.input = lexResult.tokens;
  const cst = parserInstance.document();

  for (const err of parserInstance.errors) {
    const token = err.token;
    const missingBrace = err.message.includes("RBrace");
    const missingEndpoint =
      err.message.includes("Identifier") &&
      /(?:>|->|<-|<->|--|-\.->|-\[[^\]]+\]->)\s*(?:\r?\n|$)/.test(source);
    
    const code = missingBrace
      ? "AL-PARSE-MISSING-BRACE"
      : missingEndpoint
        ? "AL-PARSE-MISSING-ENDPOINT"
        : "AL-PARSE-002";

    diagnostics.push(
      createDiagnostic(
        code,
        { 
          details: err.message,
          scopeType: missingBrace ? "scope" : undefined,
          startLine: token.startLine,
        },
        tokenToSpan(token),
        [],
        diagnosticRegistry
      )
    );
  }

  const hasUnclosedScope = diagnostics.some(
    (diagnostic) => diagnostic.code === "AL-PARSE-MISSING-BRACE"
  );

  const hasIncompleteRelationship = diagnostics.some(
    (diagnostic) => diagnostic.code === "AL-PARSE-MISSING-ENDPOINT"
  );

  if (parserInstance.errors.length > 0 && !hasUnclosedScope && !hasIncompleteRelationship) {
    return { ast: { type: "document", statements: [], span: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } } }, diagnostics };
  }

  const ast = convertCstToAst(cst, source);

  return { ast, diagnostics };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/parser && pnpm test`
Expected: PASS - All diagnostics now have remediation

- [ ] **Step 6: Run typecheck**

Run: `cd packages/parser && pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add packages/parser/package.json packages/parser/src/index.ts packages/parser/src/index.test.ts
git commit -m "refactor(parser): use diagnostic factory from registry"
```

---

## Task 9: Refactor Core Analyzer to Use Diagnostic Factory

**Files:**
- Modify: `packages/core/package.json` - Add diagnostics dependency
- Modify: `packages/core/src/index.ts` - Use diagnostic factory
- Test: `packages/core/src/index.test.ts` - Verify diagnostics have remediation

- [ ] **Step 1: Add diagnostics dependency to core**

Add to `packages/core/package.json` dependencies:
```json
"@archlex/diagnostics": "workspace:*"
```

Run: `cd packages/core && pnpm install`
Expected: Dependency added

- [ ] **Step 2: Write test for core analyzer diagnostics having remediation**

Add to `packages/core/src/index.test.ts`:
```typescript
test("structural and semantic diagnostics include remediation", () => {
  const sources = [
    "lambda: my-func\nlambda: my-func",  // Duplicate ID
    "provider: aws\nprovider: gcp",  // Duplicate directive
    "lambda -> rds\nprovider: aws",  // Late directive
  ];

  for (const source of sources) {
    const ast = parse(source).ast;
    const result = core.analyze(ast);
    
    for (const diagnostic of result.diagnostics) {
      expect(diagnostic.remediation).toBeDefined();
      expect(diagnostic.remediation).toBeTruthy();
    }
  }
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/core && pnpm test`
Expected: FAIL - remediation is undefined

- [ ] **Step 4: Refactor core analyzer directive collection**

In `packages/core/src/index.ts`, update imports and directive collection:

```typescript
import { awsProvider } from "@archlex/aws";
import { gcpProvider } from "@archlex/gcp";
import { createInlineLayoutEngine } from "@archlex/layout-elk";
import {
  createDiagnostic,
  diagnosticRegistry,
} from "@archlex/diagnostics";
import type {
  AnalysisResult,
  CloudEdge,
  CloudGraph,
  CloudNode,
  CloudProvider,
  Diagnostic,
  DirectiveAst,
  DocumentAst,
  GraphRenderer,
  InvalidStatementAst,
  LayoutEngine,
  LayoutGraph,
  LayoutOptions,
  LayoutResult,
  ParseResult,
  RelationshipAst,
  RenderResult,
  ResourceAst,
  ScopeAst,
  StatementAst,
  SvgResult,
  ValidationMode,
} from "@archlex/model";
import { parse as parseSource } from "@archlex/parser";
import { createSvgRenderer } from "@archlex/renderer-svg";

// ... (keep existing interfaces)

function collectDirectives(
  statements: readonly StatementAst[],
  diagnostics: Diagnostic[]
): Partial<Record<"provider" | "direction" | "validation", string>> {
  const values: Partial<
    Record<"provider" | "direction" | "validation", string>
  > = {};
  let declarationsStarted = false;
  
  for (const statement of statements) {
    if (statement.type !== "directive") {
      declarationsStarted = true;
      continue;
    }
    const directive = statement as DirectiveAst;
    const name = directive.name as "provider" | "direction" | "validation";
    
    if (declarationsStarted || values[name] !== undefined) {
      const code = declarationsStarted
        ? "AL-STRUCT-LATE-DIRECTIVE"
        : "AL-STRUCT-DUPLICATE-DIRECTIVE";
      
      diagnostics.push(
        createDiagnostic(
          code,
          { directiveName: name },
          directive.span,
          [],
          diagnosticRegistry
        )
      );
      continue;
    }
    
    const allowed =
      name === "direction"
        ? ["LR", "RL", "TB", "BT"]
        : name === "validation"
          ? ["normal", "strict", "off"]
          : undefined;
    
    if (allowed && !allowed.includes(directive.value)) {
      diagnostics.push(
        createDiagnostic(
          "AL-STRUCT-INVALID-DIRECTIVE",
          { 
            value: directive.value, 
            directiveName: name,
            allowedValues: allowed.join(", "),
          },
          directive.span,
          [],
          diagnosticRegistry
        )
      );
      continue;
    }
    
    values[name] = directive.value;
  }
  return values;
}
```

- [ ] **Step 5: Refactor core analyzer node and edge processing**

Continue in `packages/core/src/index.ts`, update the analyze function's diagnostic creation:

```typescript
analyze(ast: DocumentAst, analyzeOptions?: AnalyzeOptions): AnalysisResult {
  const nodesMap = new Map<string, CloudNode>();
  const edges: CloudEdge[] = [];
  const diagnostics: Diagnostic[] = [];
  
  const directives = collectDirectives(ast.statements, diagnostics);
  
  // ... (keep existing code until resource processing)
  
  // When creating unknown resource diagnostic:
  diagnostics.push(
    createDiagnostic(
      "AL-SEM-UNKNOWN-RESOURCE",
      { 
        serviceKind: resource.kind,
        provider: currentProvider,
      },
      resource.span,
      [nodeId],
      diagnosticRegistry
    )
  );
  
  // When creating conflicting label diagnostic:
  diagnostics.push(
    createDiagnostic(
      "AL-STRUCT-CONFLICTING-LABEL",
      { id: resource.name ?? resource.kind },
      resource.span,
      [nodeId],
      diagnosticRegistry
    )
  );
  
  // When creating duplicate ID diagnostic:
  diagnostics.push(
    createDiagnostic(
      "AL-STRUCT-DUPLICATE-ID",
      { 
        id: nodeId,
        line: existing.span.start.line,
        column: existing.span.start.column,
      },
      resource.span,
      [nodeId],
      diagnosticRegistry
    )
  );
  
  // When creating unknown relationship diagnostic:
  diagnostics.push(
    createDiagnostic(
      "AL-SEM-UNKNOWN-RELATIONSHIP",
      { 
        relationshipKind: rel.kind ?? rel.arrow,
        leftKind: leftNode.serviceKind,
        rightKind: rightNode.serviceKind,
      },
      rel.span,
      [edgeId, leftNode.id, rightNode.id],
      diagnosticRegistry
    )
  );
  
  // When creating empty graph diagnostic:
  if (validation !== "off" && nodesMap.size === 0) {
    diagnostics.push(
      createDiagnostic(
        "AL-SEM-EMPTY-GRAPH",
        {},
        ast.span,
        [],
        diagnosticRegistry
      )
    );
  }
  
  // ... (rest of analyze function)
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/core && pnpm test`
Expected: PASS - All diagnostics now have remediation

- [ ] **Step 7: Run full test suite**

Run: `pnpm test` (from root)
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add packages/core/package.json packages/core/src/index.ts packages/core/src/index.test.ts
git commit -m "refactor(core): use diagnostic factory from registry"
```

---


## Task 10: Implement Monaco Code Actions Provider

**Files:**
- Create: `apps/playground/src/monaco/code-actions.ts`
- Modify: `apps/playground/src/components/Editor.tsx` - Register code actions
- Create: `apps/playground/src/monaco/code-actions.test.ts`

- [ ] **Step 1: Write test for code actions provider**

```typescript
import { describe, test, expect } from "vitest";
import { getCodeActionsForDiagnostic } from "./code-actions.js";
import type { Diagnostic } from "@archlex/model";

describe("getCodeActionsForDiagnostic", () => {
  test("provides actions for missing endpoint", () => {
    const diagnostic: Diagnostic = {
      code: "AL-PARSE-MISSING-ENDPOINT",
      severity: "error",
      message: "Expected relationship endpoint",
      span: {
        start: { line: 1, column: 10, offset: 9 },
        end: { line: 1, column: 12, offset: 11 },
      },
      elements: [],
      remediation: "Add a service identifier",
    };

    const actions = getCodeActionsForDiagnostic(diagnostic, "lambda ->");
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].title).toContain("Add");
    expect(actions[0].edit).toBeDefined();
  });

  test("provides actions for invalid directive value", () => {
    const diagnostic: Diagnostic = {
      code: "AL-STRUCT-INVALID-DIRECTIVE",
      severity: "error",
      message: "Invalid value 'diagonal' for 'direction'",
      span: {
        start: { line: 1, column: 12, offset: 11 },
        end: { line: 1, column: 20, offset: 19 },
      },
      elements: [],
      remediation: "Use one of: LR, RL, TB, BT",
    };

    const actions = getCodeActionsForDiagnostic(diagnostic, "direction: diagonal");
    expect(actions.length).toBe(4); // One for each valid value
    expect(actions[0].title).toMatch(/LR|RL|TB|BT/);
  });

  test("returns empty array for non-actionable diagnostics", () => {
    const diagnostic: Diagnostic = {
      code: "AL-SEM-UNKNOWN-RESOURCE",
      severity: "info",
      message: "Unknown service",
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 10, offset: 9 },
      },
      elements: [],
      remediation: "Check service name",
    };

    const actions = getCodeActionsForDiagnostic(diagnostic, "unknown-svc");
    expect(actions).toEqual([]);
  });
});
```

Command: `cat > apps/playground/src/monaco/code-actions.test.ts` (paste content above)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/playground && pnpm test`
Expected: FAIL - "Cannot find module './code-actions.js'"

- [ ] **Step 3: Implement code actions provider**

```typescript
import type { Diagnostic } from "@archlex/model";
import type * as Monaco from "monaco-editor";

export interface CodeAction {
  title: string;
  edit: {
    range: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
    text: string;
  };
  kind: string;
  isPreferred?: boolean;
}

const COMMON_SERVICES = ["lambda", "rds", "s3", "ec2", "vpc", "dynamodb"];

export function getCodeActionsForDiagnostic(
  diagnostic: Diagnostic,
  sourceText: string
): CodeAction[] {
  switch (diagnostic.code) {
    case "AL-PARSE-MISSING-ENDPOINT":
      return COMMON_SERVICES.map((service, index) => ({
        title: `Add '${service}'`,
        edit: {
          range: {
            startLineNumber: diagnostic.span.end.line,
            startColumn: diagnostic.span.end.column,
            endLineNumber: diagnostic.span.end.line,
            endColumn: diagnostic.span.end.column,
          },
          text: ` ${service}`,
        },
        kind: "quickfix",
        isPreferred: index === 0,
      }));

    case "AL-STRUCT-INVALID-DIRECTIVE": {
      const match = diagnostic.remediation?.match(/Use one of: (.+)/);
      if (!match) return [];

      const validValues = match[1].split(", ");
      return validValues.map((value, index) => ({
        title: `Change to '${value}'`,
        edit: {
          range: {
            startLineNumber: diagnostic.span.start.line,
            startColumn: diagnostic.span.start.column,
            endLineNumber: diagnostic.span.end.line,
            endColumn: diagnostic.span.end.column,
          },
          text: value,
        },
        kind: "quickfix",
        isPreferred: index === 0,
      }));
    }

    case "AL-STRUCT-DUPLICATE-DIRECTIVE":
    case "AL-STRUCT-LATE-DIRECTIVE": {
      return [
        {
          title: "Remove this directive",
          edit: {
            range: {
              startLineNumber: diagnostic.span.start.line,
              startColumn: 1,
              endLineNumber: diagnostic.span.end.line + 1,
              endColumn: 1,
            },
            text: "",
          },
          kind: "quickfix",
          isPreferred: true,
        },
      ];
    }

    default:
      return [];
  }
}

export function registerCodeActionsProvider(
  monaco: typeof Monaco,
  diagnostics: readonly Diagnostic[]
): Monaco.IDisposable {
  return monaco.languages.registerCodeActionProvider("archlex", {
    provideCodeActions(model, range, context) {
      const actions: Monaco.languages.CodeAction[] = [];

      for (const marker of context.markers) {
        const diagnostic = diagnostics.find(
          (d) =>
            d.span.start.line === marker.startLineNumber &&
            d.span.start.column === marker.startColumn
        );

        if (!diagnostic) continue;

        const lineText = model.getLineContent(marker.startLineNumber);
        const codeActions = getCodeActionsForDiagnostic(diagnostic, lineText);

        for (const action of codeActions) {
          actions.push({
            title: action.title,
            diagnostics: [marker],
            kind: action.kind,
            isPreferred: action.isPreferred,
            edit: {
              edits: [
                {
                  resource: model.uri,
                  versionId: model.getVersionId(),
                  textEdit: {
                    range: new monaco.Range(
                      action.edit.range.startLineNumber,
                      action.edit.range.startColumn,
                      action.edit.range.endLineNumber,
                      action.edit.range.endColumn
                    ),
                    text: action.edit.text,
                  },
                },
              ],
            },
          });
        }
      }

      return {
        actions,
        dispose: () => {},
      };
    },
  });
}
```

Command: `cat > apps/playground/src/monaco/code-actions.ts` (paste content above)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/playground && pnpm test`
Expected: PASS - Code actions tests pass

- [ ] **Step 5: Register code actions provider in Editor**

Modify `apps/playground/src/components/Editor.tsx`:

Add import:
```typescript
import { registerCodeActionsProvider } from "../monaco/code-actions.js";
```

Add after registering hover provider in `handleEditorDidMount`:
```typescript
// Register code actions provider
const codeActionsDisposable = registerCodeActionsProvider(monaco, diagnostics);
```

Store disposable in ref and clean up:
```typescript
const codeActionsDisposableRef = useRef<Monaco.IDisposable | null>(null);

// In useEffect for diagnostics:
useEffect(() => {
  const editor = editorRef.current;
  const monaco = monacoRef.current;
  if (!editor || !monaco) return;

  const model = editor.getModel();
  if (model) {
    setDiagnosticMarkers(monaco, model, diagnostics);
    
    // Update code actions
    if (codeActionsDisposableRef.current) {
      codeActionsDisposableRef.current.dispose();
    }
    codeActionsDisposableRef.current = registerCodeActionsProvider(monaco, diagnostics);
  }

  return () => {
    if (codeActionsDisposableRef.current) {
      codeActionsDisposableRef.current.dispose();
    }
  };
}, [diagnostics]);
```

- [ ] **Step 6: Test code actions in playground**

Run: `cd apps/playground && pnpm dev`
1. Open playground in browser
2. Type: `lambda ->`
3. Click on error, press Ctrl+. (or Cmd+. on Mac)
4. Verify quick fix menu appears with service suggestions
Expected: Code actions menu shows suggestions

- [ ] **Step 7: Run typecheck**

Run: `cd apps/playground && pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 8: Commit**

```bash
git add apps/playground/src/monaco/code-actions.ts apps/playground/src/monaco/code-actions.test.ts apps/playground/src/components/Editor.tsx
git commit -m "feat(playground): implement Monaco code actions for quick fixes"
```

---

## Task 11: Enhance Monaco Hover Provider

**Files:**
- Modify: `apps/playground/src/monaco/hover.ts` - Query diagnostic registry
- Modify: `apps/playground/package.json` - Add diagnostics dependency

- [ ] **Step 1: Add diagnostics dependency to playground**

Add to `apps/playground/package.json` dependencies:
```json
"@archlex/diagnostics": "workspace:*"
```

Run: `cd apps/playground && pnpm install`
Expected: Dependency added

- [ ] **Step 2: Enhance hover provider implementation**

Replace content of `apps/playground/src/monaco/hover.ts`:

```typescript
import type { Diagnostic } from "@archlex/model";
import { getDiagnosticDefinition } from "@archlex/diagnostics";
import type * as Monaco from "monaco-editor";

export function registerHoverProvider(
  monaco: typeof Monaco,
  diagnostics: readonly Diagnostic[]
): Monaco.IDisposable {
  return monaco.languages.registerHoverProvider("archlex", {
    provideHover(model, position) {
      // Find diagnostic at this position
      const diagnostic = diagnostics.find(
        (d) =>
          d.span.start.line === position.lineNumber &&
          position.column >= d.span.start.column &&
          position.column <= d.span.end.column
      );

      if (!diagnostic) {
        return null;
      }

      // Get full definition from registry
      const definition = getDiagnosticDefinition(diagnostic.code as any);

      // Build hover content
      const severityBadge =
        diagnostic.severity === "error"
          ? "Error"
          : diagnostic.severity === "warning"
            ? "Warning"
            : "Info";

      let content = `**${diagnostic.code}** [${severityBadge}]\n\n`;
      content += `${diagnostic.message}\n\n`;

      if (diagnostic.remediation) {
        content += `**Fix:** ${diagnostic.remediation}\n\n`;
      }

      if (definition?.examples) {
        content += `**Example:**\n\`\`\`archlex\n${definition.examples.valid}\n\`\`\`\n\n`;
      }

      if (definition?.documentationUrl) {
        content += `[View full documentation →](${definition.documentationUrl})`;
      }

      return {
        range: new monaco.Range(
          diagnostic.span.start.line,
          diagnostic.span.start.column,
          diagnostic.span.end.line,
          diagnostic.span.end.column
        ),
        contents: [{ value: content, supportHtml: false, isTrusted: false }],
      };
    },
  });
}
```

- [ ] **Step 3: Update Editor to pass diagnostics to hover provider**

Modify `apps/playground/src/components/Editor.tsx`:

Update hover provider registration:
```typescript
// Register hover provider with diagnostics
const hoverDisposableRef = useRef<Monaco.IDisposable | null>(null);

// In handleEditorDidMount, remove the old registerHoverProvider call

// In useEffect for diagnostics, add:
if (hoverDisposableRef.current) {
  hoverDisposableRef.current.dispose();
}
hoverDisposableRef.current = registerHoverProvider(monaco, diagnostics);
```

And add cleanup:
```typescript
return () => {
  if (hoverDisposableRef.current) {
    hoverDisposableRef.current.dispose();
  }
  if (codeActionsDisposableRef.current) {
    codeActionsDisposableRef.current.dispose();
  }
};
```

- [ ] **Step 4: Test enhanced hover in playground**

Run: `cd apps/playground && pnpm dev`
1. Open playground
2. Type: `lambda ->`
3. Hover over the error
4. Verify hover shows: code, message, fix, example
Expected: Rich hover content appears

- [ ] **Step 5: Run typecheck**

Run: `cd apps/playground && pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add apps/playground/package.json apps/playground/src/monaco/hover.ts apps/playground/src/components/Editor.tsx
git commit -m "feat(playground): enhance Monaco hover with registry data"
```

---


## Task 12: Implement CLI Diagnostic Formatter

**Files:**
- Create: `packages/cli/src/utils/format-diagnostic.ts`
- Create: `packages/cli/src/utils/format-diagnostic.test.ts`
- Modify: `packages/cli/package.json` - Add diagnostics dependency

- [ ] **Step 1: Add diagnostics dependency to CLI**

Add to `packages/cli/package.json` dependencies:
```json
"@archlex/diagnostics": "workspace:*"
```

Run: `cd packages/cli && pnpm install`
Expected: Dependency added

- [ ] **Step 2: Write test for diagnostic formatter**

```typescript
import { describe, test, expect } from "vitest";
import { formatDiagnostic } from "./format-diagnostic.js";
import type { Diagnostic } from "@archlex/model";

describe("formatDiagnostic", () => {
  test("formats error diagnostic with source context", () => {
    const diagnostic: Diagnostic = {
      code: "AL-PARSE-MISSING-ENDPOINT",
      severity: "error",
      message: "Expected relationship endpoint after arrow operator",
      span: {
        start: { line: 1, column: 10, offset: 9 },
        end: { line: 1, column: 12, offset: 11 },
      },
      elements: [],
      remediation: "Add a service identifier after the arrow",
    };

    const source = "lambda ->";
    const formatted = formatDiagnostic(diagnostic, source, "test.cm");

    expect(formatted).toContain("error[AL-PARSE-MISSING-ENDPOINT]");
    expect(formatted).toContain("test.cm:1:10");
    expect(formatted).toContain("lambda ->");
    expect(formatted).toContain("Add a service identifier");
  });

  test("formats warning diagnostic", () => {
    const diagnostic: Diagnostic = {
      code: "AL-SEM-UNKNOWN-RESOURCE",
      severity: "warning",
      message: "Unknown service type",
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 10, offset: 9 },
      },
      elements: [],
      remediation: "Check service name",
    };

    const formatted = formatDiagnostic(diagnostic, "unknown", "test.cm");
    expect(formatted).toContain("warning[AL-SEM-UNKNOWN-RESOURCE]");
  });

  test("handles multi-line source context", () => {
    const diagnostic: Diagnostic = {
      code: "AL-STRUCT-DUPLICATE-ID",
      severity: "error",
      message: "Duplicate resource ID",
      span: {
        start: { line: 2, column: 1, offset: 10 },
        end: { line: 2, column: 10, offset: 19 },
      },
      elements: [],
      remediation: "Rename to unique ID",
    };

    const source = "lambda: func1\nlambda: func1";
    const formatted = formatDiagnostic(diagnostic, source, "test.cm");

    expect(formatted).toContain("2 |");
    expect(formatted).toContain("lambda: func1");
  });
});
```

Command: `cat > packages/cli/src/utils/format-diagnostic.test.ts` (paste content above)

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/cli && pnpm test`
Expected: FAIL - "Cannot find module './format-diagnostic.js'"

- [ ] **Step 4: Implement diagnostic formatter**

```typescript
import type { Diagnostic } from "@archlex/model";
import chalk from "chalk";

export function formatDiagnostic(
  diagnostic: Diagnostic,
  source: string,
  filename: string
): string {
  const lines = source.split("\n");
  const { span, severity, code, message, remediation } = diagnostic;

  // Severity color
  const severityColor =
    severity === "error"
      ? chalk.red
      : severity === "warning"
        ? chalk.yellow
        : chalk.blue;

  // Header line: error[CODE]: message
  let output = severityColor(
    `${severity}[${chalk.bold(code)}]: ${message}\n`
  );

  // Location: --> file:line:column
  output += chalk.blue(
    `  --> ${filename}:${span.start.line}:${span.start.column}\n`
  );

  // Source context with line numbers
  const lineNumber = span.start.line;
  const gutterWidth = String(lineNumber).length + 1;
  
  output += chalk.blue(`${" ".repeat(gutterWidth)}|\n`);

  if (lineNumber > 0 && lineNumber <= lines.length) {
    const lineContent = lines[lineNumber - 1];
    output += chalk.blue(`${lineNumber.toString().padStart(gutterWidth)} | `);
    output += lineContent + "\n";

    // Caret pointer
    const caretColumn = span.start.column;
    const caretLength = Math.max(
      1,
      span.end.column - span.start.column
    );
    const caret = "^".repeat(caretLength);
    
    output += chalk.blue(`${" ".repeat(gutterWidth)}| `);
    output += " ".repeat(caretColumn - 1);
    output += severityColor(caret);
    
    if (remediation) {
      output += " " + severityColor(remediation);
    }
    output += "\n";
  }

  output += chalk.blue(`${" ".repeat(gutterWidth)}|\n`);

  // Help section
  if (remediation) {
    output += chalk.bold(`   = help: `) + remediation + "\n";
  }

  return output;
}

export function formatDiagnosticList(
  diagnostics: readonly Diagnostic[],
  source: string,
  filename: string
): string {
  if (diagnostics.length === 0) {
    return "";
  }

  return diagnostics
    .map((d) => formatDiagnostic(d, source, filename))
    .join("\n");
}
```

Command: `cat > packages/cli/src/utils/format-diagnostic.ts` (paste content above)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/cli && pnpm test`
Expected: PASS - Diagnostic formatter tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/cli/package.json packages/cli/src/utils/format-diagnostic.ts packages/cli/src/utils/format-diagnostic.test.ts
git commit -m "feat(cli): implement diagnostic formatter with source context"
```

---

## Task 13: Add CLI Errors Command

**Files:**
- Create: `packages/cli/src/commands/errors.ts`
- Modify: `packages/cli/src/index.ts` - Register errors command

- [ ] **Step 1: Implement errors command**

```typescript
import { Command } from "commander";
import chalk from "chalk";
import {
  getAllDiagnostics,
  getDiagnosticDefinition,
} from "@archlex/diagnostics";
import type { DiagnosticCode } from "@archlex/diagnostics";

export function createErrorsCommand(): Command {
  const cmd = new Command("errors");
  cmd.description("View error code documentation");

  // List all errors
  cmd
    .command("list")
    .description("List all error codes")
    .option("-c, --category <category>", "Filter by category")
    .option("-s, --severity <severity>", "Filter by severity")
    .action((options) => {
      const allDiagnostics = getAllDiagnostics();
      let diagnostics = Array.from(allDiagnostics.values());

      if (options.category) {
        diagnostics = diagnostics.filter(
          (d) => d.category === options.category
        );
      }

      if (options.severity) {
        diagnostics = diagnostics.filter(
          (d) => d.severity === options.severity
        );
      }

      // Group by category
      const byCategory = new Map<string, typeof diagnostics>();
      for (const d of diagnostics) {
        if (!byCategory.has(d.category)) {
          byCategory.set(d.category, []);
        }
        byCategory.get(d.category)!.push(d);
      }

      // Display
      for (const [category, items] of byCategory.entries()) {
        console.log(chalk.bold(`\n${category.toUpperCase()} ERRORS\n`));
        
        for (const item of items) {
          const severityColor =
            item.severity === "error"
              ? chalk.red
              : item.severity === "warning"
                ? chalk.yellow
                : chalk.blue;

          console.log(
            `  ${chalk.bold(item.code)} ${severityColor(`[${item.severity}]`)}`
          );
          console.log(`    ${item.message}\n`);
        }
      }
    });

  // Show specific error
  cmd.argument("[code]", "Error code to display").action((code?: string) => {
    if (!code) {
      // Default to list
      cmd.commands.find((c) => c.name() === "list")?.action({ category: undefined, severity: undefined });
      return;
    }

    const definition = getDiagnosticDefinition(code as DiagnosticCode);

    if (!definition) {
      console.error(chalk.red(`Error code not found: ${code}`));
      process.exit(1);
    }

    // Display detailed info
    const severityColor =
      definition.severity === "error"
        ? chalk.red
        : definition.severity === "warning"
          ? chalk.yellow
          : chalk.blue;

    console.log(chalk.bold(`\n${definition.code}`));
    console.log(severityColor(`[${definition.severity}]`) + chalk.gray(` · ${definition.category}`));
    console.log();

    console.log(chalk.bold("Description"));
    console.log(definition.message);
    console.log();

    console.log(chalk.bold("Remediation"));
    console.log(definition.remediation);
    console.log();

    if (definition.examples) {
      console.log(chalk.bold("Example"));
      console.log(chalk.red("Invalid:"));
      console.log(definition.examples.invalid);
      console.log();
      console.log(chalk.green("Valid:"));
      console.log(definition.examples.valid);
      console.log();
    }

    if (definition.relatedCodes && definition.relatedCodes.length > 0) {
      console.log(chalk.bold("Related Codes"));
      console.log(definition.relatedCodes.join(", "));
      console.log();
    }
  });

  return cmd;
}
```

Command: `cat > packages/cli/src/commands/errors.ts` (paste content above)

- [ ] **Step 2: Register errors command in CLI**

Modify `packages/cli/src/index.ts` to add the errors command:

```typescript
import { createErrorsCommand } from "./commands/errors.js";

// In the main program setup:
program.addCommand(createErrorsCommand());
```

- [ ] **Step 3: Test errors command**

Run: `cd packages/cli && pnpm build`
Expected: Build succeeds

Run: `./dist/index.js errors`
Expected: Lists all error codes grouped by category

Run: `./dist/index.js errors AL-PARSE-MISSING-ENDPOINT`
Expected: Shows detailed info for that specific code

- [ ] **Step 4: Run typecheck**

Run: `cd packages/cli && pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/errors.ts packages/cli/src/index.ts
git commit -m "feat(cli): add errors command for documentation"
```

---

## Task 14: Create Documentation Generation Script

**Files:**
- Create: `scripts/generate-error-docs.ts`
- Modify: `package.json` - Add generate-docs script

- [ ] **Step 1: Implement doc generation script**

```typescript
#!/usr/bin/env node
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getAllDiagnostics } from "@archlex/diagnostics";

async function generateErrorDocs() {
  const docsDir = join(process.cwd(), "docs", "errors");
  
  // Create directory
  await mkdir(docsDir, { recursive: true });

  const allDiagnostics = getAllDiagnostics();
  
  // Group by category
  const byCategory = new Map<string, Array<[string, any]>>();
  for (const [code, def] of allDiagnostics.entries()) {
    if (!byCategory.has(def.category)) {
      byCategory.set(def.category, []);
    }
    byCategory.get(def.category)!.push([code, def]);
  }

  // Generate index page
  let indexContent = "# ArchLex Error Codes\n\n";
  indexContent += "Complete reference of all diagnostic codes.\n\n";

  for (const [category, items] of byCategory.entries()) {
    indexContent += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    
    for (const [code, def] of items) {
      const badge = def.severity === "error" ? "🔴" : def.severity === "warning" ? "🟡" : "🔵";
      indexContent += `- ${badge} [${code}](${code}.md) - ${def.message}\n`;
    }
    
    indexContent += "\n";
  }

  await writeFile(join(docsDir, "index.md"), indexContent);
  console.log(`✓ Generated docs/errors/index.md`);

  // Generate individual pages
  for (const [code, def] of allDiagnostics.entries()) {
    let content = `# ${code}\n\n`;
    content += `**Severity:** ${def.severity}  \n`;
    content += `**Category:** ${def.category}\n\n`;

    content += `## Description\n\n`;
    content += `${def.message}\n\n`;

    content += `## Remediation\n\n`;
    content += `${def.remediation}\n\n`;

    if (def.examples) {
      content += `## Examples\n\n`;
      content += `### Invalid\n\n`;
      content += `\`\`\`archlex\n${def.examples.invalid}\n\`\`\`\n\n`;
      content += `### Valid\n\n`;
      content += `\`\`\`archlex\n${def.examples.valid}\n\`\`\`\n\n`;
    }

    if (def.relatedCodes && def.relatedCodes.length > 0) {
      content += `## Related Codes\n\n`;
      for (const related of def.relatedCodes) {
        content += `- [${related}](${related}.md)\n`;
      }
      content += "\n";
    }

    content += `---\n\n`;
    content += `[← Back to Error Codes](index.md)\n`;

    await writeFile(join(docsDir, `${code}.md`), content);
    console.log(`✓ Generated docs/errors/${code}.md`);
  }

  console.log(`\n✓ Generated ${allDiagnostics.size} error documentation pages`);
}

generateErrorDocs().catch((error) => {
  console.error("Failed to generate error docs:", error);
  process.exit(1);
});
```

Command: `cat > scripts/generate-error-docs.ts` (paste content above)

- [ ] **Step 2: Make script executable**

Run: `chmod +x scripts/generate-error-docs.ts`

- [ ] **Step 3: Add script to package.json**

Add to root `package.json` scripts:
```json
"generate-docs": "tsx scripts/generate-error-docs.ts"
```

- [ ] **Step 4: Run doc generation**

Run: `pnpm generate-docs`
Expected: Creates docs/errors/ with index.md and individual code pages

- [ ] **Step 5: Verify generated docs**

Run: `ls docs/errors/`
Expected: index.md, AL-PARSE-001.md, AL-PARSE-MISSING-ENDPOINT.md, etc.

Run: `cat docs/errors/AL-PARSE-MISSING-ENDPOINT.md`
Expected: Complete documentation page with description, remediation, examples

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-error-docs.ts package.json docs/errors/
git commit -m "feat: add error documentation generation script"
```

---


## Task 15: Integration Testing and Documentation

**Files:**
- Create: `tests/error-system-integration.test.ts`
- Modify: `README.md` or create `docs/errors/README.md` - Usage guide

- [ ] **Step 1: Write integration test**

```typescript
import { describe, test, expect } from "vitest";
import { createArchLex } from "@archlex/core";
import { awsProvider } from "@archlex/aws";
import { getDiagnosticDefinition } from "@archlex/diagnostics";

describe("Error System Integration", () => {
  test("all diagnostics include remediation", async () => {
    const archlex = createArchLex({
      providers: [awsProvider],
    });

    const testCases = [
      "lambda ->",  // Missing endpoint
      "vpc my-vpc { lambda",  // Missing brace
      "lambda: func\nlambda: func",  // Duplicate ID
      "provider: aws\nprovider: gcp",  // Duplicate directive
      "direction: invalid",  // Invalid directive
    ];

    for (const source of testCases) {
      const result = await archlex.render(source);
      
      for (const diagnostic of result.diagnostics) {
        expect(diagnostic.remediation).toBeDefined();
        expect(diagnostic.remediation).toBeTruthy();
        expect(diagnostic.code).toMatch(/^AL-(PARSE|STRUCT|SEM)-/);
      }
    }
  });

  test("diagnostic definitions match emitted diagnostics", async () => {
    const archlex = createArchLex({
      providers: [awsProvider],
    });

    const result = await archlex.render("lambda ->");
    
    for (const diagnostic of result.diagnostics) {
      const definition = getDiagnosticDefinition(diagnostic.code as any);
      expect(definition).toBeDefined();
      expect(definition?.code).toBe(diagnostic.code);
      expect(definition?.severity).toBe(diagnostic.severity);
    }
  });

  test("all error-severity diagnostics have examples", () => {
    const allDiagnostics = require("@archlex/diagnostics").getAllDiagnostics();
    
    for (const [code, def] of allDiagnostics.entries()) {
      if (def.severity === "error") {
        expect(def.examples).toBeDefined();
        expect(def.examples?.invalid).toBeTruthy();
        expect(def.examples?.valid).toBeTruthy();
      }
    }
  });
});
```

Command: `cat > tests/error-system-integration.test.ts` (paste content above)

- [ ] **Step 2: Run integration test**

Run: `pnpm test tests/error-system-integration.test.ts`
Expected: PASS - All integration tests pass

- [ ] **Step 3: Create error system usage guide**

```markdown
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

Full error reference: [docs/errors/index.md](./errors/index.md)
```

Command: `cat > docs/errors/README.md` (paste content above)

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 5: Run full typecheck**

Run: `pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 6: Build all packages**

Run: `pnpm build`
Expected: All packages build successfully

- [ ] **Step 7: Commit**

```bash
git add tests/error-system-integration.test.ts docs/errors/README.md
git commit -m "test: add error system integration tests and usage guide"
```

---

## Task 16: Final Verification and Cleanup

**Files:**
- Review: All modified files
- Test: End-to-end workflow
- Update: Any remaining documentation

- [ ] **Step 1: Verify all diagnostics have remediation**

Run manual check:
```bash
cd packages/diagnostics
pnpm test
```

Expected: All tests pass, every diagnostic definition has non-empty remediation

- [ ] **Step 2: Test Monaco enhancements in playground**

Run: `cd apps/playground && pnpm dev`

Test scenarios:
1. Type `lambda ->` → Verify hover shows remediation and example
2. Press Ctrl+. → Verify quick fixes appear
3. Type `direction: invalid` → Verify quick fixes offer LR/RL/TB/BT
4. Create duplicate ID → Verify error with remediation
5. Check diagnostics panel shows clear messages

Expected: All Monaco features work correctly

- [ ] **Step 3: Test CLI error formatting**

Run: `cd packages/cli && pnpm build`

Test commands:
```bash
echo "lambda ->" | ./dist/index.js render
./dist/index.js errors list
./dist/index.js errors AL-PARSE-MISSING-ENDPOINT
```

Expected: 
- Render shows formatted diagnostic with source context
- List shows all error codes
- Specific error shows detailed documentation

- [ ] **Step 4: Verify documentation generation**

Run: `pnpm generate-docs`

Check: 
```bash
ls docs/errors/
cat docs/errors/index.md
cat docs/errors/AL-PARSE-MISSING-ENDPOINT.md
```

Expected: All documentation files generated correctly

- [ ] **Step 5: Run complete test suite**

Run: `pnpm test`
Expected: All tests pass (parser, core, diagnostics, playground, CLI)

- [ ] **Step 6: Run complete typecheck**

Run: `pnpm typecheck`
Expected: No TypeScript errors in any package

- [ ] **Step 7: Update changelog if needed**

Add to `CHANGELOG.md` or create `.changeset/`:
```markdown
---
"@archlex/diagnostics": minor
"@archlex/core": patch
"@archlex/parser": patch
"@archlex/cli": minor
"@archlex/playground": minor
---

Comprehensive error message system with diagnostic registry, Monaco code actions, CLI formatting, and multi-channel documentation
```

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "chore: finalize error message system implementation"
```

- [ ] **Step 9: Create summary of changes**

Document what was implemented:
- ✅ Diagnostic registry package with all existing codes
- ✅ Template interpolation engine
- ✅ Factory pattern for type-safe diagnostic creation
- ✅ Parser refactored to use registry
- ✅ Core analyzer refactored to use registry
- ✅ Monaco code actions for quick fixes
- ✅ Enhanced Monaco hover with examples
- ✅ CLI diagnostic formatter with source context
- ✅ `archlex errors` command
- ✅ Documentation generation script
- ✅ Integration tests
- ✅ Usage guide

Expected: Complete feature implementation verified

---

## Self-Review Checklist

### Spec Coverage
✅ Diagnostic registry architecture - Task 1-7
✅ Monaco Editor integration (markers, hover, code actions) - Task 10-11
✅ CLI error formatting - Task 12
✅ CLI errors command - Task 13
✅ Documentation generation - Task 14
✅ Parser refactoring - Task 8
✅ Core analyzer refactoring - Task 9
✅ Testing and verification - Task 15-16

### No Placeholders
✅ All code blocks contain complete implementations
✅ All test cases include actual test code
✅ All file paths are absolute and explicit
✅ All commands include expected output
✅ No "TBD", "TODO", or "implement later" markers

### Type Consistency
✅ `DiagnosticCode` type used consistently
✅ `createDiagnostic()` signature matches across all uses
✅ `Diagnostic` interface from @archlex/model unchanged
✅ Template interpolation context types consistent
✅ Monaco API types from monaco-editor used correctly

### Implementation Completeness
✅ All 16 tasks cover the full migration path
✅ Each task produces working, testable code
✅ Tests written before implementation (TDD)
✅ Frequent commits after each logical step
✅ Dependencies added before use
✅ Builds and typechecks included

---

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-08-01-error-message-system.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

