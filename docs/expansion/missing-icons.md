# CloudMer Missing Icons Tracker

This document tracks services that have been added to CloudMer's catalog but don't have official icons available in the AWS or GCP icon libraries.

**Last Updated**: 2026-07-31

## Purpose

- Track services without official icons
- Document fallback icon strategies
- Schedule icon package reviews when new official icons are released

## AWS Missing Icons

**Status**: Tier 1 services added, icons not yet verified

### Tier 1 Services (Added 2026-07-31)

The following Tier 1 services have been added to the catalog. Icon availability needs verification:

**Networking (13 services):**
- vpc-endpoint-interface
- vpc-endpoint-gateway
- nat-gateway
- internet-gateway
- transit-gateway
- privatelink
- direct-connect
- vpn-gateway
- customer-gateway
- vpn-connection
- elastic-ip
- network-firewall
- global-accelerator

**Compute (3 services):**
- app-runner
- batch
- fargate

**Storage (6 services):**
- efs
- fsx-windows
- fsx-lustre
- ebs
- glacier
- storage-gateway

**Database (5 services):**
- aurora
- neptune
- documentdb
- timestream
- keyspaces

**Security (6 services):**
- waf
- shield
- secrets-manager
- kms
- acm
- guardduty

**Monitoring (6 services):**
- cloudwatch-logs
- cloudwatch-metrics
- cloudwatch-alarms
- xray
- cloudtrail
- systems-manager

**Action Required**: Run `pnpm run icons:generate` in packages/aws to attempt icon import. Services without official icons will use category fallbacks.

### Tier 2 Services (To be checked during implementation)

*This section will be populated as Tier 2 services are added*

### Tier 3 Services (To be checked during implementation)

*This section will be populated as Tier 3 services are added*

### Tier 4 Services (To be checked during implementation)

*This section will be populated as Tier 4 services are added*

## GCP Missing Icons

**Status**: Tier 1 services added, icons not yet verified

### Tier 1 Services (Added 2026-07-31)

The following Tier 1 services have been added to the catalog. Icon availability needs verification:

**Networking (10 services):**
- cloud-nat
- cloud-vpn
- cloud-interconnect
- private-service-connect
- cloud-router
- vpc-service-controls
- firewall
- cloud-armor
- network-endpoint-groups
- cloud-domains

**Compute (4 services):**
- cloud-workstations
- batch
- app-engine
- cloud-shell

**Storage (5 services):**
- persistent-disk
- filestore
- archive-storage
- transfer-service
- transfer-appliance

**Database (3 services):**
- alloydb
- cloud-memcached
- datastore

**Security (8 services):**
- cloud-kms
- security-command-center
- binary-authorization
- certificate-manager
- cloud-hsm
- recaptcha-enterprise
- web-risk
- identity-platform

**Monitoring (7 services):**
- cloud-monitoring
- cloud-logging
- cloud-trace
- cloud-profiler
- error-reporting
- cloud-debugger
- operations

**Action Required**: Run `pnpm run icons:generate` in packages/gcp to attempt icon import. Services without official icons will use category fallbacks.

### Tier 2 Services (To be checked during implementation)

*This section will be populated as Tier 2 services are added*

### Tier 3 Services (To be checked during implementation)

*This section will be populated as Tier 3 services are added*

### Tier 4 Services (To be checked during implementation)

*This section will be populated as Tier 4 services are added*

## Fallback Strategy

When a service doesn't have an official icon, use these fallback approaches:

### By Category

| Category | Fallback Icon | Example |
|----------|---------------|---------|
| compute | Generic server/compute icon | EC2, Compute Engine |
| networking | Generic network node icon | Custom networking services |
| database | Generic database cylinder | Custom databases |
| storage | Generic storage bucket | Custom storage |
| security | Generic shield icon | Security services |
| monitoring | Generic chart/graph icon | Monitoring services |
| analytics | Generic analytics icon | Analytics services |
| ai-ml | Generic AI/brain icon | ML services |

### Icon Resolution Order

1. **Official icon** from AWS/GCP icon package (preferred)
2. **Category fallback** from generic icon set
3. **Generic node** as last resort

## Icon Package Update Schedule

Check for new official icon packages:

- **Quarterly**: Review AWS Architecture Icons updates
- **Quarterly**: Review GCP Cloud Architecture icons updates
- **After major service launches**: Check if new icons are available

### Last Icon Package Versions

