export interface GetCatalogArgs {
  provider?: "aws" | "gcp" | "all";
}

const AWS_KNOWN_SERVICES = [
  "rds-proxy",
  "rds",
  "ecs",
  "ec2",
  "lambda",
  "s3",
  "dynamodb",
  "sqs",
  "sns",
  "apigateway",
  "cloudfront",
  "vpc",
  "route53",
  "iam",
  "kms",
  "cloudwatch",
  "eventbridge",
];

const GCP_KNOWN_SERVICES = [
  "gke",
  "cloud-run",
  "cloud-functions",
  "compute-engine",
  "cloud-storage",
  "cloud-sql",
  "pubsub",
  "bigquery",
  "cloud-cdn",
  "vpc",
];

const CONTAINMENT_SCOPES = ["account", "region", "vpc", "subnet", "cluster"];

const RELATIONSHIP_KINDS = [
  "connects",
  "reads",
  "writes",
  "publishes",
  "subscribes",
  "invokes",
  "routes",
  "replicates",
  "assumes-role",
  "encrypts",
  "decrypts",
  "monitors",
  "logs",
  "caches",
  "proxies",
  "traces",
  "alerts",
  "processes",
  "transforms",
  "orchestrates",
  "triggers",
  "schedules",
  "builds",
  "deploys",
  "analyzes",
];

export async function handleGetCatalog(args: GetCatalogArgs = {}) {
  const { provider = "all" } = args;

  const catalog: Record<string, unknown> = {
    directives: {
      provider: ["aws", "gcp"],
      direction: ["LR", "RL", "TB", "BT"],
      validation: ["strict", "normal", "off"],
    },
    containment_scopes: CONTAINMENT_SCOPES,
    relationship_kinds: RELATIONSHIP_KINDS,
  };

  if (provider === "aws" || provider === "all") {
    catalog.aws = {
      id: "aws",
      name: "Amazon Web Services",
      services: AWS_KNOWN_SERVICES,
    };
  }

  if (provider === "gcp" || provider === "all") {
    catalog.gcp = {
      id: "gcp",
      name: "Google Cloud Platform",
      services: GCP_KNOWN_SERVICES,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(catalog, null, 2),
      },
    ],
  };
}
