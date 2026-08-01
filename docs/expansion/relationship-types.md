# ArchLex Relationship Types Expansion

This document tracks the expansion of `knownRelationships` in ArchLex as new services are added across tiers.

**Last Updated**: 2026-07-31

## Purpose

- Track relationship types added per tier
- Document semantic meaning of each relationship type
- Guide users on which relationship types to use for service connections

## Location in Codebase

**File**: `packages/core/src/index.ts` (lines 159-169)

The `knownRelationships` Set defines valid relationship kinds. Unknown relationship types emit info-level diagnostics but are still preserved in the graph.

## Current Relationship Types (9 types)

**Tier 0 (MVP)** - Completed 2026-07-29

| Relationship | Semantic Meaning | Example Usage |
|--------------|------------------|---------------|
| `connects` | Generic connection between services | `alb connects ec2` |
| `reads` | Data read operation | `lambda reads dynamodb` |
| `writes` | Data write operation | `lambda writes s3` |
| `publishes` | Publish to messaging system | `lambda publishes sns` |
| `subscribes` | Subscribe to messaging system | `lambda subscribes sqs` |
| `invokes` | Direct service invocation | `api-gateway invokes lambda` |
| `routes` | Traffic routing | `alb routes ec2` |
| `replicates` | Data replication | `rds replicates rds` |
| `assumes-role` | IAM role assumption | `lambda assumes-role iam-role` |

---

## Tier 1: Core Infrastructure (Target: 6-8 new types)

**Status**: ✅ Complete (2026-07-31)  
**Types Added**: 8  
**Total Count**: 17 types

### Added Relationships

| Relationship | Semantic Meaning | Example Usage |
|--------------|------------------|---------------|
| `encrypts` | Encryption service | `kms encrypts s3` |
| `decrypts` | Decryption service | `lambda decrypts kms` |
| `monitors` | Monitoring/observability | `cloudwatch monitors ec2` |
| `logs` | Logging relationship | `lambda logs cloudwatch-logs` |
| `caches` | Caching layer | `cloudfront caches s3` |
| `proxies` | Proxy/intermediary | `nat-gateway proxies ec2` |
| `traces` | Distributed tracing | `xray traces lambda` |
| `alerts` | Alerting relationship | `cloudwatch-alarms alerts sns` |

### Implementation Notes

- Added for Tier 1 core infrastructure services
- Essential for security (encrypts/decrypts), observability (monitors/logs/traces/alerts), networking (proxies), and performance (caches)
- All types successfully integrated and tested

---

## Tier 2: Application Services (Target: 6-8 new types)

**Status**: ✅ Complete (2026-07-31)  
**Types Added**: 9  
**Total Count**: 26 types

### Added Relationships

| Relationship | Semantic Meaning | Example Usage |
|--------------|------------------|---------------|
| `processes` | Data processing | `kinesis-firehose processes kinesis-streams` |
| `transforms` | Data transformation | `glue transforms s3` |
| `orchestrates` | Workflow orchestration | `step-functions orchestrates lambda` |
| `triggers` | Event-based triggering | `eventbridge triggers lambda` |
| `schedules` | Scheduled execution | `eventbridge-scheduler schedules lambda` |
| `streams` | Data streaming | `kinesis-streams streams lambda` |
| `builds` | Build pipeline | `codebuild builds ecr` |
| `deploys` | Deployment pipeline | `codedeploy deploys ec2` |
| `analyzes` | Data/content analysis | `rekognition analyzes s3` |

### Implementation Notes

- Added for Tier 2 application integration, analytics, AI/ML, and CI/CD services
- Covers data flow (processes/transforms/streams), workflow (orchestrates/triggers/schedules), and deployment (builds/deploys)
- `analyzes` added early for AI/ML services

---

## Tier 3: Specialized Services (Target: 4-6 new types)

**Status**: ✅ Complete (2026-07-31)  
**Types Added**: 7  
**Total Count**: 33 types

### Added Relationships

| Relationship | Semantic Meaning | Example Usage |
|--------------|------------------|---------------|
| `transcodes` | Media transcoding | `mediaconvert transcodes s3` |
| `packages` | Media packaging | `mediapackage packages medialive` |
| `migrates` | Data/service migration | `dms migrates rds` |
| `discovers` | Service/resource discovery | `application-discovery discovers ec2` |
| `catalogs` | Data cataloging | `data-catalog catalogs bigquery` |
| `protects` | Data protection | `dlp protects cloud-storage` |
| `governs` | Data governance | `dataplex governs datasets` |

### Implementation Notes

