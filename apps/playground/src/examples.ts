export const EXAMPLE_PROVIDERS = ["aws", "gcp", "k8s"] as const;

export type ExampleProvider = (typeof EXAMPLE_PROVIDERS)[number];

export const EXAMPLE_PROVIDER_LABELS: Record<ExampleProvider, string> = {
  aws: "AWS",
  gcp: "Google Cloud",
  k8s: "Kubernetes",
};

export const EXAMPLE_USE_CASES = [
  "Getting Started",
  "Web Applications",
  "Serverless",
  "Event-Driven",
  "Networking",
  "Data & Analytics",
  "AI & Machine Learning",
  "Media & Streaming",
  "IoT & Edge",
  "Migration & Hybrid",
  "DevOps & CI/CD",
  "Enterprise",
  "Stateful Workloads",
  "Batch Processing",
  "Reliability & Scaling",
  "Security & Access",
  "Security & Compliance",
] as const;

export type ExampleUseCase = (typeof EXAMPLE_USE_CASES)[number];

export interface ArchitectureExample {
  id: string;
  title: string;
  provider: ExampleProvider;
  useCase: ExampleUseCase;
  description: string;
  source: string;
}

export const ARCHITECTURE_EXAMPLES: readonly ArchitectureExample[] = [
  // AWS
  {
    id: "minimal-slice",
    title: "Minimal Vertical Slice",
    provider: "aws",
    useCase: "Getting Started",
    description: "RDS Proxy, RDS Database, and ECS Service",
    source: `provider aws
direction LR
validation normal

rds-proxy > rds > ecs`,
  },
  {
    id: "labeled-instances",
    title: "Display Labels & Named Instances",
    provider: "aws",
    useCase: "Getting Started",
    description:
      "Instance names and custom display labels distinguishing primary and replica databases",
    source: `provider aws
direction LR
validation normal

primary: rds["Primary DB"]
replica: rds["Read Replica"]
app: ecs

app -[writes]-> primary
primary -[replicates]-> replica`,
  },
  {
    id: "3-tier-web",
    title: "Classic 3-Tier Web Architecture",
    provider: "aws",
    useCase: "Web Applications",
    description:
      "Application Load Balancer distributing to ECS container tasks connected to RDS",
    source: `provider aws
direction LR
validation normal

alb > ecs -[writes]->|SQL| rds`,
  },
  {
    id: "serverless-api",
    title: "Serverless Microservice",
    provider: "aws",
    useCase: "Serverless",
    description:
      "API Gateway invoking Lambda function accessing DynamoDB table",
    source: `provider aws
direction LR

api-gateway -[invokes]-> lambda -[writes]-> dynamodb`,
  },
  {
    id: "serverless-web-app",
    title: "Full-Stack Serverless Web Application",
    provider: "aws",
    useCase: "Serverless",
    description:
      "Route 53 DNS, CloudFront CDN, S3 static assets, API Gateway, Lambda, and DynamoDB",
    source: `provider aws
direction LR

dns: route53
cdn: cloudfront
static_site: s3
api: api-gateway
fn: lambda
db: dynamodb

dns > cdn
cdn -[routes]->|static origin| static_site
cdn -[routes]->|API route| api
api -[invokes]-> fn -[reads]-> db`,
  },
  {
    id: "container-cache-db",
    title: "Containerized App with In-Memory Cache",
    provider: "aws",
    useCase: "Web Applications",
    description:
      "ALB distributing traffic to ECS microservices cached by ElastiCache and backed by RDS",
    source: `provider aws
direction LR
validation normal

alb -[routes]-> ecs
ecs -[caches]-> elasticache
ecs -[reads]-> rds`,
  },
  {
    id: "event-driven",
    title: "Event-Driven Microservices",
    provider: "aws",
    useCase: "Event-Driven",
    description: "EventBridge publishing to SQS Queue subscribed by Lambda",
    source: `provider aws
direction LR

eventbridge -[publishes]-> sqs -[invokes]-> lambda`,
  },
  {
    id: "async-fanout-messaging",
    title: "Async Fan-Out Event Processing",
    provider: "aws",
    useCase: "Event-Driven",
    description:
      "API Gateway triggering SNS Topic fan-out to parallel SQS Queues for Email workers and Analytics S3 Data Lake",
    source: `provider aws
direction LR

apigw: api-gateway
publisher: lambda
topic: sns

queue_email: sqs
worker_email: lambda

queue_analytics: sqs
worker_analytics: lambda
data_lake: s3

apigw > publisher > topic
topic -[publishes]->|fan-out| queue_email > worker_email
topic -[publishes]->|fan-out| queue_analytics > worker_analytics > data_lake`,
  },
  {
    id: "vpc-hierarchy",
    title: "VPC Subnet Hierarchy",
    provider: "aws",
    useCase: "Networking",
    description:
      "Production Account with us-east-1 Region, VPC, Subnet, and container database workload",
    source: `provider aws
direction LR
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
    provider: "aws",
    useCase: "Networking",
    description:
      "Production Account with Public Subnet ALB/Security Group and isolated Private Subnets for ECS and RDS Database",
    source: `provider aws
direction LR
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
    provider: "aws",
    useCase: "AI & Machine Learning",
    description:
      "CloudFront and API Gateway feeding Lambda preprocessor to EKS GPU inference cluster backed by ElastiCache and S3",
    source: `provider aws
direction LR
validation normal

cdn: cloudfront
gateway: api-gateway
preprocessor: lambda
inference_cluster: eks
feature_store: elasticache
model_bucket: s3

cdn > gateway > preprocessor
preprocessor -[invokes]->|submits inference| inference_cluster
inference_cluster -[reads]->|feature data| feature_store
inference_cluster -[reads]->|model artifacts| model_bucket`,
  },
  {
    id: "enterprise-cloud",
    title: "Enterprise Multi-Tier Cloud Architecture",
    provider: "aws",
    useCase: "Enterprise",
    description:
      "Full-stack AWS architecture featuring CloudFront CDN, API Gateway, nested VPC/Subnets, ECS tasks, ElastiCache, and RDS Proxy",
    source: `provider aws
direction LR
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
    provider: "aws",
    useCase: "Data & Analytics",
    description:
      "High-throughput event streaming with API Gateway, EventBridge, SNS, SQS, Lambda workers, DynamoDB, and S3 Data Lake",
    source: `provider aws
direction LR
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
notification_topic -[publishes]->|forwards| buffer_queue
events_bus -[triggers]-> buffer_queue
buffer_queue -[invokes]->|batch| processor_fn
processor_fn -[writes]-> nosql_store
processor_fn -[archives]-> lake`,
  },
  {
    id: "multi-region-dr",
    title: "Multi-Region High Availability & DR",
    provider: "aws",
    useCase: "Reliability & Scaling",
    description:
      "Cross-region active/passive failover with Route 53 DNS routing, primary and secondary VPCs, and database replication",
    source: `provider aws
direction LR
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
global_dns -[routes]->|primary| app_primary
global_dns -[routes]->|failover| app_secondary
db_primary -[replicates]-> db_replica`,
  },
  {
    id: "aws-media-streaming",
    title: "Live Video Streaming Pipeline",
    provider: "aws",
    useCase: "Media & Streaming",
    description:
      "AWS MediaLive ingesting live streams, MediaPackage packaging for delivery, and CloudFront CDN distribution",
    source: `provider aws
direction LR

live_input: medialive["Live Video Input"]
packager: mediapackage
cdn: cloudfront
storage: s3

live_input -[transcodes]-> packager
packager -[packages]-> cdn
packager -[archives]-> storage`,
  },
  {
    id: "aws-iot-analytics",
    title: "IoT Data Collection & Analytics",
    provider: "aws",
    useCase: "IoT & Edge",
    description:
      "IoT Core ingesting device data, IoT Analytics processing streams, and QuickSight visualizing insights",
    source: `provider aws
direction LR

devices: iot-core["IoT Devices"]
analytics: iot-analytics
warehouse: timestream
viz: quicksight

devices -[streams]-> analytics
analytics -[writes]-> warehouse
warehouse -[analyzes]-> viz`,
  },
  {
    id: "aws-data-lake-etl",
    title: "Serverless Data Lake ETL Pipeline",
    provider: "aws",
    useCase: "Data & Analytics",
    description:
      "Kinesis Firehose streaming to S3 Data Lake, Glue ETL transforming data, and Athena querying results",
    source: `provider aws
direction LR

stream: kinesis-firehose
raw_lake: s3["Raw Data Lake"]
etl: glue
processed_lake: s3["Processed Data Lake"]
query: athena

stream -[streams]-> raw_lake
raw_lake -[transforms]-> etl
etl -[writes]-> processed_lake
query -[reads]-> processed_lake`,
  },
  {
    id: "aws-migration-workflow",
    title: "Database Migration to Cloud",
    provider: "aws",
    useCase: "Migration & Hybrid",
    description:
      "DMS migrating on-premises database to Aurora, with Application Discovery mapping dependencies",
    source: `provider aws
direction LR

discovery: application-discovery
on_prem_db: rds["On-Premises DB"]
migration: dms
target_db: aurora["Aurora Cluster"]
app: ecs

discovery -[discovers]-> on_prem_db
on_prem_db -[migrates]-> migration
migration -[writes]-> target_db
app -[connects]-> target_db`,
  },
  {
    id: "aws-cicd-pipeline",
    title: "Complete CI/CD Deployment Pipeline",
    provider: "aws",
    useCase: "DevOps & CI/CD",
    description:
      "CodePipeline orchestrating CodeBuild, CodeDeploy to ECS, with CloudFormation infrastructure",
    source: `provider aws
direction LR

repo: codecommit
pipeline: codepipeline
build: codebuild
registry: ecr
deploy: codedeploy
infra: cloudformation
service: ecs

repo -[triggers]-> pipeline
pipeline -[orchestrates]-> build
build -[builds]-> registry
pipeline -[orchestrates]-> deploy
deploy -[deploys]-> service
pipeline -[orchestrates]-> infra`,
  },
  // Google Cloud
  {
    id: "gcp-serverless-sql",
    title: "GCP Serverless Cloud Run + Cloud SQL",
    provider: "gcp",
    useCase: "Serverless",
    description: "Cloud Run service connected to a Cloud SQL database",
    source: `provider gcp
direction LR
validation normal

cloud-run -[connects]->|Cloud SQL Auth Proxy| cloud-sql`,
  },
  {
    id: "gcp-event-pipeline",
    title: "GCP Event-Driven Data Pipeline",
    provider: "gcp",
    useCase: "Data & Analytics",
    description:
      "GKE publishing events to Pub/Sub, processed by Cloud Functions into BigQuery",
    source: `provider gcp
direction LR

gke -[publishes]-> pubsub
pubsub -[invokes]-> cloud-functions
cloud-functions -[writes]-> bigquery`,
  },
  {
    id: "gcp-vpc-architecture",
    title: "GCP VPC Network Architecture",
    provider: "gcp",
    useCase: "Networking",
    description:
      "Cloud Load Balancing routing to Compute Engine and Memorystore inside a regional VPC with subnets",
    source: `provider gcp
direction LR
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
  {
    id: "gcp-ai-document-processing",
    title: "AI-Powered Document Processing",
    provider: "gcp",
    useCase: "AI & Machine Learning",
    description:
      "Document AI extracting data from uploads, Natural Language AI analyzing content, stored in Firestore",
    source: `provider gcp
direction LR

uploads: cloud-storage["Document Uploads"]
doc_ai: document-ai
nlp: natural-language-ai
database: firestore
search: cloud-search

uploads -[triggers]-> doc_ai
doc_ai -[analyzes]-> nlp
nlp -[writes]-> database
database -[connects]->|indexes into| search`,
  },
  {
    id: "gcp-data-warehouse",
    title: "Modern Data Warehouse with Dataflow",
    provider: "gcp",
    useCase: "Data & Analytics",
    description:
      "Pub/Sub streaming to Dataflow for transformation, loading into BigQuery, visualized by Looker",
    source: `provider gcp
direction LR

events: pubsub["Event Stream"]
transform: dataflow
warehouse: bigquery
viz: looker
govern: dataplex

events -[streams]-> transform
transform -[processes]-> warehouse
warehouse -[analyzes]-> viz
warehouse -[governs]-> dataplex`,
  },
  {
    id: "gcp-hybrid-anthos",
    title: "Hybrid Cloud with Anthos",
    provider: "gcp",
    useCase: "Migration & Hybrid",
    description:
      "GKE Enterprise (Anthos) managing clusters across GCP, on-premises VMware, and AWS environments",
    source: `provider gcp
direction LR

control_plane: gke-enterprise["Anthos Control Plane"]
gcp_cluster: gke["GCP GKE"]
vmware_cluster: anthos-vmware["On-Prem VMware"]
aws_cluster: anthos-aws["AWS EKS"]
config: config-connector

control_plane -[orchestrates]-> gcp_cluster
control_plane -[orchestrates]-> vmware_cluster
control_plane -[orchestrates]-> aws_cluster
control_plane -[governs]->|manages config| config`,
  },
  {
    id: "gcp-retail-recommendations",
    title: "E-Commerce Recommendations Engine",
    provider: "gcp",
    useCase: "AI & Machine Learning",
    description:
      "Retail API serving product catalog, Recommendations AI generating personalized suggestions to customers",
    source: `provider gcp
direction LR

catalog: retail-api["Product Catalog"]
recommendations: recommendations-ai
user_events: pubsub["User Events"]
frontend: cloud-run
cache: memorystore

user_events -[streams]-> recommendations
catalog -[streams]->|catalog feed| recommendations
recommendations -[caches]-> cache
frontend -[reads]-> cache
frontend -[reads]-> catalog`,
  },
  {
    id: "gcp-healthcare-compliance",
    title: "HIPAA-Compliant Healthcare Data Platform",
    provider: "gcp",
    useCase: "Security & Compliance",
    description:
      "Healthcare API storing medical records, Cloud DLP protecting sensitive data, Assured Workloads ensuring compliance",
    source: `provider gcp
direction LR

account healthcare-org {
  compliance: assured-workloads["Compliance Controls"]

  region us-central1 {
    healthcare: cloud-healthcare-api["Medical Records"]
    protection: dlp["Data Protection"]
    audit: cloud-logging["Audit Logs"]
    encryption: cloud-kms

    healthcare -[protects]-> protection
    healthcare -[encrypts]-> encryption
    healthcare -[logs]-> audit
  }
}`,
  },
  // Kubernetes
  {
    id: "k8s-microservices",
    title: "Kubernetes Microservices",
    provider: "k8s",
    useCase: "Web Applications",
    description:
      "Ingress and Services routing to frontend and API Deployments inside a namespace",
    source: `provider k8s
direction LR
validation normal

cluster production {
  namespace web {
    gateway: ingress
    frontend_service: service
    frontend: deployment
    api_service: service
    api: deployment

    gateway -[routes]-> frontend_service
    frontend_service -[targets]-> frontend
    frontend -[invokes]-> api_service
    api_service -[targets]-> api
  }
}`,
  },
  {
    id: "k8s-stateful-application",
    title: "Kubernetes Stateful Application",
    provider: "k8s",
    useCase: "Stateful Workloads",
    description:
      "Service exposing a StatefulSet backed by a PersistentVolumeClaim and PersistentVolume",
    source: `provider k8s
direction LR
validation normal

cluster production {
  database_volume: persistentvolume

  namespace data {
    database_service: service
    database: statefulset
    database_claim: persistentvolumeclaim

    database_service -[targets]-> database
    database -[mounts]-> database_claim
    database_claim -[binds]-> database_volume
  }
}`,
  },
  {
    id: "k8s-scheduled-batch",
    title: "Kubernetes Scheduled Batch Processing",
    provider: "k8s",
    useCase: "Batch Processing",
    description:
      "CronJob loading runtime settings from a ConfigMap and credentials from a Secret",
    source: `provider k8s
direction LR
validation normal

cluster production {
  namespace operations {
    nightly_report: cronjob
    report_config: configmap
    warehouse_credentials: secret

    nightly_report -[reads]-> report_config
    nightly_report -[reads]-> warehouse_credentials
  }
}`,
  },
  {
    id: "k8s-autoscaled-api",
    title: "Kubernetes Autoscaled Resilient API",
    provider: "k8s",
    useCase: "Reliability & Scaling",
    description:
      "Service and Deployment protected by horizontal autoscaling and a disruption budget",
    source: `provider k8s
direction LR
validation normal

cluster production {
  namespace api {
    api_service: service
    api_workload: deployment
    autoscaler: horizontalpodautoscaler
    availability_budget: poddisruptionbudget

    api_service -[targets]-> api_workload
    autoscaler -[scales]-> api_workload
    availability_budget -[protects]-> api_workload
  }
}`,
  },
  {
    id: "k8s-namespace-rbac",
    title: "Kubernetes Namespace RBAC",
    provider: "k8s",
    useCase: "Security & Access",
    description:
      "RoleBinding granting a namespaced Role to an application ServiceAccount",
    source: `provider k8s
direction LR
validation normal

cluster production {
  namespace application {
    app_identity: serviceaccount
    config_reader: role
    access_grant: rolebinding

    access_grant -[authorizes]->|grants role| config_reader
    access_grant -[authorizes]->|grants to| app_identity
  }
}`,
  },
];
