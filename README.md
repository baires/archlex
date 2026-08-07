# ArchLex

**A semantic cloud architecture diagramming library for the browser and Node.js**

ArchLex turns concise, provider-aware text into accessible SVG cloud architecture diagrams. It understands AWS and GCP resources, validates architectural relationships, and produces clean, deterministic output that integrates into your documentation, tools, or browser applications.

## ✨ Features

- **🧠 Semantic validation** - Understands cloud resources, containment rules, and relationship compatibility
- **📝 Concise syntax** - Express architectures with shorthand like `rds-proxy > rds > ecs` or fully qualified names
- **☁️ Multi-cloud** - AWS and GCP providers with fully qualified resource names (`aws.rds`, `gcp.cloudsql`)
- **♿ Accessible by default** - SVG output includes ARIA attributes, keyboard navigation, and focus states
- **🎨 Themeable** - Built-in light and dark themes with official cloud provider icons
- **🔍 Never punishing** - Invalid input produces diagnostics and a partial diagram, never a blank canvas
- **🎯 Deterministic** - Same input always produces the same output with stable IDs and ordering
- **⚡ Framework-neutral** - Works in React, Vue, Svelte, vanilla JS, or Node.js 22+

## 🚀 Quick Start

### Installation

```bash
npm install @archlex/core @archlex/aws @archlex/gcp
```

### Basic Usage

```typescript
import { createArchLex, awsProvider, gcpProvider } from '@archlex/core';

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider()]
});

const source = `
@provider aws
@layout LR

vpc {
  public: subnet {
    alb
  }
  private: subnet {
    ecs
    rds
  }
}

alb -> ecs
ecs -> rds
`;

const result = await archlex.render(source);

if (result.diagnostics.length > 0) {
  console.log('Diagnostics:', result.diagnostics);
}

// result.svg contains the rendered SVG string
document.getElementById('diagram').innerHTML = result.svg;
```

### Playground

The project includes an interactive playground for live editing and testing:

```bash
git clone https://github.com/baires/archlex.git
cd archlex
pnpm install
pnpm --filter playground dev
```

Open [http://localhost:5173](http://localhost:5173) to see the playground.

## 📖 Documentation

- **[Getting Started](docs/README.md)** - Documentation overview and reading order
- **[Language Specification](docs/specs/language.md)** - Complete syntax reference
- **[Public API](docs/specs/public-api.md)** - JavaScript/TypeScript API documentation
- **[AWS Semantics](docs/specs/aws-semantics.md)** - AWS provider catalog and validation rules
- **[GCP Semantics](docs/specs/gcp-semantics.md)** - GCP provider catalog and validation rules
- **[Error Reference](docs/errors/README.md)** - Diagnostic codes and remediation
- **[Relationship Types](docs/guides/relationship-types.md)** - Guide to relationship types
- **[System Architecture](docs/architecture/system-architecture.md)** - Package structure and pipeline

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Package structure
- Testing guidelines
- Adding cloud services
- Writing validation rules
- Pull request process

## 🏗️ Architecture

ArchLex is built as a monorepo with clear package boundaries:

- **`@archlex/core`** - Main library with parser, layout, and renderer orchestration
- **`@archlex/parser`** - Chevrotain-based language parser
- **`@archlex/layout-elk`** - ELK-based graph layout engine with Web Worker support
- **`@archlex/renderer-svg`** - Accessible SVG renderer with theming
- **`@archlex/aws`** - AWS provider with service catalog and validation rules
- **`@archlex/gcp`** - GCP provider with service catalog and validation rules
- **`@archlex/model`** - Shared types and interfaces
- **`@archlex/diagnostics`** - Diagnostic system

## 📋 Requirements

- **Node.js** 22.0.0 or later
- **pnpm** 9.0.0 or later (for development)
- **Modern browser** with ES2022+ support

## 🎯 Design Principles

1. **Semantics are the product** - ArchLex wins by understanding cloud architecture, not just drawing boxes
2. **Never punish the author** - Invalid input produces diagnostics and a partial diagram, never a blank canvas
3. **Determinism builds trust** - Same source, same SVG with stable IDs and ordering
4. **The library is the product** - Framework-neutral core with consistent behavior across runtimes
5. **Accessibility is intrinsic** - SVG output is accessible by default, not wrapped after the fact

## 📄 License

[License TBD - Add your chosen open source license here]

## 🙏 Acknowledgments

ArchLex uses official architecture icons from:
- [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/)
- [Google Cloud Architecture Icons](https://cloud.google.com/icons)

Layout powered by [Eclipse Layout Kernel (ELK)](https://www.eclipse.org/elk/)
