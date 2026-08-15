# @archlex/aws

## 0.3.0

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

- Updated dependencies [f53538f]
  - @archlex/model@0.5.0

## 0.2.3

### Patch Changes

- Updated dependencies [29e730b]
  - @archlex/model@0.4.0
  - @archlex/icons-core@0.2.3

## 0.2.2

### Patch Changes

- Updated dependencies [12dd3ec]
  - @archlex/model@0.3.0

## 0.2.1

### Patch Changes

- 69fac46: Remove the redundant `typecheck` script from packages whose `build` already
  runs `tsc --emitDeclarationOnly` (a full type check), eliminating a second
  `tsc --noEmit` pass in CI. Apps and packages with non-tsc builds keep their
  standalone `typecheck` script.
- Updated dependencies [69fac46]
  - @archlex/icons-core@0.2.1
  - @archlex/model@0.2.1

## 0.2.0

### Minor Changes

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

- a6d55b3: # Tier 3: Specialized Services Expansion

  Adds 55 AWS and 52 GCP specialized services for domain-specific workloads including IoT, media processing, gaming, end-user computing, healthcare, migration tools, and business applications.

  ## AWS Tier 3 Services (55 services)

  ### IoT Services (8 services)

  - AWS IoT Core, IoT Analytics, IoT Events, IoT Greengrass, IoT SiteWise
  - AWS IoT TwinMaker, Amazon Monitron, AWS Panorama

  ### Media Services (8 services)

  - AWS Elemental MediaLive, MediaConvert, MediaPackage, MediaConnect, MediaTailor
  - Amazon Interactive Video Service (IVS), Kinesis Video Streams, MediaStore

  ### Gaming (2 services)

  - Amazon GameLift, GameSparks

  ### End User Computing (5 services)

  - Amazon WorkSpaces, AppStream 2.0, WorkDocs, WorkLink, WorkMail

  ### Contact Center (3 services)

  - Amazon Connect, Connect Customer Profiles, Connect Voice ID

  ### Business Applications (4 services)

  - Amazon Chime, Honeycode, WorkSpaces Web, AWS Wickr

  ### Blockchain & Ledger (2 services)

  - Amazon Managed Blockchain, Amazon QLDB

  ### Robotics & AR/VR (3 services)

  - AWS RoboMaker, Amazon Sumerian, AWS IoT RoboRunner

  ### Migration Services (10 services)

  - AWS Database Migration Service (DMS), Server Migration Service (SMS)
  - AWS DataSync, Transfer Family, Migration Hub
  - Application Discovery Service, Application Migration Service
  - Migration Evaluator, CloudEndure Migration, Mainframe Modernization

  ### Supply Chain & Industrial (2 services)

  - AWS Supply Chain, AWS Private 5G

  ### Additional Compute (4 services)

  - AWS Elastic Beanstalk, Amazon Lightsail, AWS SimSpace Weaver, AWS Compute Optimizer

  ## GCP Tier 3 Services (52 services)

  ### IoT (1 service)

  - Cloud IoT Core (legacy, kept for backward compatibility)

  ### Media Services (4 services)

  - Transcoder API, Video Intelligence API, Live Stream API, Media CDN

  ### Gaming (2 services)

  - Game Servers (Agones-based), Google Play Games Services

  ### Business Applications (4 services)

  - Chrome Enterprise, Cloud Search, Google Workspace APIs, AppSheet

  ### Specialized Compute (5 services)

  - Bare Metal Solution, VMware Engine
  - Anthos on VMware, Anthos on AWS, Anthos on Azure

  ### Migration Services (6 services)

  - Database Migration Service, Migrate for Compute Engine, Migrate for Anthos
  - BigQuery Data Transfer Service, Cloud Data Transfer, Rapid Migration Assessment

  ### API Management Extended (3 services)

  - Cloud Endpoints Service Management, Service Control, Service Infrastructure

  ### Identity Extended (4 services)

  - Cloud Identity Premium, Context-Aware Access, BeyondCorp Enterprise, Assured Workloads

  ### Healthcare & Life Sciences (3 services)

  - Cloud Healthcare API, Cloud Life Sciences, Medical Imaging Suite

  ### Retail & Commerce (2 services)

  - Retail API, Discovery AI for Retail

  ### Security Extended (4 services)

  - Chronicle Security Operations, Cloud Asset Inventory, Policy Intelligence, Risk Manager

  ### Networking Extended (4 services)

  - Network Intelligence Center, Network Connectivity Center, Traffic Director, Service Directory

  ### Management Tools (5 services)

  - Cloud Deployment Manager, Config Connector, Cloud Billing API, Recommender, Active Assist

  ### Data Governance (3 services)

  - Data Catalog, Cloud Data Loss Prevention, Sensitive Data Protection

  ## Breaking Changes

  None. All additions are backward compatible.

  ## Notes

  - Catalog version updated to `2026-07-31-tier3` for both providers
  - Many Tier 3 services are specialized and may not have official icons in vendor icon libraries
  - Services without official icons use category-based fallback icons
  - Icon availability tracked in `docs/expansion/missing-icons.md`
  - Tier 3 services have minimal validation rules (0-3 per provider) focusing on critical architectural guidance
  - All services render correctly with fallback icons when official artwork is unavailable

