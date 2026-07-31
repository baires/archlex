# Plan: Build Relationship Type Usage Guide

## Goal
Create comprehensive documentation for all relationship types in the catalog, explaining when to use each type and providing clear examples.

## Current State
- Multiple relationship types exist (depends-on, triggers, stores-data, etc.)
- No formal documentation on when to use each type
- Users guess which relationship type to use
- Inconsistent relationship type usage across diagrams

## Tasks

### 1. Audit Existing Relationship Types
- [ ] List all relationship types in the catalog
- [ ] Review current usage across services
- [ ] Identify relationship type definitions
- [ ] Document relationship type properties (directionality, cardinality, semantics)

### 2. Categorize Relationship Types
- [ ] Data flow relationships (stores-data, reads-from, writes-to)
- [ ] Control relationships (manages, controls, configures)
- [ ] Dependency relationships (depends-on, requires)
- [ ] Event relationships (triggers, subscribes-to, publishes-to)
- [ ] Network relationships (connects-to, routes-to)
- [ ] Security relationships (authenticates, authorizes, encrypts)

### 3. Define Relationship Semantics
For each relationship type:
- [ ] Formal definition
- [ ] Directionality (unidirectional/bidirectional)
- [ ] Cardinality (1:1, 1:N, N:M)
- [ ] When to use
- [ ] When NOT to use
- [ ] Visual representation

### 4. Create Service-Specific Relationship Rules
- [ ] Which relationships are valid for each service
- [ ] Common service pair relationships
- [ ] Invalid relationship combinations
- [ ] Required relationships per service type

### 5. Build Relationship Decision Tree
- [ ] Flow chart for selecting relationship type
- [ ] Question-based selection guide
- [ ] Context-based recommendations
- [ ] Example scenarios

### 6. Document Common Relationship Patterns
- [ ] Lambda → DynamoDB (stores-data)
- [ ] EventBridge → Lambda (triggers)
- [ ] S3 → Lambda (triggers via event)
- [ ] EC2 → RDS (connects-to)
- [ ] CloudFront → S3 (reads-from)
- [ ] API Gateway → Lambda (invokes)
- [ ] ALB → EC2 (routes-to)
- [ ] IAM → Services (authenticates/authorizes)
- [ ] VPC → Subnets (contains)
- [ ] CloudWatch → Services (monitors)

### 7. Create Anti-Pattern Guide for Relationships
- [ ] Circular dependencies
- [ ] Wrong relationship type
- [ ] Missing critical relationships
- [ ] Overly complex relationship graphs
- [ ] Relationship type conflicts

### 8. Build Interactive Relationship Explorer
- [ ] Relationship type browser
- [ ] Service pair lookup tool
- [ ] Relationship validator
- [ ] Suggestion engine

### 9. Add Visual Examples
- [ ] Diagram for each relationship type
- [ ] Side-by-side correct vs. incorrect examples
- [ ] Complex multi-service relationship examples
- [ ] Before/after refactoring examples

### 10. Create Relationship Validation Rules
- [ ] Valid relationship types per service
- [ ] Required relationships checker
- [ ] Bidirectional consistency validator
- [ ] Circular dependency detector

### 11. Document Relationship Metadata
- [ ] Labels and annotations
- [ ] Visual styling per type
- [ ] Arrow styles and semantics
- [ ] Color coding conventions

### 12. Integration with Editor
- [ ] Context-aware relationship suggestions
- [ ] Auto-validation on relationship creation
- [ ] Quick-fix for invalid relationships
- [ ] Relationship type picker with descriptions

## Deliverables
- Comprehensive relationship type guide
- Service-specific relationship rules
- Interactive relationship explorer
- Validation rules and tooling
- Integration with diagram editor

## Success Criteria
- Users can quickly find the right relationship type
- Clear examples for every relationship type
- Validation prevents invalid relationships
- Consistent relationship usage across diagrams
- Easy to understand visual conventions

## Non-Goals
- Implementation-level details (terraform, CloudFormation)
- Cost implications of relationships
- Performance characteristics
- Real-time monitoring of relationships

## Open Questions
- Should we support custom relationship types?
- How to handle deprecated relationship types?
- Should relationships have severity/criticality levels?
- Integration with AWS service quotas/limits?
