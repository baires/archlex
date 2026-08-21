import type { CloudGraph, Diagnostic } from "@archlex/model";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";
import { matchesGcpRelationshipRule } from "../relationships.js";

/**
 * Tier 2: Application Integration Rules
 */

/**
 * Workflows should reference valid Cloud Functions or Cloud Run services
 */
export const workflowsTargetsRule = {
  code: GCP_DIAGNOSTIC_CODES.WORKFLOWS_TARGETS,
  severity: "info" as const,
  summary:
    "Workflows should orchestrate valid Cloud Functions or Cloud Run services.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const workflows = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "workflows",
    );

    for (const wf of workflows) {
      const orchestratesEdges = graph.edges.filter(
        (e) =>
          e.source === wf.id &&
          matchesGcpRelationshipRule(e.kind, "workflows-target"),
      );

      if (orchestratesEdges.length === 0) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.WORKFLOWS_TARGETS,
          severity: "info",
          message: `Workflow '${wf.label}' should orchestrate Cloud Functions or Cloud Run services.`,
          span: wf.span,
          elements: [wf.id],
          remediation:
            "Add connections to Cloud Functions or Cloud Run services that this workflow orchestrates.",
        });
      }
    }

    return diagnostics;
  },
};

/**
 * Eventarc should have valid event sources and targets
 */
export const eventarcTargetsRule = {
  code: GCP_DIAGNOSTIC_CODES.EVENTARC_TARGETS,
  severity: "info" as const,
  summary: "Eventarc triggers should have valid event sources and targets.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const eventarc = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "eventarc",
    );

    for (const ea of eventarc) {
      const triggerEdges = graph.edges.filter(
        (e) =>
          e.source === ea.id &&
          matchesGcpRelationshipRule(e.kind, "eventarc-target"),
      );

      if (triggerEdges.length === 0) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.EVENTARC_TARGETS,
          severity: "info",
          message: `Eventarc trigger '${ea.label}' should have valid targets configured.`,
          span: ea.span,
          elements: [ea.id],
          remediation:
            "Add connections to services that this Eventarc trigger invokes.",
        });
      }
    }

    return diagnostics;
  },
};
