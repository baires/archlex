import type { ResourceDefinition } from "@archlex/model";
import { describe, expect, test } from "vitest";
import {
  VALID_RESOURCE_CATEGORIES,
  validateCatalogDefinition,
  validateCatalogManifest,
} from "./catalog-validator.js";
import { CATALOG_DIAGNOSTIC_CODES } from "./registry.js";

describe("catalog-validator", () => {
  describe("validateCatalogDefinition", () => {
    test("valid ResourceDefinition returns valid: true with empty diagnostics", () => {
      const validDef: ResourceDefinition = {
        id: "aws-lambda",
        displayName: "AWS Lambda",
        category: "compute",
        aliases: ["lambda", "aws-serverless-function"],
        iconKey: "aws/lambda",
      };

      const result = validateCatalogDefinition(validDef);
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    test("invalid ID format generates CATALOG001 diagnostic error", () => {
      const invalidIds = [
        "AWS-Lambda",
        "aws_lambda",
        "aws:lambda",
        "",
        "  ",
        "lambda!",
      ];

      for (const id of invalidIds) {
        const def: ResourceDefinition = {
          id,
          displayName: "AWS Lambda",
          category: "compute",
          aliases: ["lambda"],
        };

        const result = validateCatalogDefinition(def);
        expect(result.valid).toBe(false);
        expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
        const diag = result.diagnostics.find(
          (d) => d.code === CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
        );
        expect(diag).toBeDefined();
        expect(diag?.severity).toBe("error");
      }
    });

    test("empty or whitespace displayName generates CATALOG001 diagnostic error", () => {
      const invalidNames = ["", "   ", "\t\n"];

      for (const displayName of invalidNames) {
        const def: ResourceDefinition = {
          id: "aws-lambda",
          displayName,
          category: "compute",
          aliases: ["lambda"],
        };

        const result = validateCatalogDefinition(def);
        expect(result.valid).toBe(false);
        const diag = result.diagnostics.find(
          (d) => d.code === CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
        );
        expect(diag).toBeDefined();
        expect(diag?.severity).toBe("error");
      }
    });

    test("invalid category generates CATALOG001 diagnostic error", () => {
      const def: ResourceDefinition = {
        id: "aws-lambda",
        displayName: "AWS Lambda",
        category: "serverless", // Not in allowed categories list
        aliases: ["lambda"],
      };

      const result = validateCatalogDefinition(def);
      expect(result.valid).toBe(false);
      const diag = result.diagnostics.find(
        (d) => d.code === CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA,
      );
      expect(diag).toBeDefined();
      expect(diag?.severity).toBe("error");
    });

    test("validates all 15 allowed categories successfully", () => {
      const allowedCategories = [
        "boundary",
        "networking",
        "compute",
        "storage",
        "database",
        "messaging",
        "identity",
        "security",
        "monitoring",
        "integration",
        "analytics",
        "ai-ml",
        "devtools",
        "containers",
        "management",
      ];

      expect(VALID_RESOURCE_CATEGORIES).toEqual(allowedCategories);

      for (const category of allowedCategories) {
        const def: ResourceDefinition = {
          id: "test-resource",
          displayName: "Test Resource",
          category,
          aliases: [],
        };
        const result = validateCatalogDefinition(def);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe("validateCatalogManifest", () => {
    test("accepts an array of valid ResourceDefinitions", () => {
      const definitions: ResourceDefinition[] = [
        {
          id: "aws-lambda",
          displayName: "AWS Lambda",
          category: "compute",
          aliases: ["lambda"],
        },
        {
          id: "aws-s3",
          displayName: "AWS S3",
          category: "storage",
          aliases: ["s3", "bucket"],
        },
      ];

      const result = validateCatalogManifest(definitions);
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    test("accepts a Map of valid ResourceDefinitions", () => {
      const map = new Map<string, ResourceDefinition>([
        [
          "aws-lambda",
          {
            id: "aws-lambda",
            displayName: "AWS Lambda",
            category: "compute",
            aliases: ["lambda"],
          },
        ],
        [
          "aws-s3",
          {
            id: "aws-s3",
            displayName: "AWS S3",
            category: "storage",
            aliases: ["s3"],
          },
        ],
      ]);

      const result = validateCatalogManifest(map);
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    test("catches duplicate IDs across definitions", () => {
      const definitions: ResourceDefinition[] = [
        {
          id: "aws-lambda",
          displayName: "AWS Lambda 1",
          category: "compute",
          aliases: ["lambda-1"],
        },
        {
          id: "aws-lambda",
          displayName: "AWS Lambda 2",
          category: "compute",
          aliases: ["lambda-2"],
        },
      ];

      const result = validateCatalogManifest(definitions);
      expect(result.valid).toBe(false);
      const duplicateDiag = result.diagnostics.find(
        (d) =>
          d.code === CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA &&
          d.message.includes("Duplicate ID"),
      );
      expect(duplicateDiag).toBeDefined();
    });

    test("catches duplicate aliases across definitions", () => {
      const definitions: ResourceDefinition[] = [
        {
          id: "aws-lambda",
          displayName: "AWS Lambda",
          category: "compute",
          aliases: ["serverless"],
        },
        {
          id: "gcp-cloud-functions",
          displayName: "GCP Cloud Functions",
          category: "compute",
          aliases: ["serverless"],
        },
      ];

      const result = validateCatalogManifest(definitions);
      expect(result.valid).toBe(false);
      const duplicateAliasDiag = result.diagnostics.find(
        (d) =>
          d.code === CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA &&
          d.message.includes("Duplicate alias"),
      );
      expect(duplicateAliasDiag).toBeDefined();
    });

    test("normalizes aliases before conflict detection", () => {
      const result = validateCatalogManifest([
        {
          id: "first",
          displayName: "First",
          category: "compute",
          aliases: ["AWS.EKS"],
        },
        {
          id: "second",
          displayName: "Second",
          category: "compute",
          aliases: ["aws.eks"],
        },
      ]);

      expect(result.valid).toBe(false);
      expect(result.diagnostics[0]?.message).toContain("aws.eks");
    });

    test("rejects an alias that conflicts with another canonical ID", () => {
      const result = validateCatalogManifest([
        {
          id: "first",
          displayName: "First",
          category: "compute",
          aliases: ["second"],
        },
        {
          id: "second",
          displayName: "Second",
          category: "compute",
          aliases: [],
        },
      ]);

      expect(result.valid).toBe(false);
      expect(result.diagnostics[0]?.message).toContain("second");
    });

    test("rejects duplicate normalized search terms on one resource", () => {
      const result = validateCatalogManifest([
        {
          id: "eks",
          displayName: "Amazon EKS",
          category: "compute",
          aliases: [],
          searchTerms: [
            "Elastic Kubernetes Service",
            "elastic-kubernetes_service",
          ],
        },
      ]);

      expect(result.valid).toBe(false);
    });

    test("allows one discovery term on different resources", () => {
      const result = validateCatalogManifest([
        {
          id: "rds",
          displayName: "Amazon RDS",
          category: "database",
          aliases: [],
          searchTerms: ["database"],
        },
        {
          id: "dynamodb",
          displayName: "Amazon DynamoDB",
          category: "database",
          aliases: [],
          searchTerms: ["database"],
        },
      ]);

      expect(result.valid).toBe(true);
    });
  });
});
