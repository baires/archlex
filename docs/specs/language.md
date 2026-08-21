---
title: Language Specification
description: "ArchLex DSL language specification, defining document structure, directives, resources, scopes, containment, and relationship syntax for cloud diagrams."
---

# Language Specification

## Document structure

ArchLex reads UTF-8 text. Newlines and semicolons separate statements. Spaces
and tabs do not affect syntax outside quoted labels. `#` and `//` start line
comments.

Identifiers begin with an ASCII letter or `_` and may contain letters, digits,
`_`, or `-`. Provider-qualified resource names use `provider.resource`, such as
`aws.rds`, `gcp.cloud-run`, or `k8s.deployment`.

Reserved words are `provider`, `direction`, `validation`, `theme`, `account`,
`region`, `vpc`, `subnet`, `cluster`, and `namespace`.

## Directives

Place directives before resources, scopes, or relationships:

```archlex
direction LR
provider aws
validation normal
theme dark
```

| Directive | Values | Default |
| --- | --- | --- |
| `provider` | A registered provider ID | Sole registered provider, otherwise required |
| `direction` | `LR`, `RL`, `TB`, `BT` | `LR` |
| `validation` | `normal`, `strict`, `off` | `normal` |
| `theme` | `light`, `dark` | `dark` |

A colon may follow a directive name. Duplicate or late directives emit a
structural diagnostic. The first valid value wins.

## Resources and identity

Declare resources by kind or assign an instance name:

```archlex
rds
primary: rds
runner: gcp.cloud-run
api: k8s.deployment
```

An implicit resource uses its kind as the local instance ID. Repeated implicit
references in one scope resolve to that instance. Use names when you need more
than one instance of a kind.

ArchLex builds stable graph IDs from the containment path and local instance ID.
Moving a declaration within the same scope does not change its identity.

## Display labels

Add a quoted label after the resource kind:

```archlex
primary: rds["Primary database"]
replica: rds["Read replica"]
primary -[replicates]-> replica
```

The renderer shows the display label, then falls back to the instance name, then
the provider display name. When the visible label differs from the provider
name, the accessible name includes both.

The first label for an instance wins. A later conflicting label emits
`AL-STRUCT-CONFLICTING-LABEL`.

## Containment

Cloud providers use account, region, VPC, and subnet scopes:

```archlex
account production {
  region us-east-1 {
    vpc application {
      subnet private-a {
        api: ecs
      }
    }
  }
}
```

Kubernetes uses cluster and namespace scopes:

```archlex
cluster production {
  namespace web {
    service: k8s.service
    app: k8s.deployment
    service -[targets]-> app
  }
}
```

The parser accepts all six scope kinds. The selected provider decides whether a
resource belongs in a scope. A closing brace ends the innermost scope.

## Relationships

```archlex
a > b
a -> b
a <- b
a <-> b
a -- b
a -.-> b
a -[writes]-> b
a ->|PostgreSQL over TLS| b
a -[writes]->|PostgreSQL over TLS| b
```

`>` abbreviates `->`. Arrow syntax controls direction and line style.
`-[kind]->` adds a machine-readable relationship kind. `->|label|` adds display
text without changing semantics.

Chains associate from left to right. `a > b > c` creates `a -> b` and `b -> c`.
Provider rules validate the resulting graph. Unknown custom kinds remain on the
edge and may produce an informational diagnostic.

Each known kind belongs to an area (`connectivity`, `data`, `events`,
`operations`, `processing`, `delivery`, `governance`, `lifecycle`, `dependency`,
`reliability`), recorded in the language metadata as
`RelationshipDefinition.area`. Providers declare the
kinds they understand together with allowed source and target services, and
warn when a typed edge violates those constraints.

Provider-owned vocabulary such as Kubernetes `targets`, `mounts`, `binds`, and
`scales` is marked `providerSpecific`. Catalog validation requires this marker
for kinds outside the core registry and requires lowercase kebab-case for every
declared provider kind. User-authored custom kinds remain supported.

## Recovery and diagnostics

The parser preserves useful partial input. It reports unknown characters,
incomplete declarations, missing endpoints, and missing braces. It resumes at a
newline, semicolon, closing brace, or statement keyword.

Recovery does not invent a provider resource or relationship. Expected source
errors return diagnostics instead of throwing.

## Editor completions

The language service provides context-aware completions for ArchLex source:

- **Resource kinds**: After `:` in a resource declaration, suggests provider-specific services filtered by current scope
- **Directive values**: After directive names, suggests valid options (`aws`, `gcp`, `k8s` for `provider`)
- **Relationship types**: After `-[` in a relationship, suggests valid relationship kinds for the source and target resources
- **Relationship targets**: After `->` in a relationship, suggests declared resource identifiers
- **Scope keywords**: Suggests `account`, `region`, `vpc`, `subnet`, `cluster`, `namespace` at statement positions

Completions use **human-readable search**: typing "elastic kubernetes" suggests Amazon EKS (`eks`), and "relational" suggests RDS and Aurora. Search terms come from catalog service names and descriptions.

Results are **semantically ranked** by:
1. Exact prefix match (typing `lam` ranks `lambda` higher)
2. Search term relevance (fuzzy match quality)
3. Relationship compatibility (valid source/target pairs)

All completions insert **canonical syntax**: lowercase kebab-case for resources (`eks`, `cloud-run`, `statefulset`) and relationships (`connects`, `writes`, `publishes`).
