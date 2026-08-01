# GCP Semantics Specification

## Provider and catalog

The GCP provider implements the `CloudProvider` interface from `@archlex/model`:

```ts
interface CloudProvider {
  id: string;
  name: string;
  catalogVersion: string;
  supports(serviceKind: string): boolean;
  resolveService(serviceKind: string): ServiceMetadata | undefined;
  validateGraph(
    graph: CloudGraph,
    mode?: ValidationMode,
  ): readonly Diagnostic[];
}
```

The GCP provider ID is `gcp`. Each resource definition has a canonical ID, display name, category, unique aliases, and optional allowed containment. Canonical IDs remain stable within a major version; renames add deprecated aliases.

The generated icon manifest records the upstream archives and maps keys to sanitized fragments. Catalog loading performs no network request.

Unknown resources become generic nodes and emit `GCP-CATALOG-UNKNOWN-RESOURCE-001`. Unknown types are never silently coerced to known services.

## Icon provenance and sanitization

Icons come from the official Google Cloud icon library (<https://cloud.google.com/icons>):

- `core-products-icons.zip` (2025 icon system, sha256 `6531a10f58bc599c24d9a455d81dd757c1a03c3c43da9cddf639b859c1c1eece`) — unique product icons.
- `google-cloud-legacy-icons.zip` (sha256 `a6d9d7921758042538b462f03cf64614c2cebd96743b3ed63580a769fc7de3e9`) — classic product icons.

Both retrieved 2026-07-29. Policy: the 2025 unique product icon is used where one exists; otherwise the legacy classic icon fills the gap so every catalog service renders a distinct, recognizable icon. `vpc` and `subnet` share the legacy Virtual Private Cloud artwork (precedent: AWS ALB/NLB share one file).

Official GCP SVGs carry presentational CSS in `<style>` blocks. The import script deterministically resolves the observed flat subset (comma-separated `.class` selectors; `fill`, `fill-rule`, `opacity`, `stroke`, `mask`-family properties) into plain presentation attributes, strips `data-*` bookkeeping attributes, and removes emptied `<style>`/`<defs>` elements before the same strict sanitizer used for AWS runs. Anything outside that subset fails the build loudly. Re-ingesting the same archives must produce byte-identical output and checksums.

## MVP coverage

- Boundaries: organization/folder (`account` scope), region, project.
- Networking: VPC network, subnet, Cloud Load Balancing, Cloud DNS, Cloud CDN.
- Compute: Compute Engine, Cloud Run, Cloud Functions, GKE.
- Data: Cloud SQL, Cloud Spanner, Firestore, Bigtable, Memorystore, Cloud Storage.
- Messaging/events: Pub/Sub, Cloud Tasks.
- Analytics/AI: BigQuery, Vertex AI.
- Identity/security: IAM, Secret Manager.

## Extended coverage (Tier 1-3)

**Tier 1: Core Infrastructure** (37 services)
- Networking: Cloud NAT, Cloud VPN, Cloud Interconnect, Private Service Connect, Cloud Router, VPC Service Controls, Firewall, Cloud Armor, Network Endpoint Groups, Cloud Domains
- Compute: Cloud Workstations, Batch, App Engine, Cloud Shell
- Storage: Persistent Disk, Filestore, Archive Storage, Transfer Service, Transfer Appliance
- Database: AlloyDB, Memorystore for Memcached, Cloud Datastore
- Security: Cloud KMS, Security Command Center, Binary Authorization, Certificate Manager, Cloud HSM, reCAPTCHA Enterprise, Web Risk, Identity Platform
- Monitoring: Cloud Monitoring, Cloud Logging, Cloud Trace, Cloud Profiler, Error Reporting, Cloud Debugger, Cloud Operations

**Tier 2: Application Services** (53 services)
- Integration: Cloud Scheduler, Workflows, Eventarc, Cloud Composer (Airflow), Apigee
- Analytics: Dataproc, Dataform, Looker, Data Fusion, Dataplex, Datastream, Pub/Sub Lite, Analytics Hub
- AI/ML: AI Platform, AutoML, Recommendations AI, Vision AI, Natural Language AI, Speech-to-Text, Text-to-Speech, Translation AI, Document AI, Video Intelligence, Dialogflow, Contact Center AI
- Developer Tools: Cloud Build, Cloud Deploy, Artifact Registry, Source Repositories, Cloud Code, Cloud SDK, Skaffold
- Containers: GKE Autopilot, GKE Enterprise (Anthos), Container Registry, Cloud Run Jobs, Anthos Service Mesh
- API Management: Cloud Endpoints, API Gateway, Apigee Hybrid, Apigee X
- Identity & Access: Cloud Identity, IAP, Access Context Manager, Managed AD, Cloud Identity Engine, Workforce Identity Federation

**Tier 3: Specialized Services** (52 services)
- IoT: Cloud IoT Core (legacy)
- Media: Transcoder API, Video Intelligence API, Live Stream API, Media CDN
- Gaming: Game Servers (Agones), Google Play Games Services
- Business Applications: Chrome Enterprise, Cloud Search, Google Workspace APIs, AppSheet
- Specialized Compute: Bare Metal Solution, VMware Engine, Anthos on VMware/AWS/Azure
- Migration: Database Migration Service, Migrate for Compute Engine, Migrate for Anthos, BigQuery Data Transfer Service, Cloud Data Transfer, Rapid Migration Assessment
- API Management Extended: Cloud Endpoints Service Management, Service Control, Service Infrastructure
- Identity Extended: Cloud Identity Premium, Context-Aware Access, BeyondCorp Enterprise, Assured Workloads
- Healthcare & Life Sciences: Cloud Healthcare API, Cloud Life Sciences, Medical Imaging Suite
- Retail & Commerce: Retail API, Discovery AI for Retail
- Security Extended: Chronicle Security Operations, Cloud Asset Inventory, Policy Intelligence, Risk Manager
- Networking Extended: Network Intelligence Center, Network Connectivity Center, Traffic Director, Service Directory
- Management Tools: Cloud Deployment Manager, Config Connector, Cloud Billing API, Recommender, Active Assist
- Data Governance: Data Catalog, Cloud Data Loss Prevention, Sensitive Data Protection

**Tier 4: Edge Cases & Emerging Services** (30 services)
- Edge/Hybrid: Distributed Cloud Edge, Distributed Cloud Hosted, Edge TPU, Google Distributed Cloud Virtual
- Maps & Location: Google Maps Platform, Places API, Routes API, Geocoding API, Street View API
- Content & Media: YouTube Data API
- AI/ML Extended: Dialogflow CX, Contact Center AI Platform, Cloud Talent Solution
- Security Extended: Chronicle SOAR
- Management & Governance: Cloud Foundation Toolkit, Cloud Resource Manager, Cloud Billing Budget, Cloud Quotas, Infrastructure Manager, Policy Simulator
- Collaboration & Productivity: Google Workspace, Gmail API, Calendar API, Drive API
- Testing & QA: Firebase Test Lab, Cloud Testing

**Total Coverage**: ~212 services (Catalog version: `2026-07-31-tier4`)

Catalog entries may precede deep semantic rules. They render with official imagery and produce `info` only when placement or a relationship cannot be evaluated.

Containment uses the provider-agnostic grammar scopes (`account`, `region`, `vpc`, `subnet`): a GCP `account` scope models an organization or folder, and GCP VPC/subnet blocks model VPC networks and subnets.

## Relationships and validation

Relationship kinds are provider-neutral (`connects`, `reads`, `writes`, `publishes`, `subscribes`, `invokes`, `routes`, `replicates`, `assumes-role`); core handles unknown kinds. Labels do not affect semantics.

Validation order:

1. Core structural validation always checks IDs, references, scope, and graph integrity.
2. GCP validation checks catalog membership and containment.
3. GCP guidance reports suspicious or incomplete modeled architecture.

`normal` preserves severities. `strict` promotes provider/guidance warnings, but not info, to errors. `off` skips passes 2 and 3; catalog resolution still runs for rendering.

## Rule policy

Codes use `GCP-<DOMAIN>-<RULE>-NNN`, are globally unique, and have registry entries for severity, summary, and remediation. Removing or redefining a code is breaking.

Initial rules:

- `GCP-NETWORKING-SUBNET-CONTAINMENT-001` (warning): subnets should be nested within a VPC containment block.
- `GCP-DATA-CLOUD-SQL-NETWORK-001` (warning): a Cloud SQL instance and its compute client should not reside in different VPC scopes without peering.

Rules use only facts represented in the graph. ArchLex does not infer firewall rules, IAM policy contents, zones, or network peering unless the language models them.

## Verification

Validate canonical IDs, alias uniqueness, icon references, documented/unique rule codes, normal/strict/off outcomes, and deterministic catalog generation. Re-ingesting the same upstream archives must produce identical output and checksum.
