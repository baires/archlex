# @archlex/k8s

Kubernetes provider for ArchLex architecture diagrams.

## Installation

```bash
npm install @archlex/k8s
```

## Usage

```typescript
import { createArchLex } from '@archlex/core';
import { k8sProvider } from '@archlex/k8s';

const archlex = createArchLex({ providers: [k8sProvider()] });

const svg = archlex.render(`
provider k8s
cluster prod {
  namespace frontend {
    web: deployment
    web-svc: service
  }
}
web-svc -> web
`);
```

## Features

- Official Kubernetes community icons (39 bundled, sanitized inline)
- Catalog of 60+ Kubernetes resources (workloads, networking, storage, RBAC, control plane)
- Semantic validation rules (namespace containment, service/ingress targets, unbound PVCs, and more)
- `cluster` / `namespace` scope nesting in the ArchLex DSL
- CDN fallback via the jsDelivr mirror of `kubernetes/community`

## Icon Attribution

Bundled and CDN icons come from the
[Kubernetes Community Icons](https://github.com/kubernetes/community/tree/main/icons)
set, licensed under a choice of **Apache-2.0 OR CC-BY-4.0**. The Kubernetes
logo is a registered trademark of The Linux Foundation.

## Documentation

Visit [archlex.dev](https://archlex.dev) for full documentation.

## License

MIT
