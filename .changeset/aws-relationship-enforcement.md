---
"@archlex/aws": minor
---

Declare AWS relationship semantics and enforce them with kind-aware validation.

- Populate `AWS_RELATIONSHIPS` with 24 relationship definitions
  (`orchestrates`, `invokes`, `triggers`, `publishes`, `subscribes`, `reads`,
  `writes`, `streams`, `caches`, `encrypts`, `decrypts`, `monitors`, `logs`,
  `traces`, `assumes-role`, `routes`, `replicates`, `builds`, `deploys`,
  `archives`, `attaches`, `exposes`, `fails-over-to`, `trusts`) including
  `allowedSources`/`allowedTargets`
  catalog constraints.
- Add `AWS-RELATIONSHIP-INVALID-ENDPOINT-001`: warns when a typed
  relationship connects AWS services that do not support the kind (promoted
  to an error in `strict` mode).
- **Behavior change**: Step Functions, EventBridge, and Kinesis Firehose
  target rules now match the machine-readable edge `kind` (`-[kind]->`)
  instead of free-text edge labels (`|label|`).
- Remove the dead `AWS-RELATIONSHIP-UNKNOWN-KIND-001` registry entry.
- Keep rule-specific relationship intent as declarative tags alongside the
  provider definitions instead of duplicating kind lists in rule files.
