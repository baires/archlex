# Landing MCP Showcase

## Goal

Add a major product pillar to the ArchLex landing page that explains and enables the remote MCP server. Visitors should understand why MCP matters, configure a supported AI client without leaving the page, or copy a prompt that asks their agent to perform the setup.

The section belongs between `Capabilities` and `SourceToSystem`. This position extends the landing-page narrative from cloud-aware product proof, to AI access to that intelligence, to the underlying source-to-diagram workflow.

## Audience and scope

The primary audience is infrastructure engineers who use AI coding or chat clients and want those clients to generate, validate, inspect, and render ArchLex diagrams.

The showcase supports five setup views:

- Codex
- Claude
- Cursor
- VS Code
- Generic MCP

Only verified client instructions will appear. Each client-specific command or configuration must be checked against its current official documentation before implementation. Generic MCP will identify the ArchLex remote endpoint and transport without implying a universal configuration format.

The landing page remains static. Runtime MCP health checks, authentication flows, client detection, installation automation, and additional clients are out of scope.

## Content hierarchy

The section opens with the label `ARCHLEX × MCP`, the headline `Give your architecture agent cloud judgment.`, and supporting copy that explains the outcome:

> Connect ArchLex once. Then ask your AI to design, validate, inspect, and render AWS or GCP systems using the same semantic engine behind the playground.

The showcase closes the gap between explanation and action with three layers:

1. Exact setup instructions for the selected client.
2. A client-neutral prompt that asks an AI agent to set up ArchLex MCP.
3. An example architecture request that demonstrates what to do after setup.

The example request will use a concrete outcome such as:

> Design a resilient AWS event ingestion system, validate it, and open the result in ArchLex Playground.

A compact proof strip reinforces the server capabilities: `4 tools · AWS + GCP · no API key · playground deep links`.

## Visual direction

The section uses an “agent console” composition consistent with the landing page's dark industrial/editorial system. It reuses the shared display and code typography, green signal color, thin technical borders, raised surfaces, and restrained motion.

The console is a full-width framed surface:

- A left rail lists the five clients.
- The active client uses the signal color and strong contrast.
- The main pane presents a short client-specific instruction, a command or configuration block, and a copy control.
- A secondary bordered card presents the agent-assisted setup prompt and its own copy control.
- The proof strip and example prompt complete the console without introducing a separate card grid.

Client logos and client brand colors will not be used. Text labels keep the presentation cohesive, reduce asset overhead, and avoid making the section feel like an integration marketplace.

On narrow screens, the client rail becomes a horizontally scrollable tab row above the content. Code blocks scroll independently when required; the page itself must not gain horizontal overflow.

## Component structure

Create `apps/landing/src/components/McpShowcase.astro` and render it in `apps/landing/src/pages/index.astro` between `Capabilities` and `SourceToSystem`.

The component owns:

- A typed, immutable client configuration collection.
- The section heading and supporting copy.
- The client tab list and setup panels.
- The agent-assisted setup prompt.
- The example prompt and proof strip.
- A link to the MCP documentation for deeper reference material.

The client collection is the single source of truth for labels, setup descriptions, code content, and code language hints. This prevents tab labels and panels from drifting apart.

Section styles belong in `apps/landing/src/styles/global.css` and reuse existing design tokens. No new frontend framework or runtime dependency is needed.

## Interaction and progressive enhancement

The first client, Codex, is active and readable in the server-rendered HTML. A small inline browser script progressively enhances the console with tab switching and clipboard controls.

The client selector follows the ARIA tabs pattern:

- The container uses `role="tablist"`.
- Each client control is a real button with `role="tab"`, `aria-selected`, and `aria-controls`.
- Each setup pane uses `role="tabpanel"` and references its tab.
- Left and right arrow keys move between tabs and activate the newly focused tab.
- Home and End move to the first and last tabs.
- Focus remains visible with the existing site focus treatment.

Copy buttons write the selected setup content or agent prompt to the clipboard. Successful copies update the button label briefly and announce confirmation through a polite `aria-live` region. If the Clipboard API is missing or rejects the operation, the script selects the corresponding text so the visitor can copy it manually and announces that fallback.

All client panels render in the HTML as a readable stack. The enhancement script marks the console as enhanced, then hides inactive panels and applies tab behavior. Without JavaScript, every client setup remains available alongside the agent prompt, example prompt, capability proof, and documentation link.

## Data and failure behavior

All displayed content is build-time data. The component makes no network requests and stores no user data.

Failure cases are intentionally local:

- Clipboard failure falls back to text selection.
- JavaScript failure leaves useful server-rendered content.
- Long configuration lines scroll within their code container.
- Unsupported clients are directed to the Generic MCP view and MCP documentation.

The section does not claim the MCP server is currently healthy. It describes stable product capabilities and links to documentation instead of adding a runtime dependency to the marketing page.

## Verification

Before implementation, verify setup syntax for Codex, Claude, Cursor, and VS Code against current official client documentation. Record only instructions that work with the deployed ArchLex remote MCP endpoint.

Automated coverage should verify:

- The MCP section appears in the intended order between capabilities and source-to-system.
- The page retains a logical heading hierarchy.
- Tabs expose correct roles, selected state, panel relationships, and keyboard behavior.
- Selecting a client reveals the matching setup content.
- Both copy controls produce the intended text and accessible feedback.
- The fallback path handles unavailable clipboard access.
- A mobile viewport has no document-level horizontal overflow and can reach every client tab.
- Reduced-motion preferences do not depend on animation for meaning.
- The initial server-rendered state contains useful setup content without client-side execution.

Verification commands follow repository requirements, including the landing package typecheck and build, relevant browser tests, linting, and the comprehensive repository check when feasible.

## Success criteria

The work is successful when a visitor can understand the MCP value proposition, choose one of the four verified clients or Generic MCP, copy accurate setup instructions, copy an agent-assisted setup prompt, and discover a meaningful first request—all within a cohesive, responsive, keyboard-accessible landing-page section.
