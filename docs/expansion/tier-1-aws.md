# Tier 1 AWS Services: Core Infrastructure

**Target**: 35-40 services  
**Priority**: Critical  
**Timeline**: Week 1-2  
**Release**: v0.2.0

## Status Summary

- **Total Services**: 39
- **Completed**: 0
- **In Progress**: 0
- **Not Started**: 39

## Networking (13 services)

### VPC Infrastructure
- [ ] **VPC Endpoint (Interface)** - `vpc-endpoint-interface`
  - Category: networking
  - Aliases: `vpc-endpoint`, `vpce-interface`, `aws.vpc-endpoint-interface`
  - Containment: vpc
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **VPC Endpoint (Gateway)** - `vpc-endpoint-gateway`
  - Category: networking
  - Aliases: `vpce-gateway`, `aws.vpc-endpoint-gateway`
  - Containment: vpc
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **NAT Gateway** - `nat-gateway`
  - Category: networking
  - Aliases: `nat`, `natgw`, `aws.nat-gateway`
  - Containment: subnet
  - Icon: Check AWS icons
  - Status: Not Started
  - Validation: Should be in public subnet

- [ ] **Internet Gateway** - `internet-gateway`
  - Category: networking
  - Aliases: `igw`, `aws.internet-gateway`
  - Containment: vpc
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Transit Gateway** - `transit-gateway`
  - Category: networking
  - Aliases: `tgw`, `aws.transit-gateway`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **PrivateLink** - `privatelink`
  - Category: networking
  - Aliases: `aws.privatelink`
  - Containment: vpc
  - Icon: Check AWS icons
  - Status: Not Started

### Connectivity
- [ ] **Direct Connect** - `direct-connect`
  - Category: networking
  - Aliases: `dx`, `aws.direct-connect`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **VPN Gateway** - `vpn-gateway`
  - Category: networking
  - Aliases: `vgw`, `aws.vpn-gateway`
  - Containment: vpc
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Customer Gateway** - `customer-gateway`
  - Category: networking
  - Aliases: `cgw`, `aws.customer-gateway`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **VPN Connection** - `vpn-connection`
  - Category: networking
  - Aliases: `site-to-site-vpn`, `aws.vpn-connection`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Elastic IP** - `elastic-ip`
  - Category: networking
  - Aliases: `eip`, `aws.elastic-ip`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Network Firewall** - `network-firewall`
  - Category: networking
  - Aliases: `aws.network-firewall`
  - Containment: vpc
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Global Accelerator** - `global-accelerator`
  - Category: networking
  - Aliases: `aws.global-accelerator`
  - Containment: account
  - Icon: Check AWS icons
  - Status: Not Started

## Compute (3 services)

- [ ] **App Runner** - `app-runner`
  - Category: compute
  - Aliases: `aws.app-runner`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **AWS Batch** - `batch`
  - Category: compute
  - Aliases: `aws.batch`
  - Containment: subnet
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Fargate** - `fargate`
  - Category: compute
  - Aliases: `aws.fargate`
  - Containment: subnet
  - Icon: Check AWS icons
  - Status: Not Started
  - Note: Distinct from ECS/EKS, represents Fargate profiles

## Storage (6 services)

- [ ] **EFS** - `efs`
  - Category: storage
  - Aliases: `elastic-file-system`, `aws.efs`
  - Containment: vpc
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **FSx for Windows File Server** - `fsx-windows`
  - Category: storage
  - Aliases: `fsx`, `aws.fsx-windows`
  - Containment: subnet
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **FSx for Lustre** - `fsx-lustre`
  - Category: storage
  - Aliases: `aws.fsx-lustre`
  - Containment: subnet
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **EBS** - `ebs`
  - Category: storage
  - Aliases: `elastic-block-store`, `aws.ebs`
  - Containment: subnet
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **S3 Glacier** - `glacier`
  - Category: storage
  - Aliases: `s3-glacier`, `aws.glacier`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Storage Gateway** - `storage-gateway`
  - Category: storage
  - Aliases: `aws.storage-gateway`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

## Database (5 services)

- [ ] **Aurora** - `aurora`
  - Category: database
  - Aliases: `rds-aurora`, `aws.aurora`
  - Containment: subnet
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Neptune** - `neptune`
  - Category: database
  - Aliases: `aws.neptune`
  - Containment: subnet
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **DocumentDB** - `documentdb`
  - Category: database
  - Aliases: `docdb`, `aws.documentdb`
  - Containment: subnet
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Timestream** - `timestream`
  - Category: database
  - Aliases: `aws.timestream`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Keyspaces** - `keyspaces`
  - Category: database
  - Aliases: `cassandra`, `aws.keyspaces`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

## Security (6 services)

- [ ] **WAF** - `waf`
  - Category: security
  - Aliases: `web-application-firewall`, `aws.waf`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Shield** - `shield`
  - Category: security
  - Aliases: `aws.shield`
  - Containment: account
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Secrets Manager** - `secrets-manager`
  - Category: security
  - Aliases: `secrets`, `aws.secrets-manager`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **KMS** - `kms`
  - Category: security
  - Aliases: `key-management-service`, `aws.kms`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Certificate Manager (ACM)** - `acm`
  - Category: security
  - Aliases: `certificate-manager`, `aws.acm`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **GuardDuty** - `guardduty`
  - Category: security
  - Aliases: `aws.guardduty`
  - Containment: account
  - Icon: Check AWS icons
  - Status: Not Started

## Monitoring (6 services)

- [ ] **CloudWatch Logs** - `cloudwatch-logs`
  - Category: monitoring
  - Aliases: `logs`, `aws.cloudwatch-logs`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **CloudWatch Metrics** - `cloudwatch-metrics`
  - Category: monitoring
  - Aliases: `metrics`, `aws.cloudwatch-metrics`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **CloudWatch Alarms** - `cloudwatch-alarms`
  - Category: monitoring
  - Aliases: `alarms`, `aws.cloudwatch-alarms`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **X-Ray** - `xray`
  - Category: monitoring
  - Aliases: `x-ray`, `aws.xray`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **CloudTrail** - `cloudtrail`
  - Category: monitoring
  - Aliases: `aws.cloudtrail`
  - Containment: account
  - Icon: Check AWS icons
  - Status: Not Started

- [ ] **Systems Manager** - `systems-manager`
  - Category: monitoring
  - Aliases: `ssm`, `aws.systems-manager`
  - Containment: region
  - Icon: Check AWS icons
  - Status: Not Started

## Validation Rules to Add (3-5 rules)

- [ ] NAT Gateway should be in a public subnet
- [ ] Internet Gateway should be attached to VPC
- [ ] VPC Endpoints should reference valid services
- [ ] Transit Gateway should have route table associations
- [ ] CloudWatch Alarms should reference valid metrics

## Relationship Types to Add

Consider adding these relationship types for Tier 1 services:
- `encrypts` (KMS → other services)
- `decrypts` (services → KMS)
- `monitors` (CloudWatch → services)
- `logs` (services → CloudWatch Logs)
- `caches` (ElastiCache/CloudFront → origin)
- `proxies` (NAT Gateway/RDS Proxy → target)

## Notes

- NAT Gateway and Internet Gateway are critical for networking diagrams
- CloudWatch services should be separate resources for fine-grained diagrams
- Aurora is distinct from RDS (different architecture)
- Fargate is a compute type, not just an ECS/EKS feature
