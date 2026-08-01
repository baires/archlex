# Rich Diagnostic System Design

**Date:** 2026-07-31  
**Status:** Approved  
**Author:** Claude (via brainstorming)

## Overview

Improve ArchLex's error messages to be clear, actionable, and helpful by creating a new structured diagnostic system that provides context, suggestions, and examples. The new system uses a builder pattern to ensure consistency and completeness while maintaining backward compatibility through conversion at package boundaries.

## Problem Statement

Current error messages have three main issues:

1. **Users don't understand what's wrong** - Messages lack context about which resources, relationships, or locations are involved
2. **Users don't know how to fix issues** - No actionable suggestions or examples of correct usage
3. **Inconsistent formatting** - Error messages vary in style, detail level, and helpfulness across different parts of the system

## Goals

- Every error message clearly explains what went wrong
- Every error provides actionable suggestions for fixing the issue
- Error messages include context (resource names, locations, values)
- Consistent formatting across parser, validation, and rendering errors
- Works seamlessly in both CLI and playground UI
- Maintain backward compatibility during migration

## Non-Goals

- Localization/internationalization (prepare structure for future i18n)
- Automated error fixing (suggestions only, no auto-apply initially)
- Machine-readable error schemas for external tools
- Telemetry/analytics on error frequency

## Design

### Architecture

Create a new `@archlex/diagnostics` package containing:

- `RichDiagnostic` - structured error type with problem, context, suggestions, examples
- `DiagnosticBuilder` - fluent API for creating errors
- Category-specific builders (ParseError, ValidationError, RenderError, InternalError)
- Conversion utilities (`toDiagnostic()`, `fromDiagnostic()`)
- Formatting utilities for CLI and UI display

### Core Types

```typescript
interface RichDiagnostic {
  // Identity
  code: string;
  severity: 'error' | 'warning' | 'info';
  category: 'parse' | 'validation' | 'rendering' | 'internal';
  
  // What went wrong
  problem: string;
  
  // Additional context (resource names, values, locations)
  context: ErrorContext;
  
  // How to fix it
  suggestions: readonly Suggestion[];
  
  // Show correct usage
  examples?: readonly CodeExample[];
  
  // Source location
  span: SourceSpan;
  
  // Related information (e.g., "first defined here")
  related?: readonly RelatedInfo[];
}

interface ErrorContext {
  // Human-readable key-value pairs
  // Values can be strings, numbers, or spans (for "see line X")
  [key: string]: string | number | SourceSpan;
}

interface Suggestion {
  description: string;
  action?: 'rename' | 'add' | 'remove' | 'replace';
  autofix?: QuickFix; // For future IDE/CLI quick fixes
}

interface CodeExample {
  description: string;
  code: string;
}

interface RelatedInfo {
  message: string;
  span: SourceSpan;
}

interface QuickFix {
  // Structure TBD - for future autofix support
  type: 'replace' | 'insert' | 'delete';
  span: SourceSpan;
  replacement?: string;
}
```

### Builder API

Fluent builder pattern ensures all required fields are provided:

```typescript
// Base builder
RichDiagnostic.validation('AL-STRUCT-DUPLICATE-ID')
  .problem(`Resource '${id}' is already defined`)
  .context({ 
    resourceId: id, 
    firstDefinedAt: firstSpan,
    redefinedAt: secondSpan 
  })
  .suggest('Rename one of the resources to a unique identifier')
  .suggest('Remove the duplicate definition')
  .example('my-lambda-function  // must be unique')
  .at(span)
  .build(); // returns RichDiagnostic
```

**Category-Specific Builders:**

Each category gets specialized helpers:

