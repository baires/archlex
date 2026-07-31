# Tier 4 AWS Services: Edge Cases & Legacy

**Target**: 30-40 services  
**Priority**: Low  
**Timeline**: Week 7  
**Release**: v0.4.1

## Status Summary

- **Total Services**: 35
- **Completed**: 0
- **In Progress**: 0
- **Not Started**: 35

## Edge/Hybrid (8 services)

- [ ] **AWS Outposts** - `outposts`
- [ ] **Snow Family - Snowball** - `snowball`
- [ ] **Snow Family - Snowmobile** - `snowmobile`
- [ ] **Snow Family - Snowcone** - `snowcone`
- [ ] **AWS Wavelength** - `wavelength`
- [ ] **Local Zones** - `local-zones`
- [ ] **Outposts Rack** - `outposts-rack`
- [ ] **Outposts Server** - `outposts-server`

## Satellite (2 services)

- [ ] **AWS Ground Station** - `ground-station`
- [ ] **Ground Station Control** - `ground-station-control`

## Quantum (1 service)

- [ ] **Amazon Braket** - `braket`

## Legacy Services (5 services)

- [ ] **SimpleDB** - `simpledb` (legacy, mark as deprecated)
- [ ] **OpsWorks** - `opsworks` (legacy, mark as deprecated)
- [ ] **OpsWorks Stacks** - `opsworks-stacks` (legacy)
- [ ] **OpsWorks CM** - `opsworks-cm` (legacy)
- [ ] **Cloud9** - `cloud9` (consider deprecation path)

## Monitoring & Management (7 services)

- [ ] **Amazon Managed Grafana** - `managed-grafana`
- [ ] **Amazon Managed Prometheus** - `managed-prometheus`
- [ ] **CloudFormation** - `cloudformation`
- [ ] **Service Catalog** - `service-catalog`
- [ ] **AWS Config** - `config`
- [ ] **AWS Control Tower** - `control-tower`
- [ ] **AWS Organizations** - `organizations`

## Networking (4 services)

- [ ] **AWS Cloud Map** - `cloud-map`
- [ ] **AWS App Mesh** - `app-mesh`
- [ ] **Route 53 Resolver** - `route53-resolver`
- [ ] **VPC Lattice** - `vpc-lattice`

## Security & Compliance (4 services)

- [ ] **AWS Audit Manager** - `audit-manager`
- [ ] **AWS Artifact** - `artifact`
- [ ] **Detective** - `detective`
- [ ] **Inspector** - `inspector`

## Cost Management (4 services)

- [ ] **Cost Explorer** - `cost-explorer`
- [ ] **AWS Budgets** - `budgets`
- [ ] **Cost and Usage Report** - `cost-usage-report`
- [ ] **Savings Plans** - `savings-plans`

## Validation Rules to Add

- None required (graceful degradation sufficient)

## Relationship Types to Add

- None required

## Notes

- Outposts services are for hybrid cloud deployments
- Snow Family is for data transfer and edge computing
- SimpleDB and OpsWorks are legacy, keep for backward compatibility
- Quantum computing (Braket) is emerging technology
- Ground Station is for satellite data processing
- Many services are niche or regional
- Mark legacy services with deprecation warnings in future iterations
