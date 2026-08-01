# ArchLex Error Codes

Complete reference of all diagnostic codes.

## Parse

- 🔴 [AL-PARSE-001](AL-PARSE-001.md) - Unexpected token '${token}'
- 🔴 [AL-PARSE-002](AL-PARSE-002.md) - Syntax error: ${details}
- 🔴 [AL-PARSE-MISSING-ENDPOINT](AL-PARSE-MISSING-ENDPOINT.md) - Expected relationship endpoint after arrow operator
- 🔴 [AL-PARSE-MISSING-BRACE](AL-PARSE-MISSING-BRACE.md) - Expected closing brace '}' for ${scopeType} block

## Structural

- 🔴 [AL-STRUCT-DUPLICATE-ID](AL-STRUCT-DUPLICATE-ID.md) - Resource '${id}' conflicts with existing declaration at ${line}:${column}
- 🔵 [AL-STRUCT-CONFLICTING-LABEL](AL-STRUCT-CONFLICTING-LABEL.md) - Display label for '${id}' conflicts with previous definition
- 🔴 [AL-STRUCT-DUPLICATE-DIRECTIVE](AL-STRUCT-DUPLICATE-DIRECTIVE.md) - Duplicate '${directiveName}' directive. Only one ${directiveName} directive is allowed.
- 🔴 [AL-STRUCT-LATE-DIRECTIVE](AL-STRUCT-LATE-DIRECTIVE.md) - Directive '${directiveName}' must appear before all resource and relationship declarations
- 🔴 [AL-STRUCT-INVALID-DIRECTIVE](AL-STRUCT-INVALID-DIRECTIVE.md) - Invalid value '${value}' for '${directiveName}' directive

## Semantic

- 🔵 [AL-SEM-UNKNOWN-RESOURCE](AL-SEM-UNKNOWN-RESOURCE.md) - Unknown service type '${serviceKind}' for provider '${provider}'
- 🔵 [AL-SEM-UNKNOWN-RELATIONSHIP](AL-SEM-UNKNOWN-RELATIONSHIP.md) - Unknown relationship type '${relationshipKind}' between '${leftKind}' and '${rightKind}'
- 🔵 [AL-SEM-EMPTY-GRAPH](AL-SEM-EMPTY-GRAPH.md) - Document contains no resources or relationships