- a6d55b3: # Tier 4: Edge Cases & Emerging Services

  Completes the ArchLex ecosystem expansion by adding 35 AWS and 30 GCP edge case, legacy, and emerging services. This release achieves near-complete coverage of documented AWS and GCP services.

  ## AWS Tier 4 Services (35 services)

  ### Edge/Hybrid (8 services)

  - AWS Outposts (Rack/Server), Snow Family (Snowball/Snowmobile/Snowcone)
  - AWS Wavelength, AWS Local Zones

  ### Satellite (1 service)

  - AWS Ground Station

  ### Quantum Computing (1 service)

  - Amazon Braket

  ### Legacy Services (4 services)

  - Amazon SimpleDB, AWS OpsWorks (Stacks/Chef Automate)

  ### Monitoring & Management (7 services)

  - Amazon Managed Grafana, Amazon Managed Prometheus
  - AWS CloudFormation, Service Catalog, Config, Control Tower, Organizations

  ### Networking (3 services)

  - AWS Cloud Map, Route 53 Resolver, Amazon VPC Lattice

  ### Security & Compliance (4 services)

  - AWS Audit Manager, AWS Artifact, Amazon Detective, Amazon Inspector

  ### Cost Management (4 services)

  - AWS Cost Explorer, AWS Budgets, Cost and Usage Report, AWS Savings Plans

  ## GCP Tier 4 Services (30 services)

  ### Edge/Hybrid (4 services)

  - Google Distributed Cloud (Edge/Hosted/Virtual), Edge TPU

  ### Maps & Location (5 services)

  - Google Maps Platform, Places API, Routes API, Geocoding API, Street View API

  ### Content & Media (1 service)

  - YouTube Data API

  ### AI/ML Extended (3 services)

  - Dialogflow CX, Contact Center AI Platform, Cloud Talent Solution

  ### Security Extended (1 service)

  - Chronicle SOAR

  ### Management & Governance (6 services)

  - Cloud Foundation Toolkit, Cloud Resource Manager, Cloud Billing Budget
  - Cloud Quotas, Infrastructure Manager, Policy Simulator

  ### Collaboration & Productivity (4 services)

  - Google Workspace, Gmail API, Calendar API, Drive API

  ### Testing & QA (2 services)

  - Firebase Test Lab, Cloud Testing

  ## Coverage Summary

  **AWS**: ~210 services (~95% of documented services)
  **GCP**: ~212 services (~98% of documented services)

  Combined: **422 cloud services** across both providers

  ## Breaking Changes

  None. All additions are backward compatible.

  ## Notes

  - Catalog version updated to `2026-07-31-tier4` for both providers
  - Tier 4 services are edge cases, legacy, regional, or niche offerings
  - Many Tier 4 services lack official vendor icons - category-based fallbacks are used
  - Zero validation rules added (graceful degradation sufficient)
  - SimpleDB and OpsWorks marked as legacy but retained for backward compatibility
  - Snow Family and Outposts services support hybrid cloud architectures
  - Maps Platform and Workspace APIs enable integration scenarios
  - All services render correctly with fallback icons when official artwork is unavailable

  ## Expansion Complete

  With Tier 4, the ArchLex ecosystem expansion is complete:

  - **Tier 0 (MVP)**: 24 services per provider (foundation)
  - **Tier 1**: +39 AWS, +37 GCP (core infrastructure)
  - **Tier 2**: +48 AWS, +53 GCP (application services)
  - **Tier 3**: +55 AWS, +52 GCP (specialized services)
  - **Tier 4**: +35 AWS, +30 GCP (edge cases & legacy)

  **Final Total**: ~210 AWS + ~212 GCP = **422 services**

### Patch Changes

- fa3c5af: Add explicit browser and Node icon-loading adapters backed by a shared
  browser-safe core, version-pinned AWS and GCP provider definitions, and core
  prepare/load/render APIs. The playground now fetches missing icons with
  fixture-covered fallback behavior while preserving a static browser bundle.
- Updated dependencies [fa3c5af]
- Updated dependencies [ced0859]
- Updated dependencies [8fcbb08]
  - @archlex/icons-core@0.2.0
  - @archlex/model@0.2.0