**AWS Architecture Icons**:
- Version: 2026-07-27
- SHA-256: `4b0ceea3ece5e9f3a2c5f201733386b0c9bfefcb71c23c5cca38ce00ebbb0506`

**GCP Cloud Icons**:
- Core Products: SHA-256 `6531a10f58bc599c24d9a455d81dd757c1a03c3c43da9cddf639b859c1c1eece`
- Legacy Icons: SHA-256 `a6d9d7921758042538b462f03cf64614c2cebd96743b3ed63580a769fc7de3e9`
- Manifest: SHA-256 `c3a17a4f2cddf4d69f27e657cd1e44b6ffc2526b2a7b17e68e9eda75fded181b`

## Notes

- Services without icons still render correctly (fallback to category icon or generic node)
- Icon availability doesn't block service addition
- Update this document during each tier implementation
- Quarterly reviews catch new icons from official sources

### Tier 2 Services (Added 2026-07-31)

The following Tier 2 services have been added to the catalog. Icon availability needs verification:

**Application Integration (5 services):**
- step-functions
- appflow
- appsync
- mq
- msk

**Analytics (10 services):**
- kinesis-streams
- kinesis-firehose
- kinesis-analytics
- emr
- glue
- athena
- redshift
- quicksight
- opensearch
- data-pipeline

**AI/ML (10 services):**
- sagemaker
- bedrock
- rekognition
- comprehend
- translate
- polly
- transcribe
- lex
- kendra
- forecast

**Developer Tools (7 services):**
- codepipeline
- codebuild
- codedeploy
- codecommit
- cloud9
- codeartifact
- codeguru

**Containers (5 services):**
- ecr
- ecs-anywhere
- eks-addons
- app-mesh
- copilot

**Serverless (6 services):**
- eventbridge-scheduler
- step-functions-express
- lambda-edge
- lambda-layers
- sam
- application-composer

**Messaging (5 services):**
- pinpoint
- ses
- sns-mobile
- eventbridge-pipes
- eventbridge-api-destinations

**Action Required**: Run `pnpm run -C packages/aws icons:generate` to attempt icon import. Services without official icons will use category fallbacks.

## GCP Missing Icons

**Status**: Tier 1 and Tier 2 services added, icons not yet verified

### Tier 2 Services (Added 2026-07-31)

The following Tier 2 services have been added to the catalog. Icon availability needs verification:

**Application Integration (5 services):**
- cloud-scheduler
- workflows
- eventarc
- cloud-composer
- apigee

**Analytics (8 services):**
- dataproc
- dataform
- looker
- data-fusion
- dataplex
- datastream
- pubsub-lite
- analytics-hub

**AI/ML (12 services):**
- ai-platform
- automl
- recommendations-ai
- vision-ai
- natural-language-ai
- speech-to-text
- text-to-speech
- translation-ai
- document-ai
- video-intelligence
- dialogflow
- contact-center-ai

**Developer Tools (7 services):**
- cloud-build
- cloud-deploy
- artifact-registry
- source-repositories
- cloud-code
- cloud-sdk
- skaffold

**Containers (5 services):**
- gke-autopilot
- gke-enterprise
- container-registry
- cloud-run-jobs
- anthos-service-mesh

**API Management (4 services):**
- cloud-endpoints
- api-gateway
- apigee-hybrid
- apigee-x

**Identity & Access (6 services):**
- cloud-identity
- iap
- access-context-manager
- managed-ad
- cloud-identity-engine
- workforce-identity-federation

**Action Required**: Run `pnpm run -C packages/gcp icons:generate` to attempt icon import. Services without official icons will use category fallbacks.

### Tier 3 Services (Added 2026-07-31)

The following Tier 3 specialized services have been added to the catalog. Many are expected to lack official icons:

**AWS Tier 3 Services:**

**IoT (8 services):**
- iot-core
- iot-analytics
- iot-events
- iot-greengrass
- iot-sitewise
- iot-twinmaker
- monitron
- panorama

**Media (8 services):**
- medialive
- mediaconvert
- mediapackage
- mediaconnect
- mediatailor
- ivs
- kinesis-video
- mediastore

**Gaming (2 services):**
- gamelift
- gamesparks

**End User Computing (5 services):**
- workspaces
- appstream
- workdocs
- worklink
- workmail

**Contact Center (3 services):**
- connect
- connect-customer-profiles
- connect-voice-id

**Business Applications (4 services):**
- chime
- honeycode
- workspaces-web
- wickr

**Blockchain (2 services):**
- managed-blockchain
- qldb

