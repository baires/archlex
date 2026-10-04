# @archlex/core

## 0.6.0

### Minor Changes

- 5c2beae: Export `cloudflareProvider` from core. Workers resolves in Cloudflare documents
  and as `cloudflare.workers` in mixed documents. Official CC BY 4.0 artwork is bundled for offline rendering, with attribution and technical changes recorded in the provider notices and exported fragments.

### Patch Changes

- 7aa0fc0: Validate each registered provider's resources using provider identity. Provider rules receive local nodes and edges with their containment context, preventing foreign resource names from activating rules and preserving validation of qualified resources in mixed diagrams.
- Updated dependencies [6fbd7d5]
- Updated dependencies [5768500]
- Updated dependencies [306e445]
- Updated dependencies [6a128bc]
- Updated dependencies [5c2beae]
- Updated dependencies [2160726]
- Updated dependencies [b39dfe7]
- Updated dependencies [f827ff1]
- Updated dependencies [86fbf8d]
- Updated dependencies [ef4e1e6]
- Updated dependencies [361eecb]
- Updated dependencies [07c436b]
- Updated dependencies [c761fab]
- Updated dependencies [17398a3]
- Updated dependencies [79bb35a]
- Updated dependencies [befe253]
- Updated dependencies [d109bd2]
- Updated dependencies [168d3d5]
- Updated dependencies [6742dd3]
- Updated dependencies [d5a6eec]
- Updated dependencies [4aa1584]
- Updated dependencies [4eaf3da]
- Updated dependencies [6e02ad2]
- Updated dependencies [50b98e6]
- Updated dependencies [61fd4cc]
- Updated dependencies [ccfd60b]
- Updated dependencies [172a9b7]
- Updated dependencies [7f1c415]
- Updated dependencies [a8a4236]
- Updated dependencies [65ada8e]
- Updated dependencies [55c0552]
- Updated dependencies [8350f69]
- Updated dependencies [cac04f5]
- Updated dependencies [dee60e0]
- Updated dependencies [fcdefe3]
- Updated dependencies [75b9ba5]
- Updated dependencies [0a2c71f]
- Updated dependencies [222b277]
- Updated dependencies [4b8394e]
- Updated dependencies [e84a3b7]
- Updated dependencies [d78e9d8]
- Updated dependencies [23f9e02]
- Updated dependencies [99747f9]
- Updated dependencies [35e9439]
- Updated dependencies [bdd1bed]
- Updated dependencies [6c20b5b]
- Updated dependencies [1556db0]
- Updated dependencies [08444f3]
- Updated dependencies [14e3bcb]
- Updated dependencies [6827912]
- Updated dependencies [26c4035]
- Updated dependencies [93690df]
- Updated dependencies [322f339]
- Updated dependencies [302cc6d]
- Updated dependencies [63bb802]
- Updated dependencies [c1fc4c0]
- Updated dependencies [346094a]
- Updated dependencies [d094e14]
- Updated dependencies [10aee84]
- Updated dependencies [d5f86d0]
- Updated dependencies [2fd4486]
- Updated dependencies [51967bf]
- Updated dependencies [b910f65]
- Updated dependencies [8ee0978]
- Updated dependencies [361f13b]
- Updated dependencies [9ead4bc]
- Updated dependencies [1f1ae6e]
- Updated dependencies [d33ddaa]
- Updated dependencies [f7c5a60]
- Updated dependencies [e6010c6]
- Updated dependencies [59fb7ce]
- Updated dependencies [68228c0]
- Updated dependencies [1ed9a52]
- Updated dependencies [d671a94]
- Updated dependencies [c5eb69b]
- Updated dependencies [a2e4108]
- Updated dependencies [6434e11]
- Updated dependencies [006fe34]
- Updated dependencies [12690c1]
- Updated dependencies [f0c74ae]
- Updated dependencies [eb67b50]
- Updated dependencies [9e71ff7]
- Updated dependencies [66cbf46]
- Updated dependencies [aed2fef]
- Updated dependencies [8fe9c1f]
- Updated dependencies [779b0c1]
- Updated dependencies [bef25b0]
- Updated dependencies [a6d61ec]
- Updated dependencies [c9a17e6]
- Updated dependencies [61f6b87]
- Updated dependencies [8a87363]
- Updated dependencies [5088a37]
- Updated dependencies [4460cf4]
- Updated dependencies [b2b082a]
- Updated dependencies [ee592ce]
- Updated dependencies [64e5384]
- Updated dependencies [1e22929]
- Updated dependencies [311e0f4]
- Updated dependencies [28dbc6c]
- Updated dependencies [2dcae5c]
- Updated dependencies [89629fa]
- Updated dependencies [4ea92fe]
- Updated dependencies [434442d]
- Updated dependencies [0a5d622]
- Updated dependencies [b30c670]
  - @archlex/cloudflare@0.1.0
  - @archlex/icons-core@0.2.5

