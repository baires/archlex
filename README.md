# ArchLex

A semantic cloud architecture diagramming library for browser and Node.js environments.

ArchLex compiles text-based architecture definitions into accessible SVG diagrams. It provides built-in catalog support for AWS and GCP resources, validates architectural relationships and containment rules, and outputs deterministic SVG graphics suitable for documentation, dynamic dashboards, and web applications.

## Visual Output

### Serverless API Example

![Serverless API Architecture Diagram](apps/landing/public/diagrams/serverless-api.svg)

```archlex
direction LR
provider aws

api-gateway -[invokes]-> lambda -[writes]-> dynamodb
```

### Multi-Region Infrastructure Example

![Multi-Region Architecture Diagram](apps/landing/public/diagrams/multi-region.svg)

```archlex
direction LR
provider aws
validation normal

account global-core {
  region us-east-1 {
    vpc primary-vpc {
      subnet app-subnet-1 {
        app_primary: ecs
        db_primary: rds
        cache_primary: elasticache
        app_primary > cache_primary
        app_primary > db_primary
      }
    }
  }
  region us-west-2 {
    vpc failover-vpc {
      subnet app-subnet-2 {
        app_secondary: ecs
        db_replica: rds
        app_secondary > db_replica
      }
    }
  }
}

global_dns: route53
global_dns -[primary]-> app_primary
global_dns -[failover]-> app_secondary
db_primary -[replicates]-> db_replica
```

## Features

- **Semantic validation** - Validates resource compatibility, nesting hierarchies, and relationships against cloud provider schemas.
- **Concise syntax** - Declarative language supporting shorthand inline syntax and structured containment blocks.
- **Multi-cloud support** - Provider definitions for AWS and GCP with qualified names (`aws.rds`, `gcp.cloudsql`).
- **Accessible SVG output** - Rendered output includes ARIA attributes, semantic structure, keyboard navigation, and focus management.
- **Themeable renderer** - Pre-configured light and dark themes using official cloud provider icons.
- **Diagnostic feedback** - Syntax or structural validation errors yield structured diagnostic objects alongside partial diagrams.
- **Deterministic layout** - Stable ID generation and node ordering guarantee reproducible layout trees across runs.
- **Framework neutral** - Zero DOM dependencies in core; compatible with React, Vue, Svelte, vanilla JavaScript, and Node.js 22+.

## Quick Start

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

document.getElementById('diagram').innerHTML = result.svg;
```

### Playground

An interactive playground is available for live editing and testing:

```bash
git clone https://github.com/baires/archlex.git
cd archlex
pnpm install
pnpm --filter playground dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Documentation

- **[Getting Started](docs/README.md)** - Documentation overview and guide structure
- **[Language Specification](docs/specs/language.md)** - Complete language syntax and grammar specification
- **[Public API](docs/specs/public-api.md)** - JavaScript and TypeScript API reference
- **[AWS Semantics](docs/specs/aws-semantics.md)** - AWS provider service definitions and validation rules
- **[GCP Semantics](docs/specs/gcp-semantics.md)** - GCP provider service definitions and validation rules
- **[Error Reference](docs/errors/README.md)** - Diagnostic error codes and resolution steps
- **[Relationship Types](docs/guides/relationship-types.md)** - Guide to relationship types and usage
- **[System Architecture](docs/architecture/system-architecture.md)** - Architecture overview and execution pipeline

## Architecture

ArchLex is structured as a monorepo:

- **`@archlex/core`** - Main entry point orchestrating parser, layout, and rendering pipelines
- **`@archlex/parser`** - Chevrotain-based parser for the ArchLex language
- **`@archlex/layout-elk`** - ELK-based graph layout engine supporting Web Workers
- **`@archlex/renderer-svg`** - Accessible SVG renderer with theme and icon resolution
- **`@archlex/aws`** - AWS cloud provider resource definitions and semantic rules
- **`@archlex/gcp`** - GCP cloud provider resource definitions and semantic rules
- **`@archlex/model`** - Core data structures and interface definitions
- **`@archlex/diagnostics`** - Structured diagnostic and error reporting system

## Requirements

- **Node.js** 22.0.0 or later
- **pnpm** 9.0.0 or later (for workspace development)
- **Modern browser** supporting ES2022+

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, package structure, and guidelines.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

ArchLex incorporates official cloud architecture icons:
- [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/)
- [Google Cloud Architecture Icons](https://cloud.google.com/icons)

Graph layout powered by [Eclipse Layout Kernel (ELK)](https://www.eclipse.org/elk/).
