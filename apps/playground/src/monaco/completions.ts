import type * as Monaco from "monaco-editor";

/**
 * Keywords for ArchLex language
 */
const KEYWORDS = [
  "provider",
  "direction",
  "validation",
  "account",
  "region",
  "vpc",
  "subnet",
];

const PROVIDERS = ["aws", "gcp"];

const DIRECTIONS = ["LR", "RL", "TB", "BT"];

const VALIDATION_MODES = ["normal", "strict", "off"];

/**
 * Common AWS services for autocomplete
 */
const AWS_SERVICES = [
  "ec2",
  "s3",
  "rds",
  "lambda",
  "dynamodb",
  "sqs",
  "sns",
  "cloudwatch",
  "iam",
  "vpc",
  "elb",
  "alb",
  "nlb",
  "ecs",
  "eks",
  "fargate",
  "cloudfront",
  "route53",
  "apigateway",
  "elasticache",
  "aurora",
  "kinesis",
  "glue",
  "athena",
  "redshift",
  "emr",
  "sagemaker",
  "stepfunctions",
  "eventbridge",
  "cognito",
];

/**
 * Common GCP services for autocomplete
 */
const GCP_SERVICES = [
  "compute",
  "gce",
  "gcs",
  "cloudsql",
  "cloudrun",
  "cloudfunctions",
  "firestore",
  "bigtable",
  "pubsub",
  "cloudtasks",
  "cloudscheduler",
  "logging",
  "monitoring",
  "iam",
  "vpc",
  "loadbalancer",
  "gke",
  "cloudcdn",
  "dns",
  "apigee",
  "memorystore",
  "dataflow",
  "bigquery",
  "dataproc",
  "aiplatform",
];

/**
 * Common relationship types
 */
const RELATIONSHIP_TYPES = [
  "connects",
  "reads",
  "writes",
  "calls",
  "depends-on",
  "monitors",
  "triggers",
  "caches",
  "stores",
  "authenticates",
  "authorizes",
  "routes",
  "balances",
  "scales",
  "manages",
];

/**
 * Register autocomplete provider for ArchLex
 */
export function registerCompletionProvider(
  monaco: typeof Monaco,
): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider("archlex", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);

      const suggestions: Monaco.languages.CompletionItem[] = [];

      // Keywords
      if (/^\s*\w*$/.test(textBeforeCursor)) {
        for (const keyword of KEYWORDS) {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
            detail: "ArchLex keyword",
          });
        }
      }

      // After "provider" keyword
      if (/\bprovider\s+\w*$/.test(textBeforeCursor)) {
        for (const provider of PROVIDERS) {
          suggestions.push({
            label: provider,
            kind: monaco.languages.CompletionItemKind.EnumMember,
            insertText: provider,
            range,
            detail: "Cloud provider",
          });
        }
      }

      // After "direction" keyword
      if (/\bdirection\s+\w*$/.test(textBeforeCursor)) {
        for (const dir of DIRECTIONS) {
          suggestions.push({
            label: dir,
            kind: monaco.languages.CompletionItemKind.EnumMember,
            insertText: dir,
            range,
            detail: "Layout direction",
            documentation: {
              value:
                dir === "LR"
                  ? "Left to Right"
                  : dir === "RL"
                    ? "Right to Left"
                    : dir === "TB"
                      ? "Top to Bottom"
                      : "Bottom to Top",
            },
          });
        }
      }

      // After "validation" keyword
      if (/\bvalidation\s+\w*$/.test(textBeforeCursor)) {
        for (const mode of VALIDATION_MODES) {
          suggestions.push({
            label: mode,
            kind: monaco.languages.CompletionItemKind.EnumMember,
            insertText: mode,
            range,
            detail: "Validation mode",
          });
        }
      }

      // After colon (service kinds)
      if (/:\s*\w*$/.test(textBeforeCursor)) {
        const sourceText = model.getValue();
        const isAws = /\bprovider\s+aws\b/.test(sourceText);
        const isGcp = /\bprovider\s+gcp\b/.test(sourceText);

        if (isAws) {
          for (const service of AWS_SERVICES) {
            suggestions.push({
              label: service,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: service,
              range,
              detail: "AWS service",
            });
          }
        }

        if (isGcp) {
          for (const service of GCP_SERVICES) {
            suggestions.push({
              label: service,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: service,
              range,
              detail: "GCP service",
            });
          }
        }
      }

      // Inside relationship brackets [-...-]
      if (/\-\[\s*\w*$/.test(textBeforeCursor)) {
        for (const rel of RELATIONSHIP_TYPES) {
          suggestions.push({
            label: rel,
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: `${rel}]->`,
            range,
            detail: "Relationship type",
          });
        }
      }

      return { suggestions };
    },
  });
}
