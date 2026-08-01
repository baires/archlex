# CM-PARSE-MISSING-BRACE

**Severity:** error  
**Category:** parse

## Description

Expected closing brace '}' for ${scopeType} block

## Remediation

Add closing brace '}' to complete the ${scopeType} block started at line ${startLine}.

## Examples

### Invalid

```cloudmer
vpc my-vpc {
  lambda

```

### Valid

```cloudmer
vpc my-vpc {
  lambda
}
```

---

[← Back to Error Codes](index.md)
