---
"@cloudmer/aws": minor
"@cloudmer/gcp": minor
"@cloudmer/core": minor
---

feat: add Tier 2 application services (95 services, 9 relationship types, 10 validation rules)

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
