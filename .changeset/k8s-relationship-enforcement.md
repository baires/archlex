---
"@archlex/k8s": minor
---

Enforce declared Kubernetes relationship constraints.

- Add `K8S-RELATIONSHIP-INVALID-ENDPOINT-001`: warns when a typed
  relationship (`targets`, `routes`, `mounts`, `binds`, `scales`,
  `schedules-on`) connects resources that violate the declared
  `allowedSources`/`allowedTargets` in `K8S_RELATIONSHIPS` (promoted
  to an error in `strict` mode). Previously these constraints were only used
  for editor completion scoring.
- The ingress topology rule no longer reports edges typed `routes`; those are
  validated by the new relationship rule instead, avoiding duplicate
  diagnostics.
- Mark Kubernetes-only relationship kinds as explicit provider extensions.
