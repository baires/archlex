# CloudMer Language Specification

## Lexical rules

Documents are UTF-8. Newlines or semicolons separate statements. Spaces and tabs are insignificant outside labels. Identifiers start with an ASCII letter or `_` and continue with letters, digits, `_`, or `-`. Qualified types use `provider.service`. Keywords are lowercase and reserved. `#` and `//` begin line comments. Double-quoted strings support `\"`, `\\`, `\n`, `\r`, and `\t`.

Reserved words are `provider`, `direction`, `validation`, `account`, `region`, `vpc`, and `subnet`. IDs are case-sensitive; only provider aliases receive provider-defined normalization.

## Directives

Directives occur at document scope before declarations or relationships and may appear once:

```cloudmer
provider aws
direction LR
validation normal
```

`direction` accepts `LR`, `RL`, `TB`, or `BT` and defaults to `LR`. `validation` accepts `normal`, `strict`, or `off` and defaults to `normal`. A duplicate or late directive emits a structural error; the first valid value wins.

## Resources and identity

```cloudmer
rds
aws.rds
primary: rds
replica: aws.rds
```

An implicit resource uses its type as local instance ID. Repeated implicit occurrences in one scope refer to one instance. Multiple instances of one type require names. References resolve lexically from the current scope outward. Duplicate IDs emit `CM-STRUCT-DUPLICATE-ID`; the first declaration owns the ID and later declarations remain invalid recovered nodes.

Stable graph IDs contain containment path plus local instance ID, not source offsets. Reordering within a scope does not change identity.

## Display labels

Any resource may carry a quoted display label after its kind:

```cloudmer
primary: rds["Primary DB"]
replica: rds["Read Replica"]
sqs["Ingest Queue"]
primary -[replicates]-> replica
```

The label replaces the default card text: the visible label is the display label when present, otherwise the instance name, otherwise the service display name. The service name remains in the node's accessible name (`"Primary DB (Amazon RDS)"`). Chain nodes accept the same syntax, so `rds["Primary"] > ecs["App"]` labels both endpoints.

The first display label encountered wins: named declarations are processed before relationships, and within one phase document order applies. A later, different label for the same instance is ignored and emits informational `CM-STRUCT-CONFLICTING-LABEL`. An empty or whitespace-only label is treated as absent.


## Containment

```cloudmer
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

The grammar accepts these nested group types for recovery; AWS rules decide semantic validity. A closing brace ends the innermost scope. Missing braces produce a parse diagnostic and close implicitly at end of file.

## Relationships

```cloudmer
a > b
a -> b
a <- b
a <-> b
a -- b
a -.-> b
a -[writes]-> b
a ->|PostgreSQL/TLS| b
a -[writes]->|PostgreSQL/TLS| b
```

`>` is sugar for `->`. Forward, reverse, bidirectional, undirected, and dotted forms preserve their shown semantics. `-[kind]->` carries a machine-readable identifier; `->|label|` carries presentation text. Labels are unquoted text up to the next unescaped `|`, or quoted strings. Chains are left-associative: `a > b > c` creates two edges. Relationship direction controls semantics and arrowheads; document direction controls placement only. Chain nodes may carry display labels: `rds["Primary"] > ecs["App"]`.

## AST and recovery

The public AST is a discriminated union of document, directive, resource, group, relationship, and invalid statement nodes. Every node carries zero-based, end-exclusive UTF-16 offsets and one-based, end-exclusive line/column positions. Synthesized tokens are marked `recovered: true`.

Chevrotain produces a private CST; a visitor constructs the public AST, expands shorthand, and preserves source spans. Recovery rules are:

- Skip and report unknown characters.
- Preserve incomplete declarations as invalid nodes.
- Create a placeholder when a relationship has one valid endpoint.
- Insert missing closing braces at end of file.
- Resume at newline, semicolon, closing brace, or a statement keyword.
- Never invent an AWS type or relationship semantic.

Expected syntax errors return `ParseResult` and never throw. Arbitrary input must terminate without an uncaught exception or recovery loop.

## Example

```cloudmer
provider aws
direction LR
validation normal

account production {
  region us-east-1 {
    vpc application {
      subnet private-a {
        api: ecs
        proxy: rds-proxy
        database: rds
      }
    }
  }
}

api -[connects]-> proxy
proxy -[connects]->|PostgreSQL/TLS| database
```
