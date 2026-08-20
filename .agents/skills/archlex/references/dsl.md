# ArchLex DSL Reference

## Document structure

- UTF-8 text. Newlines and semicolons separate statements.
- Spaces and tabs are insignificant outside quoted labels.
- `#` and `//` start line comments.
- Identifiers begin with an ASCII letter or `_` and may contain letters,
  digits, `_`, `-`.
- Reserved words: `provider`, `direction`, `validation`, `theme`, `account`,
  `region`, `vpc`, `subnet`, `cluster`, `namespace`.

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
| `provider` | `aws`, `gcp`, `k8s` | Required (unless sole registered provider) |
| `direction` | `LR`, `RL`, `TB`, `BT` | `LR` |
| `validation` | `normal`, `strict`, `off` | `normal` |
| `theme` | `light`, `dark` | `dark` |

A colon may follow a directive name. Duplicate or late directives emit a
structural diagnostic; the first valid value wins.

## Resources and identity

```archlex
rds                          # implicit: kind becomes the instance ID
primary: rds                 # named instance
runner: gcp.cloud-run        # provider-qualified kind
primary: rds["Primary DB"]   # display label
```

Repeated implicit references in one scope resolve to the same instance. Use
names when a diagram needs more than one instance of a kind. Graph IDs are
built from the containment path plus the local instance ID, so moving a
declaration within the same scope preserves identity.

## Display labels

The renderer shows the display label, then the instance name, then the
provider display name. The first label for an instance wins; a later
conflicting label emits `AL-STRUCT-CONFLICTING-LABEL`.

## Containment

Cloud providers use `account`, `region`, `vpc`, `subnet`:

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

Kubernetes uses `cluster` and `namespace`:

```archlex
cluster production {
  namespace web {
    service: k8s.service
    app: k8s.deployment
    service -[targets]-> app
  }
}
```

The parser accepts all six scope kinds; the selected provider decides whether
placement is valid.

## Relationships

| Syntax | Meaning |
| --- | --- |
| `a > b` | Shorthand forward edge (abbreviates `->`) |
| `a -> b` | Forward edge |
| `a <- b` | Reverse edge |
| `a <-> b` | Bidirectional edge |
| `a -- b` | Undirected edge |
| `a -.-> b` | Dotted forward edge |
| `a -[writes]-> b` | Machine-readable kind |
| `a ->|PostgreSQL| b` | Display label only |
| `a -[writes]->|PostgreSQL| b` | Kind + display label |

Chains associate left to right: `a > b > c` creates `a -> b` and `b -> c`.
Each operator owns the relationship that follows it.

Arrow direction affects provider semantics; the `direction` directive only
affects layout.

Unknown custom kinds are preserved on the edge and may produce an
informational diagnostic — the edge still renders.

## Errors and recovery

The parser preserves useful partial input and resumes at a newline,
semicolon, closing brace, or statement keyword. Expected source errors return
diagnostics instead of throwing. Recovery never invents resources or
relationships.

### Common parse errors and fixes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `unexpected character` near `-[` | Free text inside brackets: `-[serves static]->` | Kind is one word; move text to pipes: `-[routes]->\|serves static\|` |
| `unexpected character` on `/` or `*` | Special characters in an identifier or kind | Use a quoted label: `app: ecs["My App"]` |
| Conflicting label diagnostic | Two labels for the same instance | Keep the first; remove or unify the second |
| Unknown resource info diagnostic | Guessed service name | Query `get_cloud_catalog` for the canonical kind |
