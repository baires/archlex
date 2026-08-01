# Error Message System Design

**Date:** 2026-08-01  
**Status:** Approved  
**Author:** Claude (via brainstorming session)

## Overview

Comprehensive redesign of CloudMer's diagnostic and error message system to provide precise, actionable feedback across all user touchpoints: Monaco Editor (playground), CLI output, and documentation. The system centers on a centralized diagnostic registry that serves as the single source of truth for all error codes, messages, remediation steps, and examples.

## Goals

1. **Consistency:** Every diagnostic has a well-formed message and actionable remediation across Monaco, CLI, and documentation
2. **Discoverability:** Multi-channel access to error documentation (CLI commands, web docs, Monaco links)
3. **Actionability:** Monaco code actions for deterministic fixes, clear remediation for all diagnostics
4. **Maintainability:** Single source of truth prevents drift, type-safe factory prevents incomplete diagnostics
5. **Quality:** Compiler-style technical precision assumes CloudMer expertise

## Non-Goals

- Conversational or beginner-friendly tone (compiler-style technical messages)
- Automatic error fixing without user confirmation
- Localization/internationalization (English only)
- Error analytics or telemetry collection

## Current State

**Diagnostics:**
- Emitted inline in parser (`packages/parser/src/index.ts`)
- Emitted inline in core analyzer (`packages/core/src/index.ts`)
- Provider-specific semantic rules in AWS/GCP packages
- Diagnostic codes already stable (CM-PARSE-*, CM-STRUCT-*, CM-SEM-*)
- `remediation` field exists but inconsistently populated

**Monaco Integration:**
- Basic marker display via `monaco.editor.setModelMarkers()`
- Simple hover provider (`apps/playground/src/monaco/hover.ts`)
- No code actions or quick fixes

**CLI:**
- Basic error classes (`CloudMerError`, `ValidationError`, `ParseError`)
- Simple error formatting with chalk coloring
- No structured diagnostic output or error code documentation

## Design

### 1. Diagnostic Registry Architecture

**New Package:** `@cloudmer/diagnostics`

Centralized registry defining every diagnostic code with complete metadata:

```typescript
interface DiagnosticDefinition {
  code: string;              // e.g., "CM-PARSE-MISSING-ENDPOINT"
  category: "parse" | "structural" | "semantic" | "architecture";
  severity: "error" | "warning" | "info";
  message: string | MessageTemplate;  // Compiler-style technical message
  remediation: string | RemediationTemplate;  // Always present, actionable
  examples?: {
    invalid: string;         // Code that triggers this diagnostic
    valid: string;           // Correct alternative
  };
  relatedCodes?: string[];   // Related diagnostic codes
  documentationUrl?: string; // Link to detailed docs (configurable)
}

type DiagnosticCode = 
  | `CM-PARSE-${string}`
  | `CM-STRUCT-${string}`
  | `CM-SEM-${string}`;
```

**Message Templates:**

Support interpolation for context-specific details:
```typescript
// Definition
message: "Resource '${id}' conflicts with declaration at ${line}:${column}"

// Usage
createDiagnostic("CM-STRUCT-DUPLICATE-ID", {
  id: "my-lambda",
  line: 10,
  column: 5
}, span)

// Result
"Resource 'my-lambda' conflicts with declaration at 10:5"
```

**Factory Function:**

Type-safe factory ensures all required fields are provided:

```typescript
function createDiagnostic<T extends Record<string, unknown>>(
  code: DiagnosticCode,
  context: T,
  span: SourceSpan,
  elements?: string[]
): Diagnostic;

function getDefinition(code: DiagnosticCode): DiagnosticDefinition;
```

**Package Structure:**

```
packages/diagnostics/
  src/
    index.ts              # Public API exports
    registry.ts           # Diagnostic definitions
    factory.ts            # createDiagnostic() implementation
    templates.ts          # Message/remediation template engine
    categories/
      parse.ts            # CM-PARSE-* definitions
      structural.ts       # CM-STRUCT-* definitions
      semantic.ts         # CM-SEM-* definitions
      architecture.ts     # CM-ARCH-* definitions (future)
  package.json
  tsconfig.json
```

**Registry Organization:**
- Grouped by category (parse, structural, semantic, architecture)
- Exported as typed constants for type-safe reference
- Single source of truth consumed by parser, core, AWS/GCP providers, Monaco, CLI

**Validation:**
- Build-time checks ensure every diagnostic code has non-empty message and remediation
- TypeScript types prevent incomplete diagnostic definitions
- At least one example required for errors (optional for warnings/info)

