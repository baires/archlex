import type { CloudGraph, Diagnostic } from "@archlex/model";
import { AWS_DIAGNOSTIC_CODES } from "../registry.js";
import { matchesAwsRelationshipRule } from "../relationships.js";

/**
 * Tier 2: Application Integration Rules
 */

/**
 * Step Functions should reference valid Lambda functions or ECS tasks
 */
export const stepFunctionsTargetsRule = {
  code: AWS_DIAGNOSTIC_CODES.STEP_FUNCTIONS_TARGETS,
  severity: "info" as const,
  summary:
    "Step Functions state machines should orchestrate valid Lambda functions or ECS tasks.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const stepFunctions = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "step-functions",
    );

    for (const sf of stepFunctions) {
      const orchestratesEdges = graph.edges.filter(
        (e) =>
          e.source === sf.id &&
          matchesAwsRelationshipRule(e.kind, "step-functions-target"),
      );

      if (orchestratesEdges.length === 0) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.STEP_FUNCTIONS_TARGETS,
          severity: "info",
          message: `Step Functions '${sf.label}' should orchestrate Lambda functions or ECS tasks.`,
          span: sf.span,
          elements: [sf.id],
          remediation:
            "Add connections to Lambda functions or ECS tasks that this state machine orchestrates.",
        });
      }
    }

    return diagnostics;
  },
};

/**
 * EventBridge rules should have valid targets
 */
export const eventBridgeTargetsRule = {
  code: AWS_DIAGNOSTIC_CODES.EVENTBRIDGE_TARGETS,
  severity: "info" as const,
  summary: "EventBridge rules should have valid targets configured.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const eventBridge = graph.nodes.filter(
      (n) =>
        n.serviceKind.toLowerCase() === "eventbridge" ||
        n.serviceKind.toLowerCase() === "eventbridge-scheduler",
    );

    for (const eb of eventBridge) {
      const triggerEdges = graph.edges.filter(
        (e) =>
          e.source === eb.id &&
          matchesAwsRelationshipRule(e.kind, "eventbridge-target"),
      );

      if (triggerEdges.length === 0) {
        diagnostics.push({
          code: AWS_DIAGNOSTIC_CODES.EVENTBRIDGE_TARGETS,
          severity: "info",
          message: `EventBridge '${eb.label}' should have valid targets configured.`,
          span: eb.span,
          elements: [eb.id],
          remediation:
            "Add connections to services that this EventBridge rule triggers.",
        });
      }
    }

    return diagnostics;
  },
};