## 0.5.1

### Patch Changes

- 6568174: Keep nested subnet layout when the same implicit resource name is reused across scopes.

## 0.5.0

### Minor Changes

- 5ad0f4a: Expand the core relationship vocabulary and add relationship areas.

  - Add `area` to `RelationshipDefinition` (`connectivity`, `data`, `events`,
    `operations`, `processing`, `delivery`, `governance`, `lifecycle`,
    `dependency`, `reliability`) so the documentation grouping is code-driven.
  - Add 11 new relationship kinds: `streams`, `stores`, `backs-up`, `restores`,
    `archives`
    (data), `notifies` (events), `provisions` (delivery), `authenticates`,
    `authorizes`, `audits`, `scans` (governance).
  - Add `depends-on` and `attaches` (dependency), `exposes` (connectivity),
    `fails-over-to` (reliability), and `trusts` (governance).
  - Group all core relationship metadata by area in
    `ARCHLEX_LANGUAGE_METADATA`.
  - Add searchable metadata to every core relationship and expose intentional
    provider extensions through `RelationshipDefinition.providerSpecific`.

### Patch Changes

- Updated dependencies [5ad0f4a]
- Updated dependencies [5ad0f4a]
- Updated dependencies [5ad0f4a]
- Updated dependencies [5ad0f4a]
  - @archlex/aws@0.4.0
  - @archlex/gcp@0.4.0
  - @archlex/k8s@0.4.0
  - @archlex/model@0.6.0
  - @archlex/diagnostics@0.3.1
  - @archlex/layout-elk@0.2.6
  - @archlex/parser@0.6.1
  - @archlex/renderer-svg@0.2.6

## 0.4.0

### Minor Changes

- f53538f: Add editor-neutral ArchLex language intelligence, catalog search nomenclature, structured grammar metadata, provider relationship semantics, and canonical Monaco completion.

  **Language Service Package:**

  - Context-aware completion engine with catalog-driven suggestions
  - Human-readable search with fuzzy matching (e.g., "elastic kubernetes" → `eks`)
  - Grammar-aware filtering (directive values, resource kinds, relationships, scope keywords)
  - Semantic ranking by prefix match, search relevance, and relationship compatibility
  - DOM-neutral design compatible with Monaco, VSCode, CodeMirror, and other editors

  **Catalog Enhancements:**

  - Search terms extracted from service names and descriptions for all 441 resources
  - Structured metadata for 194 AWS, 185 GCP, and 62 Kubernetes services
  - Relationship compatibility validation (source/target kind pairs)
  - Containment rules for scope-aware suggestions

  **Parser Integration:**

  - Document analysis extracting provider, scope hierarchy, and symbol declarations
  - Cursor context detection identifying grammar position for completions
  - Symbol visibility tracking for relationship target suggestions

  **Playground Integration:**

  - Monaco completion provider backed by language service
  - Browser-tested performance (<50ms p95 on 100+ declaration documents)
  - WeakMap-based document caching for incremental updates
  - Performance measurement with `performance.measure()`

