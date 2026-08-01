import type { CdnProviderDefinition } from "@archlex/icons-core";
import { beforeAll, describe, expect, it, vi } from "vitest";

const registerProvider = vi.hoisted(() => vi.fn());

vi.mock("@archlex/icons", () => ({
  IconLoader: { registerProvider },
}));

let provider: CdnProviderDefinition | undefined;

beforeAll(async () => {
  const cdnModule = await import("./cdn.js");
  provider = Reflect.get(cdnModule, "AWS_CDN_PROVIDER") as
    | CdnProviderDefinition
    | undefined;

  await import("../index.js");
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
});

describe("AWS_CDN_PROVIDER", () => {
  it("exports a strict, version-pinned HTTPS provider definition", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    const url = new URL(provider.baseUrl);
    expect(provider.provider).toBe("aws");
    expect(provider.baseUrl).toBe(
      "https://unpkg.com/aws-icons@3.3.0/icons/architecture-service",
    );
    expect(url.protocol).toBe("https:");
    expect(provider.releaseId).toBe("3.3.0");
    expect(provider.allowedHosts).toContain(url.hostname);
    expect(
      `${provider.baseUrl}/${provider.releaseId}`.toLowerCase(),
    ).not.toContain("latest");
  });

  it("maps service keys to canonical aws-icons architecture-service filenames", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    expect(provider.mappings).toMatchObject({
      lambda: "AWSLambda",
      s3: "AmazonSimpleStorageService",
      "api-gateway": "AmazonAPIGateway",
      cloudfront: "AmazonCloudFront",
      dynamodb: "AmazonDynamoDB",
      ec2: "AmazonEC2",
      ecs: "AmazonElasticContainerService",
      eks: "AmazonElasticKubernetesService",
      elasticache: "AmazonElastiCache",
      eventbridge: "AmazonEventBridge",
      "iam-role": "AWSIdentityandAccessManagement",
      rds: "AmazonRDS",
      route53: "AmazonRoute53",
      sns: "AmazonSimpleNotificationService",
      sqs: "AmazonSimpleQueueService",
      vpc: "AmazonVirtualPrivateCloud",
      apprunner: "AWSAppRunner",
      "step-functions": "AWSStepFunctions",
    });
  });

  it("maps the catalog's app-runner key to its canonical package filename", () => {
    expect(provider).toBeDefined();
    if (!provider) return;

    expect(provider.mappings["app-runner"]).toBe("AWSAppRunner");
  });

  it("imports the provider package without legacy loader registration", () => {
    expect(registerProvider).not.toHaveBeenCalled();
  });
});
