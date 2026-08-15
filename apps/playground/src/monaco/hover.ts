import type { DiagnosticCode } from "@archlex/diagnostics";
import { getDiagnosticDefinition } from "@archlex/diagnostics";
import type { Diagnostic } from "@archlex/model";
import type * as Monaco from "monaco-editor";

/**
 * Hover documentation for ArchLex keywords
 */
const KEYWORD_DOCS: Record<string, string> = {
  provider:
    "**Provider directive** - Specifies the cloud provider for this diagram.\n\nSupported providers: `aws`, `gcp`, `k8s`",
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
  cluster:
    "**Cluster scope** - Groups Kubernetes resources within a cluster.\n\nSyntax: `cluster <name> { ... }`",
  namespace:
    "**Namespace scope** - Groups Kubernetes resources within a namespace.\n\nSyntax: `namespace <name> { ... }`",
  aws: "**Amazon Web Services** - AWS cloud provider",
  gcp: "**Google Cloud Platform** - GCP cloud provider",
  k8s: "**Kubernetes** - Kubernetes architecture provider",
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
  deployment:
    "**Kubernetes Deployment** - Declarative controller for replicated application workloads",
  service:
    "**Kubernetes Service** - Stable network endpoint for a set of workloads",
  ingress: "**Kubernetes Ingress** - HTTP and HTTPS routing into a cluster",
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
 * Register hover provider for ArchLex
 */
export function registerHoverProvider(
  monaco: typeof Monaco,
  diagnostics: readonly Diagnostic[] = [],
): Monaco.IDisposable {
  return monaco.languages.registerHoverProvider("archlex", {
    provideHover: (model, position) => {
      // First, check if there's a diagnostic at this position
      const diagnostic = diagnostics.find(
        (d) =>
          d.span.start.line === position.lineNumber &&
          position.column >= d.span.start.column &&
          position.column <= d.span.end.column,
      );

      if (diagnostic) {
        // Get full definition from registry
        const definition = getDiagnosticDefinition(
          diagnostic.code as DiagnosticCode,
        );

        // Build hover content
        const severityBadge =
          diagnostic.severity === "error"
            ? "Error"
            : diagnostic.severity === "warning"
              ? "Warning"
              : "Info";

        let content = `**${diagnostic.code}** [${severityBadge}]\n\n`;
        content += `${diagnostic.message}\n\n`;

        if (diagnostic.remediation) {
          content += `**Fix:** ${diagnostic.remediation}\n\n`;
        }

        if (definition?.examples) {
          content += `**Example:**\n\`\`\`archlex\n${definition.examples.valid}\n\`\`\`\n\n`;
        }

        if (definition?.documentationUrl) {
          content += `[View full documentation →](${definition.documentationUrl})`;
        }

        return {
          range: new monaco.Range(
            diagnostic.span.start.line,
            diagnostic.span.start.column,
            diagnostic.span.end.line,
            diagnostic.span.end.column,
          ),
          contents: [{ value: content, supportHtml: false, isTrusted: false }],
        };
      }

      // Otherwise, show keyword/service documentation
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
