import { defineService } from "../builder.js";
import { AWS_PHASE_ONE_ICONS } from "../icons/index.js";

export const initialServices = [
  defineService({
    id: "rds-proxy",
    displayName: "Amazon RDS Proxy",
    category: "database",
    aliases: ["proxy"],
    iconKey: "aws.rds-proxy",
    iconSvg: AWS_PHASE_ONE_ICONS["aws.rds-proxy"],
  }),
  defineService({
    id: "rds",
    displayName: "Amazon RDS",
    category: "database",
    aliases: ["database"],
    iconKey: "aws.rds",
    iconSvg: AWS_PHASE_ONE_ICONS["aws.rds"],
  }),
  defineService({
    id: "ecs",
    displayName: "Amazon ECS",
    category: "compute",
    aliases: ["container"],
    iconKey: "aws.ecs",
    iconSvg: AWS_PHASE_ONE_ICONS["aws.ecs"],
  }),
  defineService({
    id: "lambda",
    displayName: "AWS Lambda",
    category: "compute",
    aliases: ["function"],
  }),
  defineService({
    id: "s3",
    displayName: "Amazon S3",
    category: "storage",
    aliases: ["bucket"],
  }),
  defineService({
    id: "dynamodb",
    displayName: "Amazon DynamoDB",
    category: "database",
    aliases: ["dynamo"],
  }),
  defineService({
    id: "sqs",
    displayName: "Amazon SQS",
    category: "messaging",
    aliases: ["queue"],
  }),
  defineService({
    id: "sns",
    displayName: "Amazon SNS",
    category: "messaging",
    aliases: ["topic"],
  }),
  defineService({
    id: "api-gateway",
    displayName: "Amazon API Gateway",
    category: "networking",
    aliases: ["api"],
  }),
  defineService({
    id: "cloudfront",
    displayName: "Amazon CloudFront",
    category: "networking",
    aliases: ["cdn"],
  }),
  defineService({
    id: "vpc",
    displayName: "Amazon VPC",
    category: "networking",
  }),
  defineService({
    id: "subnet",
    displayName: "VPC Subnet",
    category: "networking",
  }),
];

export const AWS_SERVICE_CATALOG = new Map(
  initialServices.map((s) => [s.id, s]),
);

export function resolveAwsService(serviceKind: string) {
  const normalized = serviceKind.toLowerCase();
  const direct = AWS_SERVICE_CATALOG.get(normalized);
  if (direct) return direct;
  return initialServices.find((service) =>
    service.aliases.some((alias) => alias.toLowerCase() === normalized),
  );
}
