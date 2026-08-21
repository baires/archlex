import type { CloudGraph, Diagnostic } from "@archlex/model";
import { defineRule } from "../builder.js";
import { K8S_DIAGNOSTIC_CODES } from "../registry.js";
import { matchesK8sRelationshipRule } from "../relationships.js";
import { WORKLOAD_KINDS, resolveNodeKind } from "./util.js";

export const serviceTargetRule = defineRule({
  code: K8S_DIAGNOSTIC_CODES.SERVICE_TARGET,
  severity: "warning",
  summary: "Services should route traffic to at least one workload.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const kindByNodeId = new Map(
      graph.nodes.map((node) => [node.id, resolveNodeKind(node)]),
    );

    for (const node of graph.nodes) {
      if (resolveNodeKind(node) !== "service") continue;

      const targetsWorkload = graph.edges.some((edge) => {
        if (edge.source !== node.id && edge.target !== node.id) return false;
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const otherKind = kindByNodeId.get(otherId);
        return otherKind !== undefined && WORKLOAD_KINDS.has(otherKind);
      });

      if (!targetsWorkload) {
        diagnostics.push({
          code: K8S_DIAGNOSTIC_CODES.SERVICE_TARGET,
          severity: "warning",
          message: `Service '${node.label}' does not route to any workload.`,
          span: node.span,
          elements: [node.id],
          remediation:
            "Connect the service to a workload (e.g. deployment) it selects.",
        });
      }
    }

    return diagnostics;
  },
});

export const ingressTargetRule = defineRule({
  code: K8S_DIAGNOSTIC_CODES.INGRESS_TARGET,
  severity: "warning",
  summary: "Ingresses should route to Services, not directly to workloads.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const kindByNodeId = new Map(
      graph.nodes.map((node) => [node.id, resolveNodeKind(node)]),
    );

    for (const node of graph.nodes) {
      if (resolveNodeKind(node) !== "ingress") continue;

      let routesToService = false;
      for (const edge of graph.edges) {
        if (edge.source !== node.id && edge.target !== node.id) continue;
        // Edges typed `routes` are validated by relationshipEndpointsRule.
        if (matchesK8sRelationshipRule(edge.kind, "ingress-route")) {
          routesToService =
            routesToService ||
            kindByNodeId.get(
              edge.source === node.id ? edge.target : edge.source,
            ) === "service";
          continue;
        }
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const otherKind = kindByNodeId.get(otherId);
        if (otherKind === "service") {
          routesToService = true;
        } else if (otherKind !== undefined) {
          diagnostics.push({
            code: K8S_DIAGNOSTIC_CODES.INGRESS_TARGET,
            severity: "warning",
            message: `Ingress '${node.label}' connects to '${otherKind}' instead of a service.`,
            span: edge.span,
            elements: [node.id, otherId],
            remediation:
              "Route the ingress through a service rather than directly to a workload.",
          });
        }
      }

      if (!routesToService) {
        diagnostics.push({
          code: K8S_DIAGNOSTIC_CODES.INGRESS_TARGET,
          severity: "warning",
          message: `Ingress '${node.label}' does not route to any service.`,
          span: node.span,
          elements: [node.id],
          remediation: "Connect the ingress to the service it exposes.",
        });
      }
    }

    return diagnostics;
  },
});