### 2. Monaco Editor Integration

Three-layer enhancement providing comprehensive in-editor diagnostic experience:

**Layer 1: Enhanced Markers (Existing)**
- Continue using `monaco.editor.setModelMarkers()`
- Map diagnostic severity to Monaco marker severity
- Include diagnostic code in marker metadata
- File: `apps/playground/src/monaco/diagnostics.ts` (enhanced)

**Layer 2: Rich Hover Provider**

```typescript
monaco.languages.registerHoverProvider('cloudmer', {
  provideHover(model, position) {
    // Find diagnostic at position
    // Query registry for full definition
    // Return markdown content
  }
})
```

Hover content structure:
```markdown
**CM-PARSE-MISSING-ENDPOINT** [Error]

Expected relationship endpoint after arrow operator.

**Fix:** Add a service identifier after the arrow.

**Example:**
  lambda -> rds

[View full documentation →](link)
```

File: `apps/playground/src/monaco/hover.ts` (enhanced to query diagnostic registry)

**Layer 3: Code Actions Provider (Quick Fixes)**

```typescript
monaco.languages.registerCodeActionsProvider('cloudmer', {
  provideCodeActions(model, range, context) {
    // For diagnostics with deterministic fixes:
    // - Return workspace edits that apply the fix
    // - Label actions clearly ("Add missing endpoint", "Remove duplicate directive")
    // - Mark as preferred for Ctrl+. quick fix
  }
})
```

Code actions work for:
- Missing endpoints (suggest common services)
- Invalid directive values (offer valid alternatives from allowed list)
- Duplicate IDs (suggest unique alternatives by appending suffix)
- Common typos in service kinds (did-you-mean suggestions based on edit distance)

File: `apps/playground/src/monaco/code-actions.ts` (new)

**Decision:** Only provide code actions for deterministic fixes. Non-deterministic fixes (requiring human judgment) stay in hover remediation text.

### 3. CLI Error Formatting

CLI consumes the same diagnostic registry but formats output for terminal display with source context.

**Error Output Structure:**

```
error[CM-PARSE-MISSING-ENDPOINT]: Expected relationship endpoint after arrow operator
  --> diagram.cm:5:12
   |
 5 | lambda ->
   |        ^^ Add a service identifier after the arrow
   |
   = help: Example: lambda -> rds
```

**Formatting Components:**

1. **Header Line:** `{severity}[{code}]: {message}`
   - Color-coded: red (error), yellow (warning), blue (info)
   - Bold diagnostic code

2. **Location Context:** `--> {file}:{line}:{column}`

3. **Source Snippet:** Show relevant source lines with caret pointer
   - Line numbers in left gutter
   - Underline/caret pointing to exact span
   - Remediation text inline below span

4. **Help Section:** `= help: {remediation}`
   - Examples when available
   - Link to documentation (if configured)

**CLI Commands:**

1. **`cloudmer errors`** - List all error codes with brief descriptions
   - Organized by category
   - Filterable by category or severity
   - Shows code, severity, and one-line summary

2. **`cloudmer errors <code>`** - Show detailed documentation for specific code
   - Full description
   - When this error occurs
   - Remediation strategies
   - Multiple examples (before/after)
   - Related error codes

**Implementation Files:**
- `packages/cli/src/utils/errors.ts` - Enhanced with diagnostic formatting
- `packages/cli/src/utils/format-diagnostic.ts` - New formatter consuming registry
- `packages/cli/src/commands/errors.ts` - New command for error documentation

### 4. Documentation System

Multi-channel documentation built from diagnostic registry as canonical source.

**Channel 1: Web Documentation**

Auto-generated markdown files from registry during build:

```
docs/
  errors/
    index.md                         # Overview, all codes by category
    CM-PARSE-MISSING-ENDPOINT.md
    CM-STRUCT-DUPLICATE-ID.md
    CM-SEM-UNKNOWN-RESOURCE.md
    ...
```

Each error code page includes:
- Diagnostic code and severity
- Technical description
- When this error occurs
- Remediation steps
- Before/after examples
- Related error codes
- Version introduced/modified

**Channel 2: CLI Documentation**

`cloudmer errors` command queries registry at runtime:
- Formatted for terminal display
- Supports search/filtering by category or code
- Same content as web docs, terminal-optimized formatting

**Channel 3: Monaco Links**

