# AWS Semantics Specification

## Provider and catalog

The AWS provider implements the `CloudProvider` interface from `@archlex/model`:

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

The AWS provider ID is `aws`. Each resource definition has a canonical ID, display name, category, unique aliases, official icon key, allowed containment, emitted/accepted relationships, and rule IDs. Canonical IDs remain stable within a major version; renames add deprecated aliases.

The generated icon manifest records the upstream release and maps keys to sanitized fragments. Catalog loading performs no network request.

Unknown resources become generic AWS nodes and emit `AWS-CATALOG-UNKNOWN-RESOURCE`. Unknown types are never silently coerced to known services.

## MVP coverage

- Boundaries/networking: account, region, VPC, subnet, route table, security group.
- Load balancing/API: ALB, NLB, API Gateway.
- Compute: Lambda, ECS, EKS, EC2.
- Data: RDS, RDS Proxy, DynamoDB, ElastiCache, S3.
- Messaging/events: SQS, SNS, EventBridge.
- Identity: IAM role.
- Edge/DNS: CloudFront and Route 53.

## Extended coverage (Tier 1-3)

**Tier 1: Core Infrastructure** (39 services)
- Networking: VPC Endpoints, NAT Gateway, Internet Gateway, Transit Gateway, Direct Connect, PrivateLink, Network Firewall, Global Accelerator
- Compute: App Runner, Batch, Fargate
- Storage: EFS, FSx (Windows/Lustre), EBS, Glacier, Storage Gateway
- Database: Aurora, Neptune, DocumentDB, Timestream, Keyspaces
- Security: WAF, Shield, Secrets Manager, KMS, ACM, GuardDuty
- Monitoring: CloudWatch (Logs/Metrics/Alarms), X-Ray, CloudTrail, Systems Manager

**Tier 2: Application Services** (48 services)
- Integration: Step Functions, AppFlow, AppSync, MQ, MSK, EventBridge extensions
- Analytics: Kinesis (Streams/Firehose/Analytics), EMR, Glue, Athena, Redshift, QuickSight, OpenSearch, Data Pipeline
- AI/ML: SageMaker, Bedrock, Rekognition, Comprehend, Translate, Polly, Transcribe, Lex, Kendra, Forecast
- Developer Tools: CodePipeline, CodeBuild, CodeDeploy, CodeCommit, Cloud9, CodeArtifact, CodeGuru
- Containers: ECR, ECS Anywhere, EKS Add-ons, App Mesh, Copilot
- Serverless: Lambda@Edge, Lambda Layers, SAM, Application Composer

**Tier 3: Specialized Services** (55 services)
- IoT: IoT Core, IoT Analytics, IoT Events, IoT Greengrass, IoT SiteWise, IoT TwinMaker, Monitron, Panorama
- Media: MediaLive, MediaConvert, MediaPackage, MediaConnect, MediaTailor, IVS, Kinesis Video Streams, MediaStore
- Gaming: GameLift, GameSparks
- End User Computing: WorkSpaces, AppStream 2.0, WorkDocs, WorkLink, WorkMail
- Contact Center: Amazon Connect (with Customer Profiles and Voice ID)
- Business Applications: Chime, Honeycode, WorkSpaces Web, Wickr
- Blockchain: Managed Blockchain, QLDB
- Robotics & AR/VR: RoboMaker, Sumerian, IoT RoboRunner
- Migration: DMS, SMS, DataSync, Transfer Family, Migration Hub, Application Discovery, Application Migration, Migration Evaluator, CloudEndure, Mainframe Modernization
- Supply Chain: Supply Chain, Private 5G
- Additional Compute: Elastic Beanstalk, Lightsail, SimSpace Weaver, Compute Optimizer

**Tier 4: Edge Cases & Legacy** (35 services)
- Edge/Hybrid: AWS Outposts (Rack/Server), Snow Family (Snowball/Snowmobile/Snowcone), AWS Wavelength, Local Zones
- Satellite: AWS Ground Station
- Quantum: Amazon Braket
- Legacy Services: SimpleDB, OpsWorks (Stacks/Chef Automate)
- Monitoring & Management: Managed Grafana, Managed Prometheus, CloudFormation, Service Catalog, Config, Control Tower, Organizations
- Networking: Cloud Map, App Mesh (legacy, moved from Tier 2), Route 53 Resolver, VPC Lattice
- Security & Compliance: Audit Manager, Artifact, Detective, Inspector
- Cost Management: Cost Explorer, Budgets, Cost and Usage Report, Savings Plans

**Total Coverage**: ~210 services (Catalog version: `2026-07-31-tier4`)

Catalog entries may precede deep semantic rules. They render with official imagery and produce `info` only when placement or a relationship cannot be evaluated.

## Relationships and validation

Neutral kinds are `connects`, `reads`, `writes`, `publishes`, `subscribes`, `invokes`, `routes`, `replicates`, and `assumes-role`. Generic edges receive structural validation only. Unknown custom kinds are preserved and emit `AWS-RELATIONSHIP-UNKNOWN-KIND`; labels do not affect semantics.

Validation order:

1. Core structural validation always checks IDs, references, scope, and graph integrity.
2. AWS validation checks containment and source/kind/target compatibility.
3. AWS guidance reports suspicious or incomplete modeled architecture.

`normal` preserves severities. `strict` promotes provider/guidance warnings, but not info, to errors. `off` skips passes 2 and 3; catalog resolution still runs for rendering.

## Rule policy

Codes use `AWS-<DOMAIN>-<RULE>-NNN`, are globally unique, and have registry entries for severity, summary, rationale, resources, and remediation. Removing or redefining a code is breaking.

The first cross-resource rule is `AWS-RDS-PROXY-NETWORK-001`: RDS Proxy and its target must have compatible VPC placement.

Rules use only facts represented in the graph. ArchLex does not infer security-group rules, IAM policy contents, availability zones, or trust policies unless the language models them.

Invalid and unknown elements remain in the graph with validity metadata; layout and rendering may not drop them solely due to semantics.

## Verification

Validate schemas, canonical IDs, alias uniqueness, icon references, documented/unique rule codes, normal/strict/off outcomes, and deterministic catalog generation. Re-ingesting one upstream archive must produce identical output and checksum.
