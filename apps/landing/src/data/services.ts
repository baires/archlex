import {
  EXAMPLE_PROVIDER_LABELS,
  type ExampleProvider,
  type PublishedExample,
  publishedExamples,
  renderExample,
} from "./examples";
import { type ProviderPage, providerPage } from "./providers";
import { SITE_ORIGIN } from "./seo";

export type ServiceFaq = { q: string; a: string };

export type ServiceSnippet = {
  /** Short title shown above the diagram. */
  title: string;
  /** One-sentence lead under the title. */
  lead: string;
  /** Filename shown in the source chrome, e.g. lambda-api.arch */
  file: string;
  /** ArchLex source that must pass provider checks with no warnings. */
  source: string;
  /** Accessible alt text for the rendered SVG. */
  alt: string;
};

export type ServicePage = {
  /** Stable id used in diagram URLs, e.g. "aws-lambda". */
  id: string;
  provider: ExampleProvider;
  /** URL segment before -architecture-diagram, e.g. "lambda". */
  slug: string;
  /** Catalog service ids this page teaches (for related-example matching). */
  serviceKinds: string[];
  /** Primary search query this page targets. */
  targetQuery: string;
  /** Human service name used in H1, e.g. "AWS Lambda". */
  name: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  /** Why this pattern / how placement and connections work for this service. */
  pattern: { title: string; body: string }[];
  snippets: [ServiceSnippet, ServiceSnippet] | [ServiceSnippet];
  agentPrompt: string;
  faqs: ServiceFaq[];
};

const docsFor = (provider: ExampleProvider): string =>
  providerPage(provider).docs.href;

