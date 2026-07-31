---
"@cloudmer/aws": minor
"@cloudmer/gcp": minor
---

# Tier 3: Specialized Services Expansion

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
