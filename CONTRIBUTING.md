# Contributing to ArchLex

Thank you for your interest in contributing to ArchLex! This guide will help you get started.

## 🚀 Development Setup

### Prerequisites

- Node.js 22.0.0 or later
- pnpm 9.0.0 or later
- Git

### Getting Started

1. **Fork and clone the repository**

```bash
git clone https://github.com/your-username/archlex.git
cd archlex
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Build all packages**

```bash
pnpm build
```

4. **Run tests**

```bash
pnpm test           # Run unit tests
pnpm test:browser   # Run Playwright browser tests
pnpm typecheck      # Type checking
pnpm lint           # Linting
pnpm check          # Full validation (build + test + lint)
```

5. **Start the playground**

```bash
pnpm --filter playground dev
```

Open [http://localhost:5173](http://localhost:5173)

## 📁 Project Structure

ArchLex is a monorepo using pnpm workspaces and Turborepo:

```
archlex/
├── packages/
│   ├── core/           # Main orchestration library
│   ├── parser/         # Language parser
│   ├── layout-elk/     # Graph layout engine
│   ├── renderer-svg/   # SVG renderer
│   ├── aws/            # AWS provider
│   ├── gcp/            # GCP provider
│   ├── k8s/            # Kubernetes provider
│   ├── model/          # Shared types
│   ├── diagnostics/    # Diagnostic system
│   └── icons*/         # Icon loading runtime packages
├── apps/
│   └── playground/     # Interactive playground app
├── docs/               # Documentation
└── scripts/            # Build and maintenance scripts
```

## 🎯 Common Contribution Types

### 1. Adding an AWS Service

To add a new AWS service to the catalog:

1. **Define the service** in `packages/aws/src/catalog/`:

```typescript
import { defineService } from "../builder.js";

export const lambdaService = defineService({
  id: "lambda",
  displayName: "AWS Lambda",
  category: "compute",
  aliases: ["aws.lambda", "function"],
  iconKey: "aws-lambda"
});
```

2. **Add the icon**:
   - **Bundled icon**: Place official SVG in `packages/aws/assets/official/` and run `pnpm --filter @archlex/aws icons:generate`
   - **CDN icon**: Add mapping in `packages/aws/src/icons/cdn.ts`

3. **Write tests** in `packages/aws/src/__tests__/`

4. **Update documentation** if adding a new category

See [docs/architecture/contribution-guide.md](docs/architecture/contribution-guide.md) for complete details.

### 2. Adding a Semantic Validation Rule

Validation rules enforce architectural best practices:

1. **Register the diagnostic code** in `packages/aws/src/registry.ts`:

```typescript
export const AWS_DIAGNOSTIC_CODES = {
  LAMBDA_VPC_SUBNET: "AWS-LAMBDA-VPC-SUBNET-001"
} as const;
```

2. **Create the rule** in `packages/aws/src/rules/<domain>/<rule-name>.ts`:

```typescript
import { defineRule } from "../../builder.js";

export const lambdaVpcSubnetRule = defineRule({
  code: "AWS-LAMBDA-VPC-SUBNET-001",
  severity: "error",
  summary: "Lambda functions in VPCs must be placed in subnets",
  validate(graph) {
    // Your validation logic
    return diagnostics;
  }
});
```

3. **Export from** `packages/aws/src/rules/index.ts`

4. **Write tests** covering `normal`, `strict`, and `off` validation modes

### 3. Adding a GCP Service

Same process as AWS, but in the `packages/gcp/` directory.

Kubernetes resources follow the same process in `packages/k8s/`; use
`pnpm --filter @archlex/k8s icons:generate` for bundled icon changes.

### 4. Adding a New Cloud Provider

To add Azure or another provider:

1. Create `packages/<provider>/` with the structure from `packages/gcp/` or `packages/k8s/`
2. Implement the `CloudProvider` interface from `@archlex/model`
3. Add to `packages/core` dependencies
4. Register in `createArchLex({ providers: [...] })`

No changes needed to parser, layout, or renderer!

See [docs/architecture/contribution-guide.md](docs/architecture/contribution-guide.md) for complete provider integration guide.

## 🧪 Testing Guidelines

### Unit Tests

- Place tests next to source files or in `__tests__/` directories
- Use Vitest for unit tests
- Run with `pnpm test`

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Property Tests

- Use `fast-check` for grammar and recovery robustness
- Test parser with random valid/invalid inputs
- Test layout with various graph structures

### Browser Tests

- Use Playwright for end-to-end tests
- Test in `packages/browser-tests/`
- Run with `pnpm test:browser`

### What to Test

- **New services**: Catalog lookup, icon resolution, display names
- **Validation rules**: Normal/strict/off modes, diagnostic accuracy
- **Parser changes**: Valid input, error recovery, diagnostic spans
- **API changes**: Backward compatibility, type safety

## 📝 Code Style

- **TypeScript**: Strict mode, no `any` types
- **Formatting**: Biome handles formatting automatically
- **Linting**: Run `pnpm lint` before committing
- **Naming**: camelCase for variables/functions, PascalCase for types/classes
- **Comments**: Focus on "why" not "what"

Pre-commit hooks run automatically via Husky.

## 🔄 Pull Request Process

1. **Create a branch** from `main`:

```bash
git checkout -b feature/my-feature
```

2. **Make your changes** with clear, focused commits

3. **Add a changeset** (for published packages):

```bash
pnpm changeset
```

4. **Run the full test suite**:

```bash
pnpm check
```

5. **Push and open a PR**:

```bash
git push origin feature/my-feature
```

6. **Fill out the PR template**:
   - What does this change?
   - Why is it needed?
   - How was it tested?
   - Breaking changes?

### PR Guidelines

- Keep PRs focused and reasonably sized
- Include tests for new functionality
- Update documentation for user-facing changes
- Follow existing code patterns
- Respond to review feedback promptly

## 📚 Documentation

When adding features, update:

- **Specs** (`docs/specs/`) for language or API changes
- **Error docs** (`docs/errors/`) for new diagnostic codes
- **Guides** (`docs/guides/`) for user-facing features
- **README** for major features

## 🐛 Bug Reports

Found a bug? Please open an issue with:

- Clear description of the problem
- Minimal reproduction case (ArchLex source code)
- Expected vs actual behavior
- Environment (browser, Node version, OS)
- Screenshots if relevant

## 💡 Feature Requests

Have an idea? Open an issue with:

- Use case: what problem does it solve?
- Proposed solution or API design
- Alternatives you've considered
- Examples from other tools

## ❓ Questions

- **Documentation**: Check [docs/README.md](docs/README.md) first
- **Discussions**: Open a GitHub Discussion
- **Architecture**: See [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md)

## 📜 Code of Conduct

This project follows a Code of Conduct that all contributors are expected to uphold. Please be respectful and constructive in all interactions.

## 🙏 Recognition

Contributors will be recognized in release notes and the project's contributor list.

---

Thank you for contributing to ArchLex! 🎉
