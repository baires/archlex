---

title: Specifications
description: "ArchLex specifications: the diagram language, public API, AWS, Google Cloud and Kubernetes semantics, layout and rendering, and the playground."
---

# Specifications

Reference specifications for the ArchLex language, API, and provider rules.
- [Language Specification](/specs/language/): ArchLex DSL language specification, defining document structure, directives, resources, scopes, containment, and relationship syntax for cloud diagrams.
- [Public API Specification](/specs/public-api/): ArchLex public API reference for createArchLex(), parse, analyze, prepare, layout, and render methods with TypeScript types and options.
- [AWS Semantics](/specs/aws-semantics/): AWS semantics in ArchLex, covering the 194-service catalog, account, region, VPC, and subnet containment, relationship rules, and AWS diagnostic codes.
- [Google Cloud Semantics](/specs/gcp-semantics/): Google Cloud semantics in ArchLex, covering the 189-service GCP catalog, containment scopes, relationship rules, and GCP diagnostic codes.
- [Kubernetes Semantics](/specs/k8s-semantics/): Kubernetes semantics in ArchLex, covering the 62-resource catalog, cluster and namespace containment, workload placement, and K8S diagnostic codes.
- [Layout and Rendering Specification](/specs/layout-rendering/): How ArchLex lays out and renders diagrams, from ELK compound graph mapping and geometry caching to icon resolution and deterministic accessible SVG.
- [Playground Specification](/specs/playground/): ArchLex playground specification, covering the Monaco editor, context-aware completions, live diagnostics, SVG preview, examples, sharing, and export tools.