```typescript
// Parse errors
RichDiagnostic.parse('AL-PARSE-MISSING-ENDPOINT')
  .problem('Relationship is missing the target endpoint')
  .context({ 
    arrow: '-->',
    leftEndpoint: 'my-lambda',
    partialStatement: 'my-lambda -->'
  })
  .suggest('Add a target service after the arrow')
  .example('my-lambda --> s3-bucket')
  .at(span)
  .build();

// Validation errors with helpers
RichDiagnostic.validation('AL-SEM-UNKNOWN-RESOURCE')
  .problem(`Service type 'lambdaa' is not recognized`)
  .context({ 
    providedType: 'lambdaa',
    provider: 'aws',
    resourceName: 'my-function'
  })
  .didYouMean('lambda') // Helper method
  .suggest('See available AWS service types in the documentation')
  .example('lambda my-function  // correct service type')
  .at(span)
  .build();

// Rendering errors
RichDiagnostic.rendering('AL-RENDER-ICON-NOT-FOUND')
  .problem(`Cannot load icon for service '${serviceKind}'`)
  .context({ 
    serviceKind,
    iconPath: '/icons/custom.svg',
    provider: 'aws'
  })
  .suggest('Use a standard AWS service type with a built-in icon')
  .suggest('Set icon: null to use the default icon')
  .example('lambda my-function  // has built-in icon')
  .at(span)
  .build();

// Internal errors
RichDiagnostic.internal('AL-INTERNAL-LAYOUT-FAILED')
  .problem('Layout engine failed unexpectedly')
  .context({ 
    engine: 'elk',
    nodeCount: 42,
    edgeCount: 38
  })
  .suggest('Try reducing the diagram complexity')
  .suggest('Report this issue with the diagram source')
  .at(span)
  .build();
```

**Builder Helper Methods:**

```typescript
class DiagnosticBuilder {
  // Common patterns
  didYouMean(correct: string): this;
  requiredField(fieldName: string, expectedType?: string): this;
  invalidValue(field: string, provided: string, expected: string[]): this;
  
  // Chaining
  problem(message: string): this;
  context(ctx: ErrorContext): this;
  suggest(description: string, action?: Action): this;
  example(code: string, description?: string): this;
  at(span: SourceSpan): this;
  relatedInfo(message: string, span: SourceSpan): this;
  
  build(): RichDiagnostic;
}
```

### Integration and Migration

**Package Boundary Conversion:**

All packages emit `RichDiagnostic` internally but convert to `Diagnostic` at public API boundaries:

```typescript
class RichDiagnostic {
  toDiagnostic(): Diagnostic {
    return {
      code: this.code,
      severity: this.severity,
      message: this.formatMessage(), // "Resource 'x' is already defined (first defined at line 5)"
      span: this.span,
      remediation: this.formatRemediation(), // "Suggested fixes:\n  1. ...\n\nExample:\n  ..."
      elements: this.extractElements(), // Extract element IDs from context spans
      related: this.related?.map(r => ({
        message: r.message,
        span: r.span
      }))
    };
  }

  private formatMessage(): string {
    // Combine problem + inline context
    let msg = this.problem;
    
    // Add important context inline
    const contextParts: string[] = [];
    for (const [key, value] of Object.entries(this.context)) {
      if (typeof value === 'string' || typeof value === 'number') {
        contextParts.push(`${key}: ${value}`);
      } else {
        // SourceSpan - reference the location
        contextParts.push(`${key} at line ${value.start.line}`);
      }
    }
    
    if (contextParts.length > 0) {
      msg += ` (${contextParts.join(', ')})`;
    }
    
    return msg;
  }

  private formatRemediation(): string | undefined {
    if (this.suggestions.length === 0 && !this.examples) {
      return undefined;
    }
    
    const parts: string[] = [];
    
    // Format suggestions
    if (this.suggestions.length > 0) {
      parts.push('Suggested fixes:');
      this.suggestions.forEach((s, i) => {
        parts.push(`  ${i + 1}. ${s.description}`);
      });
    }
    
    // Format examples
    if (this.examples && this.examples.length > 0) {
      if (parts.length > 0) parts.push('');
      parts.push('Example:');
      this.examples.forEach(ex => {
        if (ex.description) {
          parts.push(`  ${ex.description}`);
        }
        parts.push(`  ${ex.code}`);
      });
    }
    
    return parts.join('\n');
  }

  private extractElements(): string[] {
    // Extract element IDs from context for diagnostic highlighting
    const elements: string[] = [];
    for (const value of Object.values(this.context)) {
      if (typeof value === 'string' && value.match(/^[a-z0-9-]+$/)) {
        elements.push(value);
      }
    }
    return elements;
  }
}
```

**Migration Strategy:**

All error emitters switch to `RichDiagnostic` builders immediately, converting to `Diagnostic` at package boundaries:

