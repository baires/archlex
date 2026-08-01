# CM-STRUCT-DUPLICATE-DIRECTIVE

**Severity:** error  
**Category:** structural

## Description

Duplicate '${directiveName}' directive. Only one ${directiveName} directive is allowed.

## Remediation

Remove duplicate '${directiveName}' directive. Keep only the first occurrence.

## Examples

### Invalid

```cloudmer
provider: aws
provider: gcp
```

### Valid

```cloudmer
provider: aws
```

---

[← Back to Error Codes](index.md)
