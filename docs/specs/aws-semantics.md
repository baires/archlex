# AWS Semantics Specification

## Provider and catalog

```ts
interface CloudProvider {
  id: string;
  catalogVersion: string;
  resolveResource(type: string): ResourceDefinition | undefined;
  resolveRelationship(kind: string): RelationshipDefinition | undefined;
  validate(context: ProviderValidationContext): readonly Diagnostic[];
}
```

The AWS provider ID is `aws`. Each resource definition has a canonical ID, display name, category, unique aliases, official icon key, allowed containment, emitted/accepted relationships, and rule IDs. Canonical IDs remain stable within a major version; renames add deprecated aliases.

The generated icon manifest records the upstream release and maps keys to sanitized fragments. Catalog loading performs no network request.

Unknown resources become generic AWS nodes and emit `AWS-CATALOG-UNKNOWN-RESOURCE`. Unknown types are never silently coerced to known services.

## MVP coverage

- Boundaries/networking: account, region, VPC, subnet, route table, security group.
- Load balancing/API: ALB, NLB, API Gateway.
- Compute: Lambda, ECS, EKS, EC2.
- Data: RDS, RDS Proxy, DynamoDB, ElastiCache, S3.
- Messaging/events: SQS, SNS, EventBridge.
- Identity: IAM role.
- Edge/DNS: CloudFront and Route 53.

Catalog entries may precede deep semantic rules. They render with official imagery and produce `info` only when placement or a relationship cannot be evaluated.

## Relationships and validation

Neutral kinds are `connects`, `reads`, `writes`, `publishes`, `subscribes`, `invokes`, `routes`, `replicates`, and `assumes-role`. Generic edges receive structural validation only. Unknown custom kinds are preserved and emit `AWS-RELATIONSHIP-UNKNOWN-KIND`; labels do not affect semantics.

Validation order:

1. Core structural validation always checks IDs, references, scope, and graph integrity.
2. AWS validation checks containment and source/kind/target compatibility.
3. AWS guidance reports suspicious or incomplete modeled architecture.

`normal` preserves severities. `strict` promotes provider/guidance warnings, but not info, to errors. `off` skips passes 2 and 3; catalog resolution still runs for rendering.

## Rule policy

Codes use `AWS-<DOMAIN>-<RULE>-NNN`, are globally unique, and have registry entries for severity, summary, rationale, resources, and remediation. Removing or redefining a code is breaking.

The first cross-resource rule is `AWS-RDS-PROXY-NETWORK-001`: RDS Proxy and its target must have compatible VPC placement.

Rules use only facts represented in the graph. CloudMer does not infer security-group rules, IAM policy contents, availability zones, or trust policies unless the language models them.

Invalid and unknown elements remain in the graph with validity metadata; layout and rendering may not drop them solely due to semantics.

## Verification

Validate schemas, canonical IDs, alias uniqueness, icon references, documented/unique rule codes, normal/strict/off outcomes, and deterministic catalog generation. Re-ingesting one upstream archive must produce identical output and checksum.
