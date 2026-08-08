# Landing MCP Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standards-current Streamable HTTP `/mcp` endpoint and showcase it on the landing page with verified, copy-ready setup for Codex, Claude Code, Cursor, VS Code, and generic MCP clients.

**Architecture:** The Cloudflare Worker delegates `/mcp` requests to the MCP SDK's stateless Web Standards transport while retaining the existing shared server registration and legacy routes. A new static Astro component renders all client instructions, then progressively enhances them into an accessible tabbed agent console with clipboard fallbacks; Playwright exercises the real built page.

**Tech Stack:** TypeScript strict mode, Cloudflare Workers, `@modelcontextprotocol/sdk`, Astro 5, browser-native JavaScript, CSS design tokens, Vitest, Playwright, Biome, pnpm/Turborepo.

## Global Constraints

- Node.js must remain `>=22.0.0`; pnpm must remain `>=9.0.0`.
- Do not add a frontend framework or runtime dependency.
- Keep `@archlex/core` DOM-neutral.
- Never use `any`; public TypeScript APIs require explicit return types.
- Keep `/sse` and `/messages` operational for backward compatibility.
- Make `https://mcp.archlex.dev/mcp` the recommended Streamable HTTP endpoint.
- The landing page remains static and makes no runtime MCP health request.
- Supported setup views are exactly Codex, Claude Code, Cursor, VS Code, and Generic MCP.
- Reuse landing design tokens, typography, focus treatment, and reduced-motion behavior; do not add client logos or client brand colors.
- Run the repository-required verification checks before completion.

## File Structure

- `apps/mcp-server/src/index.ts`: Shared MCP registration, legacy routing, and new `/mcp` request delegation.
- `apps/mcp-server/test/server.test.ts`: Protocol-level Streamable HTTP and backward-compatibility coverage.
- `apps/mcp-server/README.md`: Package-facing endpoint and setup reference.
- `docs/guides/mcp-server.md`: User-facing transport and client setup guide.
- `apps/landing/src/config.ts`: Canonical MCP documentation URL beside existing site routes.
- `apps/landing/src/components/McpShowcase.astro`: Typed client setup data, semantic console markup, tab behavior, and copy fallback.
- `apps/landing/src/pages/index.astro`: Places MCP between capabilities and source-to-system.
- `apps/landing/src/styles/global.css`: Agent-console layout, responsive tabs, code overflow, feedback, and reduced-motion styling.
- `tests/browser/landing.spec.mjs`: Real-page content, ordering, keyboard, clipboard, fallback, responsiveness, and no-JavaScript tests.

---

### Task 1: Add the Streamable HTTP Worker endpoint

**Files:**
- Modify: `apps/mcp-server/test/server.test.ts`
- Modify: `apps/mcp-server/src/index.ts`

**Interfaces:**
- Consumes: `createMcpServer(): Server` and the existing security middleware in `fetch(request, env)`.
- Produces: `handleStreamableHttpRequest(request: Request, corsHeaders: Readonly<Record<string, string>>): Promise<Response>` and `GET|POST|DELETE https://mcp.archlex.dev/mcp`.

- [x] **Step 1: Write failing protocol tests**

Add a helper and focused suite to `apps/mcp-server/test/server.test.ts`:

```ts
const protocolVersion = "2025-03-26";

function mcpRequest(body: unknown, method = "POST"): Request {
  return new Request("https://mcp.archlex.dev/mcp", {
    method,
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": protocolVersion,
      Origin: "https://archlex.dev",
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

describe("Streamable HTTP endpoint", () => {
  it("initializes through POST /mcp", async () => {
    const response = await worker.fetch(
      mcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion,
          capabilities: {},
          clientInfo: { name: "archlex-test", version: "1.0.0" },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const data = (await response.json()) as {
      result: { protocolVersion: string; serverInfo: { name: string } };
    };
    expect(data.result.protocolVersion).toBe(protocolVersion);
    expect(data.result.serverInfo.name).toBe("archlex-mcp-server");
  });

  it("lists the four tools through stateless POST /mcp", async () => {
    const response = await worker.fetch(
      mcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    );
    const data = (await response.json()) as {
      result: { tools: { name: string }[] };
    };

    expect(data.result.tools.map((tool) => tool.name)).toEqual([
      "render_diagram",
      "validate_diagram",
      "get_cloud_catalog",
      "generate_playground_url",
    ]);
  });

  it("advertises the current and compatibility endpoints", async () => {
    const response = await worker.fetch(
      new Request("https://mcp.archlex.dev/info"),
    );
    const data = (await response.json()) as Record<string, unknown>;

    expect(data.streamable_http_endpoint).toBe("/mcp");
    expect(data.sse_endpoint).toBe("/sse");
    expect(data.messages_endpoint).toBe("/messages");
  });
});
```

