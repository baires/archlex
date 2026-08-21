---
title: Diagnostic Reference
description: "Reference for ArchLex diagnostics, including AL-PARSE and AL-STRUCT families, AWS, GCP, and K8S codes, severities, and validation modes."
---

# Diagnostic Reference

ArchLex returns structured diagnostics with parse, analysis, and render results. Use each diagnostic's code, severity, source span, and remediation to show a useful correction beside the diagram source.

```typescript
const result = await archlex.render(source);

for (const diagnostic of result.diagnostics) {
  console.log(`${diagnostic.code}: ${diagnostic.message}`);
  console.log(`Fix: ${diagnostic.remediation}`);
}
```

## Diagnostic Families

| Prefix | Stage | What to check |
| --- | --- | --- |
| `AL-PARSE-*` | Parser | Directive syntax, resource declarations, relationship endpoints, and block delimiters |
| `AL-STRUCT-*` | Structural analysis | Duplicate IDs, missing references, invalid containment, and conflicting declarations |
| `AWS-*` | AWS semantics | AWS resource names, scopes, containment, and provider relationships |
| `GCP-*` | Google Cloud semantics | Google Cloud resource names, scopes, containment, and provider relationships |
| `K8S-*` | Kubernetes semantics | Kubernetes resource names, cluster and namespace placement, and workload relationships |

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

| Mode | Behavior |
| --- | --- |
| `normal` | Runs the standard structural and provider checks |
| `strict` | Promotes supported advisory findings to stricter diagnostics |
| `off` | Skips provider semantic rules while retaining parsing and graph construction checks |

Provider specifications describe the rules that each mode affects:

- [AWS diagnostics](../specs/aws-semantics.md)
- [Google Cloud diagnostics](../specs/gcp-semantics.md)
- [Kubernetes diagnostics](../specs/k8s-semantics.md)

## Fix a Diagnostic

1. Find the diagnostic code and source span in the result.
2. Read its `remediation` field.
3. Open the code in the [generated index](index.md) when you need its full reference page.
4. Update the source, then render it again.

## Maintainer Workflow

The diagnostic registries provide the source for the generated index and `AL-*.md` pages. Regenerate those files after you add or change a registered diagnostic:

```bash
pnpm generate-docs
```

Do not edit generated pages by hand. Update the registry or generator so the next run keeps the correction.