### Patch Changes

- Updated dependencies [16b8844]
- Updated dependencies [f53538f]
  - @archlex/diagnostics@0.3.0
  - @archlex/parser@0.6.0
  - @archlex/model@0.5.0
  - @archlex/aws@0.3.0
  - @archlex/gcp@0.3.0
  - @archlex/k8s@0.3.0
  - @archlex/layout-elk@0.2.5
  - @archlex/renderer-svg@0.2.5

## 0.3.2

### Patch Changes

- Updated dependencies [29e730b]
  - @archlex/k8s@0.2.0
  - @archlex/model@0.4.0
  - @archlex/parser@0.5.0
  - @archlex/icons-core@0.2.3
  - @archlex/aws@0.2.3
  - @archlex/diagnostics@0.2.3
  - @archlex/gcp@0.2.4
  - @archlex/layout-elk@0.2.4
  - @archlex/renderer-svg@0.2.4

## 0.3.1

### Patch Changes

- Updated dependencies [07c63b9]
  - @archlex/parser@0.4.0

## 0.3.0

### Minor Changes

- 12dd3ec: Add `theme` DSL directive for light/dark rendering

  The `theme` directive allows specifying `light` or `dark` theme directly in ArchLex source:

  ```archlex
  provider aws
  theme light
  rds > ecs
  ```

  - Parser now recognizes `theme` as a reserved word and accepts both `theme dark` and `theme: dark` syntax (optional colon, consistent with other directives)
  - Core extracts the theme directive and passes it through the render pipeline with precedence: explicit API/CLI option > source directive > renderer default (`dark`)
  - CLI `--theme` flag no longer defaults to `dark`, allowing source directives to take effect
  - Playground syncs the theme toggle to reflect valid source directives
  - `ThemeName` type exported from `@archlex/model` for type safety

### Patch Changes

- Updated dependencies [12dd3ec]
  - @archlex/model@0.3.0
  - @archlex/parser@0.3.0
  - @archlex/aws@0.2.2
  - @archlex/diagnostics@0.2.2
  - @archlex/gcp@0.2.2
  - @archlex/layout-elk@0.2.3
  - @archlex/renderer-svg@0.2.2

## 0.2.1

### Patch Changes

- 69fac46: Remove the redundant `typecheck` script from packages whose `build` already
  runs `tsc --emitDeclarationOnly` (a full type check), eliminating a second
  `tsc --noEmit` pass in CI. Apps and packages with non-tsc builds keep their
  standalone `typecheck` script.
- Updated dependencies [69fac46]
  - @archlex/aws@0.2.1
  - @archlex/diagnostics@0.2.1
  - @archlex/gcp@0.2.1
  - @archlex/icons-core@0.2.1
  - @archlex/layout-elk@0.2.1
  - @archlex/model@0.2.1
  - @archlex/parser@0.2.1
  - @archlex/renderer-svg@0.2.1

## 0.2.0

### Minor Changes

- fa3c5af: Add explicit browser and Node icon-loading adapters backed by a shared
  browser-safe core, version-pinned AWS and GCP provider definitions, and core
  prepare/load/render APIs. The playground now fetches missing icons with
  fixture-covered fallback behavior while preserving a static browser bundle.
- ced0859: Initial public release of ArchLex packages

  This is the first public release of ArchLex, a declarative language for cloud architecture diagrams.

  ### Core Features

  - **@archlex/core**: Complete diagramming engine with parse, compile, and render pipeline
  - **@archlex/aws**: AWS provider with 200+ official service icons
  - **@archlex/gcp**: GCP provider with 100+ official service icons
  - **@archlex/cli**: Command-line interface for rendering and validating diagrams
  - **@archlex/model**: TypeScript type definitions and data models
  - **@archlex/parser**: Fast Chevrotain-based DSL parser
  - **@archlex/diagnostics**: Diagnostic and validation utilities
  - **@archlex/renderer-svg**: SVG rendering engine
  - **@archlex/layout-elk**: Automatic graph layout using ELK
  - **@archlex/icons-core**: Icon utilities and registry
  - **@archlex/icons**: Node.js icon loading utilities

  ### Key Capabilities

  - Declarative DSL for architecture diagrams
  - Automatic layout and positioning
  - SVG and PNG export
  - Semantic validation
  - Multiple cloud providers
  - Extensible architecture
  - TypeScript support
  - CLI and programmatic API