Add explicit protection cases to the same suite:

```ts
it.each([
  {
    name: "invalid origin",
    request: new Request("https://mcp.archlex.dev/mcp", {
      method: "POST",
      headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
      body: "{}",
    }),
    env: { ALLOWED_ORIGINS: "https://archlex.dev" },
    status: 403,
  },
  {
    name: "missing bearer token",
    request: new Request("https://mcp.archlex.dev/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }),
    env: { MCP_AUTH_TOKEN: "secret" },
    status: 401,
  },
])("rejects $name before MCP dispatch", async ({ request, env, status }) => {
  expect((await worker.fetch(request, env)).status).toBe(status);
});

it("rejects oversized /mcp payloads", async () => {
  const response = await worker.fetch(
    new Request("https://mcp.archlex.dev/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": "524289" },
      body: "{}",
    }),
  );
  expect(response.status).toBe(413);
});

it("rejects unsupported /mcp methods through the protocol transport", async () => {
  const response = await worker.fetch(mcpRequest(undefined, "PUT"));
  expect(response.status).toBe(405);
});
```

These tests catch accidental routing around the existing protections.

- [x] **Step 2: Run the tests and verify RED**

Run:

```bash
pnpm --filter @archlex/mcp-server test -- --run test/server.test.ts
```

Expected: FAIL because `/mcp` returns `404` and `/info` omits `streamable_http_endpoint`.

- [x] **Step 3: Implement request-local Streamable HTTP handling**

In `apps/mcp-server/src/index.ts`, import the Worker-compatible transport:

```ts
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
```

Add a focused helper near `createMcpServer()`:

```ts
async function handleStreamableHttpRequest(
  request: Request,
  corsHeaders: Readonly<Record<string, string>>,
): Promise<Response> {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
```

After the shared security and payload gates and before legacy routing, delegate every `/mcp` method to the helper:

```ts
if (url.pathname === "/mcp") {
  return handleStreamableHttpRequest(request, corsHeaders);
}
```

Add `streamable_http_endpoint: "/mcp"` to `/info`. Keep `/sse` and `/messages` unchanged. The protocol tests must retain the initialize handshake and the four-tool assertion; do not bypass SDK protocol validation.

- [x] **Step 4: Run focused tests and typecheck to verify GREEN**

Run:

```bash
pnpm --filter @archlex/mcp-server test
pnpm --filter @archlex/mcp-server typecheck
```

Expected: all MCP server tests pass and TypeScript reports no errors.

- [x] **Step 5: Commit the transport**

```bash
git add apps/mcp-server/src/index.ts apps/mcp-server/test/server.test.ts
git commit -m "feat(mcp): add Streamable HTTP endpoint"
```

---

### Task 2: Update MCP endpoint and client documentation

**Files:**
- Modify: `apps/mcp-server/README.md`
- Modify: `docs/guides/mcp-server.md`

**Interfaces:**
- Consumes: the `/mcp` contract from Task 1.
- Produces: one canonical set of copy-ready client instructions used to review the landing content in Task 3.

- [x] **Step 1: Replace the recommended endpoint and preserve compatibility notes**

In both documents, make `/mcp` the first endpoint and identify `/sse` and `/messages` as legacy-compatible routes. Use these exact examples:

````markdown
### Codex

```bash
codex mcp add archlex --url https://mcp.archlex.dev/mcp
```

### Claude Code

```bash
claude mcp add --transport http archlex https://mcp.archlex.dev/mcp
```

### Cursor

```json
{
  "mcpServers": {
    "archlex": {
      "url": "https://mcp.archlex.dev/mcp"
    }
  }
}
```

### VS Code

```json
{
  "servers": {
    "archlex": {
      "type": "http",
      "url": "https://mcp.archlex.dev/mcp"
    }
  }
}
```
````

State the correct file locations: `.cursor/mcp.json` for project-scoped Cursor configuration and `.vscode/mcp.json` for project-scoped VS Code configuration. Keep the optional bearer-token documentation for private deployments.

- [x] **Step 2: Verify documentation formatting and generated-resource sync**

Run:

