---
title: AL-STRUCT-INVALID-DIRECTIVE
description: "AL-STRUCT-INVALID-DIRECTIVE — ArchLex structural error: Invalid value '<value>' for '<directiveName>' directive Causes and how to fix it."
---

# AL-STRUCT-INVALID-DIRECTIVE

**Severity:** error  
**Category:** structural

## Description

Invalid value '${value}' for '${directiveName}' directive

## Remediation

Use one of the allowed values: ${allowedValues}

## Examples

### Invalid

```archlex
direction: diagonal
```

### Valid

```archlex
direction: LR
```

---

[← Back to Error Codes](index.md)
