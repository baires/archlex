# Future Work: Reverse Backward Compatibility

**Status:** Not Started  
**Priority:** Low (post-initial migration)  
**Created:** 2026-07-31

## Context

During the initial implementation of the rich diagnostic system, we maintain backward compatibility by:
- Emitting `RichDiagnostic` internally in all packages
- Converting to legacy `Diagnostic` at public API boundaries
- Keeping existing consumers (playground UI, CLI, tests) unchanged

This approach allows us to migrate error emitters without breaking existing consumers.

## Goal

Once the initial migration is complete and we're confident in the new system, **reverse the compatibility direction**:

1. Public APIs return `RichDiagnostic[]` instead of `Diagnostic[]`
2. Consumers use `RichDiagnostic` directly (no conversion overhead)
3. Legacy `Diagnostic` type becomes deprecated or internal-only
4. Unlock richer features that don't map cleanly to old format

## Benefits

- **Performance:** Remove conversion overhead at package boundaries
- **Type safety:** Consumers get full `RichDiagnostic` type information
- **Features:** Enable features that don't map to legacy format (structured autofixes, interactive suggestions)
- **Simplicity:** One error type throughout the system
- **Better DX:** IDE autocomplete shows rich diagnostic fields directly

## Prerequisites

Before starting this work:

1. All error emitters migrated to `RichDiagnostic` builders
2. CLI formatter fully supports rich diagnostic display
3. Playground UI fully supports rich diagnostic display
4. Test suite uses rich diagnostics for assertions
5. No external consumers depend on `Diagnostic` type

## Migration Steps

### Phase 1: Update Consumers

1. **CLI:** Update to consume `RichDiagnostic[]` from core APIs
   - Remove `toDiagnostic()` conversion calls
   - Use `DiagnosticFormatter.formatForCLI()` directly
   
2. **Playground:** Update to consume `RichDiagnostic[]`
   - Remove `toDiagnostic()` conversion calls
   - Use `DiagnosticFormatter.formatForUI()` directly
   - Update React components to render `FormattedDiagnostic`

3. **Tests:** Update test assertions
   - Use `RichDiagnostic` expectations instead of `Diagnostic`
   - Update snapshot tests to use rich format
   - Create test helpers for common assertions

### Phase 2: Update Public APIs

1. **Core package (`@cloudmer/core`):**
   ```typescript
   // Before
   export interface AnalysisResult {
     graph: CloudGraph;
     diagnostics: readonly Diagnostic[];
   }
   
   // After
   export interface AnalysisResult {
     graph: CloudGraph;
     diagnostics: readonly RichDiagnostic[];
   }
   ```

2. **Parser package (`@cloudmer/parser`):**
   ```typescript
   // Before
   export interface ParseResult {
     ast: DocumentAst;
     diagnostics: readonly Diagnostic[];
   }
   
   // After
   export interface ParseResult {
     ast: DocumentAst;
     diagnostics: readonly RichDiagnostic[];
   }
   ```

3. **Layout package (`@cloudmer/layout-elk`):**
   ```typescript
   // Before
   export interface LayoutResult {
     graph: LayoutGraph;
     diagnostics: readonly Diagnostic[];
     metadata: { ... };
   }
   
   // After
   export interface LayoutResult {
     graph: LayoutGraph;
     diagnostics: readonly RichDiagnostic[];
     metadata: { ... };
   }
   ```

4. **Renderer package (`@cloudmer/renderer-svg`):**
   ```typescript
   // Before
   export interface SvgResult {
     svg: string;
     diagnostics: readonly Diagnostic[];
     mappings: readonly ElementMapping[];
     metadata: { ... };
   }
   
   // After
   export interface SvgResult {
     svg: string;
     diagnostics: readonly RichDiagnostic[];
     mappings: readonly ElementMapping[];
     metadata: { ... };
   }
   ```

### Phase 3: Deprecate Legacy Type

1. Mark `Diagnostic` as deprecated in `@cloudmer/model`:
   ```typescript
   /**
    * @deprecated Use RichDiagnostic from @cloudmer/diagnostics instead.
    * This type is maintained for backward compatibility only.
    */
   export interface Diagnostic {
     // ... existing fields
   }
   ```

2. Add deprecation warnings in documentation

3. Update migration guide for external consumers (if any)

### Phase 4: Remove Conversion Layer (Optional)

If no external consumers depend on `Diagnostic`:

1. Remove `toDiagnostic()` method from `RichDiagnostic`
2. Remove `fromDiagnostic()` helper
3. Remove `Diagnostic` type from `@cloudmer/model`
4. Clean up any conversion-related code

## New Features Unlocked

Once consumers use `RichDiagnostic` directly:

### 1. Structured Autofixes

```typescript
interface QuickFix {
  type: 'replace' | 'insert' | 'delete';
  span: SourceSpan;
  replacement?: string;
  description: string;
}

// In CLI
Choose a fix:
  1. [a] Rename to 'my-lambda-v2'  (applies automatically)
  2. [b] Remove duplicate definition  (applies automatically)
  3. [c] See documentation

// In Playground
[Apply Fix] button next to each suggestion
```

### 2. Interactive Suggestions

```typescript
interface InteractiveSuggestion extends Suggestion {
  action: 'rename' | 'add' | 'remove' | 'replace';
  interactive?: {
    prompt: string;  // "Enter new resource name:"
    validate?: (input: string) => boolean;
    apply: (input: string) => QuickFix;
  };
}

// User clicks "Rename resource"
// Playground shows input: "Enter new name: _____"
// Validates uniqueness, applies fix
```

### 3. Rich Context Display

```typescript
interface RichContext {
  resourceId: string;
  firstDefinedAt: SourceSpan;
  conflictingDefinition: SourceSpan;
  // New: structured data for visualization
  visualization?: {
    type: 'diff' | 'graph' | 'timeline';
    data: unknown;
  };
}

// Playground can render:
// - Side-by-side diff of conflicting definitions
// - Graph showing relationship conflicts
// - Timeline of directive order issues
```

### 4. Diagnostic Grouping

```typescript
interface DiagnosticGroup {
  category: string;
  diagnostics: RichDiagnostic[];
  summary: string;
  relatedDocs?: string;
}

// Group related errors:
// "5 duplicate resource IDs found"
//   - my-lambda (lines 5, 12)
//   - my-bucket (lines 8, 15)
//   ...
```

## Rollback Plan

If issues arise during migration:

1. Keep `toDiagnostic()` conversion in place temporarily
2. Update specific consumers back to `Diagnostic` type
3. Fix issues in rich diagnostic system
4. Resume migration when ready

The key is: **don't rush this phase**. Only proceed when:
- Initial migration is complete and stable
- All consumers are ready to adopt `RichDiagnostic`
- Team is confident in the new system

## Timeline

- **Earliest start:** After initial migration is complete and stable (1-2 months of production use)
- **Estimated duration:** 1-2 weeks of work
- **Priority:** Low - this is an optimization, not a requirement

## Success Criteria

- All public APIs return `RichDiagnostic[]`
- Zero conversion overhead in hot paths
- Consumers leverage rich diagnostic features
- No regressions in error reporting
- Legacy `Diagnostic` type removed or deprecated

## Related Documents

- [Error Messages Design](../superpowers/specs/2026-07-31-error-messages-design.md) - Initial rich diagnostic system
- [Error Message Implementation Plan](../plans/catalog-error-messages.md) - Original task list