```bash
pnpm exec biome check apps/mcp-server/README.md docs/guides/mcp-server.md
pnpm --filter @archlex/mcp-server sync:docs
git status --short
```

Expected: Biome passes; sync completes; `apps/mcp-server/src/generated/docs-resources.ts` changes because `docs/guides/mcp-server.md` is embedded by the server.

- [x] **Step 3: Commit the documentation**

```bash
git add apps/mcp-server/README.md docs/guides/mcp-server.md apps/mcp-server/src/generated/docs-resources.ts
git commit -m "docs(mcp): recommend Streamable HTTP clients"
```

---

### Task 3: Render the MCP product pillar and verified client content

**Files:**
- Modify: `tests/browser/landing.spec.mjs`
- Modify: `apps/landing/src/config.ts`
- Create: `apps/landing/src/components/McpShowcase.astro`
- Modify: `apps/landing/src/components/Capabilities.astro`
- Modify: `apps/landing/src/components/SourceToSystem.astro`
- Modify: `apps/landing/src/pages/index.astro`

**Interfaces:**
- Consumes: the client instructions established in Task 2 and `SITE_ROUTES.docs`.
- Produces: server-rendered `#mcp` section, `[data-mcp-console]`, tabs named `Codex`, `Claude Code`, `Cursor`, `VS Code`, and `Generic MCP`, plus copy targets identified by stable element IDs.

- [x] **Step 1: Write failing content, ordering, and no-JavaScript tests**

Add to `tests/browser/landing.spec.mjs`:

```js
test("presents MCP as the fourth product pillar", async ({ page }) => {
  await page.goto("/");
  const mcp = page.locator("#mcp");

  await expect(
    mcp.getByRole("heading", { name: "Give your architecture agent cloud judgment." }),
  ).toBeVisible();
  await expect(mcp.getByRole("tab")).toHaveCount(5);
  await expect(mcp.getByText("codex mcp add archlex --url https://mcp.archlex.dev/mcp"))
    .toBeVisible();
  await expect(mcp.getByText("4 tools · AWS + GCP · no API key · playground deep links"))
    .toBeVisible();

  const sectionIds = await page.locator("main > section").evaluateAll((sections) =>
    sections.map((section) => section.id),
  );
  expect(sectionIds.indexOf("mcp")).toBeGreaterThan(sectionIds.indexOf("capabilities"));
  expect(sectionIds.indexOf("mcp")).toBeLessThan(sectionIds.indexOf("source-to-system"));
});

test("keeps every setup readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  const mcp = page.locator("#mcp");
  await expect(mcp.getByText(/codex mcp add archlex/)).toBeVisible();
  await expect(mcp.getByText(/claude mcp add --transport http archlex/)).toBeVisible();
  await expect(mcp.getByText('"mcpServers"')).toBeVisible();
  await expect(mcp.getByText('"servers"')).toBeVisible();
  await context.close();
});
```

Give the section in `Capabilities.astro` `id="capabilities"` and the section in `SourceToSystem.astro` `id="source-to-system"`. Rewrite the ordering assertion to compare those stable IDs with `mcp`.

- [x] **Step 2: Run the landing tests and verify RED**

Run:

```bash
pnpm exec playwright test --config=playwright.landing.config.mjs --grep "MCP|fourth product pillar|without JavaScript"
```

Expected: FAIL because `#mcp` and `McpShowcase.astro` do not exist.

- [x] **Step 3: Add typed client data and semantic markup**

Add `mcpDocs: `${SITE_ROUTES.docs}/guides/mcp-server`` without self-reference by defining it directly in `apps/landing/src/config.ts`:

```ts
export const SITE_ROUTES = {
  docs: "https://docs.archlex.dev",
  mcpDocs: "https://docs.archlex.dev/guides/mcp-server",
  playground: "https://playground.archlex.dev",
  github: import.meta.env.PUBLIC_GITHUB_URL?.trim() || null,
} as const;
```

Create `McpShowcase.astro` with this frontmatter contract:

