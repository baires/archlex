import { defineService } from "../builder.js";

export const initialServices = [
  defineService({
    id: "rds-proxy",
    displayName: "Amazon RDS Proxy",
    category: "database",
    aliases: ["proxy"],
  }),
  defineService({
    id: "rds",
    displayName: "Amazon RDS",
    category: "database",
    aliases: ["database"],
  }),
  defineService({
    id: "ecs",
    displayName: "Amazon ECS",
    category: "compute",
    aliases: ["container"],
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
