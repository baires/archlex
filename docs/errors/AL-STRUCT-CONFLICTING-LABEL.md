# AL-STRUCT-CONFLICTING-LABEL

**Severity:** info  
**Category:** structural

## Description

Display label for '${id}' conflicts with previous definition

## Remediation

Remove duplicate display label. Each resource can only have one display label.

## Examples

### Invalid

```archlex
lambda["First Label"]
lambda["Second Label"]
```

### Valid

```archlex
lambda["My Function"]
```

---

[← Back to Error Codes](index.md)
