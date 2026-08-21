import type { RelationshipDefinition } from "@archlex/model";

type K8sRelationshipRuleTag = "ingress-route";

type K8sRelationshipDeclaration = RelationshipDefinition & {
  readonly ruleTags?: readonly K8sRelationshipRuleTag[];
};

const K8S_RELATIONSHIP_DECLARATIONS: readonly K8sRelationshipDeclaration[] = [
  {
    kind: "targets",
    displayName: "Targets",
    providerSpecific: true,
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
    ruleTags: ["ingress-route"],
    displayName: "Routes",
    documentation: "An Ingress routes traffic to a Service.",
    allowedSources: ["ingress"],
    allowedTargets: ["service"],
  },
  {
    kind: "mounts",
    displayName: "Mounts",
    providerSpecific: true,
    documentation: "A workload mounts storage or configuration.",
    allowedSources: [
      "pod",
      "deployment",
      "replicaset",
      "replicationcontroller",
      "statefulset",
      "daemonset",
      "job",
      "cronjob",
    ],
    allowedTargets: ["persistentvolumeclaim", "volume", "configmap", "secret"],
  },
  {
    kind: "binds",
    displayName: "Binds",
    providerSpecific: true,
    documentation: "A PersistentVolumeClaim binds to a PersistentVolume.",
    allowedSources: ["persistentvolumeclaim"],
    allowedTargets: ["persistentvolume"],
  },
  {
    kind: "scales",
    displayName: "Scales",
    providerSpecific: true,
    documentation: "A HorizontalPodAutoscaler scales a workload.",
    allowedSources: ["horizontalpodautoscaler"],
    allowedTargets: [
      "deployment",
      "replicaset",
      "replicationcontroller",
      "statefulset",
    ],
  },
  {
    kind: "schedules-on",
    displayName: "Schedules on",
    providerSpecific: true,
    documentation: "A Pod is scheduled onto a Node.",
    allowedSources: ["pod"],
    allowedTargets: ["node"],
  },
];

export const K8S_RELATIONSHIPS: readonly RelationshipDefinition[] =
  K8S_RELATIONSHIP_DECLARATIONS.map(
    ({ ruleTags: _ruleTags, ...definition }) => definition,
  );

export function matchesK8sRelationshipRule(
  kind: string | undefined,
  ruleTag: K8sRelationshipRuleTag,
): boolean {
  if (!kind) return false;
  const declaration = K8S_RELATIONSHIP_DECLARATIONS.find(
    (relationship) => relationship.kind === kind,
  );
  return (
    declaration?.ruleTags?.some((candidate) => candidate === ruleTag) ?? false
  );
}