```astro
---
import { SITE_ROUTES } from "../config";

interface McpClient {
  readonly id: "codex" | "claude" | "cursor" | "vscode" | "generic";
  readonly label: string;
  readonly instruction: string;
  readonly language: "bash" | "json" | "text";
  readonly setup: string;
}

const clients = [
  {
    id: "codex",
    label: "Codex",
    instruction: "Add ArchLex to the shared Codex MCP configuration.",
    language: "bash",
    setup: "codex mcp add archlex --url https://mcp.archlex.dev/mcp",
  },
  {
    id: "claude",
    label: "Claude Code",
    instruction: "Register ArchLex as a remote HTTP server.",
    language: "bash",
    setup: "claude mcp add --transport http archlex https://mcp.archlex.dev/mcp",
  },
  {
    id: "cursor",
    label: "Cursor",
    instruction: "Add this server to .cursor/mcp.json.",
    language: "json",
    setup: JSON.stringify({ mcpServers: { archlex: { url: "https://mcp.archlex.dev/mcp" } } }, null, 2),
  },
  {
    id: "vscode",
    label: "VS Code",
    instruction: "Add this server to .vscode/mcp.json.",
    language: "json",
    setup: JSON.stringify({ servers: { archlex: { type: "http", url: "https://mcp.archlex.dev/mcp" } } }, null, 2),
  },
  {
    id: "generic",
    label: "Generic MCP",
    instruction: "Use this URL in any client that supports remote Streamable HTTP.",
    language: "text",
    setup: "https://mcp.archlex.dev/mcp",
  },
] as const satisfies readonly McpClient[];

const setupPrompt = "Set up the ArchLex MCP server for this project using the official remote Streamable HTTP endpoint at https://mcp.archlex.dev/mcp. Verify the connection, list the available ArchLex tools, and tell me when it is ready. Do not change unrelated MCP servers.";
const examplePrompt = "Design a resilient AWS event ingestion system, validate it, and open the result in ArchLex Playground.";
---
```

Render `<section id="mcp" class="section section--mcp shell">`, a heading, one `role="tablist"`, five button tabs, five matching `role="tabpanel"` elements, setup `<pre><code id={`mcp-setup-${client.id}`}>`, copy buttons with `data-copy-target`, the agent prompt, example prompt, proof strip, an `aria-live="polite"` status, and a link to `SITE_ROUTES.mcpDocs`. Render every panel without `hidden`; the enhancement script in Task 4 will hide inactive panels only after initialization.

Import and place `<McpShowcase />` between `<Capabilities />` and `<SourceToSystem />` in `index.astro`.

- [x] **Step 4: Run tests and typecheck to verify GREEN**

Run:

```bash
pnpm exec playwright test --config=playwright.landing.config.mjs --grep "fourth product pillar|without JavaScript"
pnpm --filter @archlex/landing typecheck
```

Expected: the new content tests pass and Astro typechecking reports no errors.

- [x] **Step 5: Commit the server-rendered pillar**

```bash
git add apps/landing/src/config.ts apps/landing/src/components/McpShowcase.astro apps/landing/src/pages/index.astro apps/landing/src/components/Capabilities.astro apps/landing/src/components/SourceToSystem.astro tests/browser/landing.spec.mjs
git commit -m "feat(landing): add MCP product pillar"
```

---

### Task 4: Add accessible tabs and resilient copy behavior

**Files:**
- Modify: `tests/browser/landing.spec.mjs`
- Modify: `apps/landing/src/components/McpShowcase.astro`

**Interfaces:**
- Consumes: the tab, panel, copy-target, and status IDs from Task 3.
- Produces: `data-enhanced="true"`, roving `tabindex`, selected panel state, keyboard activation, Clipboard API success feedback, and selection fallback.

- [x] **Step 1: Write failing interaction tests**

Add real-browser tests:

```js
test("switches MCP clients with tabs and arrow keys", async ({ page }) => {
  await page.goto("/");
  const mcp = page.locator("#mcp");
  const codex = mcp.getByRole("tab", { name: "Codex" });
  const claude = mcp.getByRole("tab", { name: "Claude Code" });

  await expect(codex).toHaveAttribute("aria-selected", "true");
  await codex.focus();
  await page.keyboard.press("ArrowRight");
  await expect(claude).toBeFocused();
  await expect(claude).toHaveAttribute("aria-selected", "true");
  await expect(mcp.getByRole("tabpanel", { name: "Claude Code" })).toBeVisible();
  await expect(mcp.getByRole("tabpanel", { name: "Codex" })).toBeHidden();
});

test("copies setup text and announces success", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const mcp = page.locator("#mcp");
  await mcp.getByRole("button", { name: /copy codex setup/i }).click();

  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "codex mcp add archlex --url https://mcp.archlex.dev/mcp",
  );
  await expect(mcp.getByRole("status")).toHaveText(/codex setup copied/i);
});

test("selects setup text when clipboard access fails", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
  });
  await page.goto("/");
  const mcp = page.locator("#mcp");
  await mcp.getByRole("button", { name: /copy codex setup/i }).click();

  await expect(mcp.getByRole("status")).toHaveText(/selected.*copy manually/i);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toContain(
    "codex mcp add archlex",
  );
});
```

