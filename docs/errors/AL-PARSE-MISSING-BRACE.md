---
title: AL-PARSE-MISSING-BRACE
description: "AL-PARSE-MISSING-BRACE — ArchLex parse error: Expected closing brace '}' for <scopeType> block Causes and how to fix it."
---

# AL-PARSE-MISSING-BRACE

**Severity:** error  
**Category:** parse

## Description

Expected closing brace '}' for ${scopeType} block

## Remediation

Add closing brace '}' to complete the ${scopeType} block started at line ${startLine}.

## Examples

### Invalid

```archlex
vpc my-vpc {
  lambda

```

### Valid

```archlex
vpc my-vpc {
  lambda
}
```

---

[← Back to Error Codes](index.md)
