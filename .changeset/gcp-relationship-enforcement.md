---
"@archlex/gcp": minor
---

Declare GCP relationship semantics and enforce them with kind-aware validation.

- Populate `GCP_RELATIONSHIPS` with 19 relationship definitions
  (`orchestrates`, `invokes`, `triggers`, `publishes`, `subscribes`, `reads`,
  `writes`, `streams`, `caches`, `encrypts`, `decrypts`, `proxies`,
  `monitors`, `logs`, `routes`, `attaches`, `exposes`, `fails-over-to`,
  `trusts`) including `allowedSources`/`allowedTargets` catalog constraints.
- Add `GCP-RELATIONSHIP-INVALID-ENDPOINT-001`: warns when a typed
  relationship connects GCP services that do not support the kind (promoted
  to an error in `strict` mode).
- **Behavior change**: Workflows, Eventarc, and IAP target rules now match
  the machine-readable edge `kind` (`-[kind]->`) instead of free-text edge
  labels (`|label|`).
- Keep rule-specific relationship intent as declarative tags alongside the
  provider definitions instead of duplicating kind lists in rule files.