1. Create `@archlex/diagnostics` package with types, builders, and converters
2. Migrate `@archlex/parser` - all AL-PARSE-* codes
3. Migrate `@archlex/core` - all AL-STRUCT-* and AL-SEM-* codes
4. Migrate playground rendering errors
5. Update CLI formatter to use rich display when available
6. Update playground UI to use rich display when available

**Why this approach:**
- Clean break: new errors are immediately better
- Type safety enforces completeness at error creation time
- Backward compatibility maintained via conversion
- No gradual debt—once migrated, a package always emits rich diagnostics

### Display and Formatting

**CLI Display:**

Rich diagnostics render with full context in the terminal:

```
Error [AL-STRUCT-DUPLICATE-ID]: Resource 'my-lambda' is already defined
  --> example.archlex:12:3
   |
 5 | lambda my-lambda
   | ^^^^^^ first defined here
   |
12 | lambda my-lambda
   |        ^^^^^^^^^^ redefined here

Context:
  • Resource ID: my-lambda
  • First defined: line 5, column 8
  • Redefined: line 12, column 8

Suggested fixes:
  1. Rename one of the resources to a unique identifier
  2. Remove the duplicate definition

Example:
  lambda my-lambda-v2  // must be unique
```

**Playground UI Display:**

Diagnostics appear in three places:

1. **Inline editor markers** - squiggly underlines with hover tooltips showing problem + first suggestion
2. **Diagnostics panel** - expandable list with full details (all suggestions, examples, context)
3. **Status bar** - error/warning/info counts

The playground displays:
- **Problem** as the primary heading
- **Context** as expandable "Details" section with key-value pairs
- **Suggestions** as numbered list (or buttons if autofix available)
- **Examples** in syntax-highlighted code blocks

**Formatter API:**

```typescript
class DiagnosticFormatter {
  // For CLI - plain text with ANSI colors
  formatForCLI(diag: RichDiagnostic, source: string): string;
  
  // For playground - structured data for React components
  formatForUI(diag: RichDiagnostic): FormattedDiagnostic;
  
  // For tests - simple string for snapshot comparison
  formatForTest(diag: RichDiagnostic): string;
}

interface FormattedDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  title: string; // the problem
  details: Array<{ label: string; value: string }>; // the context
  suggestions: Array<{ text: string; autofix?: QuickFix }>;
  examples: Array<{ description: string; code: string }>;
  span: SourceSpan;
}
```

### Error Categories

**Parse Errors (AL-PARSE-*):**
- Lexer/tokenization failures
- Syntax errors (missing braces, endpoints)
- Malformed statements

**Validation Errors:**
- **Structural (AL-STRUCT-*):** Duplicate IDs, conflicting labels, invalid directives
- **Semantic (AL-SEM-*):** Unknown resources/relationships, invalid connections, empty graphs

**Rendering Errors (AL-RENDER-*):**
- Icon loading failures
- Layout engine failures
- SVG generation errors

**Internal Errors (AL-INTERNAL-*):**
- Unexpected failures
- Abort signals
- System errors

Each category gets a specialized builder with domain-specific helpers.

## Examples

### Before and After

**Current (Diagnostic):**
```typescript
{
  code: "AL-SEM-UNKNOWN-RESOURCE",
  severity: "error",
  message: "Unknown service kind: lambdaa",
  span: { ... },
  elements: []
}
```

**New (RichDiagnostic):**
```typescript
RichDiagnostic.validation('AL-SEM-UNKNOWN-RESOURCE')
  .problem(`Service type 'lambdaa' is not recognized`)
  .context({ 
    providedType: 'lambdaa',
    provider: 'aws',
    resourceName: 'my-function'
  })
  .didYouMean('lambda')
  .suggest('See available AWS service types in the documentation')
  .example('lambda my-function  // correct service type')
  .at(span)
  .build()
  .toDiagnostic(); // Converts to legacy format at boundary
```

**Rendered in CLI:**
```
Error [AL-SEM-UNKNOWN-RESOURCE]: Service type 'lambdaa' is not recognized
  --> example.archlex:5:1

Context:
  • Provided type: lambdaa
  • Provider: aws
  • Resource name: my-function

Suggested fixes:
  1. Did you mean "lambda"?
  2. See available AWS service types in the documentation

Example:
  lambda my-function  // correct service type
```