- 8fcbb08: Add node display labels (`db: rds["Primary DB"]`, including on chain nodes), show instance names for named resources with the service name preserved in the accessible name, pick label-aware card widths (128/160/192) so canonical service names stop truncating, and deduplicate icon artwork into shared `<symbol>` definitions referenced by `<use>`.
- a6d55b3: feat: add Tier 1 core infrastructure services (76 services, 8 relationship types, 6 validation rules)

  ## Services Added

  ### AWS (39 services)

  - **Networking** (13): VPC Endpoints (Interface/Gateway), NAT Gateway, Internet Gateway, Transit Gateway, PrivateLink, Direct Connect, VPN Gateway, Customer Gateway, VPN Connection, Elastic IP, Network Firewall, Global Accelerator
  - **Compute** (3): App Runner, Batch, Fargate
  - **Storage** (6): EFS, FSx (Windows/Lustre), EBS, Glacier, Storage Gateway
  - **Database** (5): Aurora, Neptune, DocumentDB, Timestream, Keyspaces
  - **Security** (6): WAF, Shield, Secrets Manager, KMS, ACM, GuardDuty
  - **Monitoring** (6): CloudWatch (Logs/Metrics/Alarms), X-Ray, CloudTrail, Systems Manager

  ### GCP (37 services)

  - **Networking** (10): Cloud NAT, Cloud VPN, Cloud Interconnect, Private Service Connect, Cloud Router, VPC Service Controls, Firewall, Cloud Armor, Network Endpoint Groups, Cloud Domains
  - **Compute** (4): Cloud Workstations, Batch, App Engine, Cloud Shell
  - **Storage** (5): Persistent Disk, Filestore, Archive Storage, Transfer Service, Transfer Appliance
  - **Database** (3): AlloyDB, Cloud Memcached, Datastore
  - **Security** (8): Cloud KMS, Security Command Center, Binary Authorization, Certificate Manager, Cloud HSM, reCAPTCHA Enterprise, Web Risk, Identity Platform
  - **Monitoring** (7): Cloud Monitoring, Cloud Logging, Cloud Trace, Cloud Profiler, Error Reporting, Cloud Debugger, Operations

  ## Relationship Types Added (8)

  - `encrypts` / `decrypts` - Encryption services
  - `monitors` / `logs` / `traces` / `alerts` - Observability
  - `caches` - CDN and caching
  - `proxies` - NAT and proxy services

  ## Validation Rules Added (6)

  ### AWS (3)

  - NAT Gateway placement validation (warning)
  - Internet Gateway attachment validation (info)
  - Transit Gateway routes validation (info)

  ### GCP (3)

  - Cloud NAT VPC placement validation (warning)
  - Filestore VPC placement validation (warning)
  - AlloyDB Private Service Connect validation (info)

  ## Coverage Progress

  - AWS: 24 → 63 services (13.6% → 35.6%)
  - GCP: 24 → 61 services (14.0% → 36.3%)
  - Combined: 48 → 124 services (13.9% → 35.9%)
  - ✅ Tier 1 milestone (30%) exceeded

  ## Breaking Changes

  None - all changes are additive.

