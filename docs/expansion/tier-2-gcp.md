# Tier 2 GCP Services: Application Services

**Target**: 45-50 services  
**Priority**: High  
**Timeline**: Week 3-4  
**Release**: v0.3.0

## Status Summary

- **Total Services**: 47
- **Completed**: 0
- **In Progress**: 0
- **Not Started**: 47

## Application Integration (5 services)

- [ ] **Cloud Scheduler** - `cloud-scheduler`
- [ ] **Workflows** - `workflows`
- [ ] **Eventarc** - `eventarc`
- [ ] **Cloud Composer** (Airflow) - `cloud-composer`
- [ ] **Apigee API Management** - `apigee`

## Analytics (8 services)

- [ ] **Dataproc** (Spark/Hadoop) - `dataproc`
- [ ] **Dataform** - `dataform`
- [ ] **Looker** - `looker`
- [ ] **Data Fusion** - `data-fusion`
- [ ] **Dataplex** - `dataplex`
- [ ] **Datastream** - `datastream`
- [ ] **Pub/Sub Lite** - `pubsub-lite`
- [ ] **Analytics Hub** - `analytics-hub`

## AI/ML (12 services)

- [ ] **AI Platform** - `ai-platform`
- [ ] **AutoML** - `automl`
- [ ] **Recommendations AI** - `recommendations-ai`
- [ ] **Vision AI** - `vision-ai`
- [ ] **Natural Language AI** - `natural-language-ai`
- [ ] **Speech-to-Text** - `speech-to-text`
- [ ] **Text-to-Speech** - `text-to-speech`
- [ ] **Translation AI** - `translation-ai`
- [ ] **Document AI** - `document-ai`
- [ ] **Video Intelligence API** - `video-intelligence`
- [ ] **Dialogflow** - `dialogflow`
- [ ] **Contact Center AI** - `contact-center-ai`

## Developer Tools (7 services)

- [ ] **Cloud Build** - `cloud-build`
- [ ] **Cloud Deploy** - `cloud-deploy`
- [ ] **Artifact Registry** - `artifact-registry`
- [ ] **Source Repositories** - `source-repositories`
- [ ] **Cloud Code** - `cloud-code`
- [ ] **Cloud SDK** - `cloud-sdk`
- [ ] **Skaffold** - `skaffold`

## Containers (5 services)

- [ ] **GKE Autopilot** - `gke-autopilot`
- [ ] **GKE Enterprise** (Anthos) - `gke-enterprise`
- [ ] **Container Registry** (legacy) - `container-registry`
- [ ] **Cloud Run Jobs** - `cloud-run-jobs`
- [ ] **Anthos Service Mesh** - `anthos-service-mesh`

## API Management (4 services)

- [ ] **Cloud Endpoints** - `cloud-endpoints`
- [ ] **API Gateway** - `api-gateway`
- [ ] **Apigee Hybrid** - `apigee-hybrid`
- [ ] **Apigee X** - `apigee-x`

## Identity & Access (6 services)

- [ ] **Cloud Identity** - `cloud-identity`
- [ ] **Identity-Aware Proxy (IAP)** - `iap`
- [ ] **Access Context Manager** - `access-context-manager`
- [ ] **Managed Service for Microsoft AD** - `managed-ad`
- [ ] **Cloud Identity Engine** - `cloud-identity-engine`
- [ ] **Workforce Identity Federation** - `workforce-identity-federation`

## Validation Rules to Add (5-7 rules)

- [ ] Workflows should reference valid Cloud Functions/Cloud Run
- [ ] Dataproc clusters should be in VPC
- [ ] Cloud Composer should have valid DAG definitions
- [ ] GKE Autopilot should have proper node pool config
- [ ] Eventarc should have valid event sources and targets
- [ ] IAP should be configured with valid backend services

## Relationship Types to Add

- `processes` (Dataproc/Dataflow → data)
- `transforms` (Data Fusion → data)
- `orchestrates` (Workflows/Composer → services)
- `triggers` (Eventarc → services)
- `schedules` (Cloud Scheduler → services)
- `streams` (Pub/Sub → consumers)
- `builds` (Cloud Build → artifacts)
- `deploys` (Cloud Deploy → targets)
- `analyzes` (Document AI/Vision AI → data)

## Notes

- GKE Autopilot is distinct from standard GKE (different management model)
- Cloud Composer is managed Apache Airflow
- Apigee has multiple deployment models (Apigee, Hybrid, X)
- Document AI and Vision AI are specialized ML services
- Dataproc is managed Spark/Hadoop
