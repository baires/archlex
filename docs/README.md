# ArchLex Documentation

ArchLex is a browser-first TypeScript library that turns a concise, provider-aware language into accessible cloud architecture diagrams. AWS and GCP are the supported providers; semantic validation is the main product capability.

## Getting Started

New to ArchLex? Start here:

1. **[Quick Start](../README.md#quick-start)** - Installation and basic usage
2. **[Language Specification](specs/language.md)** - Learn the syntax
3. **[Public API](specs/public-api.md)** - JavaScript/TypeScript API reference
4. **[Contribution Guide](architecture/contribution-guide.md)** - Contributing to ArchLex

## Core Documentation

### Specifications

- **[Language Specification](specs/language.md)** - Complete syntax reference with grammar and examples
- **[Public API](specs/public-api.md)** - JavaScript/TypeScript API documentation
- **[AWS Semantics](specs/aws-semantics.md)** - AWS provider catalog and validation rules
- **[GCP Semantics](specs/gcp-semantics.md)** - GCP provider catalog and validation rules
- **[Layout & Rendering](specs/layout-rendering.md)** - Layout algorithms and SVG rendering
- **[Playground](specs/playground.md)** - Interactive playground features and usage

### Guides

- **[Relationship Types](guides/relationship-types.md)** - Using the 9 built-in relationship types and custom types
- **[Dynamic CDN Icons](guides/dynamic-cdn-icons.md)** - Icon loading, caching, and CDN configuration

### Architecture

- **[System Architecture](architecture/system-architecture.md)** - Package boundaries, pipeline, and runtime behavior
- **[Contribution Guide](architecture/contribution-guide.md)** - Package layout, extension workflows, and testing standards

### Error Reference

- **[Error System Overview](errors/README.md)** - Diagnostic codes, severities, and remediation
- **[Error Index](errors/index.md)** - Complete list of diagnostic codes
- Individual error pages: `AL-PARSE-*`, `AL-STRUCT-*`, `AL-SEM-*`

### Roadmap

- **[Development Roadmap](ROADMAP.md)** - Project milestones and release planning

## Documentation Standards

- `docs/specs/` - Observable behavior and public contracts (language, API, providers)
- `docs/architecture/` - Implementation boundaries and design decisions
- `docs/guides/` - User-facing tutorials and how-to documentation
- `docs/errors/` - Diagnostic code documentation

Public API, grammar, diagnostic-code, or package-boundary changes require corresponding spec updates.

## Contributing to Documentation

Documentation improvements are welcome! See [CONTRIBUTING.md](../CONTRIBUTING.md) for:

- Documentation structure and standards
- How to add error documentation
- How to update specifications
- Pull request process
