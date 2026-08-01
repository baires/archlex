import type { DiagnosticCode, DiagnosticDefinition } from "./types.js";
import {
  parseDiagnostics,
  structuralDiagnostics,
  semanticDiagnostics,
} from "./categories/index.js";

const allDiagnostics = new Map<string, DiagnosticDefinition>([
  ...parseDiagnostics,
  ...structuralDiagnostics,
  ...semanticDiagnostics,
]);

export function getAllDiagnostics(): ReadonlyMap<string, DiagnosticDefinition> {
  return allDiagnostics;
}

export function getDiagnosticDefinition(
  code: DiagnosticCode
): DiagnosticDefinition | undefined {
  return allDiagnostics.get(code);
}

export { allDiagnostics as diagnosticRegistry };
