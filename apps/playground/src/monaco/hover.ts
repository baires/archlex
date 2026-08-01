import type * as Monaco from "monaco-editor";

/**
 * Hover documentation for CloudMer keywords
 */
const KEYWORD_DOCS: Record<string, string> = {
  provider:
    "**Provider directive** - Specifies the cloud provider for this diagram.\n\nSupported providers: `aws`, `gcp`",
  direction:
    "**Direction directive** - Controls the layout flow of the diagram.\n\nOptions: `LR` (left-right), `RL` (right-left), `TB` (top-bottom), `BT` (bottom-top)",
  validation:
    "**Validation directive** - Sets the validation strictness level.\n\nModes: `normal`, `strict`, `off`",
  account:
    "**Account scope** - Groups resources within a cloud account.\n\nSyntax: `account <name> { ... }`",
  region:
    "**Region scope** - Groups resources within a geographic region.\n\nSyntax: `region <name> { ... }`",
  vpc: "**VPC scope** - Groups resources within a Virtual Private Cloud.\n\nSyntax: `vpc <name> { ... }`",
  subnet:
    "**Subnet scope** - Groups resources within a subnet.\n\nSyntax: `subnet <name> { ... }`",
  aws: "**Amazon Web Services** - AWS cloud provider",
  gcp: "**Google Cloud Platform** - GCP cloud provider",
};

/**
 * Hover documentation for common services
 */
const SERVICE_DOCS: Record<string, string> = {
  ec2: "**Amazon EC2** - Virtual compute instances in the cloud",
  s3: "**Amazon S3** - Object storage service with unlimited scalability",
  rds: "**Amazon RDS** - Managed relational database service",
  lambda: "**AWS Lambda** - Serverless compute service for running code",
  dynamodb: "**Amazon DynamoDB** - Fully managed NoSQL database",
  ecs: "**Amazon ECS** - Container orchestration service",
  eks: "**Amazon EKS** - Managed Kubernetes service",
  alb: "**Application Load Balancer** - Layer 7 load balancing",
  apigateway: "**API Gateway** - Create, publish, and manage APIs",
  cloudfront: "**CloudFront** - Content delivery network (CDN)",
  compute: "**Compute Engine** - Virtual machines on Google Cloud",
  gce: "**Google Compute Engine** - VM instances on GCP",
  gcs: "**Google Cloud Storage** - Object storage on GCP",
  cloudsql: "**Cloud SQL** - Fully managed relational database",
  cloudrun: "**Cloud Run** - Fully managed serverless platform",
  gke: "**Google Kubernetes Engine** - Managed Kubernetes clusters",
  pubsub: "**Pub/Sub** - Asynchronous messaging service",
  bigquery: "**BigQuery** - Serverless data warehouse",
};

/**
 * Hover documentation for relationship types
 */
const RELATIONSHIP_DOCS: Record<string, string> = {
  connects: "General connection between resources",
  reads: "Read operation from source to target",
  writes: "Write operation from source to target",
  calls: "API or function invocation",
  "depends-on": "Dependency relationship",
  monitors: "Monitoring or observability relationship",
  triggers: "Event trigger relationship",
  caches: "Caching relationship",
  stores: "Data storage relationship",
  authenticates: "Authentication flow",
  authorizes: "Authorization flow",
  routes: "Traffic routing relationship",
};

/**
 * Register hover provider for CloudMer
 */
export function registerHoverProvider(
  monaco: typeof Monaco,
): Monaco.IDisposable {
  return monaco.languages.registerHoverProvider("cloudmer", {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const wordText = word.word.toLowerCase();

      // Check keywords
      if (KEYWORD_DOCS[wordText]) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          ),
          contents: [{ value: KEYWORD_DOCS[wordText] }],
        };
      }

      // Check services
      if (SERVICE_DOCS[wordText]) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          ),
          contents: [{ value: SERVICE_DOCS[wordText] }],
        };
      }

      // Check if inside relationship brackets
      const lineContent = model.getLineContent(position.lineNumber);
      const beforePosition = lineContent.substring(0, position.column - 1);
      const afterPosition = lineContent.substring(position.column - 1);

      if (beforePosition.includes("-[") && afterPosition.includes("]->")) {
        if (RELATIONSHIP_DOCS[wordText]) {
          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn,
            ),
            contents: [{ value: RELATIONSHIP_DOCS[wordText] }],
          };
        }
      }

      return null;
    },
  });
}
