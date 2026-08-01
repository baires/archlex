import {
  parseDiagnostics,
  semanticDiagnostics,
  structuralDiagnostics,
} from "./categories/index.js";
import type { DiagnosticCode, DiagnosticDefinition } from "./types.js";

const allDiagnostics = new Map<string, DiagnosticDefinition>([
  ...parseDiagnostics,
  ...structuralDiagnostics,
  ...semanticDiagnostics,
]);

export function getAllDiagnostics(): ReadonlyMap<string, DiagnosticDefinition> {
  return allDiagnostics;
}

export function getDiagnosticDefinition(
  code: DiagnosticCode,
): DiagnosticDefinition | undefined {
  return allDiagnostics.get(code);
}

export const CATALOG_DIAGNOSTIC_CODES = {
  INVALID_METADATA: "CATALOG001",
  INVALID_RELATIONSHIP: "CATALOG002",
  MISSING_ICON: "CATALOG003",
  CROSS_SERVICE_INCONSISTENCY: "CATALOG004",
} as const;

export type CatalogDiagnosticCode =
  (typeof CATALOG_DIAGNOSTIC_CODES)[keyof typeof CATALOG_DIAGNOSTIC_CODES];

export { allDiagnostics as diagnosticRegistry };
