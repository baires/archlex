# Kubernetes Semantics Specification

## Provider and catalog

The Kubernetes provider implements the `CloudProvider` interface from
`@archlex/model`. Its provider ID is `k8s`, its catalog version is
`2026-08-14-tier1`, and its initial catalog contains 62 resources spanning
workloads, networking, configuration, storage, autoscaling, RBAC, extensibility,
and control-plane components.

Every resource has a canonical ID, display name, shared catalog category,
unique aliases, and optional allowed containment. Unknown resources remain
renderable as generic nodes and emit `K8S-CATALOG-UNKNOWN-RESOURCE-001`; they are
never silently coerced to known Kubernetes kinds.

## Containment model

Kubernetes adds `cluster` and `namespace` to the provider-agnostic scope model.
A namespace belongs inside a cluster. Namespaced resources, including workloads,
Services, Ingresses, configuration, claims, and namespaced RBAC objects, belong
inside a namespace. Cluster-scoped resources such as Nodes, StorageClasses,
ClusterRoles, and control-plane components may be placed directly in a cluster.

```archlex
provider k8s

cluster production {
  namespace web {
    edge: ingress
    frontend: service
    app: deployment

    edge -> frontend
    frontend -> app
  }
}
```

## Icon provenance and sanitization

Bundled and CDN icons come from the Kubernetes community icon set pinned to
commit `43d6605709182dedb495a864930ece08666a1e67`. ArchLex prefers unlabeled
resource and infrastructure artwork; control-plane components use the labeled
upstream variants where those are the available canonical assets. The generated
manifest checksum is
`cb828bdc53155609238474603aa2d2db5b7fc9ef61d1d13a04eb5f4bc2b9be47`.

The icon set is offered under a choice of Apache-2.0 or CC-BY-4.0. The Kubernetes
logo remains a trademark of The Linux Foundation. Missing bundled icons may be
loaded from the jsDelivr mirror of the same immutable commit, then pass through
the shared ArchLex SVG sanitizer before rendering.

## Relationships and validation

Core structural validation runs before Kubernetes validation. Kubernetes rules
then use only facts represented in the graph; ArchLex does not infer selectors,
RBAC policy contents, storage provisioning, admission policy, or runtime state.

Initial diagnostics are:

- `K8S-CATALOG-UNKNOWN-RESOURCE-001` (info): resource kind is not in the catalog.
- `K8S-NAMESPACE-WORKLOAD-CONTAINMENT-001` (warning): a workload should be nested in a namespace.
- `K8S-NAMESPACE-CLUSTER-CONTAINMENT-001` (warning): a namespace should be nested in a cluster.
- `K8S-WORKLOAD-POD-MANAGED-001` (warning): a standalone Pod should be managed by a workload controller.
- `K8S-NETWORKING-SERVICE-TARGET-001` (warning): a Service should target a workload.
- `K8S-NETWORKING-INGRESS-TARGET-001` (warning): an Ingress should route to a Service.
- `K8S-STORAGE-PVC-UNBOUND-001` (warning): a persistent volume claim should connect to a volume.
- `K8S-RBAC-BINDING-SUBJECT-001` (warning): a role binding should connect to a subject.

`normal` preserves these severities. `strict` promotes provider warnings to
errors but leaves informational diagnostics unchanged. `off` skips Kubernetes
semantic diagnostics while retaining catalog resolution for rendering.

## Verification

Validate canonical IDs, alias uniqueness, allowed containment, icon references,
stable and unique diagnostic codes, normal/strict/off behavior, CDN pinning, and
deterministic icon generation. Re-ingesting the pinned upstream icon set must
produce byte-identical output and the same manifest checksum.
