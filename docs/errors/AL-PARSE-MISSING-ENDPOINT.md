---
title: AL-PARSE-MISSING-ENDPOINT
description: "AL-PARSE-MISSING-ENDPOINT — ArchLex parse error: Expected relationship endpoint after arrow operator Causes and how to fix it."
---

# AL-PARSE-MISSING-ENDPOINT

**Severity:** error  
**Category:** parse

## Description

Expected relationship endpoint after arrow operator

## Remediation

Add a service identifier after the arrow operator. Valid services: lambda, rds, s3, ec2, etc.

## Examples

### Invalid

```archlex
lambda ->
```

### Valid

```archlex
lambda -> rds
```

---

[← Back to Error Codes](index.md)
