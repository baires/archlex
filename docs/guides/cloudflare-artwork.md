---
title: Cloudflare Artwork Research
description: "Official SVG provenance, distribution requirements, and the unresolved permission gate for the planned Cloudflare provider."
---

# Cloudflare artwork research

Research date: 2026-09-29 (America/Sao_Paulo).
CF01 evidence is prepared. Official artwork distribution remains blocked; this
document does not establish permission to ship the assets.

## Official source

The preferred source is Cloudflare's public `cloudflare-docs` repository,
`src/icons/*.svg`, pinned at commit
`48f601bf4293fa9032505f858656d0db5b559131`. The source tree contains 126 SVGs.
Cloudflare's [icon documentation](https://developers.cloudflare.com/style-guide/build-the-page/components/icons/)
identifies this directory as its product-icon source. It also contains navigation
and documentation icons, so not every file represents an architecture resource.

- [Pinned icon directory](https://github.com/cloudflare/cloudflare-docs/tree/48f601bf4293fa9032505f858656d0db5b559131/src/icons)
- [Pinned README legal notices](https://github.com/cloudflare/cloudflare-docs/blob/48f601bf4293fa9032505f858656d0db5b559131/README.md#license-and-legal-notices)
- [Pinned content license](https://github.com/cloudflare/cloudflare-docs/blob/48f601bf4293fa9032505f858656d0db5b559131/LICENSE)
- [Pinned code license](https://github.com/cloudflare/cloudflare-docs/blob/48f601bf4293fa9032505f858656d0db5b559131/LICENSE-CODE)

The immutable revision, rather than the moving `production` branch, is the
reproducibility anchor. Its Git commit timestamp is 2026-09-30 01:08:49 UTC,
which is 2026-09-29 22:08:49 in the research timezone.

## Evidence and distribution decision

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| Repository README | Content is CC BY 4.0 and code is MIT, except where otherwise noted | Whether every SVG should be treated as code; trademark rights |
| Content LICENSE | Copyright reuse conditions, including attribution and marking adaptations | Permission to use protected logos/trademarks |
| LICENSE-CODE | MIT conditions for repository code | A blanket declaration that product artwork is MIT code |
| Cloudflare trademark guidelines | Text references are permitted within stated conditions; logo use generally requires written permission | Specific permission for this icon pack, npm redistribution, or modified SVG presentation |

The README explicitly reserves trademark rights outside its licenses.
Cloudflare's [trademark guidelines](https://www.cloudflare.com/trademark/)
cover commercial, educational, and reference materials and generally require
written permission for logos. Whether particular product pictograms are covered
needs clarification; do not assume every pictogram is a logo, or that every
pictogram is exempt.

Decision: **copyright terms are identified; artwork classification and trademark
authorization for this distribution are unresolved**. Do not bundle source SVGs,
generated artwork, or publish an official-artwork package until an applicable
basis is established. Metadata inventory and topology specification can proceed.
No Cloudflare provider or artwork has shipped through this work.

## Required clarification

Prepare these questions for a human to resolve with Cloudflare or qualified
counsel. No message has been sent on the user's behalf.

1. Are the selected product SVGs licensed as CC BY 4.0 content or MIT code?
   Are there per-asset exceptions or alternative architecture assets with
   explicit distribution terms?
2. May ArchLex redistribute these selected SVGs and derived sanitized fragments
   in a public repository, public npm package, browser bundle, and user-exported
   diagrams identifying Cloudflare products?
3. Does that use require separate trademark permission? What attribution,
   non-endorsement language, sizing, inherited-color treatment, or other
   modification constraints apply?

Clearance requires an attributable terms reference or written clarification
covering the selected assets and intended distribution, with any restrictions
recorded here. Silence, a public download URL, or the repository code license
alone is not recorded clearance. If clearance fails, revisit the user-required
official-artwork scope before proposing a substitute.

## Repository and npm notice requirements

After rights are established, preserve the applicable copyright/creator notices,
source URLs, immutable revision, license reference/text as required, and a record
of modifications. CC BY content requires appropriate attribution, a license
link, and an indication of changes; MIT-covered material requires its copyright
and permission notice in copies or substantial portions. Asset-specific terms
and any authorization can add requirements.

Keep ArchLex's software license distinct from the artwork license. Package
`NOTICE`/license files must survive the npm `files` allowlist and browser
distribution process. Inspect the actual tarball in CF24. Determine exported
diagram attribution from the established asset terms rather than assuming npm
notices alone cover every output. Do not imply Cloudflare endorsement.

## Research integrity

SHA-256 digests of the retrieved pinned legal files:

| File | SHA-256 |
| --- | --- |
| README.md | `72af7df8c677e936f1dbde38d3e8609d37e25696988f2079a8812cc0498f8f06` |
| LICENSE | `9e5f1b3c610b9c2da5c313bf81d577a7d1acec686bdb0384edefa6df0f90cd94` |
| LICENSE-CODE | `246b89de9b9621800e31db8422c53fdcb41b942a0cc1f7733dc6736fe49e6670` |

The dashboard sprite was not a usable research source: its supplied URL returned
HTTP 403 during the earlier investigation. Its contents and license are
unverified; it is not the source for this inventory.
