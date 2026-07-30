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
    id: "serverless-web-app",
    title: "Full-Stack Serverless Web Application",
    category: "Serverless",
    description:
      "Route 53 DNS, CloudFront CDN, S3 static assets, API Gateway, Lambda, and DynamoDB",
    source: `direction LR
provider aws

dns: route53
cdn: cloudfront
static_site: s3
api: api-gateway
fn: lambda
db: dynamodb

dns > cdn
cdn -[origin]-> static_site
cdn -[api_route]-> api
api -[invokes]-> fn -[queries]-> db`,
  },
  {
    id: "container-cache-db",
    title: "Containerized App with In-Memory Cache",
    category: "Web & Compute",
    description:
      "ALB distributing traffic to ECS microservices cached by ElastiCache and backed by RDS",
    source: `direction LR
provider aws
validation normal

alb -[routes]-> ecs
ecs -[caches]-> elasticache
ecs -[queries]-> rds`,
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
    id: "async-fanout-messaging",
    title: "Async Fan-Out Event Processing",
    category: "Messaging",
    description:
      "API Gateway triggering SNS Topic fan-out to parallel SQS Queues for Email workers and Analytics S3 Data Lake",
    source: `direction LR
provider aws

apigw: api-gateway
publisher: lambda
topic: sns

queue_email: sqs
worker_email: lambda

queue_analytics: sqs
worker_analytics: lambda
data_lake: s3

apigw > publisher > topic
topic -[fanout]-> queue_email > worker_email
topic -[fanout]-> queue_analytics > worker_analytics > data_lake`,
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
    id: "secure-vpc-network",
    title: "Secure Multi-Subnet VPC Infrastructure",
    category: "Networking",
    description:
      "Production Account with Public Subnet ALB/Security Group and isolated Private Subnets for ECS and RDS Database",
    source: `direction LR
provider aws
validation normal

account production {
  region us-east-1 {
    vpc main-vpc {
      subnet public-subnet {
        load_balancer: alb
        firewall: security-group
      }
      subnet private-app-subnet {
        api_cluster: ecs
      }
      subnet private-db-subnet {
        db_cluster: rds
      }
    }
  }
}

load_balancer > firewall > api_cluster > db_cluster`,
  },
  {
    id: "ai-ml-inference",
    title: "AI/ML Model Inference Pipeline",
    category: "AI & Machine Learning",
    description:
      "CloudFront and API Gateway feeding Lambda preprocessor to EKS GPU inference cluster backed by ElastiCache and S3",
    source: `direction LR
provider aws
validation normal

cdn: cloudfront
gateway: api-gateway
preprocessor: lambda
inference_cluster: eks
feature_store: elasticache
model_bucket: s3

cdn > gateway > preprocessor
preprocessor -[submits]-> inference_cluster
inference_cluster -[fetches]-> feature_store
inference_cluster -[loads]-> model_bucket`,
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

    apigw > ingress > web_app
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
  {
    id: "gcp-serverless-sql",
    title: "GCP Serverless Cloud Run + Cloud SQL",
    category: "Google Cloud",
    description: "Cloud Run service connected to a Cloud SQL database",
    source: `direction LR
provider gcp
validation normal

cloud-run -[connects]->|Cloud SQL Auth Proxy| cloud-sql`,
  },
  {
    id: "gcp-event-pipeline",
    title: "GCP Event-Driven Data Pipeline",
    category: "Google Cloud",
    description:
      "GKE publishing events to Pub/Sub, processed by Cloud Functions into BigQuery",
    source: `direction LR
provider gcp

gke -[publishes]-> pubsub
pubsub -[invokes]-> cloud-functions
cloud-functions -[writes]-> bigquery`,
  },
  {
    id: "gcp-vpc-architecture",
    title: "GCP VPC Network Architecture",
    category: "Google Cloud",
    description:
      "Cloud Load Balancing routing to Compute Engine and Memorystore inside a regional VPC with subnets",
    source: `direction LR
provider gcp
validation normal

account production {
  region us-central1 {
    vpc main-vpc {
      subnet app-subnet {
        app: compute-engine
        cache: memorystore
      }
    }
  }
}

lb: cloud-load-balancing
lb -[routes]-> app
app -[caches]-> cache
app -[writes]-> cloud-storage`,
  },
];
