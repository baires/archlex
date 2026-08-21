---
"@archlex/model": minor
"@archlex/core": minor
---

Expand the core relationship vocabulary and add relationship areas.

- Add `area` to `RelationshipDefinition` (`connectivity`, `data`, `events`,
  `operations`, `processing`, `delivery`, `governance`, `lifecycle`,
  `dependency`, `reliability`) so the documentation grouping is code-driven.
- Add 11 new relationship kinds: `streams`, `stores`, `backs-up`, `restores`,
  `archives`
  (data), `notifies` (events), `provisions` (delivery), `authenticates`,
  `authorizes`, `audits`, `scans` (governance).
- Add `depends-on` and `attaches` (dependency), `exposes` (connectivity),
  `fails-over-to` (reliability), and `trusts` (governance).
- Group all core relationship metadata by area in
  `ARCHLEX_LANGUAGE_METADATA`.
- Add searchable metadata to every core relationship and expose intentional
  provider extensions through `RelationshipDefinition.providerSpecific`.
