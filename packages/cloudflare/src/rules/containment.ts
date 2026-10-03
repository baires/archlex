import type { CloudGraph, Diagnostic, ValidationMode } from "@archlex/model";
import { resolveCloudflareService } from "../catalog/index.js";

export const CLOUDFLARE_DIAGNOSTIC_CODES = {
  CONTAINMENT: "CLOUDFLARE-CONTAINMENT-001",
} as const;

export function evaluateCloudflareContainment(
  graph: CloudGraph,
  mode: ValidationMode = "normal",
): readonly Diagnostic[] {
  if (mode === "off") return [];
  const forbiddenMembership = new Set(
    graph.scopes
      .filter((scope) => scope.kind !== "account" && scope.kind !== "group")
      .flatMap((scope) => scope.childrenNodeIds),
  );
  return graph.nodes
    .filter(
      (node) =>
        node.provider === "cloudflare" &&
        resolveCloudflareService(node.serviceKind) !== undefined &&
        forbiddenMembership.has(node.id),
    )
    .map(
      (node): Diagnostic => ({
        code: CLOUDFLARE_DIAGNOSTIC_CODES.CONTAINMENT,
        severity: mode === "strict" ? "error" : "warning",
        message: `Cloudflare resource '${node.id}' belongs at the root or in a logical account.`,
        span: node.span,
        elements: [node.id],
        remediation:
          "Move the Cloudflare resource to the document root or an account scope; keep origin workloads in their native scopes and connect them with edges.",
      }),
    );
}
