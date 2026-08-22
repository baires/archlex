# MCP 2026-07-28 Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@archlex/mcp-server` fully compliant with MCP revision `2026-07-28` for the base protocol, Streamable HTTP, subscriptions, and every capability ArchLex advertises, while preserving explicitly tested legacy-client compatibility.

**Architecture:** Keep the current MCP SDK for legacy handling, but place a version-aware protocol adapter in front of it. Modern requests are validated and dispatched statelessly by the adapter; legacy `initialize` traffic continues through the SDK. Shared tool, resource, and prompt registries keep domain behavior identical across both eras.

**Tech Stack:** TypeScript strict mode, Cloudflare Workers, `@modelcontextprotocol/sdk`, JSON-RPC 2.0, Streamable HTTP/SSE, Vitest, Wrangler, pnpm.

**Spec:** [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28), [base protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic), [versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning), [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), and [schema reference](https://modelcontextprotocol.io/specification/2026-07-28/schema).

## Global Constraints

- Modern protocol version: exactly `2026-07-28`.
- Only advertise protocol versions covered by conformance tests.
- Modern MCP is stateless. Never infer version, capabilities, identity, task, thread, or conversation from a prior request or connection.
- Every modern request MUST contain `params._meta["io.modelcontextprotocol/protocolVersion"]` and `params._meta["io.modelcontextprotocol/clientCapabilities"]`.
- Every successful modern result MUST contain `resultType: "complete"` or `resultType: "input_required"`.
- Every modern HTTP POST MUST validate `MCP-Protocol-Version`, `Mcp-Method`, and applicable `Mcp-Name` headers against the body.
- Modern `/mcp` accepts POST only. GET and DELETE return `405 Method Not Allowed`.
- `/sse` and `/messages` remain isolated legacy HTTP+SSE compatibility endpoints until intentionally removed.
- Request-scoped progress/log notifications stay on the originating response stream, never a subscription stream.
- Subscription state is scoped to the `subscriptions/listen` request, not a protocol session or global map.
- JSON Schema defaults to 2020-12 when `$schema` is absent. Unsupported explicit dialects fail gracefully.
- Do not advertise a capability, extension, notification type, or protocol version until its tests pass.
- Modern behavior MUST NOT add `logging/setLevel`, `ping`, sessions, `Mcp-Session-Id`, GET streams, `Last-Event-ID`, or SSE event IDs.
- Compliance means implementing the mandatory base protocol and all advertised capabilities. Optional icons, annotations, templates, completion, progress, and logging are not compliance prerequisites.
- Use TDD for every task and run targeted tests before its commit.

---

## Baseline and Decisions

### Current drift

- The installed SDK resolves to `1.30.0` and follows the initialization-era model; it does not expose the 2026 discovery or subscription schemas.
- `/mcp` accepts legacy `initialize`, and tests negotiate `2025-03-26`.
- Successful results do not include `resultType`.
- Required per-request `_meta` and mirrored HTTP headers are not validated.
- CORS allows only `Content-Type` and `Authorization`.
- `/sse` and `/messages` use an in-memory session map for deprecated HTTP+SSE.
- Tools, resources, and prompts are advertised without modern cacheable result envelopes.

### Decisions

1. **Use a local 2026 protocol adapter now.** Do not block on a future SDK release. Validate official 2026 shapes locally and delegate domain work to shared registries.
2. **Operate as a dual-era server.** Valid modern metadata selects 2026 behavior. `initialize` selects legacy SDK behavior. The eras never share inferred state.
3. **Keep HTTP+SSE isolated.** `/sse` and `/messages` are legacy routes, not part of modern `/mcp`.
4. **Implement mandatory behavior first.** Optional presentation and convenience features cannot be used to claim core compliance.
5. **Do not implement MCP Logging.** It is deprecated in `2026-07-28`; retain Cloudflare telemetry and plan OpenTelemetry separately.
6. **Do not implement tool-argument completion.** MCP completion applies only to prompt arguments and resource-template variables.

## Target File Structure

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Cloudflare routing, security checks, CORS, and transport entry points only |
| `src/server.ts` | Legacy SDK construction and registration |
| `src/registry.ts` | Shared definitions and callable handlers for tools, resources, and prompts |
| `src/protocol/types.ts` | Narrow local types derived from the official 2026 schema |
| `src/protocol/constants.ts` | Supported versions, metadata keys, methods, and error codes |
| `src/protocol/errors.ts` | Typed JSON-RPC errors and HTTP status mapping |
| `src/protocol/validation.ts` | JSON-RPC, metadata, version, capability, and schema validation |
| `src/protocol/http-headers.ts` | MCP header decoding, validation, CORS, and optional `x-mcp-header` checks |
| `src/protocol/results.ts` | Complete/input-required envelopes, server metadata, and cache hints |
| `src/protocol/router.ts` | Era classification and modern method dispatch |
| `src/protocol/discovery.ts` | `server/discover` result construction |
| `src/protocol/pagination.ts` | Stable opaque cursor handling |
| `src/protocol/subscriptions.ts` | Request-scoped subscription streaming and cleanup |
| `src/protocol/progress.ts` | Optional request-scoped progress emitter |
| `test/fixtures/mcp-2026.ts` | Valid metadata, headers, and expected envelopes |
| `test/protocol/*.test.ts` | Focused conformance tests |

Generated files remain generated; modify `scripts/sync-docs.mjs` rather than hand-editing `src/generated/docs-resources.ts`.

---

## Phase 0: Protocol Foundation

### Task 1: Pin the protocol contract and SDK boundary

**Files:** Modify `package.json`; create `src/protocol/types.ts`, `src/protocol/constants.ts`, `test/fixtures/mcp-2026.ts`, and `test/protocol/schema-contract.test.ts`.

**Produces:** `MODERN_PROTOCOL_VERSION`, `SUPPORTED_PROTOCOL_VERSIONS`, `ModernRequestMeta`, `ModernRequestContext`, `CompleteResult`, and `InputRequiredResult`.

- [ ] Assert the resolved SDK version and whether it exports native 2026 discovery/subscription schemas.
- [ ] Define `MODERN_PROTOCOL_VERSION = "2026-07-28"` and an ordered list containing only implemented versions.
- [ ] Define local types for request metadata, server metadata, cacheable results, discovery, subscriptions, and errors, using official schema names.
- [ ] Add valid and invalid fixtures for missing metadata, unsupported version, header mismatch, complete result, and input-required result.
- [ ] Validate fixtures against a vendored official 2026 JSON Schema; tests MUST NOT fetch it from the network.
- [ ] Pin the SDK to the tested version rather than an unbounded caret range and document the adapter boundary.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- schema-contract`.
- [ ] Commit: `test(mcp): pin 2026 protocol contract`.

### Task 2: Extract shared registries

**Files:** Create `src/registry.ts` and `src/server.ts`; modify `src/index.ts`; test `test/protocol/registry.test.ts`.

**Produces:** `listTools()`, `callTool(name, args, context)`, `listResources()`, `readResource(uri)`, `listPrompts()`, and `getPrompt(name, args)`.

- [ ] Snapshot current tool order/schemas, resource URIs, prompt names, and successful domain results.
- [ ] Move declarations and callable domain behavior from `createMcpServer()` into `registry.ts` without changing public behavior.
- [ ] Move legacy SDK setup to `server.ts` and delegate to the shared registry.
- [ ] Reduce `index.ts` to Worker routing and security responsibilities.
- [ ] Run the existing server tests plus registry parity tests.
- [ ] Commit: `refactor(mcp): share protocol registries`.

### Task 3: Implement errors and result envelopes

**Files:** Create `src/protocol/errors.ts`, `src/protocol/results.ts`, and `test/protocol/results.test.ts`.

**Produces:** `McpProtocolError`, `completeResult(payload, context, cache?)`, `inputRequiredResult(payload, context)`, and `toHttpErrorResponse(error, id)`.

- [ ] Test JSON-RPC codes `-32700`, `-32600` through `-32603` and MCP codes `-32020`, `-32021`, `-32022`.
- [ ] Require `resultType: "complete"` and server identity at `_meta["io.modelcontextprotocol/serverInfo"]` on complete results.
- [ ] Require `resultType: "input_required"` on interim results and prohibit cache hints on them.
- [ ] Validate MRTR `inputRequests`, `requestState`, and retry `inputResponses`; correlate responses by input-request ID and reject duplicate, unknown, or wrong-kind responses with `-32602`.
- [ ] Before producing an input request, require the matching client capability and return `-32021` when it was not declared.
- [ ] Map malformed modern metadata/version/header errors to 400, unknown methods to 404, invalid Origin to 403, and accepted notifications to 202 with no body.
- [ ] Make cache fields mandatory whenever `completeResult` is called for a cacheable operation.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- results`.
- [ ] Commit: `feat(mcp): add modern result envelopes`.

---

## Phase 1: Modern Request and Transport Compliance

### Task 4: Validate request metadata, schemas, and versions

**Files:** Create `src/protocol/validation.ts` and `test/protocol/validation.test.ts`.

**Produces:** `validateModernRequest(message): ModernRequestContext` and `requireClientCapabilities(context, paths)`.

- [ ] Require protocol version and client capabilities on every request, including `server/discover`.
- [ ] Return JSON-RPC `-32602` and HTTP 400 for missing required metadata.
- [ ] Return `-32022`, HTTP 400, `data.supported`, and `data.requested` for unsupported versions.
- [ ] Return `-32021`, HTTP 400, and `data.requiredCapabilities` when a required capability is absent.
- [ ] Treat `clientInfo` as optional and informational; never use it for authorization or behavior.
- [ ] Validate JSON Schema 2020-12 by default and reject unsupported explicit dialects with structured invalid params.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- validation`.
- [ ] Commit: `feat(mcp): validate modern request metadata`.

### Task 5: Enforce Streamable HTTP metadata

**Files:** Create `src/protocol/http-headers.ts`; modify `src/index.ts`; test `test/protocol/http-headers.test.ts`.

**Produces:** `validateMcpHeaders(request, message)`, `decodeMcpHeaderValue(value)`, and `modernCorsHeaders(toolDefinitions)`.

- [ ] Require and match `MCP-Protocol-Version` and `Mcp-Method` on every modern POST.
- [ ] Require and match `Mcp-Name` for `tools/call`, `resources/read`, and `prompts/get`.
- [ ] Require `Accept` to list both `application/json` and `text/event-stream`; reject an incompatible media negotiation with HTTP 406.
- [ ] Test the exact `=?base64?...?=` sentinel for non-ASCII, control-character, padded, and sentinel-shaped values.
- [ ] Return HTTP 400 and `-32020` (`HeaderMismatch`) for missing, malformed, or mismatched required headers.
- [ ] Return HTTP 404 and `-32601` for an unknown modern method.
- [ ] Allow `Accept`, `Content-Type`, `Authorization`, `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, and declared `Mcp-Param-*` headers through CORS.
- [ ] Keep `x-mcp-header` optional. If declared, validate schema placement/type and inbound header/body equality. The server MUST NOT add headers to client requests.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- http-headers`.
- [ ] Commit: `feat(mcp): enforce streamable HTTP metadata`.

### Task 6: Implement explicit dual-era routing

**Files:** Create `src/protocol/router.ts`; modify `src/index.ts` and `src/server.ts`; test `test/protocol/compatibility.test.ts`.

**Produces:** `classifyProtocolEra(message, headers)` and `handleMcpPost(request, env)`.

- [ ] Route valid modern metadata to stateless 2026 processing.
- [ ] Route `initialize` without modern metadata to legacy SDK processing and scope negotiated state only to that legacy transport.
- [ ] Ensure modern handling never reads, creates, or echoes `Mcp-Session-Id`.
- [ ] Return 405 for GET and DELETE `/mcp`.
- [ ] Keep `/sse` and `/messages` labeled and tested as deprecated compatibility routes.
- [ ] Make `/info` distinguish modern `/mcp` from deprecated endpoints.
- [ ] Test modern success, unsupported modern version, legacy initialize, legacy HTTP+SSE, and malformed ambiguous traffic.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- compatibility`.
- [ ] Commit: `feat(mcp): route modern and legacy eras explicitly`.

### Task 7: Implement `server/discover`

**Files:** Create `src/protocol/discovery.ts`; modify `src/protocol/router.ts`; test `test/protocol/discovery.test.ts`.

**Produces:** `discover(context): DiscoverResult`.

- [ ] Accept no method-specific parameters beyond standard `_meta`.
- [ ] Return `resultType: "complete"`, ordered `supportedVersions`, exact capabilities, server identity in `_meta`, instructions, `ttlMs`, and `cacheScope`.
- [ ] Derive capabilities from implemented handlers rather than duplicating flags.
- [ ] Do not return obsolete singular `protocolVersion`.
- [ ] Use public caching only when output is identical across users/environments; otherwise use private.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- discovery`.
- [ ] Commit: `feat(mcp): implement server discovery`.

---

## Phase 2: Advertised Server Features

### Task 8: Add pagination and caching

**Files:** Create `src/protocol/pagination.ts`; modify `src/protocol/router.ts` and `src/registry.ts`; test `test/protocol/pagination-cache.test.ts`.

**Produces:** `paginate(items, cursor, pageSize)` with opaque stable cursors.

- [ ] Cover first, middle, final, and invalid cursors for `tools/list`, `resources/list`, and `prompts/list`.
- [ ] Preserve deterministic tool ordering across requests and deployments.
- [ ] Add required `ttlMs` and `cacheScope` to `server/discover`, `tools/list`, `resources/list`, `resources/read`, and `prompts/list` complete results.
- [ ] Task 13 MUST use the same pagination/cache wrapper when it introduces `resources/templates/list`.
- [ ] Vary cache identity by method and every result-affecting parameter, including cursor and URI.
- [ ] Never cache results carrying `inputResponses` or `requestState`.
- [ ] Use `public` only for identical non-sensitive output; use `private` for user-, tenant-, auth-, or environment-dependent output.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- pagination-cache`.
- [ ] Commit: `feat(mcp): paginate and cache advertised results`.

### Task 9: Normalize tools, resources, and prompts

**Files:** Modify `src/registry.ts` and `src/protocol/router.ts`; test `test/protocol/server-features.test.ts`.

- [ ] Test all implemented tool, resource, and prompt methods against official message shapes.
- [ ] Ensure every successful result has `resultType: "complete"` and server metadata.
- [ ] Return resource/prompt not found as `-32602` with identifying data, not generic thrown errors.
- [ ] Validate resource URIs and tool/prompt arguments before domain execution.
- [ ] Validate tool schemas as JSON Schema 2020-12 and validate `structuredContent` against `outputSchema` when declared.
- [ ] Advertise list-change/subscribe capabilities as false or omitted until real notification support exists.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- server-features`.
- [ ] Commit: `feat(mcp): normalize server feature results`.

### Task 10: Implement request-scoped subscriptions

**Files:** Create `src/protocol/subscriptions.ts`; modify `src/protocol/router.ts`; test `test/protocol/subscriptions.test.ts`.

**Produces:** `listenForNotifications(requestId, requestedFilter, streamContext)`.

- [ ] Support filters `toolsListChanged`, `promptsListChanged`, `resourcesListChanged`, and `resourceSubscriptions`.
- [ ] Send `notifications/subscriptions/acknowledged` first.
- [ ] Set `io.modelcontextprotocol/subscriptionId` to the listen request ID on acknowledgment, all notifications, and graceful completion.
- [ ] Acknowledge only the supported subset and never emit unrequested types.
- [ ] Keep state inside the long-lived request, never the global legacy session map.
- [ ] On server shutdown, send a final `resultType: "complete"` when practical.
- [ ] On HTTP disconnect, stop and send no more messages.
- [ ] Add `X-Accel-Buffering: no` and periodic SSE comment keep-alives without SSE event IDs.
- [ ] Never send request-scoped progress/log notifications on this stream.
- [ ] If no real change-event source exists, acknowledge an empty subset and omit capability flags rather than simulating events.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- subscriptions`.
- [ ] Commit: `feat(mcp): add request-scoped subscriptions`.

### Task 11: Implement transport cancellation and timeouts

**Files:** Modify `src/protocol/router.ts`, `src/protocol/subscriptions.ts`, `src/tools/render.ts`, and `src/tools/catalog.ts`; test `test/protocol/cancellation.test.ts`.

**Produces:** An `AbortSignal` in the domain request context.

- [ ] Treat closing a modern HTTP SSE response as cancellation of only that request, clean up, and emit no later response.
- [ ] Do not expect `notifications/cancelled` on modern Streamable HTTP.
- [ ] Preserve cancellation notifications only on legacy/stdio transports that require them.
- [ ] Add abort checks between parsing, validation, icon hydration, layout, and rendering.
- [ ] Add configurable per-request and absolute maximum timeouts using the same abort path.
- [ ] Test races after completion and unknown IDs without leaks or double responses.
- [ ] Run `pnpm --filter @archlex/mcp-server test -- cancellation`.
- [ ] Commit: `feat(mcp): propagate request cancellation`.

---

## Phase 3: Optional Features

These do not block core compliance and remain unadvertised until implemented.

### Task 12: Request-scoped progress

**Files:** Create `src/protocol/progress.ts`; modify `src/tools/render.ts`; test `test/protocol/progress.test.ts`.

- [ ] Emit only when `_meta.progressToken` is present and echo the exact token.
- [ ] Deliver on the originating response stream before the final response.
- [ ] Emit monotonic `progress` with optional `total` and `message`.
- [ ] Never use `subscriptions/listen` for progress.
- [ ] Cover parsing, validation, icon hydration, layout, and rendering without overhead when disabled.

### Task 13: Resource templates and valid completion

**Files:** Create `src/resource-templates.ts` and `src/completion.ts`; modify `src/protocol/router.ts`; test `test/protocol/resource-templates.test.ts` and `test/protocol/completion.test.ts`.

- [ ] Define only real RFC 6570 resource families.
- [ ] Ship `resources/templates/list` with pagination, result type, server metadata, `ttlMs`, and `cacheScope` from day one.
- [ ] Expand templates through the same URI validation/access-control path as literal resources.
- [ ] Implement `completion/complete` only for prompt arguments and template variables.
- [ ] Declare `completions: {}` only after conformance tests pass.
- [ ] Do not implement tool argument completions; tool enums stay in JSON Schema.

### Task 14: Optional annotations and icons

**Files:** Modify `src/registry.ts` and `scripts/sync-docs.mjs`; test `test/protocol/presentation-metadata.test.ts`.

- [ ] Add annotations only where audience, priority, and modification time are accurate.
- [ ] Derive `lastModified` from source metadata or version control, never build time.
- [ ] Use same-origin HTTPS or bounded data-URI icons with accurate MIME metadata.
- [ ] Treat SVG as untrusted active content and retain a safe PNG fallback.
- [ ] Do not require every resource, prompt, or tool to have presentation metadata.

### Explicitly excluded

- `logging/setLevel` and new MCP Logging adoption.
- Tool-argument completion.
- Modern protocol sessions or `Mcp-Session-Id`.
- GET stream, `Last-Event-ID`, SSE event IDs, or resumability on `/mcp`.
- Fake list-change notifications for static registries.

---

## Phase 4: Conformance, Documentation, and Rollout

### Task 15: Build the conformance matrix

**Files:** Create `test/protocol/conformance.test.ts` and `test/protocol/transport.test.ts`; modify `test/server.test.ts`.

- [ ] Table-test every implemented 2026 method with valid metadata and headers.
- [ ] Assert every successful result has a valid `resultType`.
- [ ] Assert every advertised cacheable result has `ttlMs` and `cacheScope`.
- [ ] Assert capabilities exactly match handlers and notification support.
- [ ] Cover parse error, invalid request/params, unknown method, unsupported version, missing capability, and every header mismatch with exact code/status.
- [ ] Cover JSON and request-scoped SSE responses plus notification POST as 202/no body.
- [ ] Cover Origin, authentication, rate limiting, payload limits, and CORS with modern headers.
- [ ] Prove modern requests never create sessions or depend on prior calls.
- [ ] Test modern, dual-era, and legacy paths independently.
- [ ] Run `pnpm --filter @archlex/mcp-server test`.
- [ ] Commit: `test(mcp): cover 2026 conformance matrix`.

### Task 16: Update public documentation

**Files:** Modify `README.md`, `CHANGELOG.md`, `wrangler.json`, and repository docs found with `rg -n "mcp.archlex.dev|MCP 2026" README.md docs apps`.

- [ ] Document `/mcp` as POST-only modern Streamable HTTP.
- [ ] Label `/sse` and `/messages` as deprecated compatibility endpoints with a removal policy.
- [ ] Document request `_meta`, HTTP headers, caching, pagination, versions, and exact capabilities.
- [ ] Explain that compliance does not imply optional Logging, completion, icons, or templates.
- [ ] Publish initialization-era to per-request-metadata migration guidance.
- [ ] Source `/info`, `/health`, and discovery version from one constant.
- [ ] Run `pnpm generate-docs`, `pnpm build:docs`, and `pnpm verify:sites`.
- [ ] Commit: `docs(mcp): document 2026 protocol behavior`.

### Task 17: Verify and stage rollout

- [ ] Run `pnpm --filter @archlex/mcp-server typecheck`.
- [ ] Run `pnpm --filter @archlex/mcp-server test`.
- [ ] Run `pnpm build:mcp`.
- [ ] Run workspace `pnpm typecheck`, `pnpm test`, and `pnpm lint`.
- [ ] Run all documentation verification from Task 16.
- [ ] On staging, smoke-test discovery, list/read/get/call, subscriptions, cancellation, malformed headers, and unsupported versions.
- [ ] Smoke-test legacy initialization and HTTP+SSE separately.
- [ ] Verify Cloudflare does not buffer request-scoped or subscription SSE.
- [ ] Compare latency, error rate, CPU time, and open-stream count with production.
- [ ] Keep rollback to the previous Worker deployment available.
- [ ] Do not mark compliance complete until every mandatory definition-of-done item has automated or staging evidence.

---

## Definition of Done

### Mandatory base protocol

- [ ] `server/discover` returns supported versions, exact capabilities, identity, instructions, result type, and caching hints.
- [ ] Every modern request validates required per-request metadata.
- [ ] Every successful modern result has `resultType` and server identity metadata.
- [ ] Unsupported versions, capabilities, malformed requests, and invalid params use exact error bodies/statuses.
- [ ] Modern handling is stateless and supports unrelated requests on one connection.
- [ ] MRTR result types/retry fields are schema-valid even though current operations normally complete in one round trip.
- [ ] `subscriptions/listen` follows acknowledgment, filtering, correlation, cancellation, and graceful closure.

### Mandatory Streamable HTTP

- [ ] `/mcp` is a single POST endpoint for modern messages.
- [ ] `Accept`, protocol version, method, and applicable name headers are enforced.
- [ ] Header mismatches return 400/`-32020`; unsupported methods return 404/`-32601`.
- [ ] Accepted notifications return 202 with no body.
- [ ] Responses are one JSON object or a request-scoped SSE stream.
- [ ] Closing SSE cancels that request and stops further messages.
- [ ] Modern behavior has no session ID, GET stream, resumability, Last-Event-ID, or SSE event IDs.
- [ ] Origin, auth, payload, rate-limit, and CORS behavior covers modern headers.

### Advertised capabilities

- [ ] Tools, resources, and prompts are declared only when handlers are live.
- [ ] Tool order is deterministic and schemas are valid JSON Schema 2020-12.
- [ ] Tool output conforms to declared output schemas.
- [ ] Resource-not-found uses `-32602` with identifying data.
- [ ] Implemented list operations paginate with opaque stable cursors.
- [ ] Discovery, lists, reads, and future template lists contain required cache hints.
- [ ] List-change/subscription flags match real event support.
- [ ] Optional MCP Apps metadata is advertised only when enabled and negotiated.

### Compatibility and quality

- [ ] Modern and legacy traffic are separated by an explicit tested router.
- [ ] Deprecated routes cannot leak session semantics into modern `/mcp`.
- [ ] MCP tests, workspace checks, builds, docs generation, and site verification pass.
- [ ] Staging covers both eras and every advertised modern capability.
- [ ] README, changelog, `/info`, and deployment configuration match behavior.

## Estimated Sequence

| Phase | Scope | Estimate |
| --- | --- | --- |
| Phase 0 | Contract, registry extraction, envelopes | 2–4 days |
| Phase 1 | Metadata, headers, routing, discovery | 3–5 days |
| Phase 2 | Advertised features, subscriptions, cancellation | 3–5 days |
| Phase 3 | Optional product features | Separate follow-up; not a blocker |
| Phase 4 | Conformance, docs, staging | 2–3 days |
| **Mandatory total** | **Phases 0, 1, 2, and 4** | **10–17 days** |

If an official SDK release fully supporting `2026-07-28` is adopted and passes the same contract tests, early tasks may shrink, but no conformance requirement may be skipped.

**Last Updated:** 2026-08-22  
**Target Server Version:** `0.2.0` for mandatory compliance; optional features versioned separately  
**Plan Status:** Reviewed; ready for task-by-task execution
