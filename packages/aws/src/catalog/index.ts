import type { ResourceDefinition } from "@cloudmer/model";
import { defineService } from "../builder.js";

export const initialServices: ResourceDefinition[] = [
  // Boundaries & Networking
  defineService({
    id: "account",
    displayName: "AWS Account",
    category: "boundary",
    aliases: ["aws-account"],
  }),
  defineService({
    id: "region",
    displayName: "AWS Region",
    category: "boundary",
    aliases: ["aws-region"],
  }),
  defineService({
    id: "vpc",
    displayName: "Amazon VPC",
    category: "networking",
    aliases: ["aws.vpc"],
  }),
  defineService({
    id: "subnet",
    displayName: "VPC Subnet",
    category: "networking",
    aliases: ["aws.subnet"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "route-table",
    displayName: "VPC Route Table",
    category: "networking",
    aliases: ["rt", "route_table"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "security-group",
    displayName: "Security Group",
    category: "security",
    aliases: ["sg", "security_group"],
    allowedContainment: ["vpc"],
  }),

  // Load Balancing & API
  defineService({
    id: "alb",
    displayName: "Application Load Balancer",
    category: "networking",
    aliases: ["aws.alb", "load-balancer"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "nlb",
    displayName: "Network Load Balancer",
    category: "networking",
    aliases: ["aws.nlb"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "api-gateway",
    displayName: "Amazon API Gateway",
    category: "networking",
    aliases: ["apigw", "api_gateway"],
  }),

  // Compute
  defineService({
    id: "lambda",
    displayName: "AWS Lambda",
    category: "compute",
    aliases: ["function", "aws.lambda"],
  }),
  defineService({
    id: "ecs",
    displayName: "Amazon ECS",
    category: "compute",
    aliases: ["container", "aws.ecs"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "eks",
    displayName: "Amazon EKS",
    category: "compute",
    aliases: ["kubernetes", "aws.eks"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "ec2",
    displayName: "Amazon EC2",
    category: "compute",
    aliases: ["instance", "aws.ec2"],
    allowedContainment: ["subnet"],
  }),

  // Data
  defineService({
    id: "rds",
    displayName: "Amazon RDS",
    category: "database",
    aliases: ["database", "aws.rds"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "rds-proxy",
    displayName: "Amazon RDS Proxy",
    category: "database",
    aliases: ["proxy", "aws.rds-proxy"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "dynamodb",
    displayName: "Amazon DynamoDB",
    category: "database",
    aliases: ["dynamo", "aws.dynamodb"],
  }),
  defineService({
    id: "elasticache",
    displayName: "Amazon ElastiCache",
    category: "database",
    aliases: ["redis", "memcached"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "s3",
    displayName: "Amazon S3",
    category: "storage",
    aliases: ["bucket", "aws.s3"],
  }),

  // Messaging & Events
  defineService({
    id: "sqs",
    displayName: "Amazon SQS",
    category: "messaging",
    aliases: ["queue", "aws.sqs"],
  }),
  defineService({
    id: "sns",
    displayName: "Amazon SNS",
    category: "messaging",
    aliases: ["topic", "aws.sns"],
  }),
  defineService({
    id: "eventbridge",
    displayName: "Amazon EventBridge",
    category: "messaging",
    aliases: ["events", "event_bridge"],
  }),

  // Identity
  defineService({
    id: "iam-role",
    displayName: "IAM Role",
    category: "identity",
    aliases: ["role", "iam_role"],
  }),

  // Edge & DNS
  defineService({
    id: "cloudfront",
    displayName: "Amazon CloudFront",
    category: "networking",
    aliases: ["cdn", "aws.cloudfront"],
  }),
  defineService({
    id: "route53",
    displayName: "Amazon Route 53",
    category: "networking",
    aliases: ["dns", "route-53"],
  }),
];

export const AWS_SERVICE_CATALOG = new Map<string, ResourceDefinition>();
export const AWS_ALIAS_MAP = new Map<string, string>();

for (const service of initialServices) {
  AWS_SERVICE_CATALOG.set(service.id, service);
  AWS_ALIAS_MAP.set(service.id, service.id);
  for (const alias of service.aliases) {
    AWS_ALIAS_MAP.set(alias.toLowerCase(), service.id);
  }
}

export function resolveAwsService(
  kindOrAlias: string,
): ResourceDefinition | undefined {
  const normalized = kindOrAlias.toLowerCase();
  const canonicalId = AWS_ALIAS_MAP.get(normalized) ?? normalized;
  return AWS_SERVICE_CATALOG.get(canonicalId);
}
