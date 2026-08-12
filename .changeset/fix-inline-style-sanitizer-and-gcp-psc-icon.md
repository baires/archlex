---
"@archlex/icons-core": patch
"@archlex/icons": patch
"@archlex/gcp": patch
---

Fix SVG sanitizer stripping inline presentation styles and bundle GCP Private Service Connect icon

- Inline presentation attributes (`fill`, `stroke`, etc.) are now extracted from element `style="..."` attributes during SVG sanitization before non-allowed attributes are removed. This prevents CDN and external icons with inline styles from rendering as solid black shapes.
- Added official artwork for `gcp.private-service-connect` (`private-service-connect.svg`) to `@archlex/gcp` bundled icons catalog.
