---
title: Error Codes
description: "Complete reference of all ArchLex diagnostic codes — parse, structure, and semantic errors with remediation steps and examples."
---

# ArchLex Error Codes

ArchLex returns structured diagnostics with parse, analysis, and render results. Use each diagnostic's code, severity, source span, and remediation to show a useful correction beside the diagram source.

```typescript
const result = await archlex.render(source);

for (const diagnostic of result.diagnostics) {
  console.log(`${diagnostic.code}: ${diagnostic.message}`);
  console.log(`Fix: ${diagnostic.remediation}`);
}
```

## Diagnostic Families

| Prefix         | Stage                  | What to check                                                                          |
| -------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `AL-PARSE-*`   | Parser                 | Directive syntax, resource declarations, relationship endpoints, and block delimiters  |
| `AL-STRUCT-*`  | Structural analysis    | Duplicate IDs, missing references, invalid containment, and conflicting declarations   |
| `AWS-*`        | AWS semantics          | AWS resource names, scopes, containment, and provider relationships                    |
| `GCP-*`        | Google Cloud semantics | Google Cloud resource names, scopes, containment, and provider relationships           |
| `K8S-*`        | Kubernetes semantics   | Kubernetes resource names, cluster and namespace placement, and workload relationships |
| `CLOUDFLARE-*` | Cloudflare semantics   | Cloudflare resource placement at root or in a logical account                          |

Icon warnings report unresolved or rejected icon assets. They do not change the provider semantic rules.

## Severity

- `error` identifies source that ArchLex cannot interpret or validate as a usable graph.
- `warning` identifies a graph that ArchLex can render with a likely modeling problem.
- `info` gives provider guidance without blocking output.

ArchLex can return a partial graph or SVG with diagnostics. Check the result instead of treating a rendered SVG as proof that the source has no errors.

## Validation Modes

Set the mode with the `validation` directive or the matching API option:

```archlex
validation normal
```

| Mode     | Behavior                                                                            |
| -------- | ----------------------------------------------------------------------------------- |
| `normal` | Runs the standard structural and provider checks                                    |
| `strict` | Promotes supported advisory findings to stricter diagnostics                        |
| `off`    | Skips provider semantic rules while retaining parsing and graph construction checks |

Provider specifications describe the rules that each mode affects:
- [AWS diagnostics](/specs/aws-semantics/)
- [Google Cloud diagnostics](/specs/gcp-semantics/)
- [Kubernetes diagnostics](/specs/k8s-semantics/)
- [Cloudflare pack](/guides/cloudflare-pack/)

## Fix a Diagnostic

1. Find the diagnostic code and source span in the result.
2. Read its `remediation` field.
3. Open the code in the [error code list](#error-codes) when you need its full reference page.
4. Update the source, then render it again.

## Error Codes

Complete reference of all diagnostic codes.

### Parse

- 🔴 [AL-PARSE-001](/errors/AL-PARSE-001/) - Unexpected token '${token}'
- 🔴 [AL-PARSE-002](/errors/AL-PARSE-002/) - Syntax error: ${details}
- 🔴 [AL-PARSE-MISSING-ENDPOINT](/errors/AL-PARSE-MISSING-ENDPOINT/) - Expected relationship endpoint after arrow operator
- 🔴 [AL-PARSE-MISSING-BRACE](/errors/AL-PARSE-MISSING-BRACE/) - Expected closing brace '}' for ${scopeType} block

### Structural

- 🔴 [AL-STRUCT-DUPLICATE-ID](/errors/AL-STRUCT-DUPLICATE-ID/) - Resource '${id}' conflicts with existing declaration at ${line}:${column}
- 🔵 [AL-STRUCT-CONFLICTING-LABEL](/errors/AL-STRUCT-CONFLICTING-LABEL/) - Display label for '${id}' conflicts with previous definition
- 🔴 [AL-STRUCT-DUPLICATE-DIRECTIVE](/errors/AL-STRUCT-DUPLICATE-DIRECTIVE/) - Duplicate '${directiveName}' directive. Only one ${directiveName} directive is allowed.
- 🔴 [AL-STRUCT-LATE-DIRECTIVE](/errors/AL-STRUCT-LATE-DIRECTIVE/) - Directive '${directiveName}' must appear before all resource and relationship declarations
- 🔴 [AL-STRUCT-INVALID-DIRECTIVE](/errors/AL-STRUCT-INVALID-DIRECTIVE/) - Invalid value '${value}' for '${directiveName}' directive

### Semantic

- 🔵 [AL-SEM-UNKNOWN-RESOURCE](/errors/AL-SEM-UNKNOWN-RESOURCE/) - Unknown service type '${serviceKind}' for provider '${provider}'
- 🔵 [AL-SEM-UNKNOWN-RELATIONSHIP](/errors/AL-SEM-UNKNOWN-RELATIONSHIP/) - Unknown relationship type '${relationshipKind}' between '${leftKind}' and '${rightKind}'
- 🔵 [AL-SEM-EMPTY-GRAPH](/errors/AL-SEM-EMPTY-GRAPH/) - Document contains no resources or relationships

