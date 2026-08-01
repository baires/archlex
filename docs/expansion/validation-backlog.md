# ArchLex Validation Rules Backlog

This document tracks validation rules that should be added for new services but haven't been implemented yet. Use this to prioritize validation work across tiers.

**Last Updated**: 2026-07-31

## Purpose

- Track planned validation rules for new services
- Prioritize which rules to implement first
- Document architectural patterns that need validation

## Validation Rule Budget

| Tier | AWS Rules Target | GCP Rules Target | Total Target |
|------|------------------|------------------|--------------|
| Tier 0 (MVP) | 8 (✓ Complete) | 3 (✓ Complete) | 11 (✓ Complete) |
| Tier 1 | 3-5 | 3-5 | 6-10 |
| Tier 2 | 5-7 | 5-7 | 10-14 |
| Tier 3 | 0-3 | 0-3 | 0-6 |
| Tier 4 | 0 | 0 | 0 |
| **Total Target** | **16-23** | **11-18** | **27-41** |

## Current Rule Count

| Provider | Current Rules | Added This Phase | Total Rules |
|----------|---------------|------------------|-------------|
| AWS | 8 | 0 | 8 |
| GCP | 3 | 0 | 3 |
| **Total** | **11** | **0** | **11** |

---

## Tier 1 Validation Rules Backlog

### AWS Tier 1 Rules (3-5 rules)

**Priority: High**

- [ ] **NAT Gateway Placement** - `AWS-NETWORKING-NAT-GATEWAY-PLACEMENT-001`
  - Severity: Warning
  - Summary: NAT Gateway should be placed in a public subnet
  - Rationale: NAT Gateways require public subnet for internet access
  
- [ ] **Internet Gateway Attachment** - `AWS-NETWORKING-IGW-ATTACHMENT-001`
  - Severity: Error
  - Summary: Internet Gateway must be attached to a VPC
  - Rationale: IGW is meaningless without VPC attachment

- [ ] **VPC Endpoint Service Reference** - `AWS-NETWORKING-VPCE-SERVICE-001`
  - Severity: Info
  - Summary: VPC Endpoint should reference a valid AWS service
  - Rationale: Helps validate endpoint configuration

- [ ] **Transit Gateway Route Association** - `AWS-NETWORKING-TGW-ROUTES-001`
  - Severity: Warning
  - Summary: Transit Gateway should have route table associations
  - Rationale: TGW needs routes to function

- [ ] **CloudWatch Alarms Metric Reference** - `AWS-MONITORING-CW-ALARMS-METRICS-001`
  - Severity: Info
  - Summary: CloudWatch Alarms should reference valid metrics
  - Rationale: Helps validate alarm configuration

### GCP Tier 1 Rules (3-5 rules)

**Priority: High**

- [ ] **Cloud NAT VPC Placement** - `GCP-NETWORKING-NAT-VPC-001`
  - Severity: Warning
  - Summary: Cloud NAT should be configured within a VPC
  - Rationale: NAT requires VPC context

- [ ] **AlloyDB Private Service Connect** - `GCP-DATA-ALLOYDB-PSC-001`
  - Severity: Warning
  - Summary: AlloyDB should use Private Service Connect for subnet access
  - Rationale: AlloyDB requires PSC for VPC connectivity

- [ ] **Cloud Armor Load Balancer Association** - `GCP-NETWORKING-ARMOR-LB-001`
  - Severity: Info
  - Summary: Cloud Armor should be associated with a load balancer
  - Rationale: Armor policies apply at LB level

- [ ] **VPC Service Controls Perimeter** - `GCP-NETWORKING-SERVICE-CONTROLS-PERIMETER-001`
  - Severity: Warning
  - Summary: VPC Service Controls should define a perimeter
  - Rationale: Service controls need perimeter definition

- [ ] **Filestore VPC Placement** - `GCP-STORAGE-FILESTORE-VPC-001`
  - Severity: Warning
  - Summary: Filestore should be in a VPC
  - Rationale: Filestore requires VPC for access

---

## Tier 2 Validation Rules Backlog

### AWS Tier 2 Rules (5-7 rules)

**Priority: Medium**

- [ ] **Step Functions Task Reference** - `AWS-INTEGRATION-SFN-TASKS-001`
  - Severity: Warning
  - Summary: Step Functions should reference valid Lambda/ECS tasks
  - Rationale: Validates state machine configuration

- [ ] **Kinesis Firehose Destination** - `AWS-ANALYTICS-FIREHOSE-DESTINATION-001`
  - Severity: Error
  - Summary: Kinesis Firehose must have a valid destination (S3/Redshift/OpenSearch)
  - Rationale: Firehose requires destination

- [ ] **SageMaker VPC Training** - `AWS-ML-SAGEMAKER-VPC-001`
  - Severity: Info
  - Summary: SageMaker training jobs should use VPC for private data
  - Rationale: Security best practice for sensitive data

- [ ] **CodePipeline Stages** - `AWS-DEVTOOLS-CODEPIPELINE-STAGES-001`
  - Severity: Warning
  - Summary: CodePipeline should have valid source/build/deploy stages
  - Rationale: Validates pipeline configuration

