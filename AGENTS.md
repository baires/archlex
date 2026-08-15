# AGENTS.md

Welcome! This file provides essential context, setup instructions, development workflows, and coding conventions for AI agents (and human contributors) working on **ArchLex**.

---

## 📌 Project Overview

**ArchLex** (`arch-lex-monorepo`) is a semantic cloud architecture diagramming library for browser and Node.js environments. It compiles text-based architecture definitions into accessible, themeable SVG diagrams with automatic ELK graph layout and semantic validation against AWS, GCP, and Kubernetes catalogs.

### Tech Stack & Engine Requirements
- **Language**: TypeScript (Strict Mode)
- **Runtime**: Node.js `>=22.0.0`
- **Package Manager**: pnpm `>=9.0.0` (Monorepo Workspaces)
- **Build & Task Runner**: Turborepo
- **Linter & Formatter**: Biome (`^1.9.4`)
- **Test Frameworks**: Vitest (Unit/Integration) & Playwright (E2E/Browser)

---

## 🚀 Setup & Execution Commands

### Workspace Installation & Build
```bash
# Install all dependencies across the monorepo
pnpm install

# Build all workspace packages and applications
pnpm build
```

### Dev Servers
```bash
# Start Interactive Diagram Playground (React + Vite @ http://localhost:5173)
pnpm dev:playground

# Start Documentation App
pnpm dev:docs

# Start Marketing/Landing Page App
pnpm dev:landing

# Start MCP Server for agent integration
pnpm dev:mcp
```

### Package-Targeted Builds
```bash
# Build specific applications
pnpm build:playground
pnpm build:landing
pnpm build:mcp
pnpm build:docs
```

---

## 🧪 Testing & Verification Instructions

AI agents MUST run verification checks before completing tasks or creating PRs.

### Commands
```bash
# Run unit tests across all workspace packages
pnpm test

# Run Vitest unit tests in a specific package
pnpm --filter @archlex/core test
pnpm --filter @archlex/aws test

# Run a targeted Vitest test by name pattern
pnpm vitest run -t "<test_name>"

# Run Playwright browser / E2E tests
pnpm test:browser

# Run TypeScript type check across all packages
pnpm typecheck

# Run Biome linting check
pnpm lint

# Format codebase using Biome
pnpm format

# Comprehensive pipeline validation (build + typecheck + test + lint)
pnpm check
```

---

## 📁 Repository Structure

ArchLex is structured as a pnpm monorepo organized into `packages/` and `apps/`:

```
cloud-mer/
├── packages/
│   ├── core/           # Core API orchestrating parser, layout engine, and renderer
│   ├── parser/         # Chevrotain-based ArchLex DSL grammar parser
│   ├── layout-elk/     # Graph layout engine using Eclipse Layout Kernel (ELK)
│   ├── renderer-svg/   # Accessible, themeable SVG diagram renderer
│   ├── model/          # Shared interfaces, AST schemas, and type definitions
│   ├── diagnostics/    # Diagnostic codes, error structures, and formatting helpers
│   ├── aws/            # AWS provider definitions, catalog, icons, and semantic rules
│   ├── gcp/            # GCP provider definitions, catalog, icons, and semantic rules
│   ├── k8s/            # Kubernetes definitions, catalog, icons, and semantic rules
│   ├── cli/            # Command-line interface tool
│   ├── design/         # Shared design tokens and styling assets
│   └── icons*/         # Icon loader runtimes (icons-core, icons-node, icons-browser)
├── apps/
│   ├── playground/     # Interactive diagramming React + Vite web app
│   ├── docs/           # Next.js documentation portal
│   ├── landing/        # ArchLex landing page
│   └── mcp-server/     # Model Context Protocol server for ArchLex
├── scripts/            # Repository maintenance & verification scripts
└── docs/               # System specs, language reference, and guides
```

---

## 📝 Code Style & Conventions

### TypeScript Guidelines
- Enable strict type checking everywhere. **Never use `any`**.
- Export explicit return types on public API signatures.
- Prefer functional, immutable patterns where applicable.
- Core package (`@archlex/core`) must remain DOM-neutral and browser/Node transparent.

### Biome Code Formatting
- Indentation: 2 spaces.
- Organize imports is enabled (`biome check .` validates import order).
- Run `pnpm format` to auto-fix formatting issues.

### Workspace Dependencies
- Cross-package internal dependencies use `workspace:*` (e.g. `"@archlex/core": "workspace:*"`).

---

## 🛠️ Contribution Workflows for Agents

### 1. Adding a New AWS / GCP / Kubernetes Resource
1. Define the service catalog entry in `packages/<provider>/src/catalog/`.
2. Map or generate official SVG icons in `packages/<provider>/assets/official/`.
3. Add service unit tests under `packages/<provider>/src/__tests__/`.
4. Run catalog validation:
   ```bash
   pnpm validate:catalog
   ```

### 2. Adding a Semantic Validation Rule
1. Register a new diagnostic code in `packages/<provider>/src/registry.ts`.
2. Implement the rule logic in `packages/<provider>/src/rules/`.
3. Write test cases covering all 3 validation modes: `normal`, `strict`, and `off`.
4. Regenerate error documentation:
   ```bash
   pnpm generate-docs
   ```

### 3. Changesets & Versioning
When modifying published packages (`packages/*`), generate a changeset entry:
```bash
pnpm changeset
```

### 4. Keep Documentation Current
Update documentation in the same change when you modify public APIs, language
syntax, scopes, providers, catalogs, icons, diagnostics, playground behavior,
MCP tools or resources, commands, environment variables, or deployment
requirements.

Treat `docs/` Markdown as product source. The docs app publishes these files
through `apps/docs/pages` symlinks, and the MCP build embeds them as
documentation resources. Keep `README.md`, the docs landing page, and the
getting-started page aligned when onboarding changes.

Do not hand-edit `docs/errors/index.md` or `docs/errors/AL-*.md`. Update the
diagnostic registry or generator and run `pnpm generate-docs`.

Before you finish a documentation-affecting change, run:

```bash
pnpm generate-docs
pnpm build:docs
pnpm verify:sites
```

---

## 💡 Maintenance & Verification Scripts

```bash
# Validate provider catalogs against provider rules
pnpm validate:catalog

# Verify site configurations and documentation links
pnpm verify:sites

# Generate diagnostic error documentation from code registry
pnpm generate-docs
```
