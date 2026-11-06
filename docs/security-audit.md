# ArchLex security audit

Source reviewed: `a65fe3e20bb07e8e0f0f02b665349683f9bf576c`.
Profile: standard. Scope: the whole repository, including `apps/docs` (Next 16 + Nextra static export deployed as Cloudflare Worker assets), `apps/mcp-server`, `apps/share`, `apps/playground`, `apps/landing`, `packages/*`, and `.github/workflows`.
Method: source review only. This environment cannot enforce the skill's OS sandbox (`unshare` network and mount return `EPERM`), so no target process was executed. Nothing here was confirmed by a live run. Leads that still depend on a deployed fact are `needs_validation` and have no severity.

One pass does not exhaust the repository. No prior audit ledger was available.

## Result

No confirmed vulnerability.

Two source-grounded leads remain. They are ranked by how much they would matter if the missing deployment fact goes the wrong way. They are not confirmed vulnerabilities.

| Rank | Lead                                           | Location                                          | If the missing fact confirms it                                            |
| ---- | ---------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| 1    | Rate-limit key falls back to `X-Forwarded-For` | `apps/mcp-server/src/security.ts` `getClientIp`   | A caller who can omit `CF-Connecting-IP` chooses the quota key             |
| 2    | Published MCP config counts limits per isolate | `apps/mcp-server/wrangler.json`, `checkRateLimit` | Cross-isolate traffic is not held to 60 requests per window by this config |

## Leads that need a live run

Run these only on a temporary Worker created from this repo and delete that Worker when finished. Do not send them to `mcp.archlex.dev` or any other production host.

### 1. `mcp.rate-limit/x-forwarded-for-fallback`

`getClientIp` uses `cf-connecting-ip` when that header is non-empty. A missing or empty value is falsy, so the function returns the first `x-forwarded-for` hop. `checkRateLimit` uses that string as the limiter key (`apps/mcp-server/src/security.ts` lines 154–159, 185, 200, and 217). The share Worker does not do this (`apps/share/src/security.ts` `clientIp`).

The open fact is whether any request that reaches the deployed Worker arrives without a non-empty `CF-Connecting-IP`. Cloudflare often sets that header on proxied traffic. This repository does not prove it.

Suggested fix, if a temporary run shows the fallback is reachable: key the limiter only on `CF-Connecting-IP`, and use a constant such as `unknown` when that header is missing, matching `apps/share/src/security.ts`.

Local check (function only, no network):

```bash
node --input-type=module -e "
import { getClientIp } from './apps/mcp-server/src/security.ts';
const xff = new Request('https://audit.invalid/health', { headers: { 'x-forwarded-for': '203.0.113.10, 198.51.100.1' } });
const both = new Request('https://audit.invalid/health', { headers: { 'cf-connecting-ip': '198.51.100.8', 'x-forwarded-for': '203.0.113.10' } });
console.log(getClientIp(xff), getClientIp(both));
"
```

Expected: `203.0.113.10` then `198.51.100.8`.

Temporary Worker check: deploy `apps/mcp-server` under a throwaway name, tail one ordinary `GET /health` from the owner, and record only whether `cf-connecting-ip` is present and non-empty. Treat the fallback as reachable only when that header is missing or empty. Delete the Worker after.

```bash
pnpm --filter @archlex/mcp-server exec wrangler deploy --name archlex-mcp-audit-temp
pnpm --filter @archlex/mcp-server exec wrangler tail --name archlex-mcp-audit-temp
# one owner request to the temporary host /health, then:
pnpm --filter @archlex/mcp-server exec wrangler delete --name archlex-mcp-audit-temp
```

### 2. `mcp.rate-limit/per-isolate-memory`

`apps/mcp-server/wrangler.json` declares no `ratelimits` binding and no `RATE_LIMITER`. `checkRateLimit` (`apps/mcp-server/src/index.ts` line 140, `apps/mcp-server/src/security.ts` lines 198 and 216) then uses the module-level `InMemoryRateLimiter`. The README (line 233) says that map keeps at most 10,000 keys per isolate. Line 235 says these local limits supplement platform controls that are not defined in the repo. The share Worker's rate-limit bindings do not apply to this Worker.

Suggested fix, if the temporary Worker has no deployment-wide limiter: declare a Cloudflare rate-limit binding on `archlex-mcp` and fail closed when it is missing, instead of falling through to isolate memory.

Local check:

```bash
pnpm exec vitest run apps/mcp-server/test/security.test.ts
python3 -c "import json; print('ratelimits' in json.load(open('apps/mcp-server/wrangler.json')))"
```

Expected: the security tests pass, and the Python check prints `False`.

Temporary Worker check: deploy under a throwaway name, record bindings, then delete it. Do not use the production Worker name.

```bash
pnpm --filter @archlex/mcp-server exec wrangler deploy --name archlex-mcp-audit-temp
pnpm --filter @archlex/mcp-server exec wrangler deployments status --name archlex-mcp-audit-temp
pnpm --filter @archlex/mcp-server exec wrangler delete --name archlex-mcp-audit-temp
```

Record whether a `RATE_LIMITER` binding or a zone rate-limit rule exists. Configuration inspection resolves this lead. A missing binding leaves the per-isolate map as the quota in source.

## Reviewed surfaces

- **Docs** (`apps/docs`): Next static export (`output: "export"`) served as Worker assets from `apps/docs/wrangler.jsonc`. No Worker script, middleware, or visitor-controlled HTML. JSON-LD is `JSON.stringify` of repo frontmatter. Committers can already ship MDX. Missing response headers are hardening, not a visitor bug.
- **MCP** (`apps/mcp-server`): optional bearer, documented open-by-default; AES-GCM render URLs; tool arguments bounded at 100k characters; diagram viewer accepts `postMessage` only from `window.parent` and puts SVG in an `<img>` data URL. CORS defaults to `*` without `Access-Control-Allow-Credentials`.
- **Share** (`apps/share`): 128-bit ids, hashed revoke tokens, SVG allowlist that fails closed, cache hits re-read D1, body and graph caps, edge and D1 quotas. `clientIp` does not trust `X-Forwarded-For`.
- **Playground and landing**: preview goes through `mountSvg`. `?s=` loads a share the link already names. Landing is a static Astro build. URL import is a user-started browser fetch.
- **Packages and CLI**: icon fetch is HTTPS, host-allowlisted, and `redirect: "error"`. CLI file access is the invoking OS user. Parser input on the Workers is capped before render.
- **CI**: `pull_request` jobs that read the base ref are filtered to `main`. The Dependabot changeset job runs only for `dependabot[bot]` and does not install the pull request. No tracked service-token value or private key was found. `.dev.vars` files contain origins only.

## Hardening, not findings

- Docs and landing do not set a Content-Security-Policy in the repo. There is no visitor HTML sink.
- `.github/workflows/ci.yml` interpolates `github.event.pull_request.base.ref` without quotes. The job runs only for base `main`, so the value is `main`. Quote it if that filter changes.
- `packages/cli/src/utils/output.ts` inserts `backgroundColor` and the SVG into a local Playwright page for the same OS user.

## Coverage

26 ledger units: 25 covered, 1 candidate (the MCP quota unit above), 0 deferred, 0 blocked. The final coverage critic accepted that set (`stop: true`). This is still a single pass.