**Robotics & AR/VR (3 services):**
- robomaker
- sumerian
- iot-roborunner

**Migration (10 services):**
- dms
- sms
- datasync
- transfer-family
- migration-hub
- application-discovery
- application-migration
- migration-evaluator
- cloudendure
- mainframe-modernization

**Supply Chain & Industrial (2 services):**
- supply-chain
- private-5g

**Additional Compute (4 services):**
- elastic-beanstalk
- lightsail
- simspace-weaver
- compute-optimizer

**GCP Tier 3 Services:**

**IoT (1 service):**
- iot-core (legacy/discontinued)

**Media (4 services):**
- transcoder-api
- video-intelligence-api
- live-stream-api
- media-cdn

**Gaming (2 services):**
- game-servers
- play-games-services

**Business Applications (4 services):**
- chrome-enterprise
- cloud-search
- workspace-apis
- appsheet

**Specialized Compute (5 services):**
- bare-metal-solution
- vmware-engine
- anthos-vmware
- anthos-aws
- anthos-azure

**Migration (6 services):**
- database-migration
- migrate-compute-engine
- migrate-anthos
- bigquery-transfer
- cloud-data-transfer
- rapid-migration-assessment

**API Management Extended (3 services):**
- endpoints-service-management
- endpoints-service-control
- service-infrastructure

**Identity Extended (4 services):**
- cloud-identity-premium
- context-aware-access
- beyondcorp-enterprise
- assured-workloads

**Healthcare & Life Sciences (3 services):**
- cloud-healthcare-api
- cloud-life-sciences
- medical-imaging-suite

**Retail & Commerce (2 services):**
- retail-api
- product-discovery

**Security Extended (4 services):**
- chronicle
- cloud-asset-inventory
- policy-intelligence
- risk-manager

**Networking Extended (4 services):**
- network-intelligence-center
- network-connectivity-center
- traffic-director
- service-directory

**Management Tools (5 services):**
- deployment-manager
- config-connector
- cloud-billing
- recommender
- active-assist

**Data Governance (3 services):**
- data-catalog
- dlp
- sensitive-data-protection

**Expected Icon Coverage**: 20-30% for Tier 3 services (specialized services often lack official icons)

**Action Required**: Many Tier 3 services are domain-specific and may not have official icons. Use category fallbacks as documented in the Fallback Strategy section.

### Tier 4 Services (Added 2026-07-31)

The following Tier 4 edge case and legacy services have been added to the catalog. Most are expected to lack official icons:

**AWS Tier 4 Services:**

**Edge/Hybrid (8 services):**
- outposts
- snowball
- snowmobile
- snowcone
- wavelength
- local-zones
- outposts-rack
- outposts-server

**Satellite (1 service):**
- ground-station

**Quantum (1 service):**
- braket

**Legacy Services (4 services):**
- simpledb
- opsworks
- opsworks-stacks
- opsworks-cm

**Monitoring & Management (7 services):**
- managed-grafana
- managed-prometheus
- cloudformation
- service-catalog
- config
- control-tower
- organizations

**Networking (3 services):**
- cloud-map
- route53-resolver
- vpc-lattice

**Security & Compliance (4 services):**
- audit-manager
- artifact
- detective
- inspector

**Cost Management (4 services):**
- cost-explorer
- budgets
- cost-usage-report
- savings-plans

**GCP Tier 4 Services:**

**Edge/Hybrid (4 services):**
- distributed-cloud-edge
- distributed-cloud-hosted
- edge-tpu
- gdc-virtual

**Maps & Location (5 services):**
- maps-platform
- places-api
- routes-api
- geocoding-api
- street-view-api

**Content & Media (1 service):**
- youtube-data-api

**AI/ML Extended (3 services):**
- dialogflow-cx
- ccai-platform
- cloud-talent-solution

**Security Extended (1 service):**
- chronicle-soar

**Management & Governance (6 services):**
- cloud-foundation-toolkit
- cloud-resource-manager
- cloud-billing-budget
- cloud-quotas
- infrastructure-manager
- policy-simulator

**Collaboration & Productivity (4 services):**
- workspace
- gmail-api
- calendar-api
- drive-api

**Testing & QA (2 services):**
- firebase-test-lab
- cloud-testing

**Expected Icon Coverage**: 10-20% for Tier 4 services (edge cases, legacy, and niche services often lack official icons)

**Action Required**: Tier 4 services are edge cases and legacy services. Most will use category fallbacks. This is expected and acceptable for these specialized services.
