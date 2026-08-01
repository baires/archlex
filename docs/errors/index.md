# CloudMer Error Codes

Complete reference of all diagnostic codes.

## Parse

- 🔴 [CM-PARSE-001](CM-PARSE-001.md) - Unexpected token '${token}'
- 🔴 [CM-PARSE-002](CM-PARSE-002.md) - Syntax error: ${details}
- 🔴 [CM-PARSE-MISSING-ENDPOINT](CM-PARSE-MISSING-ENDPOINT.md) - Expected relationship endpoint after arrow operator
- 🔴 [CM-PARSE-MISSING-BRACE](CM-PARSE-MISSING-BRACE.md) - Expected closing brace '}' for ${scopeType} block

## Structural

- 🔴 [CM-STRUCT-DUPLICATE-ID](CM-STRUCT-DUPLICATE-ID.md) - Resource '${id}' conflicts with existing declaration at ${line}:${column}
- 🔵 [CM-STRUCT-CONFLICTING-LABEL](CM-STRUCT-CONFLICTING-LABEL.md) - Display label for '${id}' conflicts with previous definition
- 🔴 [CM-STRUCT-DUPLICATE-DIRECTIVE](CM-STRUCT-DUPLICATE-DIRECTIVE.md) - Duplicate '${directiveName}' directive. Only one ${directiveName} directive is allowed.
- 🔴 [CM-STRUCT-LATE-DIRECTIVE](CM-STRUCT-LATE-DIRECTIVE.md) - Directive '${directiveName}' must appear before all resource and relationship declarations
- 🔴 [CM-STRUCT-INVALID-DIRECTIVE](CM-STRUCT-INVALID-DIRECTIVE.md) - Invalid value '${value}' for '${directiveName}' directive

## Semantic

- 🔵 [CM-SEM-UNKNOWN-RESOURCE](CM-SEM-UNKNOWN-RESOURCE.md) - Unknown service type '${serviceKind}' for provider '${provider}'
- 🔵 [CM-SEM-UNKNOWN-RELATIONSHIP](CM-SEM-UNKNOWN-RELATIONSHIP.md) - Unknown relationship type '${relationshipKind}' between '${leftKind}' and '${rightKind}'
- 🔵 [CM-SEM-EMPTY-GRAPH](CM-SEM-EMPTY-GRAPH.md) - Document contains no resources or relationships

