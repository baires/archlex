import type { RelationshipDefinition } from "@archlex/model";

type AwsRelationshipRuleTag =
  | "step-functions-target"
  | "eventbridge-target"
  | "firehose-destination";

type AwsRelationshipDeclaration = RelationshipDefinition & {
  readonly ruleTags?: readonly AwsRelationshipRuleTag[];
};

/**
 * Declared AWS relationship semantics. Kinds are the canonical core
 * relationship kinds (see `@archlex/core` language metadata);
 * `allowedSources`/`allowedTargets` reference AWS catalog service ids and are
 * enforced by the relationship endpoint rule.
 */
const AWS_RELATIONSHIP_DECLARATIONS: readonly AwsRelationshipDeclaration[] = [
  {
    kind: "orchestrates",
    ruleTags: ["step-functions-target"],
    displayName: "Orchestrates",
    documentation: "A Step Functions state machine orchestrates workloads.",
    allowedSources: [
      "step-functions",
      "step-functions-express",
      "codepipeline",
    ],
    allowedTargets: [
      "lambda",
      "ecs",
      "glue",
      "sagemaker",
      "codebuild",
      "codedeploy",
      "cloudformation",
    ],
  },
  {
    kind: "invokes",
    ruleTags: ["step-functions-target", "eventbridge-target"],
    displayName: "Invokes",
    documentation: "Synchronously invokes the target service or function.",
    allowedSources: [
      "api-gateway",
      "lambda",
      "sqs",
      "step-functions",
      "step-functions-express",
      "eventbridge",
      "eventbridge-scheduler",
    ],
    allowedTargets: [
      "lambda",
      "sns",
      "sqs",
      "step-functions",
      "step-functions-express",
      "api-gateway",
      "ecs",
      "eks",
    ],
  },
  {
    kind: "triggers",
    ruleTags: ["eventbridge-target"],
    displayName: "Triggers",
    documentation: "An event source triggers the target workload.",
    allowedSources: [
      "eventbridge",
      "eventbridge-scheduler",
      "eventbridge-pipes",
      "s3",
      "sns",
      "sqs",
      "codecommit",
    ],
    allowedTargets: [
      "lambda",
      "step-functions",
      "step-functions-express",
      "sns",
      "sqs",
      "ecs",
      "codepipeline",
    ],
  },
  {
    kind: "publishes",
    displayName: "Publishes",
    documentation: "Publishes messages or events to a topic, queue, or bus.",
    allowedSources: ["lambda", "ecs", "ec2", "sns", "eventbridge"],
    allowedTargets: ["sns", "sqs", "eventbridge"],
  },
  {
    kind: "subscribes",
    displayName: "Subscribes",
    documentation: "Subscribes to messages or events from a topic.",
    allowedSources: ["lambda", "sqs"],
    allowedTargets: ["sns"],
  },
  {
    kind: "reads",
    displayName: "Reads",
    documentation: "Reads data from the target store.",
    allowedSources: ["lambda", "ecs", "ec2", "eks", "athena"],
    allowedTargets: ["s3", "dynamodb", "rds", "elasticache", "secrets-manager"],
  },
  {
    kind: "writes",
    ruleTags: ["firehose-destination"],
    displayName: "Writes",
    documentation: "Writes data to the target store.",
    allowedSources: [
      "lambda",
      "ecs",
      "ec2",
      "kinesis-firehose",
      "glue",
      "dms",
      "iot-analytics",
    ],
    allowedTargets: [
      "s3",
      "dynamodb",
      "rds",
      "aurora",
      "redshift",
      "opensearch",
      "timestream",
    ],
  },
  {
    kind: "streams",
    ruleTags: ["firehose-destination"],
    displayName: "Streams",
    documentation: "Streams records to the target consumer or destination.",
    allowedSources: [
      "kinesis-streams",
      "kinesis-firehose",
      "dynamodb",
      "iot-core",
      "lambda",
    ],
    allowedTargets: [
      "lambda",
      "s3",
      "redshift",
      "opensearch",
      "kinesis-analytics",
      "iot-analytics",
    ],
  },
  {
    kind: "caches",
    displayName: "Caches",
    documentation: "Caches data or responses in the target cache.",
    allowedSources: ["api-gateway", "lambda", "ec2", "ecs"],
    allowedTargets: ["elasticache"],
  },
  {
    kind: "encrypts",
    displayName: "Encrypts",
    documentation: "Encrypts data with the target key service.",
    allowedSources: ["s3", "dynamodb", "rds", "lambda", "ecs"],
    allowedTargets: ["kms"],
  },
  {
    kind: "decrypts",
    displayName: "Decrypts",
    documentation: "Decrypts data with the target key service.",
    allowedSources: ["lambda", "ecs", "ec2"],
    allowedTargets: ["kms"],
  },
  {
    kind: "monitors",
    displayName: "Monitors",
    documentation: "Monitors metrics and alarms for the target resource.",
    allowedSources: ["cloudwatch-metrics", "cloudwatch-alarms"],
    allowedTargets: [
      "lambda",
      "ec2",
      "ecs",
      "rds",
      "dynamodb",
      "api-gateway",
      "step-functions",
    ],
  },
  {
    kind: "logs",
    displayName: "Logs",
    documentation: "Sends logs to the target log store.",
    allowedSources: [
      "lambda",
      "ecs",
      "ec2",
      "api-gateway",
      "step-functions",
      "step-functions-express",
    ],
    allowedTargets: ["cloudwatch-logs", "s3"],
  },
  {
    kind: "traces",
    displayName: "Traces",
    documentation: "Sends traces to the target tracing service.",
    allowedSources: ["lambda", "ecs", "ec2", "api-gateway"],
    allowedTargets: ["xray"],
  },
  {
    kind: "assumes-role",
    displayName: "Assumes role",
    documentation: "Assumes the target IAM role for permissions.",
    allowedSources: [
      "lambda",
      "ec2",
      "ecs",
      "step-functions",
      "step-functions-express",
      "glue",
      "sagemaker",
      "kinesis-firehose",
    ],
    allowedTargets: ["iam-role"],
  },
  {
    kind: "routes",
    displayName: "Routes",
    documentation: "Routes requests or traffic to an AWS destination.",
    allowedSources: ["route53", "cloudfront", "alb", "nlb", "api-gateway"],
    allowedTargets: [
      "cloudfront",
      "s3",
      "alb",
      "nlb",
      "api-gateway",
      "ecs",
      "ec2",
      "lambda",
    ],
  },
  {
    kind: "exposes",
    displayName: "Exposes",
    documentation: "An AWS edge service exposes a backend workload or origin.",
    allowedSources: ["api-gateway", "alb", "nlb", "cloudfront"],
    allowedTargets: [
      "lambda",
      "ecs",
      "ec2",
      "eks",
      "s3",
      "api-gateway",
      "alb",
      "nlb",
    ],
  },
  {
    kind: "attaches",
    displayName: "Attaches",
    documentation: "An AWS workload attaches storage infrastructure.",
    allowedSources: ["ec2", "ecs", "eks", "lambda"],
    allowedTargets: ["ebs", "efs", "fsx-windows", "fsx-lustre"],
  },
  {
    kind: "replicates",
    displayName: "Replicates",
    documentation: "Replicates state or data to another AWS data store.",
    allowedSources: ["rds", "aurora", "dynamodb", "s3"],
    allowedTargets: ["rds", "aurora", "dynamodb", "s3"],
  },
  {
    kind: "fails-over-to",
    displayName: "Fails over to",
    documentation: "A primary AWS data service fails over to a standby.",
    allowedSources: ["rds", "aurora", "dynamodb", "s3"],
    allowedTargets: ["rds", "aurora", "dynamodb", "s3"],
  },
  {
    kind: "builds",
    displayName: "Builds",
    documentation: "Builds an artifact and publishes it to a destination.",
    allowedSources: ["codebuild"],
    allowedTargets: ["ecr", "s3"],
  },
  {
    kind: "deploys",
    displayName: "Deploys",
    documentation: "Deploys an artifact or revision to an AWS workload.",
    allowedSources: ["codedeploy", "codepipeline"],
    allowedTargets: ["ecs", "ec2", "lambda"],
  },
  {
    kind: "archives",
    displayName: "Archives",
    documentation: "Archives long-lived data or media in Amazon S3.",
    allowedSources: ["lambda", "ecs", "ec2", "mediapackage"],
    allowedTargets: ["s3"],
  },
  {
    kind: "trusts",
    displayName: "Trusts",
    documentation: "An AWS account or IAM role trusts another principal.",
    allowedSources: ["account", "iam-role"],
    allowedTargets: ["account", "iam-role"],
  },
];

export const AWS_RELATIONSHIPS: readonly RelationshipDefinition[] =
  AWS_RELATIONSHIP_DECLARATIONS.map(
    ({ ruleTags: _ruleTags, ...definition }) => definition,
  );

export function matchesAwsRelationshipRule(
  kind: string | undefined,
  ruleTag: AwsRelationshipRuleTag,
): boolean {
  if (!kind) return false;
  const declaration = AWS_RELATIONSHIP_DECLARATIONS.find(
    (relationship) => relationship.kind === kind,
  );
  return (
    declaration?.ruleTags?.some((candidate) => candidate === ruleTag) ?? false
  );
}
