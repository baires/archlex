# ArchLex Developer Landing Page Redesign

## Objective

Redesign `apps/landing` into a distinctive developer-first product page that persuades developers, SREs, DevOps engineers, and platform engineers to try the open-source ArchLex playground. The page must demonstrate the real render engine prominently, explain why semantic cloud diagrams are different from drawing tools, and establish a visual system that can later unify the playground and documentation apps.

## Product Positioning

ArchLex is an opinionated open-source developer tool: a semantic language and render engine for cloud architecture diagrams. Its primary differentiator is that it understands cloud resources, containment, and relationships instead of merely drawing boxes and arrows.

The page should communicate three ideas in order:

1. Write concise infrastructure source.
2. See a real cloud architecture render immediately.
3. Catch architectural mistakes through semantic validation.

The primary conversion action is opening the playground. GitHub is the secondary action, and documentation supports evaluation after the product has earned interest.

## Visual Direction

The selected direction is **Signal Console**, an industrial OSS-console aesthetic with editorial contrast.

- Dark graphite surfaces provide the dominant visual field.
- Acid lime is a scarce signal color reserved for primary actions, valid states, and important annotations.
- Hairline borders, subtle texture, technical labels, coordinates, and diagnostic marks create an operator-tool rhythm.
- A characterful editorial serif carries major statements. IBM Plex Mono carries interface labels, source, annotations, and technical proof.
- The design avoids generic SaaS gradients, decorative glass effects, emoji feature icons, fabricated customer logos, and unverifiable metrics.

The first viewport uses the approved **Diagram First** composition: compact messaging and calls to action occupy the left rail, while a large real ArchLex render dominates the right side.

## Page Narrative

### 1. Header

The header contains the ArchLex wordmark, Docs and GitHub links, and a visually prominent Playground action. It remains concise and keyboard accessible. On narrow screens, navigation simplifies without hiding the playground action.

### 2. Hero: Product Proof First

The hero pairs a sharp operator-style product claim with a real ArchLex diagram rendered by the existing engine. The right-side render is not an abstract illustration or a recreation of a competitor interface. It uses an authentic ArchLex visual fixture or generated output.

The left rail contains:

- A small open-source and provider context label.
- A concise headline centered on semantic understanding and validation.
- One supporting sentence.
- Primary `Open playground` and secondary `View on GitHub` actions.
- A compact list of truthful proof points such as semantic validation and accessible SVG output.

The product frame should suggest the source-to-render workflow without reproducing the entire playground UI. On desktop, the rendered diagram owns most of the visual area. On mobile, the claim and CTA appear first, followed by a legible cropped or simplified product frame.

### 3. Why Semantics Matter

This section contrasts ArchLex with conventional drawing tools. It explains that ArchLex understands provider resources, containment, and directional relationships, allowing it to produce actionable diagnostics instead of treating every node as an arbitrary shape.

The section uses one focused comparison or diagnostic example, not a generic feature-card grid.

### 4. Capability Proof

Three capabilities receive focused visual treatment:

- Actionable diagnostics that preserve partial output rather than returning a blank canvas.
- Deterministic, accessible SVG suitable for documentation, source control, and integrations.
- AWS and GCP provider awareness, including official service imagery and semantic rules.

Claims must match the repository documentation and current implementation. No performance benchmarks, adoption counts, or compatibility claims may be invented.

### 5. Source to System

A larger source-and-render composition demonstrates how concise ArchLex text becomes a cloud architecture artifact. This section should use real example source and real output from the repository. It can visually connect lines of source with meaningful parts of the result, inspired by the supplied references without copying their brand or UI.

### 6. Open-Source Developer Workflow

This section provides:

- The current installation command.
- A minimal, accurate API example.
- Framework-neutral and browser/Node integration context only where verified.
- Direct links to getting started, API documentation, GitHub, and contribution guidance.

### 7. Final CTA and Footer

The closing statement is: “Your architecture already lives in code. Diagram it there too.” The playground remains the primary action. The footer supplies concise product, documentation, resource, and community links without repeating the page body.

## Shared Design Package

Create a workspace package named `@archlex/design`. It owns reusable visual primitives without coupling applications to landing-specific components.

### Public CSS Contract

- `tokens.css` defines semantic color roles, typography families, spacing, radii, border weights, shadows, focus treatment, and motion timings.
- `themes.css` defines dark and light values for semantic roles such as canvas, raised surface, text, muted text, signal, warning, danger, and border.
- `fonts.css` centralizes the chosen font imports and supported weights.
- A documented package entry point exposes the styles through stable package exports.

Applications consume semantic variables rather than raw palette values. Landing-specific layout and component styles remain within `apps/landing`.

### Adoption Boundary

The landing app is fully migrated to the new design package. Playground and docs are wired to resolve and import the package, with compatibility aliases where required to preserve their current appearance. Their complete visual redesign is explicitly out of scope.

## Component Boundaries

The Astro page should be divided into focused, reusable components where that makes the structure easier to understand, including header, hero/product frame, semantic comparison, capability proof, source-to-system demo, developer quick start, final CTA, and footer. Repeated actions should share a common button/link component.

Static content stays server-rendered. Client-side JavaScript is limited to behavior that materially improves the experience, such as navigation state or reveal orchestration. The page must remain useful if JavaScript is unavailable.

## Motion and Interaction

The main motion moment is one orchestrated entrance: headline, actions, source panel, and render resolve in sequence. Scroll reveals and hover responses remain subtle and must not compete with the product proof.

All nonessential animation is disabled under `prefers-reduced-motion: reduce`. Interactive elements retain visible keyboard focus. Status is never communicated through color alone.

## Responsive Behavior

- Wide screens use the asymmetric left-message/right-render hero.
- Medium widths preserve the product render's dominance while allowing copy to wrap naturally.
- Narrow screens stack copy, actions, and product frame. The product visual remains readable without forcing page-level horizontal scrolling.
- Navigation retains a direct playground action at every breakpoint.
- Dense source and render examples may simplify or crop intentionally rather than shrinking into illegibility.

## Accessibility and Metadata

The implementation uses semantic landmarks and heading order, descriptive text for product imagery, sufficient text and control contrast, visible focus styles, reduced-motion support, and touch targets suitable for narrow screens.

The base layout should include a truthful page title and description plus appropriate Open Graph and social metadata where local assets permit. Decorative visual layers must be ignored by assistive technology.

## Verification

Verification includes:

- Production build of `@archlex/design` and `apps/landing`.
- Existing playground tests and production build after shared-package wiring.
- Documentation build after shared-package wiring.
- Browser review at desktop and mobile widths.
- Keyboard-only navigation and visible focus review.
- Reduced-motion behavior review.
- Contrast and overflow checks for major sections.
- Confirmation that links, installation commands, API examples, provider support, and GitHub destinations are accurate or explicitly configured rather than left as placeholders.

## Out of Scope

- Redesigning the playground application.
- Redesigning the documentation application or its information architecture.
- Adding authentication, analytics, testimonials, pricing, hosted projects, or community metrics.
- Creating fictional customers, usage data, or performance benchmarks.
- Changing the ArchLex language, renderer, provider semantics, or public API.
