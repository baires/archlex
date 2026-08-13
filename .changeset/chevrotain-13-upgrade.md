---
"@archlex/parser": minor
---

Upgrade chevrotain from `^11.0.2` to `^13.2.0`. Chevrotain 13 drops its runtime dependency on `lodash-es`, removing the vulnerable `lodash-es@4.17.23` (GHSA-r5fr-rjxr-66jc, GHSA-f23m-r3pf-42rh) from the dependency tree installed by consumers of `@archlex/parser`. Unavailable token/CST location values now use chevrotain 13's `-1` sentinel (previously `NaN`); this is handled internally and the public API is unchanged.
