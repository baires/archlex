---
title: AL-PARSE-002
description: "AL-PARSE-002 — ArchLex parse error: Syntax error: <details> Causes and how to fix it."
---

# AL-PARSE-002

**Severity:** error  
**Category:** parse

## Description

Syntax error: ${details}

## Remediation

Review the syntax at the indicated location and correct the error.

## Examples

### Invalid

```archlex
lambda -> rds [invalid
```

### Valid

```archlex
lambda -> rds
```

---

[← Back to Error Codes](index.md)
