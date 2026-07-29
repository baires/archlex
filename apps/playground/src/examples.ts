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
  {
    id: "enterprise-cloud",
    title: "Enterprise Multi-Tier Cloud Architecture",
    category: "Complex Enterprise",
    description:
      "Full-stack AWS architecture featuring CloudFront CDN, API Gateway, nested VPC/Subnets, ECS tasks, ElastiCache, and RDS Proxy",
    source: `direction LR
provider aws
validation normal

account enterprise-prod {
  region us-east-1 {
    dns: route53
    cdn: cloudfront
    apigw: api-gateway
    cache: elasticache
    db_nosql: dynamodb

    dns > cdn > apigw

    vpc production-vpc {
      subnet public-subnet-1 {
        ingress: alb
      }
      subnet private-subnet-a {
        web_app: ecs
        proxy: rds-proxy
        db_sql: rds
      }
    }

    apigw > web_app
    web_app > cache
    web_app > proxy > db_sql
    apigw > db_nosql
  }
}`,
  },
  {
    id: "event-data-pipeline",
    title: "Event-Driven Data Ingestion Pipeline",
    category: "Complex Enterprise",
    description:
      "High-throughput event streaming with API Gateway, EventBridge, SNS, SQS, Lambda workers, DynamoDB, and S3 Data Lake",
    source: `direction LR
provider aws
validation normal

ingress_api: api-gateway
ingest_fn: lambda
events_bus: eventbridge
notification_topic: sns
buffer_queue: sqs
processor_fn: lambda
lake: s3
nosql_store: dynamodb

ingress_api -[invokes]-> ingest_fn
ingest_fn -[publishes]-> notification_topic
notification_topic -[forwards]-> buffer_queue
events_bus -[triggers]-> buffer_queue
buffer_queue -[batch_invokes]-> processor_fn
processor_fn -[persists]-> nosql_store
processor_fn -[archives]-> lake`,
  },
  {
    id: "multi-region-dr",
    title: "Multi-Region High Availability & DR",
    category: "Complex Enterprise",
    description:
      "Cross-region active/passive failover with Route 53 DNS routing, primary and secondary VPCs, and database replication",
    source: `direction LR
provider aws
validation normal

account global-core {
  region us-east-1 {
    vpc primary-vpc {
      subnet app-subnet-1 {
        app_primary: ecs
        db_primary: rds
        cache_primary: elasticache
        app_primary > cache_primary
        app_primary > db_primary
      }
    }
  }
  region us-west-2 {
    vpc failover-vpc {
      subnet app-subnet-2 {
        app_secondary: ecs
        db_replica: rds
        app_secondary > db_replica
      }
    }
  }
}

global_dns: route53
global_dns -[primary]-> app_primary
global_dns -[failover]-> app_secondary
db_primary -[replicates]-> db_replica`,
  },
];