export const servicePages: ServicePage[] = [
  {
    id: "aws-lambda",
    provider: "aws",
    slug: "lambda",
    serviceKinds: ["lambda"],
    targetQuery: "AWS Lambda architecture diagram",
    name: "AWS Lambda",
    title: "AWS Lambda Architecture Diagram as Code | ArchLex",
    description:
      "Draw an AWS Lambda architecture diagram as code. ArchLex validates API Gateway → Lambda → DynamoDB connections and renders official AWS icons as SVG.",
    h1: "AWS Lambda architecture diagram",
    lede: "Describe Lambda handlers, their triggers, and the data stores they read and write in plain text. ArchLex checks every connection against the AWS catalog, then renders a clean SVG with official icons.",
    pattern: [
      {
        title: "Where Lambda sits.",
        body: "Lambda is a regional compute resource. Put it at the document root or inside an account/region when you want that boundary shown. It does not belong inside a VPC subnet unless you are deliberately drawing a VPC-attached function next to private resources.",
      },
      {
        title: "Valid connections.",
        body: "Common edges: api-gateway -[invokes]-> lambda, sqs -[invokes]-> lambda, eventbridge -[triggers]-> lambda, lambda -[writes]-> dynamodb|s3|rds, and lambda -[publishes]-> sns|sqs|eventbridge. An edge that breaks those endpoints returns AWS-RELATIONSHIP-INVALID-ENDPOINT-001.",
      },
      {
        title: "What ArchLex does not check.",
        body: "It does not read your AWS account, IAM policies, concurrency settings, or runtime configuration. It checks the diagram you wrote.",
      },
    ],
    snippets: [
      {
        title: "HTTP API to Lambda to DynamoDB.",
        lead: "The classic serverless request path: API Gateway invokes a function that writes to DynamoDB.",
        file: "lambda-http-api.arch",
        source: `provider aws
direction LR

api: api-gateway["HTTP API"]
fn: lambda["Order handler"]
db: dynamodb["Orders"]

api -[invokes]-> fn
fn -[writes]-> db`,
        alt: "AWS Lambda architecture diagram: API Gateway invokes a Lambda order handler that writes to a DynamoDB Orders table",
      },
      {
        title: "EventBridge to SQS to Lambda.",
        lead: "Decouple producers with a bus and a queue, then let Lambda process messages asynchronously.",
        file: "lambda-queue-worker.arch",
        source: `provider aws
direction LR
validation normal

bus: eventbridge["Orders bus"]
queue: sqs["Order queue"]
fn: lambda["Processor"]

bus -[publishes]-> queue
queue -[invokes]-> fn`,
        alt: "AWS Lambda architecture diagram: EventBridge publishes to an SQS queue that invokes a Lambda processor",
      },
    ],
    agentPrompt:
      "Draw an AWS Lambda architecture diagram with API Gateway invoking a Lambda function that writes to DynamoDB. Validate it with ArchLex and give me a playground link.",
    faqs: [
      {
        q: "Can ArchLex draw an AWS Lambda architecture diagram as code?",
        a: "Yes. Write the Lambda function and its triggers or stores in ArchLex, validate against the AWS catalog, and render SVG with the official Lambda icon. Open the same source in the playground to edit it.",
      },
      {
        q: "Which services can invoke Lambda in ArchLex?",
        a: "Declared invokes/triggers sources include api-gateway, sqs, eventbridge, eventbridge-scheduler, s3, sns, and step-functions. Targets for Lambda writes include dynamodb, s3, and rds.",
      },
      {
        q: "Does ArchLex verify my Lambda IAM role?",
        a: "No. It validates declared resources and relationship endpoints in the diagram. It does not inspect IAM policies, environment variables, or deployed function configuration.",
      },
      {
        q: "How do I open this Lambda diagram in the playground?",
        a: "Use the Open in Playground button on this page. It deep-links to playground.archlex.dev with the ArchLex source in the code query parameter so you can edit and re-render immediately.",
      },
    ],
  },
  {
    id: "aws-api-gateway",
    provider: "aws",
    slug: "api-gateway",
    serviceKinds: ["api-gateway"],
    targetQuery: "AWS API Gateway architecture diagram",
    name: "Amazon API Gateway",
    title: "AWS API Gateway Architecture Diagram as Code | ArchLex",
    description:
      "Draw an AWS API Gateway architecture diagram as code. ArchLex checks invokes to Lambda and routes from CloudFront, then renders SVG with official AWS icons.",
    h1: "AWS API Gateway architecture diagram",
    lede: "Show how HTTP or REST APIs front your backends. ArchLex validates API Gateway as an invokes source and as a CloudFront or Route 53 route target, then draws the official icon.",
    pattern: [
      {
        title: "Placement.",
        body: "API Gateway is regional edge compute. Keep it at the root or under account/region. Pair it with Lambda, HTTP backends, or authorizers in the same diagram.",
      },
      {
        title: "Valid connections.",
        body: "api-gateway -[invokes]-> lambda is the most common edge. CloudFront or Route 53 can -[routes]-> api-gateway. API Gateway can also -[exposes]-> lambda when you want that wording. Invalid endpoints surface AWS-RELATIONSHIP-INVALID-ENDPOINT-001.",
      },
      {
        title: "Authorizers and routes.",
        body: "Model an authorizer as another Lambda that the API invokes before the route handler. ArchLex checks the graph you declare; it does not infer mapping templates or usage plans.",
      },
    ],
    snippets: [
      {
        title: "API Gateway with Lambda authorizer and handler.",
        lead: "One API invokes an authorizer and a route handler; the handler reads DynamoDB.",
        file: "api-gateway-auth.arch",
        source: `provider aws
direction LR

api: api-gateway["HTTP API"]
auth: lambda["Authorizer"]
handler: lambda["Route handler"]
table: dynamodb["Users"]

api -[invokes]-> auth
api -[invokes]-> handler
handler -[reads]-> table`,
        alt: "AWS API Gateway architecture diagram: API Gateway invokes a Lambda authorizer and a route handler that reads DynamoDB",
      },
      {
        title: "CloudFront in front of API Gateway.",
        lead: "Terminate at CloudFront, then route API traffic to API Gateway.",
        file: "api-gateway-cloudfront.arch",
        source: `provider aws
direction LR

cdn: cloudfront["CDN"]
api: api-gateway["HTTP API"]
fn: lambda["Handler"]

cdn -[routes]-> api
api -[invokes]-> fn`,
        alt: "AWS API Gateway architecture diagram: CloudFront routes to API Gateway which invokes Lambda",
      },
    ],
    agentPrompt:
      "Draw an AWS API Gateway architecture diagram with a Lambda authorizer, a route handler, and DynamoDB. Validate it and return a playground link.",
    faqs: [
      {
        q: "How do I diagram Amazon API Gateway with ArchLex?",
        a: "Use the api-gateway resource (aliases apigw and api_gateway). Connect it with -[invokes]-> to Lambda handlers or authorizers, and optionally put CloudFront or Route 53 in front with -[routes]->.",
      },
      {
        q: "Can I show REST and HTTP APIs?",
        a: 'ArchLex uses one api-gateway catalog entry for both. Distinguish them with display labels such as ["HTTP API"] or ["REST API"] on the node.',
      },
      {
        q: "Does ArchLex validate API Gateway routes and stages?",
        a: "No. It checks declared resources and relationship kinds. Route keys, stages, usage plans, and mapping templates are outside the diagram graph.",
      },
      {
        q: "Where is the API Gateway semantics reference?",
        a: `See the ${docsFor("aws")} for AWS scopes, catalog entries, and relationship rules.`,
      },
    ],
  },
  {
    id: "aws-ecs",
    provider: "aws",
    slug: "ecs",
    serviceKinds: ["ecs", "fargate"],
    targetQuery: "AWS ECS Fargate architecture diagram",
    name: "Amazon ECS",
    title: "AWS ECS / Fargate Architecture Diagram as Code | ArchLex",
    description:
      "Draw an AWS ECS or Fargate architecture diagram as code. ArchLex validates ALB → ECS → RDS/ElastiCache placement and connections, then renders SVG.",
    h1: "AWS ECS / Fargate architecture diagram",
    lede: "Describe container services on ECS, including Fargate launch type, behind an Application Load Balancer. ArchLex checks subnet placement and typed connections to caches and databases.",
    pattern: [
      {
        title: "ECS vs Fargate in the catalog.",
        body: 'Use ecs for the running service. Label it ["API on Fargate"] when the launch type matters. The separate fargate catalog id is available, but ALB routes and datastore reads are declared against ecs today.',
      },
      {
        title: "Placement.",
        body: "ECS tasks that need private networking belong in a subnet inside a VPC. Put the ALB in a public subnet and the service in a private-app subnet so the diagram matches how traffic flows.",
      },
      {
        title: "Valid connections.",
        body: "alb -[routes]-> ecs, ecs -[reads]-> rds|dynamodb|s3|elasticache|secrets-manager, ecs -[caches]-> elasticache, and ecs -[writes]-> s3|rds|dynamodb. Wrong endpoints get AWS-RELATIONSHIP-INVALID-ENDPOINT-001.",
      },
    ],
    snippets: [
      {
        title: "ALB to ECS on Fargate to RDS.",
        lead: "Public load balancer, private ECS service labeled for Fargate, and a database subnet.",
        file: "ecs-fargate-api.arch",
        source: `provider aws
direction LR
validation normal

account prod {
  region us-east-1 {
    vpc main {
      subnet public {
        lb: alb["Web ALB"]
      }
      subnet private-app {
        api: ecs["API on Fargate"]
      }
      subnet private-db {
        db: rds["PostgreSQL"]
      }
    }
  }
}

lb -[routes]-> api
api -[reads]-> db`,
        alt: "AWS ECS Fargate architecture diagram: ALB in a public subnet routes to an ECS service on Fargate that reads RDS in a private subnet",
      },
      {
        title: "ECS with Redis cache and RDS.",
        lead: "Add ElastiCache beside the service for session or query caching.",
        file: "ecs-cache-db.arch",
        source: `provider aws
direction LR
validation normal

lb: alb["ALB"]
api: ecs["API on Fargate"]
cache: elasticache["Redis"]
db: rds["PostgreSQL"]

lb -[routes]-> api
api -[caches]-> cache
api -[reads]-> db`,
        alt: "AWS ECS architecture diagram: ALB routes to ECS which caches in ElastiCache and reads RDS",
      },
    ],
    agentPrompt:
      "Draw an AWS ECS on Fargate architecture diagram with an ALB in a public subnet, the ECS service in a private subnet, and RDS in a database subnet. Validate placement and give me a playground link.",
    faqs: [
      {
        q: "How do I show Fargate on an ECS architecture diagram?",
        a: 'Use the ecs resource and set a display label such as ["API on Fargate"]. ArchLex renders the ECS icon and validates ALB routes and datastore edges against ecs.',
      },
      {
        q: "Does ECS need to be inside a subnet?",
        a: "For diagrams that show VPC networking, yes—place ecs inside a subnet scope. ArchLex containment rules expect networked compute in the right boundary.",
      },
      {
        q: "Can I connect ECS to ElastiCache and RDS?",
        a: "Yes. Use ecs -[caches]-> elasticache and ecs -[reads]-> rds (or -[writes]-> for writes). Those relationship endpoints are declared in the AWS pack.",
      },
      {
        q: "Is this the same as an EKS diagram?",
        a: "No. ECS is Amazon's container orchestrator; EKS is managed Kubernetes. Use the EKS service page when you want cluster semantics.",
      },
    ],
  },
  {
    id: "aws-eks",
    provider: "aws",
    slug: "eks",
    serviceKinds: ["eks"],
    targetQuery: "AWS EKS architecture diagram",
    name: "Amazon EKS",
    title: "AWS EKS Architecture Diagram as Code | ArchLex",
    description:
      "Draw an Amazon EKS architecture diagram as code. ArchLex validates VPC placement and ALB → EKS → RDS connections, then renders SVG with official AWS icons.",
    h1: "AWS EKS architecture diagram",
    lede: "Show a managed Kubernetes cluster on EKS inside your VPC, fronted by an ALB and backed by data stores. ArchLex checks containment and relationship endpoints for eks.",
    pattern: [
      {
        title: "Placement.",
        body: "Put eks inside a subnet under a VPC when you are drawing networked architecture. Keep the ALB in a public subnet and the cluster in private-app.",
      },
      {
        title: "Valid connections.",
        body: "alb -[exposes]-> eks (routes does not list eks as a target), eks -[reads]-> rds|dynamodb|s3|elasticache|secrets-manager, and eks -[attaches]-> efs. Prefer exposes over routes for ALB to EKS.",
      },
      {
        title: "Cluster internals.",
        body: "For Deployments, Services and Ingresses inside the cluster, switch to the Kubernetes provider (or mix k8s.* qualified kinds). This page focuses on the EKS control-plane resource in an AWS diagram.",
      },
    ],
    snippets: [
      {
        title: "ALB exposing EKS in a VPC.",
        lead: "Public ALB, private EKS cluster, and RDS in its own subnet.",
        file: "eks-vpc.arch",
        source: `provider aws
direction LR
validation normal

account prod {
  region us-east-1 {
    vpc main {
      subnet public {
        lb: alb["ALB"]
      }
      subnet private-app {
        k8s: eks["EKS cluster"]
      }
      subnet private-db {
        db: rds["PostgreSQL"]
      }
    }
  }
}

lb -[exposes]-> k8s
k8s -[reads]-> db`,
        alt: "AWS EKS architecture diagram: ALB exposes an EKS cluster that reads RDS across public, app and database subnets",
      },
      {
        title: "Minimal ALB to EKS.",
        lead: "A compact diagram when you do not need every subnet drawn.",
        file: "eks-alb.arch",
        source: `provider aws
direction LR

lb: alb["ALB"]
k8s: eks["EKS cluster"]

lb -[exposes]-> k8s`,
        alt: "AWS EKS architecture diagram: Application Load Balancer exposes an Amazon EKS cluster",
      },
    ],
    agentPrompt:
      "Draw an Amazon EKS architecture diagram with an ALB in a public subnet exposing an EKS cluster in a private subnet that reads RDS. Validate it and give me a playground link.",
    faqs: [
      {
        q: "How do I connect an ALB to EKS in ArchLex?",
        a: "Use alb -[exposes]-> eks. The routes relationship does not list eks as an allowed target, so exposes is the valid edge.",
      },
      {
        q: "Can I mix EKS with Kubernetes Deployments in one diagram?",
        a: "Yes. Register both providers and use qualified kinds such as aws.eks next to k8s.deployment, or keep AWS edge/data plane on aws and workloads on k8s.",
      },
      {
        q: "Does ArchLex read my EKS cluster?",
        a: "No. It validates the diagram source only. It does not import manifests, RBAC, or cluster state.",
      },
      {
        q: "Where do I diagram Ingress and Deployments?",
        a: "Use the Kubernetes Ingress architecture diagram page for in-cluster routing, or open a Kubernetes example from the gallery.",
      },
    ],
  },
  {
    id: "aws-s3-cloudfront",
    provider: "aws",
    slug: "s3-cloudfront",
    serviceKinds: ["s3", "cloudfront"],
    targetQuery: "S3 CloudFront architecture diagram",
    name: "Amazon S3 + CloudFront",
    title: "S3 + CloudFront Architecture Diagram as Code | ArchLex",
    description:
      "Draw an Amazon S3 and CloudFront architecture diagram as code. ArchLex validates CDN routes to S3 and API origins, then renders SVG with official AWS icons.",
    h1: "S3 + CloudFront architecture diagram",
    lede: "Put CloudFront in front of an S3 origin for static assets, and optionally route API paths to API Gateway. ArchLex checks the routes relationship and draws official icons.",
    pattern: [
      {
        title: "Placement.",
        body: "CloudFront and S3 sit at the regional/global edge of the diagram—usually at the document root. You do not place S3 inside a VPC subnet.",
      },
      {
        title: "Valid connections.",
        body: "cloudfront -[routes]-> s3 for the static origin. cloudfront -[routes]-> api-gateway when the same distribution fronts an API. route53 can point at CloudFront with a plain edge or -[routes]->.",
      },
      {
        title: "Uploads and backends.",
        body: "Lambda or ECS can -[writes]-> s3 and -[reads]-> s3. Pair those edges when the same bucket is both a CDN origin and an application datastore.",
      },
    ],
    snippets: [
      {
        title: "CloudFront with an S3 origin.",
        lead: "CDN in front of a static site bucket.",
        file: "s3-cloudfront.arch",
        source: `provider aws
direction LR

cdn: cloudfront["CDN"]
origin: s3["Static site"]

cdn -[routes]-> origin`,
        alt: "S3 CloudFront architecture diagram: CloudFront CDN routes to an S3 static site origin",
      },
      {
        title: "Static site plus API behind CloudFront.",
        lead: "Route 53 → CloudFront, with separate routes to S3 and API Gateway.",
        file: "s3-cloudfront-api.arch",
        source: `provider aws
direction LR

dns: route53["app.example.com"]
cdn: cloudfront["CDN"]
origin: s3["Static assets"]
api: api-gateway["API"]

dns > cdn
cdn -[routes]->|static| origin
cdn -[routes]->|api| api`,
        alt: "S3 CloudFront architecture diagram: Route 53 to CloudFront routing to S3 static assets and API Gateway",
      },
    ],
    agentPrompt:
      "Draw an S3 + CloudFront architecture diagram with Route 53 pointing at CloudFront, a static S3 origin, and an API Gateway route. Validate it and give me a playground link.",
    faqs: [
      {
        q: "How do I diagram CloudFront in front of S3?",
        a: "Declare cloudfront and s3 resources, then connect them with cdn -[routes]-> origin. Add a label on the edge when you have multiple origins.",
      },
      {
        q: "Can one CloudFront distribution front S3 and an API?",
        a: "Yes. Draw two routes from cloudfront: one to s3 and one to api-gateway. ArchLex allows both as routes targets.",
      },
      {
        q: "Does ArchLex check bucket policies or OAC?",
        a: "No. It checks the diagram graph. Origin access control, bucket policies, and cache behaviors are not inferred.",
      },
      {
        q: "Which icons does it use?",
        a: "Official AWS Architecture Icons for Amazon S3 and Amazon CloudFront, sanitized into the SVG output.",
      },
    ],
  },
  {
    id: "aws-dynamodb",
    provider: "aws",
    slug: "dynamodb",
    serviceKinds: ["dynamodb"],
    targetQuery: "AWS DynamoDB architecture diagram",
    name: "Amazon DynamoDB",
    title: "AWS DynamoDB Architecture Diagram as Code | ArchLex",
    description:
      "Draw an Amazon DynamoDB architecture diagram as code. ArchLex validates Lambda reads, writes and streams to consumers, then renders SVG with official AWS icons.",
    h1: "AWS DynamoDB architecture diagram",
    lede: "Show DynamoDB as the datastore behind API Gateway and Lambda, or as a stream source for downstream processors. ArchLex checks reads, writes and streams endpoints.",
    pattern: [
      {
        title: "Placement.",
        body: "DynamoDB is a regional service—keep it at the root or under account/region. Do not place it inside a VPC subnet.",
      },
      {
        title: "Valid connections.",
        body: "lambda|ecs|ec2|eks|athena -[reads]-> dynamodb, and lambda|ecs|ec2 -[writes]-> dynamodb. DynamoDB can -[streams]-> lambda for change-data-capture style designs.",
      },
      {
        title: "API front door.",
        body: "Pair with api-gateway -[invokes]-> lambda -[writes]-> dynamodb for the standard serverless CRUD path.",
      },
    ],
    snippets: [
      {
        title: "Serverless CRUD on DynamoDB.",
        lead: "API Gateway invokes Lambda; Lambda writes the table.",
        file: "dynamodb-crud.arch",
        source: `provider aws
direction LR

api: api-gateway["API"]
fn: lambda["Writer"]
table: dynamodb["Items"]

api -[invokes]-> fn
fn -[writes]-> table`,
        alt: "AWS DynamoDB architecture diagram: API Gateway invokes Lambda which writes to a DynamoDB table",
      },
      {
        title: "DynamoDB Streams to Lambda to EventBridge.",
        lead: "React to table changes and publish domain events.",
        file: "dynamodb-streams.arch",
        source: `provider aws
direction LR

stream: dynamodb["Orders table"]
fn: lambda["Stream processor"]
bus: eventbridge["Domain events"]

stream -[streams]-> fn
fn -[publishes]-> bus`,
        alt: "AWS DynamoDB architecture diagram: DynamoDB Streams to Lambda publishing to EventBridge",
      },
    ],
    agentPrompt:
      "Draw an Amazon DynamoDB architecture diagram with API Gateway, Lambda writing to DynamoDB, and a Streams processor publishing to EventBridge. Validate it and give me a playground link.",
    faqs: [
      {
        q: "How do I show DynamoDB reads and writes?",
        a: "Use -[reads]-> and -[writes]-> from compute such as lambda or ecs to dynamodb. Wrong relationship kinds return AWS-RELATIONSHIP-INVALID-ENDPOINT-001.",
      },
      {
        q: "Can I diagram DynamoDB Streams?",
        a: "Yes. dynamodb -[streams]-> lambda is a declared edge for change-data-capture style diagrams.",
      },
      {
        q: "Does ArchLex model GSIs or capacity modes?",
        a: "No. Tables are single nodes. Capture index or on-demand notes in labels if you need them on the picture.",
      },
      {
        q: "Is DynamoDB allowed inside a VPC scope?",
        a: "No. Keep it outside subnet scopes. VPC endpoints to DynamoDB can be drawn separately if you add them as their own resources.",
      },
    ],
  },
  {
    id: "gcp-cloud-run",
    provider: "gcp",
    slug: "cloud-run",
    serviceKinds: ["cloud-run"],
    targetQuery: "GCP Cloud Run architecture diagram",
    name: "Cloud Run",
    title: "GCP Cloud Run Architecture Diagram as Code | ArchLex",
    description:
      "Draw a Google Cloud Run architecture diagram as code. ArchLex validates API Gateway invokes, Cloud SQL connections and storage writes, then renders official GCP icons.",
    h1: "GCP Cloud Run architecture diagram",
    lede: "Describe Cloud Run services, the APIs that invoke them, and the databases or buckets they use. ArchLex checks GCP relationship endpoints and renders official Google Cloud icons.",
    pattern: [
      {
        title: "Placement.",
        body: "Cloud Run is regional. Place it at the root or under account/region. When you need VPC detail, put supporting resources in vpc/subnet scopes and keep Cloud Run where your design runs it.",
      },
      {
        title: "Valid connections.",
        body: "api-gateway|cloud-functions|workflows|pubsub|eventarc -[invokes]-> cloud-run. cloud-run -[writes]|[reads]-> cloud-sql|firestore|cloud-storage|bigquery, and cloud-run -[connects]-> cloud-sql for the Auth Proxy pattern. cloud-run -[publishes]-> pubsub is also valid.",
      },
      {
        title: "Triggers.",
        body: "eventarc, cloud-scheduler, cloud-storage and pubsub can -[triggers]-> cloud-run for event-driven services.",
      },
    ],
    snippets: [
      {
        title: "API Gateway to Cloud Run to Firestore.",
        lead: "Managed API in front of a Cloud Run service that persists state.",
        file: "cloud-run-api.arch",
        source: `provider gcp
direction LR

api: api-gateway["API Gateway"]
svc: cloud-run["API service"]
store: firestore["State"]

api -[invokes]-> svc
svc -[writes]-> store`,
        alt: "GCP Cloud Run architecture diagram: API Gateway invokes Cloud Run which writes to Firestore",
      },
      {
        title: "Cloud Run with Cloud SQL and Cloud Storage.",
        lead: "Connect through the Cloud SQL Auth Proxy pattern and store uploads in a bucket.",
        file: "cloud-run-sql.arch",
        source: `provider gcp
direction LR
validation normal

svc: cloud-run["API"]
db: cloud-sql["Postgres"]
bucket: cloud-storage["Uploads"]

svc -[connects]->|Cloud SQL Auth Proxy| db
svc -[writes]-> bucket`,
        alt: "GCP Cloud Run architecture diagram: Cloud Run connects to Cloud SQL and writes uploads to Cloud Storage",
      },
    ],
    agentPrompt:
      "Draw a GCP Cloud Run architecture diagram with API Gateway invoking Cloud Run, Cloud SQL via Auth Proxy, and Cloud Storage for uploads. Validate it and give me a playground link.",
    faqs: [
      {
        q: "How do I diagram Cloud Run with ArchLex?",
        a: "Use the cloud-run resource. Connect APIs with -[invokes]->, databases with -[connects]-> or -[reads]/[writes]->, and buckets with -[writes]-> or -[reads]->.",
      },
      {
        q: "Does ArchLex support Cloud Run jobs?",
        a: "Yes. cloud-run-jobs is a separate catalog entry and is a valid invokes/triggers target alongside cloud-run.",
      },
      {
        q: "Can Cloud Run publish to Pub/Sub?",
        a: "Yes. cloud-run -[publishes]-> pubsub is declared. Use -[subscribes]-> the other way when the service consumes a topic.",
      },
      {
        q: "Where is the GCP semantics reference?",
        a: `See the ${docsFor("gcp")} for scopes, catalog entries and relationship rules.`,
      },
    ],
  },
  {
    id: "gcp-bigquery",
    provider: "gcp",
    slug: "bigquery",
    serviceKinds: ["bigquery"],
    targetQuery: "BigQuery architecture diagram",
    name: "BigQuery",
    title: "BigQuery Architecture Diagram as Code | ArchLex",
    description:
      "Draw a BigQuery architecture diagram as code. ArchLex validates Dataflow, Cloud Functions and Cloud Run pipelines into BigQuery, then renders official GCP icons.",
    h1: "BigQuery architecture diagram",
    lede: "Show how events and batch jobs land in BigQuery. ArchLex checks writes and reads from Dataflow, Cloud Functions and Cloud Run against the GCP catalog.",
    pattern: [
      {
        title: "Placement.",
        body: "BigQuery is a regional analytics service—keep it at the root or under account/region, not inside a VPC subnet.",
      },
      {
        title: "Valid connections.",
        body: "cloud-functions|cloud-run|compute-engine|dataflow -[writes]-> bigquery and the same sources can -[reads]-> bigquery. Pub/Sub often sits upstream and -[invokes]-> a function that writes the warehouse.",
      },
      {
        title: "Warehouse patterns.",
        body: "For streaming ETL, prefer pubsub → dataflow/cloud-functions → bigquery. Label edges when the same warehouse serves Looker or other BI tools downstream.",
      },
    ],
    snippets: [
      {
        title: "Dataflow from Cloud Storage into BigQuery.",
        lead: "Batch ETL: read a lake bucket, write the warehouse.",
        file: "bigquery-dataflow.arch",
        source: `provider gcp
direction LR

job: dataflow["ETL job"]
lake: cloud-storage["Raw data"]
wh: bigquery["Warehouse"]

job -[reads]-> lake
job -[writes]-> wh`,
        alt: "BigQuery architecture diagram: Dataflow reads Cloud Storage and writes BigQuery",
      },
      {
        title: "Pub/Sub to Cloud Functions to BigQuery.",
        lead: "Lightweight streaming path without Dataflow.",
        file: "bigquery-functions.arch",
        source: `provider gcp
direction LR

events: pubsub["Events"]
fn: cloud-functions["Loader"]
wh: bigquery["Analytics"]

events -[invokes]-> fn
fn -[writes]-> wh`,
        alt: "BigQuery architecture diagram: Pub/Sub invokes Cloud Functions which writes to BigQuery",
      },
    ],
    agentPrompt:
      "Draw a BigQuery architecture diagram with Pub/Sub invoking Cloud Functions that write to BigQuery, and a Dataflow job reading Cloud Storage into BigQuery. Validate it and give me a playground link.",
    faqs: [
      {
        q: "How do I diagram BigQuery pipelines in ArchLex?",
        a: "Use the bigquery resource as a writes or reads target from dataflow, cloud-functions, cloud-run or compute-engine. Put pubsub upstream when you need an event bus.",
      },
      {
        q: "Can I show Looker or Dataplex next to BigQuery?",
        a: "Yes when those catalog entries exist in your ArchLex version. The gallery includes a Data Warehouse example with Looker and Dataplex.",
      },
      {
        q: "Does ArchLex know about datasets and tables?",
        a: "No. BigQuery is one node per diagram resource. Encode dataset names in the display label if you need them visible.",
      },
      {
        q: "Is BigQuery allowed inside a VPC?",
        a: "No. Keep analytics services outside subnet scopes unless you are drawing a specific networking accessory as its own resource.",
      },
    ],
  },
  {
    id: "cloudflare-workers",
    provider: "cloudflare",
    slug: "workers",
    serviceKinds: ["workers", "d1", "r2", "kv"],
    targetQuery: "Cloudflare Workers architecture diagram",
    name: "Cloudflare Workers",
    title: "Cloudflare Workers Architecture Diagram as Code | ArchLex",
    description:
      "Draw a Cloudflare Workers architecture diagram as code with D1, R2 and KV. ArchLex checks edge placement and storage connections, then renders bundled Cloudflare icons.",
    h1: "Cloudflare Workers architecture diagram",
    lede: "Describe a Worker and the D1, R2 or KV data it touches. ArchLex keeps Cloudflare resources at the edge (not inside a VPC) and validates the connections you declare.",
    pattern: [
      {
        title: "Placement.",
        body: "Cloudflare resources belong at the document root or inside a logical account. Putting a Worker inside a region, VPC, subnet, cluster or namespace reports CLOUDFLARE-CONTAINMENT-001.",
      },
      {
        title: "Valid connections.",
        body: "workers -[writes]-> d1|r2 and workers -[reads]-> r2|kv are the common edges. Add dns, waf and cache nodes when you want the full edge picture from the gallery examples.",
      },
      {
        title: "Origins on other clouds.",
        body: "Mix providers with qualified kinds such as cloudflare.workers next to aws.alb or gcp.cloud-run when the Worker proxies to an origin.",
      },
    ],
    snippets: [
      {
        title: "Worker with D1 and R2.",
        lead: "API Worker writing relational state to D1 and objects to R2.",
        file: "workers-d1-r2.arch",
        source: `provider cloudflare
direction LR

edge: workers["API Worker"]
db: d1["App DB"]
blob: r2["Uploads"]

edge -[writes]-> db
edge -[writes]-> blob`,
        alt: "Cloudflare Workers architecture diagram: Worker writes to D1 and R2",
      },
      {
        title: "Worker with D1, R2 and KV inside an account.",
        lead: "Group edge resources under a Cloudflare account scope and add KV for session cache.",
        file: "workers-account.arch",
        source: `provider cloudflare
direction LR
account production {
  edge: workers["API Worker"]
  db: d1["App database"]
  files: r2["Uploads"]
  cache: kv["Session cache"]

  edge -[writes]-> db
  edge -[writes]-> files
  edge -[reads]-> cache
}`,
        alt: "Cloudflare Workers architecture diagram: account with Worker, D1, R2 and KV",
      },
    ],
    agentPrompt:
      "Draw a Cloudflare Workers architecture diagram with a Worker writing to D1 and R2 and reading KV for sessions. Validate placement and give me a playground link.",
    faqs: [
      {
        q: "How do I diagram Cloudflare Workers with D1 and R2?",
        a: "Declare workers, d1 and r2 (optionally under an account scope). Connect with -[writes]-> and -[reads]->. Keep everything out of VPC or Kubernetes scopes.",
      },
      {
        q: "Why did I get CLOUDFLARE-CONTAINMENT-001?",
        a: "A Cloudflare resource was placed inside a region, VPC, subnet, cluster or namespace. Move it to the document root or a logical account.",
      },
      {
        q: "Can Workers talk to AWS or GCP origins in one diagram?",
        a: "Yes. Use qualified kinds and multiple providers. The Cloudflare public-edge-to-AWS gallery example shows the pattern.",
      },
      {
        q: "Is ArchLex affiliated with Cloudflare?",
        a: "No. ArchLex is a community project. Cloudflare names and trademarks remain with their owners. Icons are bundled under CC BY 4.0 attribution.",
      },
    ],
  },
  {
    id: "k8s-ingress",
    provider: "k8s",
    slug: "ingress",
    serviceKinds: ["ingress", "deployment", "service"],
    targetQuery: "Kubernetes Ingress architecture diagram",
    name: "Kubernetes Ingress",
    title: "Kubernetes Ingress Architecture Diagram as Code | ArchLex",
    description:
      "Draw a Kubernetes Ingress architecture diagram as code with Service and Deployment backends. ArchLex validates cluster and namespace containment plus routes and targets edges.",
    h1: "Kubernetes Ingress architecture diagram",
    lede: "Show how an Ingress routes to a Service that targets a Deployment, optionally with a HorizontalPodAutoscaler. ArchLex checks cluster/namespace containment and relationship endpoints.",
    pattern: [
      {
        title: "Placement.",
        body: "Namespaces belong inside clusters. Ingress, Service, Deployment and HPA belong inside a namespace. Wrong containment returns a Kubernetes diagnostic with a fix.",
      },
      {
        title: "Valid connections.",
        body: "ingress -[routes]-> service, service -[targets]-> deployment|pod|statefulset|daemonset, and horizontalpodautoscaler -[scales]-> deployment. Those three edges cover most public API diagrams.",
      },
      {
        title: "Bare pods.",
        body: "Prefer Deployment (or another controller) over a bare Pod for long-lived workloads. ArchLex flags common mistakes such as Services without workloads and Ingresses without Service routing.",
      },
    ],
    snippets: [
      {
        title: "Ingress to Service to Deployment.",
        lead: "The standard north-south path inside one namespace.",
        file: "ingress-service-deploy.arch",
        source: `provider k8s
direction LR

cluster production {
  namespace app {
    edge: ingress["Public ingress"]
    svc: service["API service"]
    deploy: deployment["API pods"]

    edge -[routes]-> svc
    svc -[targets]-> deploy
  }
}`,
        alt: "Kubernetes Ingress architecture diagram: Ingress routes to a Service that targets a Deployment",
      },
      {
        title: "Ingress with autoscaled Deployment.",
        lead: "Add a HorizontalPodAutoscaler that scales the same Deployment.",
        file: "ingress-hpa.arch",
        source: `provider k8s
direction LR
validation normal

cluster production {
  namespace api {
    edge: ingress["api.example.com"]
    svc: service["API"]
    deploy: deployment["API pods"]
    hpa: horizontalpodautoscaler["Autoscaler"]

    edge -[routes]-> svc
    svc -[targets]-> deploy
    hpa -[scales]-> deploy
  }
}`,
        alt: "Kubernetes Ingress architecture diagram: Ingress to Service to Deployment scaled by HPA",
      },
    ],
    agentPrompt:
      "Draw a Kubernetes Ingress architecture diagram with an Ingress routing to a Service that targets a Deployment, plus a HorizontalPodAutoscaler. Validate containment and give me a playground link.",
    faqs: [
      {
        q: "How do I diagram Kubernetes Ingress with ArchLex?",
        a: "Nest ingress, service and deployment inside cluster → namespace scopes. Connect with ingress -[routes]-> service and service -[targets]-> deployment.",
      },
      {
        q: "Can I include a HorizontalPodAutoscaler?",
        a: "Yes. horizontalpodautoscaler -[scales]-> deployment is a declared edge. Keep the HPA in the same namespace as the workload.",
      },
      {
        q: "Does ArchLex read my cluster or manifests?",
        a: "No. It validates the diagram source. Selectors, TLS secrets and ingress class configuration are not inferred.",
      },
      {
        q: "Where is the Kubernetes reference?",
        a: `See the ${docsFor("k8s")} for scopes, resources and relationship rules.`,
      },
    ],
  },
];

