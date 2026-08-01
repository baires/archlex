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

export { allDiagnostics as diagnosticRegistry };
