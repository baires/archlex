# Tier 1 GCP Services: Core Infrastructure

**Target**: 35-40 services  
**Priority**: Critical  
**Timeline**: Week 1-2  
**Release**: v0.2.0

## Status Summary

- **Total Services**: 37
- **Completed**: 0
- **In Progress**: 0
- **Not Started**: 37

## Networking (10 services)

### VPC Infrastructure
- [ ] **Cloud NAT** - `cloud-nat`
  - Category: networking
  - Aliases: `nat`, `gcp.cloud-nat`
  - Containment: vpc
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud VPN** - `cloud-vpn`
  - Category: networking
  - Aliases: `vpn`, `gcp.cloud-vpn`
  - Containment: vpc
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Interconnect** - `cloud-interconnect`
  - Category: networking
  - Aliases: `interconnect`, `gcp.cloud-interconnect`
  - Containment: region
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Private Service Connect** - `private-service-connect`
  - Category: networking
  - Aliases: `psc`, `gcp.private-service-connect`
  - Containment: vpc
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Router** - `cloud-router`
  - Category: networking
  - Aliases: `router`, `gcp.cloud-router`
  - Containment: vpc
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **VPC Service Controls** - `vpc-service-controls`
  - Category: networking
  - Aliases: `service-controls`, `gcp.vpc-service-controls`
  - Containment: vpc
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Firewall** - `firewall`
  - Category: networking
  - Aliases: `vpc-firewall`, `gcp.firewall`
  - Containment: vpc
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Armor** - `cloud-armor`
  - Category: networking
  - Aliases: `armor`, `gcp.cloud-armor`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Network Endpoint Groups** - `network-endpoint-groups`
  - Category: networking
  - Aliases: `neg`, `gcp.network-endpoint-groups`
  - Containment: subnet
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Domains** - `cloud-domains`
  - Category: networking
  - Aliases: `domains`, `gcp.cloud-domains`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

## Compute (4 services)

- [ ] **Cloud Workstations** - `cloud-workstations`
  - Category: compute
  - Aliases: `workstations`, `gcp.cloud-workstations`
  - Containment: subnet
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Batch** - `batch`
  - Category: compute
  - Aliases: `gcp.batch`
  - Containment: subnet
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **App Engine** - `app-engine`
  - Category: compute
  - Aliases: `gae`, `gcp.app-engine`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Shell** - `cloud-shell`
  - Category: compute
  - Aliases: `shell`, `gcp.cloud-shell`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

## Storage (5 services)

- [ ] **Persistent Disk** - `persistent-disk`
  - Category: storage
  - Aliases: `pd`, `disk`, `gcp.persistent-disk`
  - Containment: subnet
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Filestore** - `filestore`
  - Category: storage
  - Aliases: `gcp.filestore`
  - Containment: subnet
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Archive Storage** - `archive-storage`
  - Category: storage
  - Aliases: `archive`, `gcp.archive-storage`
  - Containment: region
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Transfer Service** - `transfer-service`
  - Category: storage
  - Aliases: `storage-transfer`, `gcp.transfer-service`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Transfer Appliance** - `transfer-appliance`
  - Category: storage
  - Aliases: `gcp.transfer-appliance`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

## Database (3 services)

- [ ] **AlloyDB** - `alloydb`
  - Category: database
  - Aliases: `alloydb-for-postgresql`, `gcp.alloydb`
  - Containment: subnet
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Memcached** - `cloud-memcached`
  - Category: database
  - Aliases: `memcached`, `gcp.cloud-memcached`
  - Containment: subnet
  - Icon: Check GCP icons
  - Status: Not Started
  - Note: Distinct from Memorystore for Redis

- [ ] **Datastore** - `datastore`
  - Category: database
  - Aliases: `gcp.datastore`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

## Security (8 services)

- [ ] **Cloud KMS** - `cloud-kms`
  - Category: security
  - Aliases: `kms`, `gcp.cloud-kms`
  - Containment: region
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Security Command Center** - `security-command-center`
  - Category: security
  - Aliases: `scc`, `gcp.security-command-center`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Binary Authorization** - `binary-authorization`
  - Category: security
  - Aliases: `binauthz`, `gcp.binary-authorization`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Certificate Manager** - `certificate-manager`
  - Category: security
  - Aliases: `cert-manager`, `gcp.certificate-manager`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud HSM** - `cloud-hsm`
  - Category: security
  - Aliases: `hsm`, `gcp.cloud-hsm`
  - Containment: region
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **reCAPTCHA Enterprise** - `recaptcha-enterprise`
  - Category: security
  - Aliases: `recaptcha`, `gcp.recaptcha-enterprise`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Web Risk API** - `web-risk`
  - Category: security
  - Aliases: `gcp.web-risk`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Identity Platform** - `identity-platform`
  - Category: security
  - Aliases: `gcp.identity-platform`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

## Monitoring (7 services)

- [ ] **Cloud Monitoring** - `cloud-monitoring`
  - Category: monitoring
  - Aliases: `monitoring`, `stackdriver-monitoring`, `gcp.cloud-monitoring`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Logging** - `cloud-logging`
  - Category: monitoring
  - Aliases: `logging`, `stackdriver-logging`, `gcp.cloud-logging`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Trace** - `cloud-trace`
  - Category: monitoring
  - Aliases: `trace`, `gcp.cloud-trace`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Profiler** - `cloud-profiler`
  - Category: monitoring
  - Aliases: `profiler`, `gcp.cloud-profiler`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Error Reporting** - `error-reporting`
  - Category: monitoring
  - Aliases: `gcp.error-reporting`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Cloud Debugger** - `cloud-debugger`
  - Category: monitoring
  - Aliases: `debugger`, `gcp.cloud-debugger`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

- [ ] **Operations (formerly Stackdriver)** - `operations`
  - Category: monitoring
  - Aliases: `stackdriver`, `gcp.operations`
  - Containment: project
  - Icon: Check GCP icons
  - Status: Not Started

## Validation Rules to Add (3-5 rules)

- [ ] Cloud NAT should be in a VPC
- [ ] AlloyDB should be in a subnet with Private Service Connect
- [ ] Cloud Armor should be associated with load balancer
- [ ] VPC Service Controls should define perimeter
- [ ] Filestore should be in a VPC

## Relationship Types to Add

Consider adding these relationship types for Tier 1 services:
- `encrypts` (Cloud KMS → other services)
- `decrypts` (services → Cloud KMS)
- `monitors` (Cloud Monitoring → services)
- `logs` (services → Cloud Logging)
- `traces` (Cloud Trace → services)
- `profiles` (Cloud Profiler → services)

## Notes

- Cloud Monitoring/Logging/Trace are distinct services (unlike AWS CloudWatch which is often bundled)
- AlloyDB is PostgreSQL-compatible but architecturally distinct from Cloud SQL
- Binary Authorization is important for GKE security
- VPC Service Controls is critical for security perimeters
- Cloud Armor is GCP's WAF equivalent