- [ ] **EventBridge Rule Targets** - `AWS-INTEGRATION-EVENTBRIDGE-TARGETS-001`
  - Severity: Warning
  - Summary: EventBridge rules should have valid targets
  - Rationale: Rules without targets are ineffective

- [ ] **MSK VPC Placement** - `AWS-INTEGRATION-MSK-VPC-001`
  - Severity: Error
  - Summary: MSK clusters must be in VPC subnets
  - Rationale: MSK requires VPC deployment

- [ ] **Redshift VPC Security** - `AWS-ANALYTICS-REDSHIFT-VPC-001`
  - Severity: Warning
  - Summary: Redshift should be in VPC for security
  - Rationale: Public Redshift is security risk

### GCP Tier 2 Rules (5-7 rules)

**Priority: Medium**

- [ ] **Workflows Service Reference** - `GCP-INTEGRATION-WORKFLOWS-SERVICES-001`
  - Severity: Warning
  - Summary: Workflows should reference valid Cloud Functions/Cloud Run
  - Rationale: Validates workflow configuration

- [ ] **Dataproc VPC Placement** - `GCP-ANALYTICS-DATAPROC-VPC-001`
  - Severity: Warning
  - Summary: Dataproc clusters should be in VPC
  - Rationale: VPC provides network isolation

- [ ] **Cloud Composer DAG** - `GCP-INTEGRATION-COMPOSER-DAG-001`
  - Severity: Info
  - Summary: Cloud Composer should have valid DAG definitions
  - Rationale: Validates Airflow configuration

- [ ] **GKE Autopilot Config** - `GCP-COMPUTE-GKE-AUTOPILOT-CONFIG-001`
  - Severity: Info
  - Summary: GKE Autopilot should have proper node pool configuration
  - Rationale: Validates cluster setup

- [ ] **Eventarc Triggers** - `GCP-INTEGRATION-EVENTARC-TRIGGERS-001`
  - Severity: Warning
  - Summary: Eventarc should have valid event sources and targets
  - Rationale: Validates event routing

- [ ] **IAP Backend Services** - `GCP-SECURITY-IAP-BACKENDS-001`
  - Severity: Warning
  - Summary: IAP should be configured with valid backend services
  - Rationale: IAP protects backend resources

- [ ] **Dataflow VPC Placement** - `GCP-ANALYTICS-DATAFLOW-VPC-001`
  - Severity: Info
  - Summary: Dataflow jobs should use VPC for private data
  - Rationale: Security best practice

---

## Tier 3 Validation Rules Backlog

### AWS Tier 3 Rules (0-3 rules)

**Priority: Low**

- [ ] **IoT Greengrass Deployment** - `AWS-IOT-GREENGRASS-DEPLOY-001`
  - Severity: Info
  - Summary: IoT Greengrass should be deployed to edge devices
  - Rationale: Architectural guidance

- [ ] **MediaLive Output** - `AWS-MEDIA-MEDIALIVE-OUTPUT-001`
  - Severity: Info
  - Summary: MediaLive should output to MediaPackage or MediaStore
  - Rationale: Common media pipeline pattern

- [ ] **DMS Endpoints** - `AWS-MIGRATION-DMS-ENDPOINTS-001`
  - Severity: Info
  - Summary: DMS should have valid source and target endpoints
  - Rationale: Validates migration configuration

### GCP Tier 3 Rules (0-3 rules)

**Priority: Low**

- [ ] **VMware Engine VPC** - `GCP-COMPUTE-VMWARE-ENGINE-VPC-001`
  - Severity: Info
  - Summary: VMware Engine should be in a VPC
  - Rationale: Network connectivity requirement

- [ ] **Bare Metal Solution Network** - `GCP-COMPUTE-BARE-METAL-NETWORK-001`
  - Severity: Info
  - Summary: Bare Metal Solution should have proper network configuration
  - Rationale: Connectivity requirement

- [ ] **Healthcare API Audit** - `GCP-HEALTHCARE-AUDIT-001`
  - Severity: Info
  - Summary: Healthcare API should have proper IAM and audit logging
  - Rationale: Compliance requirement

---

## Tier 4 Validation Rules Backlog

### AWS Tier 4 Rules (0 rules)

No validation rules planned for Tier 4. Graceful degradation is sufficient for edge cases and legacy services.

### GCP Tier 4 Rules (0 rules)

No validation rules planned for Tier 4. Graceful degradation is sufficient for edge cases and specialized services.

---

## Implementation Priority

### Phase 1: Tier 1 Rules (Weeks 1-2)
Focus on infrastructure-level validation that prevents common misconfigurations.

### Phase 2: Tier 2 Rules (Weeks 3-4)
Add service interaction validation for application-level patterns.

### Phase 3: Tier 3 Rules (Weeks 5-6)
Add architectural guidance for specialized services (info-level only).

### Phase 4: Tier 4 Rules (Week 7)
No rules required.

---

## Notes

- Validation rules are **optional** - services can be added without rules
- Most rules should be **warning** or **info** severity (not **error**)
- Focus on **common anti-patterns** rather than exhaustive validation
- Rules can be added incrementally after services are in the catalog
- Use info-level diagnostics for architectural guidance
- Prioritize rules that prevent deployment failures
