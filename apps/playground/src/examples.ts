export interface ArchitectureExample {
  id: string;
  title: string;
  category: string;
  description: string;
  source: string;
}

export const ARCHITECTURE_EXAMPLES: ArchitectureExample[] = [
  {
    id: "minimal-slice",
    title: "Minimal Vertical Slice",
    category: "Database & Compute",
    description: "RDS Proxy, RDS Database, and ECS Service",
    source: `direction LR
provider aws
validation normal

rds-proxy > rds > ecs`,
  },
  {
    id: "3-tier-web",
    title: "Classic 3-Tier Web Architecture",
    category: "Web & Compute",
    description:
      "Application Load Balancer distributing to ECS container tasks connected to RDS",
    source: `direction LR
provider aws
validation normal

alb > ecs -[writes]->|SQL| rds`,
  },
  {
    id: "serverless-api",
    title: "Serverless Microservice",
    category: "Serverless",
    description:
      "API Gateway invoking Lambda function accessing DynamoDB table",
    source: `direction LR
provider aws

api-gateway -[invokes]-> lambda -[writes]-> dynamodb`,
  },
  {
    id: "event-driven",
    title: "Event-Driven Microservices",
    category: "Messaging",
    description: "EventBridge publishing to SQS Queue subscribed by Lambda",
    source: `direction LR
provider aws

eventbridge -[publishes]-> sqs -[invokes]-> lambda`,
  },
  {
    id: "vpc-hierarchy",
    title: "VPC Subnet Hierarchy",
    category: "Networking",
    description:
      "Production Account with us-east-1 Region, VPC, Subnet, and container database workload",
    source: `direction LR
provider aws
validation normal

account production {
  region us-east-1 {
    vpc application {
      subnet private-a {
        proxy: rds-proxy
        db: rds
        proxy > db
      }
    }
  }
}`,
  },
];