- Added for Tier 3 specialized services: media, migration, healthcare, retail, data governance
- **transcodes/packages**: Media services (MediaConvert, MediaPackage, Transcoder API)
- **migrates**: Migration services (DMS, SMS, Database Migration Service)
- **discovers**: Discovery services (Application Discovery Service)
- **catalogs/protects/governs**: Data governance services (Data Catalog, DLP, Dataplex)
- All types are domain-specific but provider-agnostic

---

## Tier 4: Edge Cases & Legacy (Target: 0-2 new types)

**Status**: Not Started  
**Target Count**: 25-33 total types

### Proposed Additions

| Relationship | Semantic Meaning | Example Usage | Priority |
|--------------|------------------|---------------|----------|
| `syncs` | Data synchronization | `datasync syncs s3` | Low |
| `transfers` | Data transfer | `transfer-family transfers s3` | Low |

### Implementation Notes

- Most Tier 4 services use existing relationship types
- Add specialized types only if needed for clarity

---

## Implementation Checklist

When adding new relationship types to each tier:

### Step 1: Update Core
- [ ] Add new relationship types to `knownRelationships` Set in `packages/core/src/index.ts` (lines 159-169)
- [ ] Maintain alphabetical order within the Set
- [ ] Ensure no duplicates

### Step 2: Update Documentation
- [ ] Document new types in `docs/specs/language.md` (relationship types section)
- [ ] Add examples of usage for each new type
- [ ] Mark tier and version when type was added
- [ ] Update this tracking document

### Step 3: Test
- [ ] Add test cases for new relationship types
- [ ] Verify info diagnostics for unknown types still work
- [ ] Verify new types are preserved in graph

### Step 4: Changeset
- [ ] Create changeset describing new relationship types
- [ ] Use appropriate semver (minor for new features)

---

## Design Principles

### When to Add a New Relationship Type

✅ **Add when:**
- The relationship has clear semantic meaning distinct from existing types
- Multiple services use this pattern
- Users would benefit from explicit relationship naming

❌ **Don't add when:**
- Existing type is sufficient (use `connects` for generic)
- Only one or two services use this pattern
- Relationship is too service-specific

### Naming Conventions

- Use **verbs** (actions): `encrypts`, `monitors`, `processes`
- Use **present tense, third person**: `connects` not `connect`
- Use **kebab-case** for multi-word types: `assumes-role`, not `assumesRole`
- Be **specific but generic**: `encrypts` not `kms-encrypts`

### Severity Guidance

Unknown relationship types produce **info-level diagnostics**:
- Message: `"Unknown relationship kind '{kind}' is preserved."`
- Not an error - diagram still renders
- Helps users discover typos or suggest new types

---

## Relationship Type Categories

### Data Flow
- `reads`, `writes`, `streams`, `processes`, `transforms`

### Service Invocation
- `invokes`, `triggers`, `schedules`, `orchestrates`

### Messaging
- `publishes`, `subscribes`

### Networking
- `connects`, `routes`, `proxies`

### Security
- `encrypts`, `decrypts`, `assumes-role`

### Observability
- `monitors`, `logs`, `traces`, `alerts`

### CI/CD
- `builds`, `deploys`

### Specialized
- `transcodes`, `analyzes`, `trains`, `migrates`, `caches`, `replicates`, `packages`, `discovers`, `syncs`, `transfers`

---

## Backward Compatibility

- New relationship types are **additive only** (never remove types)
- Old diagrams using removed types would produce info diagnostics
- If deprecating a type, keep it for at least one major version
- Document deprecated types with recommended replacements

---

## Future Considerations

### Potential Future Additions (Post-Tier 4)

- `authenticates` - Authentication services
- `authorizes` - Authorization checks
- `validates` - Validation services
- `indexes` - Search indexing
- `archives` - Archival services
- `restores` - Restoration services
- `backups` - Backup operations

Only add these if services are added that require them.

---

## Progress Tracking

| Tier | Planned Types | Added Types | Total Types | Status |
|------|---------------|-------------|-------------|--------|
| Tier 0 (MVP) | 9 | 9 | 9 | ✅ Complete |
| Tier 1 | 6-8 | 8 | 17 | ✅ Complete |
| Tier 2 | 6-8 | 9 | 26 | ✅ Complete |
| Tier 3 | 4-6 | 7 | 33 | ✅ Complete |
| Tier 4 | 0-2 | 0 | 33 | Not Started |
| **Target** | **25-35** | **33** | **33** | **95% Complete** |

---

## Notes

- Relationship types are provider-agnostic (work for AWS and GCP)
- Types should be semantically meaningful, not implementation-specific
- Unknown types emit info diagnostics but are preserved
- Prefer existing types over adding new ones when semantic meaning overlaps
- Update `docs/specs/language.md` when types are added
