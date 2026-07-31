# Tier 3 GCP Services: Specialized Services

**Target**: 50-60 services  
**Priority**: Medium  
**Timeline**: Week 5-6  
**Release**: v0.4.0

## Status Summary

- **Total Services**: 52
- **Completed**: 0
- **In Progress**: 0
- **Not Started**: 52

## IoT (1 service)

- [ ] **IoT Core** - `iot-core`
  - Note: Service discontinued, keep for legacy diagrams

## Media (4 services)

- [ ] **Transcoder API** - `transcoder-api`
- [ ] **Video Intelligence API** - `video-intelligence-api`
- [ ] **Live Stream API** - `live-stream-api`
- [ ] **Media CDN** - `media-cdn`

## Gaming (2 services)

- [ ] **Game Servers** (Agones-based) - `game-servers`
- [ ] **Google Play Games Services** - `play-games-services`

## Business Applications (4 services)

- [ ] **Chrome Enterprise** - `chrome-enterprise`
- [ ] **Cloud Search** - `cloud-search`
- [ ] **Google Workspace Integration APIs** - `workspace-apis`
- [ ] **AppSheet** - `appsheet`

## Specialized Compute (5 services)

- [ ] **Bare Metal Solution** - `bare-metal-solution`
- [ ] **VMware Engine** - `vmware-engine`
- [ ] **Anthos on VMware** - `anthos-vmware`
- [ ] **Anthos on AWS** - `anthos-aws`
- [ ] **Anthos on Azure** - `anthos-azure`

## Migration (6 services)

- [ ] **Database Migration Service** - `database-migration`
- [ ] **Migrate for Compute Engine** - `migrate-compute-engine`
- [ ] **Migrate for Anthos** - `migrate-anthos`
- [ ] **BigQuery Data Transfer Service** - `bigquery-transfer`
- [ ] **Cloud Data Transfer** - `cloud-data-transfer`
- [ ] **Rapid Migration Assessment** - `rapid-migration-assessment`

## API Management (3 services)

- [ ] **Cloud Endpoints Service Management** - `endpoints-service-management`
- [ ] **Cloud Endpoints Service Control** - `endpoints-service-control`
- [ ] **Service Infrastructure** - `service-infrastructure`

## Identity (5 services)

- [ ] **Identity-Aware Proxy (IAP)** - `iap`
- [ ] **Cloud Identity Premium** - `cloud-identity-premium`
- [ ] **Context-Aware Access** - `context-aware-access`
- [ ] **BeyondCorp Enterprise** - `beyondcorp-enterprise`
- [ ] **Assured Workloads** - `assured-workloads`

## Healthcare & Life Sciences (3 services)

- [ ] **Cloud Healthcare API** - `cloud-healthcare-api`
- [ ] **Cloud Life Sciences** - `cloud-life-sciences`
- [ ] **Medical Imaging Suite** - `medical-imaging-suite`

## Retail & Commerce (3 services)

- [ ] **Retail API** - `retail-api`
- [ ] **Product Discovery** - `product-discovery`
- [ ] **Recommendations AI** - `recommendations-ai`

## Security (4 services)

- [ ] **Chronicle Security Operations** - `chronicle`
- [ ] **Cloud Asset Inventory** - `cloud-asset-inventory`
- [ ] **Policy Intelligence** - `policy-intelligence`
- [ ] **Risk Manager** - `risk-manager`

## Networking (4 services)

- [ ] **Network Intelligence Center** - `network-intelligence-center`
- [ ] **Network Connectivity Center** - `network-connectivity-center`
- [ ] **Traffic Director** - `traffic-director`
- [ ] **Service Directory** - `service-directory`

## Management (5 services)

- [ ] **Cloud Deployment Manager** - `deployment-manager`
- [ ] **Config Connector** - `config-connector`
- [ ] **Cloud Billing API** - `cloud-billing`
- [ ] **Recommender** - `recommender`
- [ ] **Active Assist** - `active-assist`

## Data Governance (3 services)

- [ ] **Data Catalog** - `data-catalog`
- [ ] **Data Loss Prevention (DLP)** - `dlp`
- [ ] **Sensitive Data Protection** - `sensitive-data-protection`

## Validation Rules to Add (0-3 rules)

- [ ] VMware Engine should be in a VPC
- [ ] Bare Metal Solution should have proper network configuration
- [ ] Healthcare API should have proper IAM and audit logging

## Relationship Types to Add

- `migrates` (Migration services → targets)
- `catalogs` (Data Catalog → datasets)
- `protects` (DLP → sensitive data)
- `governs` (Dataplex → data)

## Notes

- Anthos multi-cloud deployments (VMware, AWS, Azure) are important for hybrid architectures
- Healthcare and Life Sciences APIs are specialized but important for regulated industries
- Chronicle is GCP's security operations platform (SIEM)
- Bare Metal Solution is for specialized workloads requiring physical servers
- Many services are domain-specific and may not require extensive validation rules