export const servicePath = (
  page: Pick<ServicePage, "provider" | "slug">,
): string => {
  const providerSlug = providerPage(page.provider).slug;
  return `/${providerSlug}/${page.slug}-architecture-diagram/`;
};

export function servicePage(id: string): ServicePage {
  const page = servicePages.find((item) => item.id === id);
  if (!page) throw new Error(`No service page for ${id}`);
  return page;
}

export function servicesFor(provider: ExampleProvider): ServicePage[] {
  return servicePages.filter((page) => page.provider === provider);
}

export function siblingServices(page: ServicePage): ServicePage[] {
  return servicesFor(page.provider).filter((item) => item.id !== page.id);
}

export function relatedServiceExamples(
  page: ServicePage,
  limit = 4,
): PublishedExample[] {
  const scored = publishedExamples
    .map((example) => {
      if (example.provider !== page.provider) return { example, score: 0 };
      const score = page.serviceKinds.reduce(
        (count, kind) => count + (example.source.includes(kind) ? 1 : 0),
        0,
      );
      return { example, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.example);
}

export function serviceDiagramUrl(
  pageId: string,
  snippetIndex: number,
  theme: "light" | "dark",
): string {
  return `/diagrams/services/${pageId}-${snippetIndex}-${theme}.svg`;
}

export async function renderServiceSnippet(
  source: string,
  theme: "light" | "dark",
): Promise<{ svg: string; width: number; height: number }> {
  return renderExample(source, theme);
}

export function serviceJsonLd(page: ServicePage): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.h1,
    description: page.description,
    url: `${SITE_ORIGIN}${servicePath(page)}`,
    author: { "@type": "Organization", name: "ArchLex" },
    publisher: {
      "@type": "Organization",
      name: "ArchLex",
      url: SITE_ORIGIN,
    },
    about: {
      "@type": "SoftwareApplication",
      name: page.name,
      applicationCategory: "DeveloperApplication",
    },
    keywords: [
      page.targetQuery,
      `${page.name} diagram as code`,
      EXAMPLE_PROVIDER_LABELS[page.provider],
      "ArchLex",
    ].join(", "),
  };
}

/** Assert every service snippet passes provider checks (used by tests). */
export function assertServiceSourcesClean(
  prepare: (source: string) => {
    diagnostics: { severity: string; code?: string; message: string }[];
  },
): void {
  for (const page of servicePages) {
    for (const snippet of page.snippets) {
      const bad = prepare(snippet.source).diagnostics.filter(
        (item) => item.severity !== "info",
      );
      if (bad.length > 0) {
        throw new Error(
          `${page.id}/${snippet.file}: ${bad.map((d) => d.message).join("; ")}`,
        );
      }
    }
  }
}

export function providerForSlug(slug: string): ProviderPage {
  return providerPage(
    (
      {
        aws: "aws",
        gcp: "gcp",
        cloudflare: "cloudflare",
        kubernetes: "k8s",
      } as const
    )[slug as "aws" | "gcp" | "cloudflare" | "kubernetes"],
  );
}
