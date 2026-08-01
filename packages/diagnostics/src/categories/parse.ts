import type { DiagnosticDefinition } from "../types.js";

export const parseDiagnostics = new Map<string, DiagnosticDefinition>([
  [
    "AL-PARSE-001",
    {
      code: "AL-PARSE-001",
      category: "parse",
      severity: "error",
      message: "Unexpected token '${token}'",
      remediation:
        "Check syntax at line ${line}, column ${column}. Remove or correct the unexpected token.",
      examples: {
        invalid: "lambda ->>\nrds",
        valid: "lambda -> rds",
      },
    },
  ],
  [
    "AL-PARSE-002",
    {
      code: "AL-PARSE-002",
      category: "parse",
      severity: "error",
      message: "Syntax error: ${details}",
      remediation:
        "Review the syntax at the indicated location and correct the error.",
      examples: {
        invalid: "lambda -> rds [invalid",
        valid: "lambda -> rds",
      },
    },
  ],
  [
    "AL-PARSE-MISSING-ENDPOINT",
    {
      code: "AL-PARSE-MISSING-ENDPOINT",
      category: "parse",
      severity: "error",
      message: "Expected relationship endpoint after arrow operator",
      remediation:
        "Add a service identifier after the arrow operator. Valid services: lambda, rds, s3, ec2, etc.",
      examples: {
        invalid: "lambda ->",
        valid: "lambda -> rds",
      },
    },
  ],
  [
    "AL-PARSE-MISSING-BRACE",
    {
      code: "AL-PARSE-MISSING-BRACE",
      category: "parse",
      severity: "error",
      message: "Expected closing brace '}' for ${scopeType} block",
      remediation:
        "Add closing brace '}' to complete the ${scopeType} block started at line ${startLine}.",
      examples: {
        invalid: "vpc my-vpc {\n  lambda\n",
        valid: "vpc my-vpc {\n  lambda\n}",
      },
    },
  ],
]);
