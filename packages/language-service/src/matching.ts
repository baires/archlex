/**
 * Text matching and scoring for completion candidates.
 *
 * Returns lower scores for better matches to enable ascending sort.
 */

export const MATCH_SCORES = {
  "canonical-exact": 0,
  "canonical-prefix": 100,
  "alias-exact": 200,
  "alias-prefix": 300,
  "display-prefix": 400,
  "search-token": 500,
  "fuzzy-subsequence": 600,
} as const;

export type MatchTier = keyof typeof MATCH_SCORES;

export interface TextMatch {
  readonly tier: MatchTier;
  readonly score: number;
}

/**
 * Normalize text for case-insensitive comparison.
 */
function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[._\s-]+/g, " ")
    .trim();
}

/**
 * Score a query against a candidate text.
 *
 * Returns undefined if no match is found.
 */
export function scoreTextMatch(
  query: string,
  candidate: string,
): TextMatch | undefined {
  const normalizedQuery = normalize(query);
  const normalizedCandidate = normalize(candidate);

  if (normalizedQuery.length === 0) return undefined;

  // Exact match on canonical/normalized form
  if (normalizedQuery === normalizedCandidate) {
    return {
      tier: "canonical-exact",
      score: MATCH_SCORES["canonical-exact"],
    };
  }

  // Prefix match on canonical/normalized form (only if no spaces in query)
  if (
    !normalizedQuery.includes(" ") &&
    normalizedCandidate.startsWith(normalizedQuery)
  ) {
    return {
      tier: "canonical-prefix",
      score: MATCH_SCORES["canonical-prefix"],
    };
  }

  // Token-based matching (all query tokens must appear in order)
  const queryTokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 0);
  const candidateTokens = normalizedCandidate
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (queryTokens.length > 1 && candidateTokens.length > 0) {
    // Check if all query tokens appear in candidate tokens in order
    let candidateIndex = 0;
    let matchedTokens = 0;

    for (const queryToken of queryTokens) {
      let found = false;
      for (; candidateIndex < candidateTokens.length; candidateIndex++) {
        if (candidateTokens[candidateIndex].startsWith(queryToken)) {
          matchedTokens++;
          candidateIndex++;
          found = true;
          break;
        }
      }
      if (!found) break;
    }

    if (matchedTokens === queryTokens.length) {
      return {
        tier: "search-token",
        score: MATCH_SCORES["search-token"],
      };
    }
  }

  // Fuzzy subsequence matching (characters in order, allow gaps)
  const fuzzyScore = fuzzyMatch(normalizedQuery, normalizedCandidate);
  if (fuzzyScore !== undefined) {
    return {
      tier: "fuzzy-subsequence",
      score: MATCH_SCORES["fuzzy-subsequence"] + fuzzyScore,
    };
  }

  return undefined;
}

/**
 * Check if query is a subsequence of candidate and return gap count.
 * Returns undefined if not a subsequence.
 */
function fuzzyMatch(query: string, candidate: string): number | undefined {
  let queryIndex = 0;
  let candidateIndex = 0;
  let gaps = 0;

  while (queryIndex < query.length && candidateIndex < candidate.length) {
    if (query[queryIndex] === candidate[candidateIndex]) {
      queryIndex++;
      candidateIndex++;
    } else {
      gaps++;
      candidateIndex++;
    }
  }

  // All query characters must be found
  if (queryIndex === query.length) {
    return gaps;
  }

  return undefined;
}

/**
 * Score a query against multiple candidate fields.
 *
 * Returns the best (lowest) score among all candidates.
 */
export function scoreBestMatch(
  query: string,
  candidates: {
    canonical: string;
    aliases: readonly string[];
    displayName: string;
    searchTerms: readonly string[];
  },
): TextMatch | undefined {
  const matches: TextMatch[] = [];

  // Check canonical ID
  const canonicalMatch = scoreTextMatch(query, candidates.canonical);
  if (canonicalMatch) {
    matches.push(canonicalMatch);
  }

  // Check aliases (exact and prefix get alias tier)
  for (const alias of candidates.aliases) {
    const aliasMatch = scoreTextMatch(query, alias);
    if (aliasMatch) {
      // Remap canonical tiers to alias tiers
      if (aliasMatch.tier === "canonical-exact") {
        matches.push({
          tier: "alias-exact",
          score: MATCH_SCORES["alias-exact"],
        });
      } else if (aliasMatch.tier === "canonical-prefix") {
        matches.push({
          tier: "alias-prefix",
          score: MATCH_SCORES["alias-prefix"],
        });
      } else {
        matches.push(aliasMatch);
      }
    }
  }

  // Check display name (prefix only gets display-prefix tier)
  const displayMatch = scoreTextMatch(query, candidates.displayName);
  if (displayMatch) {
    if (
      displayMatch.tier === "canonical-exact" ||
      displayMatch.tier === "canonical-prefix"
    ) {
      matches.push({
        tier: "display-prefix",
        score: MATCH_SCORES["display-prefix"],
      });
    } else {
      matches.push(displayMatch);
    }
  }

  // Check search terms
  for (const term of candidates.searchTerms) {
    const termMatch = scoreTextMatch(query, term);
    if (termMatch) {
      matches.push(termMatch);
    }
  }

  // Return best (lowest score) match
  if (matches.length === 0) return undefined;

  return matches.reduce((best, current) =>
    current.score < best.score ? current : best,
  );
}
