# CM-STRUCT-DUPLICATE-ID

**Severity:** error  
**Category:** structural

## Description

Resource '${id}' conflicts with existing declaration at ${line}:${column}

## Remediation

Rename one of the resources to use a unique identifier. Each resource must have a distinct ID.

## Examples

### Invalid

```cloudmer
lambda: my-func
lambda: my-func
```

### Valid

```cloudmer
lambda: my-func-1
lambda: my-func-2
```

---

[← Back to Error Codes](index.md)
