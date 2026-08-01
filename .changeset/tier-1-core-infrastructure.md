---
"@archlex/aws": minor
"@archlex/gcp": minor
"@archlex/core": minor
---

feat: add Tier 1 core infrastructure services (76 services, 8 relationship types, 6 validation rules)

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
