# AL-PARSE-001

**Severity:** error  
**Category:** parse

## Description

Unexpected token '${token}'

## Remediation

Check syntax at line ${line}, column ${column}. Remove or correct the unexpected token.

## Examples

### Invalid

```archlex
lambda ->>
rds
```

### Valid

```archlex
lambda -> rds
```

---

[← Back to Error Codes](index.md)