- [x] **Step 2: Run interaction tests and verify RED**

Run:

```bash
pnpm exec playwright test --config=playwright.landing.config.mjs --grep "MCP clients|copies setup|clipboard access"
```

Expected: FAIL because all panels remain visible and copy buttons have no behavior.

- [x] **Step 3: Implement progressive enhancement**

Add an inline `<script>` to `McpShowcase.astro`. Scope every query to `[data-mcp-console]`; avoid global tab or button selectors. Implement:

```ts
const consoleElement = document.querySelector<HTMLElement>("[data-mcp-console]");

if (consoleElement) {
  const tabs = Array.from(
    consoleElement.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  const panels = Array.from(
    consoleElement.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
  );
  const status = consoleElement.querySelector<HTMLElement>('[role="status"]');

  const activate = (tab: HTMLButtonElement): void => {
    for (const candidate of tabs) {
      const selected = candidate === tab;
      candidate.setAttribute("aria-selected", String(selected));
      candidate.tabIndex = selected ? 0 : -1;
    }
    for (const panel of panels) {
      panel.hidden = panel.id !== tab.getAttribute("aria-controls");
    }
  };

  consoleElement.dataset.enhanced = "true";
  activate(tabs[0]);
  // Register click plus ArrowLeft, ArrowRight, Home, and End handlers.
  // Every keyboard move calls focus() and activate() on the destination tab.
}
```

For each `[data-copy-target]` button, read `textContent` from the named target. Call `navigator.clipboard.writeText(text)` when available. On rejection or absence, create a `Range`, select the target contents with `window.getSelection()`, and announce `“<label> selected — copy manually.”` On success, announce `“<label> copied.”`, temporarily change visible button text to `Copied`, then restore it after 2 seconds. Store the original label in a local variable; do not derive it after mutation.

- [x] **Step 4: Run the interaction tests and verify GREEN**

Run:

```bash
pnpm exec playwright test --config=playwright.landing.config.mjs --grep "MCP clients|copies setup|clipboard access"
pnpm --filter @archlex/landing typecheck
```

Expected: all three interaction tests pass and TypeScript reports no errors.

- [x] **Step 5: Commit the interactions**

```bash
git add apps/landing/src/components/McpShowcase.astro tests/browser/landing.spec.mjs
git commit -m "feat(landing): enhance MCP setup console"
```

---

### Task 5: Apply the agent-console visual system and responsive behavior

**Files:**
- Modify: `tests/browser/landing.spec.mjs`
- Modify: `apps/landing/src/styles/global.css`

**Interfaces:**
- Consumes: `.mcp-showcase`, `.mcp-console`, `.mcp-tabs`, `.mcp-panel`, `.mcp-code`, `.mcp-agent-prompt`, `.mcp-proof`, and `[data-enhanced="true"]` markup classes from Task 3.
- Produces: desktop side rail, mobile scrollable tab row, contained code overflow, visible focus, and zero page-level horizontal overflow.

- [x] **Step 1: Add failing responsive assertions**

Extend the existing desktop/mobile overflow loop and add:

```js
test("adapts the MCP console for narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const mcp = page.locator("#mcp");
  const tabs = mcp.locator(".mcp-tabs");

  await expect(tabs).toHaveCSS("overflow-x", "auto");
  await expect(mcp.getByRole("tab", { name: "Generic MCP" })).toBeVisible();
  const documentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(documentOverflow).toBe(0);
});
```

- [x] **Step 2: Run the responsive test and verify RED**

Run:

```bash
pnpm exec playwright test --config=playwright.landing.config.mjs --grep "adapts the MCP console"
```

Expected: FAIL because `.mcp-tabs` has no horizontal overflow rule or console layout.

- [x] **Step 3: Implement the visual direction in `global.css`**

Add a cohesive section using existing variables:

