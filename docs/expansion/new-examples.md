# New ArchLex Architecture Examples

This document describes the 10 new real-world architecture examples added to showcase Tier 2-4 services and relationship types.

**Created**: 2026-07-31  
**Location**: `apps/playground/src/examples.ts`

## AWS Examples (5)

### 1. Live Video Streaming Pipeline
**ID**: `aws-media-streaming`  
**Category**: Media & Streaming  
**Services**: MediaLive, MediaPackage, CloudFront, S3  
**Relationships**: `transcodes`, `packages`, `archives`

Real-world use case for broadcasting live events, sports, or news. MediaLive ingests and transcodes live video, MediaPackage creates adaptive bitrate streams for different devices, CloudFront delivers globally, and S3 archives recordings.

### 2. IoT Data Collection & Analytics
**ID**: `aws-iot-analytics`  
**Category**: IoT & Edge  
**Services**: IoT Core, IoT Analytics, Timestream, QuickSight  
**Relationships**: `streams`, `writes`, `analyzes`

Industrial IoT scenario where sensor devices send telemetry through IoT Core, IoT Analytics processes and cleanses the data, Timestream stores time-series metrics, and QuickSight visualizes insights for operators.

### 3. Serverless Data Lake ETL Pipeline
**ID**: `aws-data-lake-etl`  
**Category**: Analytics & Data  
**Services**: Kinesis Firehose, S3, Glue, Athena  
**Relationships**: `streams`, `transforms`, `writes`, `queries`

Modern data engineering pattern where streaming data flows into a raw data lake, Glue ETL jobs transform and enrich the data, processed data lands in a curated lake, and Athena enables SQL queries without moving data.

### 4. Database Migration to Cloud
**ID**: `aws-migration-workflow`  
**Category**: Migration & Hybrid  
**Services**: Application Discovery, DMS, Aurora, ECS  
**Relationships**: `discovers`, `migrates`, `writes`, `connects`

Enterprise cloud migration scenario where Application Discovery maps the on-premises environment, DMS handles the database migration with minimal downtime, and applications connect to the new Aurora cluster.

### 5. Complete CI/CD Deployment Pipeline
**ID**: `aws-cicd-pipeline`  
**Category**: DevOps & CI/CD  
**Services**: CodeCommit, CodePipeline, CodeBuild, ECR, CodeDeploy, CloudFormation, ECS  
**Relationships**: `triggers`, `orchestrates`, `builds`, `deploys`

Full DevOps automation where code commits trigger a pipeline that builds containers, pushes to ECR, provisions infrastructure via CloudFormation, and deploys to ECS clusters.

## GCP Examples (5)

### 6. AI-Powered Document Processing
**ID**: `gcp-ai-document-processing`  
**Category**: Google Cloud AI  
**Services**: Cloud Storage, Document AI, Natural Language AI, Firestore, Cloud Search  
**Relationships**: `triggers`, `analyzes`, `writes`, `indexes`

Intelligent document management where uploaded PDFs are processed by Document AI to extract structured data, Natural Language AI analyzes sentiment and entities, results are stored in Firestore, and Cloud Search indexes for retrieval.

### 7. Modern Data Warehouse with Dataflow
**ID**: `gcp-data-warehouse`  
**Category**: Google Cloud Analytics  
**Services**: Pub/Sub, Dataflow, BigQuery, Looker, Dataplex  
**Relationships**: `streams`, `processes`, `analyzes`, `governs`

Real-time analytics architecture where event streams flow through Pub/Sub, Dataflow transforms and enriches the data, BigQuery serves as the data warehouse, Looker provides BI dashboards, and Dataplex ensures data governance.

### 8. Hybrid Cloud with Anthos
**ID**: `gcp-hybrid-anthos`  
**Category**: Google Cloud Hybrid  
**Services**: GKE Enterprise (Anthos), GKE, Anthos on VMware, Anthos on AWS, Config Connector  
**Relationships**: `orchestrates`, `manages`

Multi-cloud and hybrid scenario where Anthos provides a unified control plane managing Kubernetes clusters across GCP, on-premises VMware infrastructure, and AWS, with Config Connector automating infrastructure.

### 9. E-Commerce Recommendations Engine
**ID**: `gcp-retail-recommendations`  
**Category**: Google Cloud Retail  
**Services**: Retail API, Recommendations AI, Pub/Sub, Cloud Run, Memorystore  
**Relationships**: `streams`, `feeds`, `caches`, `reads`, `queries`

Personalized shopping experience where user behavior streams through Pub/Sub, Recommendations AI generates product suggestions from the catalog, results are cached in Memorystore for low-latency access by the Cloud Run frontend.

### 10. HIPAA-Compliant Healthcare Data Platform
**ID**: `gcp-healthcare-compliance`  
**Category**: Google Cloud Healthcare  
**Services**: Cloud Healthcare API, Cloud DLP, Assured Workloads, Cloud Logging, Cloud KMS  
**Relationships**: `protects`, `encrypts`, `logs`

Regulated healthcare data platform using Healthcare API for medical records storage, Cloud DLP to automatically protect PHI/PII, Cloud KMS for encryption at rest, and Assured Workloads to enforce HIPAA compliance controls with comprehensive audit logging.

## New Relationship Types Demonstrated

The examples showcase these newly added relationship types:

**Tier 2**: `orchestrates`, `triggers`, `streams`, `transforms`, `analyzes`, `builds`, `deploys`

**Tier 3**: `transcodes`, `packages`, `migrates`, `discovers`, `protects`, `governs`

## Categories Coverage

The new examples cover previously underrepresented categories:

- **Media & Streaming**: Live video production workflows
- **IoT & Edge**: Industrial IoT and telemetry
- **Analytics & Data**: Modern data lake architectures
- **Migration & Hybrid**: Cloud migration patterns
- **DevOps & CI/CD**: Complete automation pipelines
- **AI/ML**: Document processing and recommendations
- **Healthcare**: Compliance-focused architectures
- **Retail**: E-commerce personalization

## Testing

All examples have been validated to:
- ✅ Parse without syntax errors
- ✅ Resolve all service types correctly
- ✅ Use valid relationship types
- ✅ Render without structural errors
- ✅ Demonstrate real-world architectural patterns

## Total Examples

**Previous**: 18 examples  
**Added**: 10 examples  
**Total**: 28 architecture examples

The playground now provides comprehensive coverage of ArchLex's full service catalog across both AWS and GCP.
