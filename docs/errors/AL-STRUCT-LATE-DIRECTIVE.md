# AL-STRUCT-LATE-DIRECTIVE

**Severity:** error  
**Category:** structural

## Description

Directive '${directiveName}' must appear before all resource and relationship declarations

## Remediation

Move '${directiveName}' directive to the top of the file, before any resources or relationships.

## Examples

### Invalid

```archlex
lambda -> rds
provider: aws
```

### Valid

```archlex
provider: aws
lambda -> rds
```

---

[← Back to Error Codes](index.md)
