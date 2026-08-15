import type { CloudNode } from "@archlex/model";
import { resolveK8sService } from "../catalog/index.js";

/** Resolves a graph node's canonical catalog id, tolerating aliases and
 * provider-qualified kinds (`k8s.deployment`). */
export function resolveNodeKind(node: CloudNode): string | undefined {
  return resolveK8sService(node.serviceKind)?.id;
}

export const WORKLOAD_KINDS = new Set([
  "pod",
  "deployment",
  "replicaset",
  "replicationcontroller",
  "statefulset",
  "daemonset",
  "job",
  "cronjob",
]);

export const BINDING_SUBJECT_KINDS = new Set([
  "serviceaccount",
  "user",
  "group",
]);
