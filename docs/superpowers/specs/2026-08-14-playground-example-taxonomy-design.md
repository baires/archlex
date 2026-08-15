# Playground Example Taxonomy Design

## Summary

The playground's examples are currently stored as one loosely ordered array. Their
categories mix provider names with use cases, and the selector presents every item
in a single flat list. Kubernetes is also represented by only one example despite
the provider supporting workloads, networking, storage, scaling, configuration,
and RBAC resources.

The examples will remain a flat exported array for compatibility, but each entry
will gain explicit provider and use-case metadata. The selector will group entries
by provider and order use cases from foundational to advanced within each group.

## Goals

- Make examples easy to browse by AWS, Google Cloud, or Kubernetes.
- Use consistent use-case categories across providers.
- Preserve existing example IDs and the exported array API.
- Expand Kubernetes coverage with practical, semantically valid examples.
- Keep the organization typed, testable, and independent of source-text parsing.

## Non-goals

- Adding search, filtering, favorites, or a custom combobox.
- Rewriting existing architecture sources except where needed for consistent
  metadata or validation.
- Replacing the exported array with a nested catalog.
- Adding new Kubernetes resources or semantic rules.

## Data Model

`ArchitectureExample` will gain two explicit fields:

- `provider`: a closed union of `aws`, `gcp`, and `k8s`.
- `useCase`: a typed use-case label shared across providers where appropriate.

The existing `category` field will be replaced by `useCase` so categories describe
the architecture scenario rather than repeat a provider name. The array remains the
canonical example collection, which keeps selection by ID and existing consumers
simple.

Provider and use-case values will be declared centrally so rendering order does not
depend on incidental object insertion order or parsing `provider` directives from
the example source.

## Organization and Selector

The top-level order will be:

1. AWS
2. Google Cloud
3. Kubernetes

The command bar will render one native `optgroup` per provider. Within each group,
examples will progress from approachable building blocks toward broader or more
specialized architectures. Titles will remain descriptive without adding redundant
provider prefixes solely for grouping.

Native select groups preserve the current lightweight control, keyboard behavior,
and accessibility semantics without introducing a custom menu implementation.

## Kubernetes Examples

Kubernetes coverage will grow from one example to five:

1. **Microservices ingress** — Ingress routes through Services to frontend and API
   Deployments inside a namespace.
2. **Stateful application** — a Service exposes a StatefulSet that mounts a
   PersistentVolumeClaim backed by a PersistentVolume.
3. **Scheduled batch processing** — a CronJob consumes a ConfigMap and Secret.
4. **Autoscaled resilient API** — a Service targets a Deployment governed by a
   HorizontalPodAutoscaler and PodDisruptionBudget.
5. **Namespace RBAC** — a ServiceAccount receives permissions through a Role and
   RoleBinding.

Every source will use only resources already present in the Kubernetes catalog and
will be shaped to avoid actionable normal-mode semantic warnings where the existing
rules express a recommended relationship.

## Testing

Tests will verify that:

- every example has valid provider and use-case metadata;
- IDs remain unique and sources declare the matching provider;
- provider groups and their order are deterministic;
- the selector renders accessible provider groups;
- all examples render an SVG without structural errors;
- Kubernetes includes the five intended scenarios and representative resource
  coverage.

Targeted playground integration and component tests will be run first, followed by
type checking, linting, and the proportionate repository verification required by
the surrounding Kubernetes work.

## Success Criteria

- The Examples selector is visibly grouped by provider.
- Use-case labels are consistent and no longer substitute provider names for
  scenario taxonomy.
- Existing example IDs continue to resolve.
- Five useful Kubernetes examples are available and render successfully.
- Tests enforce grouping, metadata consistency, and Kubernetes coverage.
