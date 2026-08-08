# @archlex/core

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
