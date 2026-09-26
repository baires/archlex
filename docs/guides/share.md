---
title: Share a diagram
description: "Create short share.archlex.dev links for an ArchLex diagram: a playground link plus SVG and PNG image URLs you can paste into a README."
lastModified: 2026-09-23T08:00:00-03:00
---

# Share a diagram

A share is one short link that shows a diagram. Paste it into a README, a pull
request, or a chat and the rendered image appears. The `.arch` file stays the
canonical source; a share is a snapshot of one version of it.

GitHub does not preview `.arch` files on its own. Embed the SVG image URL to
show the diagram in Markdown.

## From the playground

In the [playground](https://playground.archlex.dev), choose **Share**. ArchLex
posts the current editor source and copies this to your clipboard:

```markdown
![Architecture diagram](https://share.archlex.dev/s/{id}.svg)

https://share.archlex.dev/s/{id}
```

The image matches the source text. Unsaved playground theme and direction
overrides are not part of the share.

Each Share action creates an independent snapshot, even when the source matches
an earlier share. The playground shows a one-time revoke token with the new
link; save it if you may need to revoke that share later. Existing shares
created before revoke tokens were added cannot be revoked. Anyone with a share
link can view the full source, so do not share confidential diagrams.

## The three URLs

Each share id has three URLs:

| URL | Result |
| --- | --- |
| `https://share.archlex.dev/s/{id}` | Opens the playground with the shared source loaded |
| `https://share.archlex.dev/s/{id}.svg` | Rendered diagram as SVG |
| `https://share.archlex.dev/s/{id}.png` | Rendered diagram as PNG |

Use the SVG (or PNG) URL in a Markdown image tag. Open the plain link to hand
someone the editable diagram.

## From the API

POST the source to create a share. No account or API key is required.

```bash
curl -X POST https://share.archlex.dev/v1/shares \
  -H "content-type: application/json" \
  -d '{"source": "provider aws\napi-gateway -[invokes]-> lambda"}'
```

The body is `{ "source": "..." }` only. Each successful create returns a new
id, the three URLs, and a one-time `revokeToken`:

```json
{
  "id": "…",
  "revokeToken": "…",
  "playgroundUrl": "https://share.archlex.dev/s/…",
  "svgUrl": "https://share.archlex.dev/s/….svg",
  "pngUrl": "https://share.archlex.dev/s/….png"
}
```

Store the token securely when the share is created. It is not returned by
subsequent reads and cannot be recovered. Revoke an active share with:

```bash
curl -X DELETE https://share.archlex.dev/v1/shares/{id} \
  -H "authorization: Bearer {revokeToken}"
```

Revocation returns `204`; the Worker purges both cached image formats, and the
id and image URLs then return 404. Image responses are not cached by browsers
or other downstream clients. Shares created before revoke tokens were
introduced cannot be revoked.

## Expiry and limits

- Shares expire after 30 days. Expired ids return 404 and are deleted.
- Source is capped at 100,000 characters and 2,000 lines; request bodies are capped at 400,000 bytes while streaming. Diagrams with more than 200 nodes, more than 400 edges, or any error diagnostic are rejected before storage.
- Public clients can submit 30 POSTs per IP per hour and 200 POSTs or 2 MiB of source per IP per UTC day. Cloudflare edge limits also allow 10 POSTs per minute, 30 image renders per minute per client IP, and 300 uncached image renders per minute globally.
- A global circuit breaker allows at most 20,000 POSTs or 200 MiB of source bytes per UTC day. This protects service capacity; normal fairness limits are per IP and service-token calls count toward both daily limits.
- The Worker caches SVG and PNG by path only for at most 24 hours and never longer than the share's remaining lifetime. Responses to clients use `Cache-Control: no-store`; query strings do not create separate Worker cache entries.
- Errors return `{ "error": "<code>" }` with status 400, 404, 413, 429, or
  503.

## Security

Shares are public and unauthenticated. Anyone with the link can view the
diagram and read its source. Do not put secrets, credentials, or confidential
topology in a share — keep them out of the `.arch` file the same way you keep
them out of any file you commit.

Served SVG is checked against an element and attribute allowlist and is
sandboxed for direct navigation
(`Content-Security-Policy: default-src 'none'; base-uri 'none'; sandbox`).
ArchLex serves it as an image. A client that fetches the SVG and inlines its
markup should apply its own sanitization before inserting it into a page.
