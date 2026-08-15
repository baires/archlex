import type { RelationshipDefinition } from "@archlex/model";

export const K8S_RELATIONSHIPS = [
  {
    kind: "targets",
    displayName: "Targets",
    documentation: "A Service selects or targets a workload.",
    allowedSources: ["service"],
    allowedTargets: [
      "pod",
      "deployment",
      "replicaset",
      "statefulset",
      "daemonset",
    ],
  },
  {
    kind: "routes",
    displayName: "Routes",
    documentation: "An Ingress routes traffic to a Service.",
    allowedSources: ["ingress"],
    allowedTargets: ["service"],
  },
] as const satisfies readonly RelationshipDefinition[];