Hover tooltips link to web documentation:
- URLs follow pattern: `docs/errors/{code}.md` (relative) or hosted URL
- Link generation configurable per deployment
- Development: relative paths to local docs
- Production: hosted docs (future: `https://cloudmer.dev/docs/errors/{code}`)

**Documentation Build Pipeline:**

```typescript
// scripts/generate-error-docs.ts
// Reads diagnostic registry
// Generates markdown files for web docs
// Validates all diagnostics have required metadata
// Runs as part of build process (pnpm build step)
```

**Validation:**
- Build fails if any diagnostic missing message or remediation
- TypeScript types enforce completeness at compile time
- At least one example required for errors

### 5. Migration Strategy

**Phase 1: Create Registry Package**
- New `packages/diagnostics/` package
- Define all existing diagnostic codes with metadata
- Implement factory function and type system
- Write missing remediations for all codes
- Add examples for all error-severity diagnostics

**Phase 2: Refactor Parser**
- Replace inline diagnostic creation with registry factory
- Update all CM-PARSE-* codes
- Remove hardcoded messages
- Import `createDiagnostic` from `@cloudmer/diagnostics`

**Phase 3: Refactor Core Analyzer**
- Update CM-STRUCT-* diagnostic emission
- Migrate to factory pattern
- Ensure consistent remediation

**Phase 4: Refactor Provider Rules**
- Update CM-SEM-* codes in AWS/GCP packages
- Providers import from diagnostics registry
- Semantic rules reference registry definitions

**Phase 5: Monaco Enhancement**
- Implement code actions provider (`code-actions.ts`)
- Enhance hover provider with registry data
- Wire up quick fixes for deterministic cases

**Phase 6: CLI Enhancement**
- Implement diagnostic formatter with source context
- Add `cloudmer errors` command and subcommand
- Update error output throughout CLI

**Phase 7: Documentation Generation**
- Build script to generate markdown docs (`scripts/generate-error-docs.ts`)
- Integrate into build pipeline (`package.json` scripts)
- Configure documentation URLs (env-based or config file)

### 6. Backwards Compatibility

**Public API:**
- `Diagnostic` interface in `@cloudmer/model` remains unchanged
- Diagnostic codes remain stable (no renames)
- `remediation` field already optional in interface (now always populated in practice)
- Library consumers see no breaking changes

**Internal:**
- Only internal diagnostic emission mechanism changes
- Existing tests continue to work (validate diagnostic codes)
- New tests for factory, templates, formatting

### 7. Testing Strategy

**Unit Tests:**
- Diagnostic factory validates context interpolation
- Template engine handles missing/extra context keys gracefully
- Registry lookup returns correct definitions

**Integration Tests:**
- Parser emits diagnostics with proper remediation
- Core analyzer diagnostics reference registry
- Provider rules use factory correctly

**CLI Tests:**
- Snapshot tests for formatted diagnostic output
- Test `cloudmer errors` command listing and detail views
- Verify source context rendering

**Monaco Tests:**
- Code actions provide correct edits
- Hover content includes all expected sections
- Quick fixes apply successfully

**Build Tests:**
- Documentation generation script runs without errors
- All diagnostic codes have complete metadata
- Generated markdown files are valid

## Implementation Checklist

High-level tasks for implementation plan:

1. ✅ Design approved
2. Create `@cloudmer/diagnostics` package structure
3. Define diagnostic registry with all existing codes
4. Implement factory function and template engine
5. Write remediation text for all existing diagnostics
6. Add examples for all error-severity diagnostics
7. Refactor parser to use registry
8. Refactor core analyzer to use registry
9. Refactor AWS/GCP providers to use registry
10. Implement Monaco code actions provider
11. Enhance Monaco hover provider
12. Implement CLI diagnostic formatter
13. Add `cloudmer errors` CLI command
14. Create documentation generation script
15. Integrate doc generation into build pipeline
16. Write tests for all new components
17. Update existing tests as needed

## Success Criteria

- Every diagnostic has a technical message and actionable remediation
- Monaco users can apply quick fixes for deterministic errors
- CLI users see source context and clear remediation in terminal
- `cloudmer errors` command provides searchable error documentation
- Web documentation auto-generates from registry
- No breaking changes to public API
- All tests pass including new integration tests

## Open Questions

None - all design questions resolved during brainstorming.

## Related Documents

- Product principles: `PRODUCT.md`
- Diagnostic interface: `packages/model/src/index.ts`
- Current Monaco integration: `apps/playground/src/monaco/`
- Current CLI errors: `packages/cli/src/utils/errors.ts`
- Original error improvement plan: `docs/plans/catalog-error-messages.md`