- a6d55b3: feat: add Tier 2 application services (95 services, 9 relationship types, 10 validation rules)

  ## Services Added

  ### AWS (48 services)

  - **Application Integration** (5): Step Functions, AppFlow, AppSync, Amazon MQ, MSK
  - **Analytics** (10): Kinesis Data Streams/Firehose/Analytics, EMR, Glue, Athena, Redshift, QuickSight, OpenSearch, Data Pipeline
  - **AI/ML** (10): SageMaker, Bedrock, Rekognition, Comprehend, Translate, Polly, Transcribe, Lex, Kendra, Forecast
  - **Developer Tools** (7): CodePipeline, CodeBuild, CodeDeploy, CodeCommit, Cloud9, CodeArtifact, CodeGuru
  - **Containers** (5): ECR, ECS Anywhere, EKS Add-ons, App Mesh, Copilot
  - **Serverless** (6): EventBridge Scheduler, Step Functions Express, Lambda@Edge, Lambda Layers, SAM, Application Composer
  - **Messaging** (5): Pinpoint, SES, SNS Mobile, EventBridge Pipes, EventBridge API Destinations

  ### GCP (47 services)

  - **Application Integration** (5): Cloud Scheduler, Workflows, Eventarc, Cloud Composer, Apigee
  - **Analytics** (8): Dataproc, Dataform, Looker, Data Fusion, Dataplex, Datastream, Pub/Sub Lite, Analytics Hub
  - **AI/ML** (12): AI Platform, AutoML, Recommendations AI, Vision AI, Natural Language AI, Speech-to-Text, Text-to-Speech, Translation AI, Document AI, Video Intelligence, Dialogflow, Contact Center AI
  - **Developer Tools** (7): Cloud Build, Cloud Deploy, Artifact Registry, Source Repositories, Cloud Code, Cloud SDK, Skaffold
  - **Containers** (5): GKE Autopilot, GKE Enterprise, Container Registry, Cloud Run Jobs, Anthos Service Mesh
  - **API Management** (4): Cloud Endpoints, API Gateway, Apigee Hybrid, Apigee X
  - **Identity & Access** (6): Cloud Identity, IAP, Access Context Manager, Managed AD, Cloud Identity Engine, Workforce Identity Federation

  ## Relationship Types Added (9)

  - `processes` - Data processing pipelines
  - `transforms` - Data transformation
  - `orchestrates` - Workflow orchestration
  - `triggers` - Event triggering
  - `schedules` - Job scheduling
  - `streams` - Data streaming
  - `builds` - Build pipelines
  - `deploys` - Deployment pipelines
  - `analyzes` - AI/ML analysis

  ## Validation Rules Added (10)

  ### AWS (6)

  - Step Functions orchestration targets (info)
  - EventBridge rule targets (info)
  - Kinesis Firehose destination validation (warning)
  - EMR VPC placement (warning)
  - SageMaker VPC placement guidance (info)
  - CodePipeline stage validation (info)

  ### GCP (6)

  - Workflows orchestration targets (info)
  - Eventarc trigger targets (info)
  - Dataproc VPC placement (warning)
  - AI Platform VPC placement guidance (info)
  - IAP backend service configuration (info)
  - GKE Autopilot VPC placement (info)

  ## Coverage Progress

  - AWS: 63 → 111 services (35.6% → 62.7%)
  - GCP: 61 → 108 services (36.3% → 64.3%)
  - Combined: 124 → 219 services (35.9% → 63.5%)
  - ✅ Tier 2 milestone (50%) exceeded

  ## Breaking Changes

  None - all changes are additive.

### Patch Changes

- Updated dependencies [fa3c5af]
- Updated dependencies [ced0859]
- Updated dependencies [8fcbb08]
- Updated dependencies [a6d55b3]
- Updated dependencies [a6d55b3]
- Updated dependencies [a6d55b3]
- Updated dependencies [a6d55b3]
  - @archlex/icons-core@0.2.0
  - @archlex/aws@0.2.0
  - @archlex/gcp@0.2.0
  - @archlex/model@0.2.0
  - @archlex/parser@0.2.0
  - @archlex/diagnostics@0.2.0
  - @archlex/renderer-svg@0.2.0
  - @archlex/layout-elk@0.2.0
