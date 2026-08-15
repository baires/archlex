# Kubernetes Semantics

## Provider contract

Register Kubernetes with `k8sProvider()` from `@archlex/k8s` or the core
re-export. The provider ID is `k8s`, and the current catalog version is
`2026-08-14-tier1`.

The initial catalog contains 62 resources across workloads, networking,
configuration, storage, scaling, policy, RBAC, extensibility, and control-plane
components. Use `getCatalog("k8s")` to inspect IDs and aliases. Run the catalog
validation command when you update packaged data:

```bash
archlex validate --catalog
```

Unknown kinds remain visible as generic nodes and emit
`K8S-CATALOG-UNKNOWN-RESOURCE-001`.

## Containment

Kubernetes adds `cluster` and `namespace` to the shared language. Namespaces
belong inside clusters. Workloads and namespaced resources belong inside a
namespace. Cluster-scoped resources can live directly inside a cluster.

```archlex
provider k8s
validation normal

cluster production {
  namespace web {
    edge: ingress
    frontend: service
    app: deployment

    edge -[routes]-> frontend
    frontend -[targets]-> app
  }
}
```

## Icons

The package uses the Kubernetes community icon set pinned to commit
`43d6605709182dedb495a864930ece08666a1e67`. The importer prefers unlabeled
resource and infrastructure artwork. `K8S_CDN_PROVIDER` points to a jsDelivr
mirror of the same immutable commit.

The shared sanitizer processes bundled and fetched SVG before rendering. The
icon source offers Apache-2.0 or CC-BY-4.0 terms. Kubernetes trademarks remain
subject to The Linux Foundation policy.

## Semantic rules

Kubernetes currently reports:

- `K8S-NAMESPACE-WORKLOAD-CONTAINMENT-001` for workloads outside namespaces
- `K8S-NAMESPACE-CLUSTER-CONTAINMENT-001` for namespaces outside clusters
- `K8S-WORKLOAD-POD-MANAGED-001` for bare Pods
- `K8S-NETWORKING-SERVICE-TARGET-001` for Services without workloads
- `K8S-NETWORKING-INGRESS-TARGET-001` for Ingresses without Service routing
- `K8S-STORAGE-PVC-UNBOUND-001` for claims without a workload consumer
- `K8S-RBAC-BINDING-SUBJECT-001` for bindings without a subject

Rules do not infer selectors, RBAC policy contents, storage provisioning,
admission policy, or cluster runtime state.

## Validation modes

`normal` preserves provider severities. `strict` promotes warnings to errors
while keeping informational diagnostics. `off` skips Kubernetes semantic rules
but keeps catalog resolution.

## Verification

```bash
pnpm --filter @archlex/k8s test
pnpm --filter @archlex/k8s icons:check
pnpm validate:catalog
```

Tests cover all 62 canonical resources, aliases, containment, bundled and CDN
icons, diagnostic codes, and all validation modes.
