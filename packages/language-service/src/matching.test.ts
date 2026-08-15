import { describe, expect, it } from "vitest";
import { MATCH_SCORES, scoreBestMatch, scoreTextMatch } from "./matching.js";

describe("scoreTextMatch", () => {
  it.each([
    ["eks", "eks", "canonical-exact"],
    ["ek", "eks", "canonical-prefix"],
    ["amazon e", "Amazon EKS", "search-token"],
    ["elastic kubernetes", "Elastic Kubernetes Service", "search-token"],
  ] as const)("classifies %s against %s as %s", (query, candidate, tier) => {
    const match = scoreTextMatch(query, candidate);
    expect(match?.tier).toBe(tier);
  });

  it("returns no match for unrelated terms", () => {
    expect(scoreTextMatch("database", "Amazon EKS")).toBeUndefined();
  });

  it("normalizes case and punctuation", () => {
    const match = scoreTextMatch("Amazon_EKS", "amazon.eks");
    expect(match?.tier).toBe("canonical-exact");
  });

  it("performs fuzzy subsequence matching", () => {
    const match = scoreTextMatch("amzeks", "Amazon EKS");
    expect(match?.tier).toBe("fuzzy-subsequence");
    expect(match?.score).toBeGreaterThan(MATCH_SCORES["fuzzy-subsequence"]);
  });

  it("requires all query tokens in order for token matching", () => {
    expect(
      scoreTextMatch("kubernetes elastic", "Elastic Kubernetes Service"),
    ).toBeUndefined();
    expect(
      scoreTextMatch("elastic kubernetes", "Elastic Kubernetes Service"),
    ).toBeDefined();
  });

  it("returns undefined for empty query", () => {
    expect(scoreTextMatch("", "eks")).toBeUndefined();
  });
});

describe("scoreBestMatch", () => {
  const resource = {
    canonical: "eks",
    aliases: ["k8s-aws"],
    displayName: "Amazon EKS",
    searchTerms: ["Elastic Kubernetes Service", "managed Kubernetes cluster"],
  };

  it("returns canonical-exact for canonical ID match", () => {
    const match = scoreBestMatch("eks", resource);
    expect(match?.tier).toBe("canonical-exact");
    expect(match?.score).toBe(MATCH_SCORES["canonical-exact"]);
  });

  it("returns alias-exact for exact alias match", () => {
    const match = scoreBestMatch("k8s-aws", resource);
    expect(match?.tier).toBe("alias-exact");
    expect(match?.score).toBe(MATCH_SCORES["alias-exact"]);
  });

  it("returns search-token for multi-word query matching search terms", () => {
    const match = scoreBestMatch("managed kubernetes", resource);
    expect(match?.tier).toBe("search-token");
    expect(match?.score).toBe(MATCH_SCORES["search-token"]);
  });

  it("returns search-token for search term match", () => {
    const match = scoreBestMatch("kubernetes service", resource);
    expect(match?.tier).toBe("search-token");
    expect(match?.score).toBe(MATCH_SCORES["search-token"]);
  });

  it("returns the best match across all fields", () => {
    // "eks" matches canonical exactly (score 0) and also fuzzy matches other fields
    const match = scoreBestMatch("eks", resource);
    expect(match?.tier).toBe("canonical-exact");
  });

  it("returns undefined when no fields match", () => {
    const match = scoreBestMatch("database", resource);
    expect(match).toBeUndefined();
  });

  it("prioritizes canonical over alias over display over search", () => {
    // Test that canonical-prefix beats alias-exact
    const matchCanonical = scoreBestMatch("ek", resource);
    expect(matchCanonical?.tier).toBe("canonical-prefix");

    // Test that alias-exact beats search-token
    const matchAlias = scoreBestMatch("k8s-aws", resource);
    expect(matchAlias?.tier).toBe("alias-exact");
  });
});
