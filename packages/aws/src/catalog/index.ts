import type { ResourceDefinition } from "@archlex/model";
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

  // Tier 1: VPC Infrastructure
  defineService({
    id: "vpc-endpoint-interface",
    displayName: "VPC Endpoint (Interface)",
    category: "networking",
    aliases: ["vpc-endpoint", "vpce-interface", "aws.vpc-endpoint-interface"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "vpc-endpoint-gateway",
    displayName: "VPC Endpoint (Gateway)",
    category: "networking",
    aliases: ["vpce-gateway", "aws.vpc-endpoint-gateway"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "nat-gateway",
    displayName: "NAT Gateway",
    category: "networking",
    aliases: ["nat", "natgw", "aws.nat-gateway"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "internet-gateway",
    displayName: "Internet Gateway",
    category: "networking",
    aliases: ["igw", "aws.internet-gateway"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "transit-gateway",
    displayName: "Transit Gateway",
    category: "networking",
    aliases: ["tgw", "aws.transit-gateway"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "privatelink",
    displayName: "AWS PrivateLink",
    category: "networking",
    aliases: ["aws.privatelink"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "direct-connect",
    displayName: "AWS Direct Connect",
    category: "networking",
    aliases: ["dx", "aws.direct-connect"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "vpn-gateway",
    displayName: "VPN Gateway",
    category: "networking",
    aliases: ["vgw", "aws.vpn-gateway"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "customer-gateway",
    displayName: "Customer Gateway",
    category: "networking",
    aliases: ["cgw", "aws.customer-gateway"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "vpn-connection",
    displayName: "VPN Connection",
    category: "networking",
    aliases: ["site-to-site-vpn", "aws.vpn-connection"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "elastic-ip",
    displayName: "Elastic IP",
    category: "networking",
    aliases: ["eip", "aws.elastic-ip"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "network-firewall",
    displayName: "AWS Network Firewall",
    category: "networking",
    aliases: ["aws.network-firewall"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "global-accelerator",
    displayName: "AWS Global Accelerator",
    category: "networking",
    aliases: ["aws.global-accelerator"],
    allowedContainment: ["region"],
  }),

  // Tier 1: Compute
  defineService({
    id: "app-runner",
    displayName: "AWS App Runner",
    category: "compute",
    aliases: ["apprunner", "aws.app-runner"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "batch",
    displayName: "AWS Batch",
    category: "compute",
    aliases: ["aws.batch"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "fargate",
    displayName: "AWS Fargate",
    category: "compute",
    aliases: ["aws.fargate"],
    allowedContainment: ["vpc"],
  }),

  // Tier 1: Storage
  defineService({
    id: "efs",
    displayName: "Amazon EFS",
    category: "storage",
    aliases: ["elastic-file-system", "aws.efs"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "fsx-windows",
    displayName: "Amazon FSx for Windows",
    category: "storage",
    aliases: ["fsx-windows-file-server", "aws.fsx-windows"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "fsx-lustre",
    displayName: "Amazon FSx for Lustre",
    category: "storage",
    aliases: ["aws.fsx-lustre"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "ebs",
    displayName: "Amazon EBS",
    category: "storage",
    aliases: ["elastic-block-store", "aws.ebs"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "glacier",
    displayName: "Amazon S3 Glacier",
    category: "storage",
    aliases: ["s3-glacier", "aws.glacier"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "storage-gateway",
    displayName: "AWS Storage Gateway",
    category: "storage",
    aliases: ["aws.storage-gateway"],
    allowedContainment: ["region"],
  }),

  // Tier 1: Database
  defineService({
    id: "aurora",
    displayName: "Amazon Aurora",
    category: "database",
    aliases: ["aws.aurora"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "neptune",
    displayName: "Amazon Neptune",
    category: "database",
    aliases: ["aws.neptune"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "documentdb",
    displayName: "Amazon DocumentDB",
    category: "database",
    aliases: ["aws.documentdb"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "timestream",
    displayName: "Amazon Timestream",
    category: "database",
    aliases: ["aws.timestream"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "keyspaces",
    displayName: "Amazon Keyspaces",
    category: "database",
    aliases: ["cassandra", "aws.keyspaces"],
    allowedContainment: ["region"],
  }),

  // Tier 1: Security
  defineService({
    id: "waf",
    displayName: "AWS WAF",
    category: "security",
    aliases: ["web-application-firewall", "aws.waf"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "shield",
    displayName: "AWS Shield",
    category: "security",
    aliases: ["aws.shield"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "secrets-manager",
    displayName: "AWS Secrets Manager",
    category: "security",
    aliases: ["secrets", "aws.secrets-manager"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "kms",
    displayName: "AWS KMS",
    category: "security",
    aliases: ["key-management-service", "aws.kms"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "acm",
    displayName: "AWS Certificate Manager",
    category: "security",
    aliases: ["certificate-manager", "aws.acm"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "guardduty",
    displayName: "Amazon GuardDuty",
    category: "security",
    aliases: ["aws.guardduty"],
    allowedContainment: ["region"],
  }),

  // Tier 1: Monitoring
  defineService({
    id: "cloudwatch-logs",
    displayName: "CloudWatch Logs",
    category: "monitoring",
    aliases: ["logs", "aws.cloudwatch-logs"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloudwatch-metrics",
    displayName: "CloudWatch Metrics",
    category: "monitoring",
    aliases: ["metrics", "aws.cloudwatch-metrics"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloudwatch-alarms",
    displayName: "CloudWatch Alarms",
    category: "monitoring",
    aliases: ["alarms", "aws.cloudwatch-alarms"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "xray",
    displayName: "AWS X-Ray",
    category: "monitoring",
    aliases: ["aws.xray", "x-ray"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloudtrail",
    displayName: "AWS CloudTrail",
    category: "monitoring",
    aliases: ["aws.cloudtrail"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "systems-manager",
    displayName: "AWS Systems Manager",
    category: "monitoring",
    aliases: ["ssm", "aws.systems-manager"],
    allowedContainment: ["region"],
  }),

  // Tier 2: Application Integration
  defineService({
    id: "step-functions",
    displayName: "AWS Step Functions",
    category: "integration",
    aliases: ["stepfunctions", "aws.step-functions", "sfn"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "appflow",
    displayName: "AWS AppFlow",
    category: "integration",
    aliases: ["aws.appflow"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "appsync",
    displayName: "AWS AppSync",
    category: "integration",
    aliases: ["aws.appsync"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "mq",
    displayName: "Amazon MQ",
    category: "integration",
    aliases: ["amazon-mq", "aws.mq"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "msk",
    displayName: "Amazon MSK",
    category: "integration",
    aliases: ["managed-kafka", "kafka", "aws.msk"],
    allowedContainment: ["vpc"],
  }),

  // Tier 2: Analytics
  defineService({
    id: "kinesis-streams",
    displayName: "Amazon Kinesis Data Streams",
    category: "analytics",
    aliases: ["kinesis", "aws.kinesis-streams"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "kinesis-firehose",
    displayName: "Amazon Kinesis Data Firehose",
    category: "analytics",
    aliases: ["firehose", "aws.kinesis-firehose"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "kinesis-analytics",
    displayName: "Amazon Kinesis Data Analytics",
    category: "analytics",
    aliases: ["aws.kinesis-analytics"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "emr",
    displayName: "Amazon EMR",
    category: "analytics",
    aliases: ["elastic-mapreduce", "aws.emr"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "glue",
    displayName: "AWS Glue",
    category: "analytics",
    aliases: ["aws.glue"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "athena",
    displayName: "Amazon Athena",
    category: "analytics",
    aliases: ["aws.athena"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "redshift",
    displayName: "Amazon Redshift",
    category: "database",
    aliases: ["aws.redshift"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "quicksight",
    displayName: "Amazon QuickSight",
    category: "analytics",
    aliases: ["aws.quicksight"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "opensearch",
    displayName: "Amazon OpenSearch Service",
    category: "analytics",
    aliases: ["elasticsearch", "aws.opensearch"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "data-pipeline",
    displayName: "AWS Data Pipeline",
    category: "analytics",
    aliases: ["aws.data-pipeline"],
    allowedContainment: ["region"],
  }),

  // Tier 2: AI/ML
  defineService({
    id: "sagemaker",
    displayName: "Amazon SageMaker",
    category: "ai-ml",
    aliases: ["aws.sagemaker"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "bedrock",
    displayName: "Amazon Bedrock",
    category: "ai-ml",
    aliases: ["aws.bedrock"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "rekognition",
    displayName: "Amazon Rekognition",
    category: "ai-ml",
    aliases: ["aws.rekognition"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "comprehend",
    displayName: "Amazon Comprehend",
    category: "ai-ml",
    aliases: ["aws.comprehend"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "translate",
    displayName: "Amazon Translate",
    category: "ai-ml",
    aliases: ["aws.translate"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "polly",
    displayName: "Amazon Polly",
    category: "ai-ml",
    aliases: ["aws.polly"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "transcribe",
    displayName: "Amazon Transcribe",
    category: "ai-ml",
    aliases: ["aws.transcribe"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "lex",
    displayName: "Amazon Lex",
    category: "ai-ml",
    aliases: ["aws.lex"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "kendra",
    displayName: "Amazon Kendra",
    category: "ai-ml",
    aliases: ["aws.kendra"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "forecast",
    displayName: "Amazon Forecast",
    category: "ai-ml",
    aliases: ["aws.forecast"],
    allowedContainment: ["region"],
  }),

  // Tier 2: Developer Tools
  defineService({
    id: "codepipeline",
    displayName: "AWS CodePipeline",
    category: "devtools",
    aliases: ["aws.codepipeline"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "codebuild",
    displayName: "AWS CodeBuild",
    category: "devtools",
    aliases: ["aws.codebuild"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "codedeploy",
    displayName: "AWS CodeDeploy",
    category: "devtools",
    aliases: ["aws.codedeploy"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "codecommit",
    displayName: "AWS CodeCommit",
    category: "devtools",
    aliases: ["aws.codecommit"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud9",
    displayName: "AWS Cloud9",
    category: "devtools",
    aliases: ["aws.cloud9"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "codeartifact",
    displayName: "AWS CodeArtifact",
    category: "devtools",
    aliases: ["aws.codeartifact"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "codeguru",
    displayName: "Amazon CodeGuru",
    category: "devtools",
    aliases: ["aws.codeguru"],
    allowedContainment: ["region"],
  }),

  // Tier 2: Containers
  defineService({
    id: "ecr",
    displayName: "Amazon ECR",
    category: "containers",
    aliases: ["elastic-container-registry", "aws.ecr"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "ecs-anywhere",
    displayName: "Amazon ECS Anywhere",
    category: "containers",
    aliases: ["aws.ecs-anywhere"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "eks-addons",
    displayName: "Amazon EKS Add-ons",
    category: "containers",
    aliases: ["aws.eks-addons"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "app-mesh",
    displayName: "AWS App Mesh",
    category: "containers",
    aliases: ["aws.app-mesh"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "copilot",
    displayName: "AWS Copilot",
    category: "containers",
    aliases: ["aws.copilot"],
    allowedContainment: ["region"],
  }),

  // Tier 2: Serverless
  defineService({
    id: "eventbridge-scheduler",
    displayName: "Amazon EventBridge Scheduler",
    category: "integration",
    aliases: ["scheduler", "aws.eventbridge-scheduler"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "step-functions-express",
    displayName: "AWS Step Functions Express",
    category: "integration",
    aliases: ["sfn-express", "aws.step-functions-express"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "lambda-edge",
    displayName: "Lambda@Edge",
    category: "compute",
    aliases: ["aws.lambda-edge"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "lambda-layers",
    displayName: "AWS Lambda Layers",
    category: "compute",
    aliases: ["aws.lambda-layers"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "sam",
    displayName: "AWS SAM",
    category: "devtools",
    aliases: ["serverless-application-model", "aws.sam"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "application-composer",
    displayName: "AWS Application Composer",
    category: "devtools",
    aliases: ["aws.application-composer"],
    allowedContainment: ["region"],
  }),

  // Tier 2: Messaging
  defineService({
    id: "pinpoint",
    displayName: "Amazon Pinpoint",
    category: "integration",
    aliases: ["aws.pinpoint"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "ses",
    displayName: "Amazon SES",
    category: "integration",
    aliases: ["simple-email-service", "aws.ses"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "sns-mobile",
    displayName: "Amazon SNS Mobile",
    category: "integration",
    aliases: ["aws.sns-mobile"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "eventbridge-pipes",
    displayName: "Amazon EventBridge Pipes",
    category: "integration",
    aliases: ["aws.eventbridge-pipes"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "eventbridge-api-destinations",
    displayName: "Amazon EventBridge API Destinations",
    category: "integration",
    aliases: ["aws.eventbridge-api-destinations"],
    allowedContainment: ["region"],
  }),

  // Tier 3: IoT Services
  defineService({
    id: "iot-core",
    displayName: "AWS IoT Core",
    category: "integration",
    aliases: ["iot", "aws.iot-core"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "iot-analytics",
    displayName: "AWS IoT Analytics",
    category: "integration",
    aliases: ["aws.iot-analytics"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "iot-events",
    displayName: "AWS IoT Events",
    category: "integration",
    aliases: ["aws.iot-events"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "iot-greengrass",
    displayName: "AWS IoT Greengrass",
    category: "integration",
    aliases: ["greengrass", "aws.iot-greengrass"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "iot-sitewise",
    displayName: "AWS IoT SiteWise",
    category: "integration",
    aliases: ["sitewise", "aws.iot-sitewise"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Media Services
  defineService({
    id: "medialive",
    displayName: "AWS Elemental MediaLive",
    category: "compute",
    aliases: ["aws.medialive"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "mediaconvert",
    displayName: "AWS Elemental MediaConvert",
    category: "compute",
    aliases: ["aws.mediaconvert"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "mediapackage",
    displayName: "AWS Elemental MediaPackage",
    category: "compute",
    aliases: ["aws.mediapackage"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "mediaconnect",
    displayName: "AWS Elemental MediaConnect",
    category: "compute",
    aliases: ["aws.mediaconnect"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "mediatailor",
    displayName: "AWS Elemental MediaTailor",
    category: "compute",
    aliases: ["aws.mediatailor"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "ivs",
    displayName: "Amazon Interactive Video Service",
    category: "compute",
    aliases: ["interactive-video-service", "aws.ivs"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "kinesis-video",
    displayName: "Amazon Kinesis Video Streams",
    category: "compute",
    aliases: ["kinesis-video-streams", "aws.kinesis-video"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "mediastore",
    displayName: "AWS Elemental MediaStore",
    category: "compute",
    aliases: ["aws.mediastore"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Gaming
  defineService({
    id: "gamelift",
    displayName: "Amazon GameLift",
    category: "compute",
    aliases: ["aws.gamelift"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "gamesparks",
    displayName: "Amazon GameSparks",
    category: "compute",
    aliases: ["aws.gamesparks"],
    allowedContainment: ["region"],
  }),

  // Tier 3: End User Computing
  defineService({
    id: "workspaces",
    displayName: "Amazon WorkSpaces",
    category: "management",
    aliases: ["aws.workspaces"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "appstream",
    displayName: "Amazon AppStream 2.0",
    category: "management",
    aliases: ["appstream-2.0", "aws.appstream"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "workdocs",
    displayName: "Amazon WorkDocs",
    category: "management",
    aliases: ["aws.workdocs"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "worklink",
    displayName: "Amazon WorkLink",
    category: "management",
    aliases: ["aws.worklink"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "workmail",
    displayName: "Amazon WorkMail",
    category: "management",
    aliases: ["aws.workmail"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Contact Center
  defineService({
    id: "connect",
    displayName: "Amazon Connect",
    category: "management",
    aliases: ["aws.connect"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "connect-customer-profiles",
    displayName: "Amazon Connect Customer Profiles",
    category: "management",
    aliases: ["aws.connect-customer-profiles"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "connect-voice-id",
    displayName: "Amazon Connect Voice ID",
    category: "management",
    aliases: ["aws.connect-voice-id"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Business Applications
  defineService({
    id: "chime",
    displayName: "Amazon Chime",
    category: "management",
    aliases: ["aws.chime"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "honeycode",
    displayName: "Amazon Honeycode",
    category: "management",
    aliases: ["aws.honeycode"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "workspaces-web",
    displayName: "Amazon WorkSpaces Web",
    category: "management",
    aliases: ["aws.workspaces-web"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "wickr",
    displayName: "AWS Wickr",
    category: "management",
    aliases: ["aws.wickr"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Blockchain
  defineService({
    id: "managed-blockchain",
    displayName: "Amazon Managed Blockchain",
    category: "management",
    aliases: ["blockchain", "aws.managed-blockchain"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "qldb",
    displayName: "Amazon QLDB",
    category: "management",
    aliases: ["quantum-ledger-database", "aws.qldb"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Robotics & AR/VR
  defineService({
    id: "robomaker",
    displayName: "AWS RoboMaker",
    category: "management",
    aliases: ["aws.robomaker"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "sumerian",
    displayName: "Amazon Sumerian",
    category: "management",
    aliases: ["aws.sumerian"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "iot-roborunner",
    displayName: "AWS IoT RoboRunner",
    category: "management",
    aliases: ["roborunner", "aws.iot-roborunner"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Migration Services
  defineService({
    id: "dms",
    displayName: "AWS Database Migration Service",
    category: "management",
    aliases: ["database-migration-service", "aws.dms"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "sms",
    displayName: "AWS Server Migration Service",
    category: "management",
    aliases: ["server-migration-service", "aws.sms"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "datasync",
    displayName: "AWS DataSync",
    category: "management",
    aliases: ["aws.datasync"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "transfer-family",
    displayName: "AWS Transfer Family",
    category: "management",
    aliases: ["aws.transfer-family", "transfer"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "migration-hub",
    displayName: "AWS Migration Hub",
    category: "management",
    aliases: ["aws.migration-hub"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "application-discovery",
    displayName: "AWS Application Discovery Service",
    category: "management",
    aliases: ["aws.application-discovery"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "application-migration",
    displayName: "AWS Application Migration Service",
    category: "management",
    aliases: ["mgn", "aws.application-migration"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "migration-evaluator",
    displayName: "AWS Migration Evaluator",
    category: "management",
    aliases: ["aws.migration-evaluator"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloudendure",
    displayName: "AWS CloudEndure Migration",
    category: "management",
    aliases: ["aws.cloudendure"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "mainframe-modernization",
    displayName: "AWS Mainframe Modernization",
    category: "management",
    aliases: ["aws.mainframe-modernization"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Supply Chain & Industrial
  defineService({
    id: "supply-chain",
    displayName: "AWS Supply Chain",
    category: "management",
    aliases: ["aws.supply-chain"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "iot-twinmaker",
    displayName: "AWS IoT TwinMaker",
    category: "integration",
    aliases: ["twinmaker", "aws.iot-twinmaker"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "monitron",
    displayName: "Amazon Monitron",
    category: "integration",
    aliases: ["aws.monitron"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "panorama",
    displayName: "AWS Panorama",
    category: "integration",
    aliases: ["aws.panorama"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "private-5g",
    displayName: "AWS Private 5G",
    category: "networking",
    aliases: ["aws.private-5g"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Additional Compute
  defineService({
    id: "elastic-beanstalk",
    displayName: "AWS Elastic Beanstalk",
    category: "compute",
    aliases: ["beanstalk", "aws.elastic-beanstalk"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "lightsail",
    displayName: "Amazon Lightsail",
    category: "compute",
    aliases: ["aws.lightsail"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "simspace-weaver",
    displayName: "AWS SimSpace Weaver",
    category: "compute",
    aliases: ["aws.simspace-weaver"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "compute-optimizer",
    displayName: "AWS Compute Optimizer",
    category: "monitoring",
    aliases: ["aws.compute-optimizer"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Edge/Hybrid
  defineService({
    id: "outposts",
    displayName: "AWS Outposts",
    category: "compute",
    aliases: ["aws.outposts"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "snowball",
    displayName: "AWS Snowball",
    category: "compute",
    aliases: ["aws.snowball", "snow-family"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "snowmobile",
    displayName: "AWS Snowmobile",
    category: "compute",
    aliases: ["aws.snowmobile"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "snowcone",
    displayName: "AWS Snowcone",
    category: "compute",
    aliases: ["aws.snowcone"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "wavelength",
    displayName: "AWS Wavelength",
    category: "compute",
    aliases: ["aws.wavelength"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "local-zones",
    displayName: "AWS Local Zones",
    category: "compute",
    aliases: ["aws.local-zones"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "outposts-rack",
    displayName: "AWS Outposts Rack",
    category: "compute",
    aliases: ["aws.outposts-rack"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "outposts-server",
    displayName: "AWS Outposts Server",
    category: "compute",
    aliases: ["aws.outposts-server"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Satellite
  defineService({
    id: "ground-station",
    displayName: "AWS Ground Station",
    category: "management",
    aliases: ["aws.ground-station"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Quantum
  defineService({
    id: "braket",
    displayName: "Amazon Braket",
    category: "compute",
    aliases: ["aws.braket"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Legacy Services
  defineService({
    id: "simpledb",
    displayName: "Amazon SimpleDB",
    category: "database",
    aliases: ["aws.simpledb"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "opsworks",
    displayName: "AWS OpsWorks",
    category: "devtools",
    aliases: ["aws.opsworks"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "opsworks-stacks",
    displayName: "AWS OpsWorks Stacks",
    category: "devtools",
    aliases: ["aws.opsworks-stacks"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "opsworks-cm",
    displayName: "AWS OpsWorks for Chef Automate",
    category: "devtools",
    aliases: ["aws.opsworks-cm"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Monitoring & Management
  defineService({
    id: "managed-grafana",
    displayName: "Amazon Managed Grafana",
    category: "monitoring",
    aliases: ["aws.managed-grafana", "grafana"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "managed-prometheus",
    displayName: "Amazon Managed Service for Prometheus",
    category: "monitoring",
    aliases: ["aws.managed-prometheus", "prometheus"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloudformation",
    displayName: "AWS CloudFormation",
    category: "devtools",
    aliases: ["aws.cloudformation", "cfn"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "service-catalog",
    displayName: "AWS Service Catalog",
    category: "management",
    aliases: ["aws.service-catalog"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "config",
    displayName: "AWS Config",
    category: "management",
    aliases: ["aws.config"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "control-tower",
    displayName: "AWS Control Tower",
    category: "management",
    aliases: ["aws.control-tower"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "organizations",
    displayName: "AWS Organizations",
    category: "management",
    aliases: ["aws.organizations"],
    allowedContainment: ["account"],
  }),

  // Tier 4: Networking
  defineService({
    id: "cloud-map",
    displayName: "AWS Cloud Map",
    category: "networking",
    aliases: ["aws.cloud-map"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "route53-resolver",
    displayName: "Route 53 Resolver",
    category: "networking",
    aliases: ["aws.route53-resolver"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "vpc-lattice",
    displayName: "Amazon VPC Lattice",
    category: "networking",
    aliases: ["aws.vpc-lattice"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Security & Compliance
  defineService({
    id: "audit-manager",
    displayName: "AWS Audit Manager",
    category: "security",
    aliases: ["aws.audit-manager"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "artifact",
    displayName: "AWS Artifact",
    category: "security",
    aliases: ["aws.artifact"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "detective",
    displayName: "Amazon Detective",
    category: "security",
    aliases: ["aws.detective"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "inspector",
    displayName: "Amazon Inspector",
    category: "security",
    aliases: ["aws.inspector"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Cost Management
  defineService({
    id: "cost-explorer",
    displayName: "AWS Cost Explorer",
    category: "management",
    aliases: ["aws.cost-explorer"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "budgets",
    displayName: "AWS Budgets",
    category: "management",
    aliases: ["aws.budgets"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "cost-usage-report",
    displayName: "AWS Cost and Usage Report",
    category: "management",
    aliases: ["aws.cost-usage-report", "cur"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "savings-plans",
    displayName: "AWS Savings Plans",
    category: "management",
    aliases: ["aws.savings-plans"],
    allowedContainment: ["account"],
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