### More Examples

**Parse Error:**
```typescript
RichDiagnostic.parse('AL-PARSE-MISSING-ENDPOINT')
  .problem('Relationship is missing the target endpoint')
  .context({ 
    arrow: '-->',
    leftEndpoint: 'my-lambda'
  })
  .suggest('Add a target service after the arrow')
  .example('my-lambda --> s3-bucket')
  .at(span)
  .build();
```

**Duplicate ID:**
```typescript
RichDiagnostic.validation('AL-STRUCT-DUPLICATE-ID')
  .problem(`Resource '${id}' is already defined`)
  .context({ 
    resourceId: id, 
    firstDefinedAt: firstSpan,
    redefinedAt: secondSpan 
  })
  .suggest('Rename one of the resources to a unique identifier')
  .suggest('Remove the duplicate definition')
  .example('my-lambda-v2  // must be unique')
  .relatedInfo('First defined here', firstSpan)
  .at(secondSpan)
  .build();
```

**Rendering Error:**
```typescript
RichDiagnostic.rendering('AL-RENDER-ICON-NOT-FOUND')
  .problem(`Cannot load icon for service 'custom-service'`)
  .context({ 
    serviceKind: 'custom-service',
    iconPath: '/icons/custom.svg',
    provider: 'aws'
  })
  .suggest('Use a standard AWS service type with a built-in icon')
  .suggest('Add the icon file to src/icons/custom.svg')
  .suggest('Set icon: null to use the default icon')
  .example('lambda my-function  // has built-in icon')
  .at(span)
  .build();
```

## Implementation Plan

1. **Create diagnostics package** - types, builders, converters
2. **Migrate parser** - replace all parse error creation with builders
3. **Migrate core validation** - replace all validation error creation
4. **Update formatters** - CLI and playground display logic
5. **Migrate rendering errors** - playground-specific errors
6. **Testing** - snapshot tests for formatted output
7. **Documentation** - error catalog, troubleshooting guide

## Testing Strategy

- **Unit tests** for builder API (required fields, chaining)
- **Snapshot tests** for formatted output (CLI and UI)
- **Integration tests** for conversion (`RichDiagnostic` → `Diagnostic`)
- **Visual tests** in playground for diagnostic panel rendering
- **Migration tests** to ensure all existing error codes are covered

## Future Work

### Reverse Backward Compatibility

Once all consumers (playground UI, CLI, tests) are updated to use `RichDiagnostic` directly, we can:

1. Change public APIs to return `RichDiagnostic[]` instead of `Diagnostic[]`
2. Deprecate `Diagnostic` type
3. Remove conversion overhead
4. Enable richer features (autofixes, structured data)

**This will be documented in a separate work item** after initial migration is complete.

See: `docs/future/reverse-backward-compatibility.md` (to be created)

### Other Future Enhancements

- **Localization** - translate messages to other languages
- **Autofixes** - IDE/CLI quick fixes for common errors
- **Error analytics** - track which errors users hit most
- **Documentation links** - deep links to relevant docs
- **Interactive examples** - clickable "insert this code" in playground

## Open Questions

- Should we include documentation URLs in suggestions? (decision: yes, as suggestions)
- How many examples per error? (decision: 1-2, prefer quality over quantity)
- Should context be ordered or unordered? (decision: unordered map, formatters handle display order)
- Support for multi-line code examples? (decision: yes, examples can contain newlines)

## Success Criteria

- All existing error codes migrated to `RichDiagnostic` builders
- CLI displays full context, suggestions, and examples
- Playground UI displays rich diagnostics in panel and tooltips
- User feedback indicates errors are clearer and more actionable
- No regression in error detection or reporting
- Test suite passes with new diagnostic format

## Dependencies

- None - this is a new package with no external dependencies
- All ArchLex packages will depend on `@archlex/diagnostics`

## Timeline Estimate

- Package creation: 1 day
- Parser migration: 1 day
- Core validation migration: 2 days
- Formatter updates: 1 day
- Testing and polish: 1 day
- **Total: ~1 week** of focused implementation work
