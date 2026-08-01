import type { Diagnostic, SourceSpan } from "@cloudmer/model";

export type DiagnosticCode =
  | `CM-PARSE-${string}`
  | `CM-STRUCT-${string}`
  | `CM-SEM-${string}`;

export type DiagnosticCategory =
  | "parse"
  | "structural"
  | "semantic"
  | "architecture";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface DiagnosticExample {
  invalid: string;
  valid: string;
}

export interface DiagnosticDefinition {
  code: DiagnosticCode;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  message: string;
  remediation: string;
  examples?: DiagnosticExample;
  relatedCodes?: readonly DiagnosticCode[];
  documentationUrl?: string;
}

export interface DiagnosticContext extends Record<string, unknown> {}

export type { Diagnostic, SourceSpan };
