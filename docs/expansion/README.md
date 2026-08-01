# ArchLex Service Expansion Tracking

This directory tracks the expansion of ArchLex's AWS and GCP service coverage from the MVP baseline (24 services each) to comprehensive ecosystem coverage (160-190 services per provider).

## Status Dashboard

**Last Updated**: 2026-07-31

### Coverage Metrics

| Provider | Current Services | Target Services | Coverage | Status |
|----------|------------------|-----------------|----------|--------|
| **AWS** | 111 | 185-215 | 60-63% | ✅ Tier 2 Complete |
| **GCP** | 108 | 180-200 | 60-64% | ✅ Tier 2 Complete |

### Current Tier Status

- [x] **Tier 0**: MVP Baseline (24 AWS, 24 GCP) - Completed 2026-07-29
- [x] **Tier 1**: Core Infrastructure (39 AWS, 37 GCP) - Completed 2026-07-31
- [x] **Tier 2**: Application Services (48 AWS, 47 GCP) - Completed 2026-07-31
- [ ] **Tier 3**: Specialized Services (50-60 per provider) - Not Started
- [ ] **Tier 4**: Edge Cases & Legacy (30-40 per provider) - Not Started

## Tier Breakdown

### Tier 1: Core Infrastructure (v0.2.0)
**Priority**: Critical  
**Timeline**: 2 weeks  
**Target Coverage**: 60-65 services per provider (~30-35%)

Essential infrastructure services that form the foundation of most architectures.

- **AWS**: [tier-1-aws.md](tier-1-aws.md)
- **GCP**: [tier-1-gcp.md](tier-1-gcp.md)

**Key Additions**:
- Networking: VPC Endpoints, NAT Gateway, Internet Gateway, Transit Gateway, Direct Connect
- Storage: EFS, FSx, EBS, Glacier
- Database: Aurora, Neptune, DocumentDB, Timestream
- Security: WAF, Shield, Secrets Manager, KMS, ACM, GuardDuty
- Monitoring: CloudWatch, X-Ray, CloudTrail

### Tier 2: Application Services (v0.3.0)
**Priority**: High  
**Timeline**: 2 weeks  
**Target Coverage**: 105-115 services per provider (~50-60%)

Services for application logic, data processing, and integration.

- **AWS**: [tier-2-aws.md](tier-2-aws.md)
- **GCP**: [tier-2-gcp.md](tier-2-gcp.md)

**Key Additions**:
- Application Integration: Step Functions, AppFlow, AppSync, MQ, MSK
- Analytics: Kinesis, EMR, Glue, Athena, Redshift, QuickSight
- AI/ML: SageMaker, Bedrock, Rekognition, Comprehend, Translate
- Developer Tools: CodePipeline, CodeBuild, CodeDeploy
- Containers: ECR, ECS Anywhere, EKS Add-ons

### Tier 3: Specialized Services (v0.4.0)
**Priority**: Medium  
**Timeline**: 2 weeks  
**Target Coverage**: 155-175 services per provider (~75-90%)

Domain-specific services for specialized workloads.

- **AWS**: [tier-3-aws.md](tier-3-aws.md)
- **GCP**: [tier-3-gcp.md](tier-3-gcp.md)

**Key Additions**:
- IoT: IoT Core, IoT Analytics, IoT Greengrass
- Media: MediaLive, MediaConvert, MediaPackage
- Gaming: GameLift, GameSparks
- Business Applications: WorkSpaces, AppStream, Connect
- Migration: DMS, DataSync, Transfer Family

### Tier 4: Edge Cases & Legacy (v0.4.1)
**Priority**: Low  
**Timeline**: 1 week  
**Target Coverage**: 185-215 services per provider (~95-100%)

Less common, regional, experimental, or legacy services.

- **AWS**: [tier-4-aws.md](tier-4-aws.md)
- **GCP**: [tier-4-gcp.md](tier-4-gcp.md)

**Key Additions**:
- Edge/Hybrid: Outposts, Snow Family, Wavelength
- Satellite: Ground Station
- Quantum: Braket
- Legacy: SimpleDB, OpsWorks, Elastic Beanstalk

## Progress Tracking

### Services Added by Tier

| Tier | AWS Services | GCP Services | Total Added |
|------|--------------|--------------|-------------|
| Tier 0 (MVP) | 24 | 24 | 48 |
| Tier 1 | 39 | 37 | 76 |
| Tier 2 | 48 | 47 | 95 |
| Tier 3 | 0 | 0 | 0 |
| Tier 4 | 0 | 0 | 0 |
| **Total** | **111** | **108** | **219** |

### Validation Rules Added by Tier

| Tier | AWS Rules | GCP Rules | Total Rules |
|------|-----------|-----------|-------------|
| Tier 0 (MVP) | 8 | 3 | 11 |
| Tier 1 | 3 | 3 | 6 |
| Tier 2 | 5 | 5 | 10 |
| Tier 3 | 0 | 0 | 0 |
| Tier 4 | 0 | 0 | 0 |
| **Total** | **16** | **11** | **27** |

### Relationship Types Added by Tier

See [relationship-types.md](relationship-types.md) for detailed tracking.

**Current relationship types** (26):
- Tier 0: `connects`, `reads`, `writes`, `publishes`, `subscribes`, `invokes`, `routes`, `replicates`, `assumes-role`
- Tier 1: `encrypts`, `decrypts`, `monitors`, `logs`, `caches`, `proxies`, `traces`, `alerts`
- Tier 2: `processes`, `transforms`, `orchestrates`, `triggers`, `schedules`, `streams`, `builds`, `deploys`, `analyzes`

**Target relationship types**: 25-35

## Additional Tracking

- **[missing-icons.md](missing-icons.md)**: Services without official icons
- **[validation-backlog.md](validation-backlog.md)**: Validation rules to add later
- **[relationship-types.md](relationship-types.md)**: New relationship types by tier

## Roadmap Integration

This expansion work extends the ArchLex roadmap:

- **Phase 0-6**: MVP (Completed 2026-07-29)
- **Phase 7**: Tier 1 Core Infrastructure (v0.2.0)
- **Phase 8**: Tier 2 Application Services (v0.3.0)
- **Phase 9**: Tier 3 Specialized Services (v0.4.0)
- **Phase 10**: Tier 4 Edge Cases & Legacy (v0.4.1)

See [../ROADMAP.md](../ROADMAP.md) for the complete project roadmap.

## Success Criteria

### Quantitative

- **Post-Tier 1**: Can diagram 70% of typical production architectures
- **Post-Tier 2**: Can diagram 85-90% of production architectures
- **Post-Tier 3**: Can diagram 95%+ of production architectures
- **Post-Tier 4**: Complete documented service catalog coverage

### Qualitative

- Users can diagram modern multi-service architectures without unknown service warnings
- Contributor velocity: <30 minutes to add a new service (definition + test + icon)
- Catalog updates don't require parser/layout/renderer changes

## Contributing

Each tier follows a standard workflow:

1. Research official service documentation
2. Define services in catalog files
3. Add/update relationship types in core
4. Run icon import scripts
5. Add validation rules (optional)
6. Write tests
7. Update documentation
8. Create changeset
9. Update this dashboard

See the [implementation plan](../../.claude/plans/now-follow-docs-readme-md-an-scalable-rossum.md) for detailed instructions.