```css
.section--mcp {
  overflow: clip;
}

.mcp-console {
  display: grid;
  grid-template-columns: minmax(11rem, 0.28fr) minmax(0, 1fr);
  margin-top: clamp(2.5rem, 4vw, 4rem);
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-panel);
  background: #0d1411;
  box-shadow: var(--shadow-raised);
}

.mcp-tabs {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-strong);
  background: #0a0f0d;
}

.mcp-tab {
  min-height: 3.5rem;
  padding: var(--space-4);
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-code);
  text-align: left;
  cursor: pointer;
}

.mcp-tab[aria-selected="true"] {
  background: var(--signal);
  color: var(--signal-contrast);
}

.mcp-panel,
.mcp-agent-prompt,
.mcp-example {
  min-width: 0;
}

.mcp-code {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
  background: #090d0b;
}

@media (max-width: 680px) {
  .mcp-console {
    grid-template-columns: minmax(0, 1fr);
  }

  .mcp-tabs {
    flex-direction: row;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border-strong);
    scrollbar-width: thin;
  }

  .mcp-tab {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}
```

Add the remaining console rules with these contracts: `.mcp-console__main` uses `padding: clamp(1.25rem, 3vw, 2.5rem)`; `.mcp-panel__bar` and `.mcp-proof` use flex wrapping with `gap: var(--space-3)`; `.mcp-copy` reuses the code-font uppercase button treatment with a `1px` border and signal-color hover; `.mcp-agent-prompt` uses a signal-colored left border; `.mcp-code pre`, `.mcp-agent-prompt pre`, and `.mcp-example pre` use `white-space: pre-wrap`, `overflow-wrap: anywhere`, and the existing code font; `[data-enhanced="true"] .mcp-panel[hidden]` uses `display: none`; and the polite status is visually hidden with the standard clipped-text technique while remaining exposed to assistive technology. Add transitions only for color and border. Inside the existing `prefers-reduced-motion: reduce` block, set transition duration to `0s` for `.mcp-tab` and `.mcp-copy`.

- [x] **Step 4: Run responsive and full landing tests to verify GREEN**

Run:

```bash
pnpm exec playwright test --config=playwright.landing.config.mjs --grep "adapts the MCP console|horizontal overflow"
pnpm exec playwright test --config=playwright.landing.config.mjs
```

Expected: the MCP responsive test and every existing landing test pass at desktop and mobile sizes.

- [x] **Step 5: Commit the visual treatment**

```bash
git add apps/landing/src/styles/global.css tests/browser/landing.spec.mjs
git commit -m "style(landing): refine MCP agent console"
```

---

### Task 6: Perform end-to-end verification and client smoke checks

**Files:**
- Modify only if verification reveals a scoped defect in the files listed above.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified Worker protocol behavior and a production-build landing section.

- [x] **Step 1: Run focused package checks**

```bash
pnpm --filter @archlex/mcp-server test
pnpm --filter @archlex/mcp-server typecheck
pnpm --filter @archlex/mcp-server build
pnpm --filter @archlex/landing typecheck
pnpm --filter @archlex/landing build
pnpm exec playwright test --config=playwright.landing.config.mjs
```

Expected: every command exits `0`; Playwright reports zero failing landing tests.

- [x] **Step 2: Smoke-test the local Worker with an SDK client**

Start the Worker in the background as required by the app instructions, then connect with the SDK's `StreamableHTTPClientTransport` to `http://127.0.0.1:8787/mcp`. Initialize, call `listTools()`, and assert the four expected names. Use a temporary script created under a `mktemp -d` directory and remove that temporary directory after the run.

Expected tool names:

```text
render_diagram
validate_diagram
get_cloud_catalog
generate_playground_url
```

- [x] **Step 3: Reconfirm client configuration shapes**

Compare the rendered production HTML with the approved literals: Codex and Claude Code must show their complete CLI commands; Cursor must use top-level `mcpServers`; VS Code must use top-level `servers` plus `type: "http"`; Generic MCP must name Streamable HTTP. This is a content review, while the SDK client smoke test in Step 2 proves endpoint compatibility.

- [x] **Step 4: Run repository-wide verification**

```bash
pnpm lint
pnpm check
git diff --check
git status --short
```

Expected: lint and check exit `0`; no whitespace errors; only intentional task files differ. Preserve the user's existing untracked `AGENTS.md` files.

- [x] **Step 5: Review the final diff against the design**

Confirm each item with direct evidence:

- `/mcp` is recommended and legacy routes remain tested.
- All five setup tabs contain the approved endpoint and client-specific shape.
- MCP appears between capabilities and source-to-system.
- Both copy paths and keyboard navigation are covered by passing tests.
- Mobile and no-JavaScript behavior are covered by passing tests.
- Documentation and `/info` agree on endpoint names.

Do not create an additional commit if the working tree is already clean. If verification requires fixes, stage only the files changed for those findings and commit them with `git commit -m "fix: resolve MCP showcase verification findings"`.
