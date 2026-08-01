# AL-STRUCT-DUPLICATE-DIRECTIVE

**Severity:** error  
**Category:** structural

## Description

Duplicate '${directiveName}' directive. Only one ${directiveName} directive is allowed.

## Remediation

Remove duplicate '${directiveName}' directive. Keep only the first occurrence.

## Examples

### Invalid

```archlex
provider: aws
provider: gcp
```

### Valid

```archlex
provider: aws
```

---

[← Back to Error Codes](index.md)
