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

Saving the same source again reuses its share link and refreshes the 30-day
expiry. Editing the source creates a separate link, so older links remain
snapshots of their original source.

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

The body is `{ "source": "..." }` only. The response returns the id and the
three URLs:

```json
{
  "id": "…",
  "playgroundUrl": "https://share.archlex.dev/s/…",
  "svgUrl": "https://share.archlex.dev/s/….svg",
  "pngUrl": "https://share.archlex.dev/s/….png"
}
```

## Expiry and limits

- Shares expire after 30 days. Expired ids return 404 and are deleted.
- Source is capped at 100,000 characters; request bodies are capped at 400,000 bytes while streaming.
- Each IP can submit 30 POSTs per hour, with edge burst limits of 10 POSTs per minute and 30 image renders per minute.
- All clients, including MCP service-token requests, share a daily limit of 1,000 POSTs and 10 MiB of submitted source bytes.
- SVG and PNG responses are cached only until the share's expiration.
- Errors return `{ "error": "<code>" }` with status 400, 404, 413, 429, or
  503.

## Security

Shares are public and unauthenticated. Anyone with the link can view the
diagram and read its source. Do not put secrets, credentials, or confidential
topology in a share — keep them out of the `.arch` file the same way you keep
them out of any file you commit.

Served SVG is sanitized and sandboxed
(`Content-Security-Policy: default-src 'none'; sandbox`), so a share cannot run
script in the page that embeds it.
