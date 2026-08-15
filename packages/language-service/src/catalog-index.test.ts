import type { CatalogMetadata, LanguageMetadata } from "@archlex/model";
import { describe, expect, it } from "vitest";
import { createCatalogIndex } from "./catalog-index.js";

describe("createCatalogIndex", () => {
  const mockCatalog: CatalogMetadata = {
    directives: {
      provider: ["aws", "gcp", "k8s"],
      direction: ["TB", "LR"],
      validation: ["normal", "strict"],
      theme: ["light", "dark"],
    },
    containmentScopes: ["account", "region", "vpc", "cluster", "namespace"],
    relationshipKinds: ["targets", "routes"],
    language: {} as LanguageMetadata,
    providers: {
      aws: {
        id: "aws",
        name: "Amazon Web Services",
        catalogVersion: "test",
        services: [
          {
            id: "lambda",
            displayName: "AWS Lambda",
            category: "compute",
            aliases: ["function"],
            searchTerms: ["serverless function"],
          },
          {
            id: "s3",
            displayName: "Amazon S3",
            category: "storage",
            aliases: ["bucket"],
            searchTerms: ["Simple Storage Service", "object storage"],
          },
        ],
        relationships: [],
        supportedScopes: ["account", "region"],
      },
      k8s: {
        id: "k8s",
        name: "Kubernetes",
        catalogVersion: "test",
        services: [
          {
            id: "deployment",
            displayName: "Deployment",
            category: "containers",
            aliases: ["deploy"],
          },
          {
            id: "service",
            displayName: "Service",
            category: "networking",
            aliases: ["svc"],
          },
        ],
        relationships: [
          {
            kind: "targets",
            displayName: "Targets",
            allowedSources: ["service"],
            allowedTargets: ["deployment"],
          },
        ],
        supportedScopes: ["cluster", "namespace"],
      },
    },
  };

  it("resolves resources by canonical ID", () => {
    const index = createCatalogIndex(mockCatalog);
    const lambda = index.resolveResource("aws", "lambda");

    expect(lambda).toMatchObject({
      id: "lambda",
      displayName: "AWS Lambda",
    });
  });

  it("resolves resources by alias", () => {
    const index = createCatalogIndex(mockCatalog);
    const lambda = index.resolveResource("aws", "function");

    expect(lambda).toMatchObject({
      id: "lambda",
      displayName: "AWS Lambda",
    });
  });

  it("searches resources by normalized search term", () => {
    const index = createCatalogIndex(mockCatalog);
    const results = index.searchResources("aws", "serverless");

    expect(results).toContainEqual(
      expect.objectContaining({
        id: "lambda",
        displayName: "AWS Lambda",
      }),
    );
  });

  it("searches resources case-insensitively with punctuation normalization", () => {
    const index = createCatalogIndex(mockCatalog);
    const results = index.searchResources("aws", "Simple Storage");

    expect(results).toContainEqual(
      expect.objectContaining({
        id: "s3",
        displayName: "Amazon S3",
      }),
    );
  });

  it("lists all resources for a provider", () => {
    const index = createCatalogIndex(mockCatalog);
    const resources = index.listResources("aws");

    expect(resources).toHaveLength(2);
    expect(resources.map((r) => r.id)).toEqual(["lambda", "s3"]);
  });

  it("returns empty array for unknown provider", () => {
    const index = createCatalogIndex(mockCatalog);
    const resources = index.listResources("unknown");

    expect(resources).toEqual([]);
  });

  it("lists supported scopes for a provider", () => {
    const index = createCatalogIndex(mockCatalog);
    const scopes = index.getSupportedScopes("k8s");

    expect(scopes).toEqual(["cluster", "namespace"]);
  });

  it("returns provider relationship definitions", () => {
    const index = createCatalogIndex(mockCatalog);
    const relationships = index.getRelationships("k8s");

    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      kind: "targets",
      displayName: "Targets",
    });
  });
});
