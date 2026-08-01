import { type CdnProviderConfig, IconLoader } from "@archlex/icons";

export const AWS_CDN_CONFIG: CdnProviderConfig = {
  provider: "aws",
  name: "aws-icons-npm",
  baseUrl: "https://unpkg.com/aws-icons@latest/icons",
  fileExtension: ".svg",
  attribution: {
    source: "aws-icons npm package",
    license: "Apache-2.0",
    url: "https://www.npmjs.com/package/aws-icons",
  },
};

export const AWS_ICON_NAME_MAPPING: Record<string, string> = {
  lambda: "lambda",
  s3: "s3",
  "api-gateway": "api-gateway",
  cloudfront: "cloudfront",
  dynamodb: "dynamodb",
  ec2: "ec2",
  ecs: "ecs",
  eks: "eks",
  elasticache: "elasticache",
  eventbridge: "eventbridge",
  "iam-role": "iam-role",
  rds: "rds",
  "rds-proxy": "rds-proxy",
  "route-table": "route-table",
  route53: "route53",
  "security-group": "security-group",
  sns: "sns",
  sqs: "sqs",
  subnet: "subnet",
  vpc: "vpc",
  apprunner: "app-runner",
  "step-functions": "step-functions",
};

// Register provider automatically
IconLoader.registerProvider("aws", AWS_CDN_CONFIG, AWS_ICON_NAME_MAPPING);
