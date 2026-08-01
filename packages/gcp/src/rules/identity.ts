import type { CloudGraph, Diagnostic } from "@archlex/model";
import { GCP_DIAGNOSTIC_CODES } from "../registry.js";

/**
 * Tier 2: Identity & Security Rules
 */

/**
 * IAP should be configured with valid backend services
 */
export const iapBackendRule = {
  code: GCP_DIAGNOSTIC_CODES.IAP_BACKEND,
  severity: "info" as const,
  summary:
    "Identity-Aware Proxy should be configured with valid backend services.",
  validate(graph: CloudGraph): readonly Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const iap = graph.nodes.filter(
      (n) => n.serviceKind.toLowerCase() === "iap",
    );

    for (const proxy of iap) {
      const backendEdges = graph.edges.filter(
        (e) =>
          e.source === proxy.id &&
          (e.label?.toLowerCase() === "proxies" ||
            e.label?.toLowerCase() === "routes"),
      );

      if (backendEdges.length === 0) {
        diagnostics.push({
          code: GCP_DIAGNOSTIC_CODES.IAP_BACKEND,
          severity: "info",
          message: `Identity-Aware Proxy '${proxy.label}' should protect backend services.`,
          span: proxy.span,
          elements: [proxy.id],
          remediation:
            "Add connections to backend services (Cloud Run, GKE, Compute Engine) that IAP protects.",
        });
      }
    }

    return diagnostics;
  },
};
