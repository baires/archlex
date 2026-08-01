import type { DiagnosticDefinition } from "../types.js";

export const structuralDiagnostics = new Map<string, DiagnosticDefinition>([
  [
    "CM-STRUCT-DUPLICATE-ID",
    {
      code: "CM-STRUCT-DUPLICATE-ID",
      category: "structural",
      severity: "error",
      message: "Resource '${id}' conflicts with existing declaration at ${line}:${column}",
      remediation: "Rename one of the resources to use a unique identifier. Each resource must have a distinct ID.",
      examples: {
        invalid: "lambda: my-func\nlambda: my-func",
        valid: "lambda: my-func-1\nlambda: my-func-2",
      },
    },
  ],
  [
    "CM-STRUCT-CONFLICTING-LABEL",
    {
      code: "CM-STRUCT-CONFLICTING-LABEL",
      category: "structural",
      severity: "error",
      message: "Display label for '${id}' conflicts with previous definition",
      remediation: "Remove duplicate display label. Each resource can only have one display label.",
      examples: {
        invalid: 'lambda["First Label"]\nlambda["Second Label"]',
        valid: 'lambda["My Function"]',
      },
    },
  ],
  [
    "CM-STRUCT-DUPLICATE-DIRECTIVE",
    {
      code: "CM-STRUCT-DUPLICATE-DIRECTIVE",
      category: "structural",
      severity: "error",
      message: "Duplicate '${directiveName}' directive. Only one ${directiveName} directive is allowed.",
      remediation: "Remove duplicate '${directiveName}' directive. Keep only the first occurrence.",
      examples: {
        invalid: "provider: aws\nprovider: gcp",
        valid: "provider: aws",
      },
    },
  ],
  [
    "CM-STRUCT-LATE-DIRECTIVE",
    {
      code: "CM-STRUCT-LATE-DIRECTIVE",
      category: "structural",
      severity: "error",
      message: "Directive '${directiveName}' must appear before all resource and relationship declarations",
      remediation: "Move '${directiveName}' directive to the top of the file, before any resources or relationships.",
      examples: {
        invalid: "lambda -> rds\nprovider: aws",
        valid: "provider: aws\nlambda -> rds",
      },
    },
  ],
  [
    "CM-STRUCT-INVALID-DIRECTIVE",
    {
      code: "CM-STRUCT-INVALID-DIRECTIVE",
      category: "structural",
      severity: "error",
      message: "Invalid value '${value}' for '${directiveName}' directive",
      remediation: "Use one of the allowed values: ${allowedValues}",
      examples: {
        invalid: "direction: diagonal",
        valid: "direction: LR",
      },
    },
  ],
]);
