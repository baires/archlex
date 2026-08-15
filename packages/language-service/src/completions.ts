import type { CatalogIndex } from "./catalog-index.js";
import { type TextMatch, scoreBestMatch } from "./matching.js";
import type { CursorContext, LanguageDocument, OffsetRange } from "./types.js";

export type CompletionKind =
  | "directive"
  | "enum-value"
  | "scope"
  | "resource"
  | "symbol"
  | "relationship"
  | "snippet";

export interface LanguageCompletion {
  readonly id: string;
  readonly label: string;
  readonly insertText: string;
  readonly filterText: string;
  readonly kind: CompletionKind;
  readonly detail?: string;
  readonly documentation?: string;
  readonly replacement: OffsetRange;
  readonly sortScore: number;
}

export interface CompletionEngine {
  complete(
    document: LanguageDocument,
    offset: number,
    options?: { trigger?: "automatic" | "manual" },
  ): readonly LanguageCompletion[];
}

export interface CompletionRequest {
  readonly document: LanguageDocument;
  readonly offset: number;
  readonly catalog: CatalogMetadata;
  readonly trigger?: "automatic" | "manual";
}

const SEMANTIC_PENALTY = {
  differentProvider: 40,
  incompatibleContainment: 60,
  parentScopeDistance: 10,
  incompatibleRelationshipSource: 80,
  incompatibleRelationshipTarget: 80,
} as const;

import type { CatalogMetadata } from "@archlex/model";
import { createCatalogIndex } from "./catalog-index.js";
import { getCursorContext } from "./cursor-context.js";

/**
 * Create a completion engine with a cached catalog index.
 *
 * The engine reuses the index across all completion requests.
 */
export function createCompletionEngine(
  catalog: CatalogMetadata,
): CompletionEngine {
  const index = createCatalogIndex(catalog);

  return {
    complete(document, offset, options) {
      const trigger = options?.trigger ?? "manual";
      const context = getCursorContext(document, offset);

      // Automatic trigger: suppress in certain contexts
      if (trigger === "automatic") {
        if (
          context.position === "unknown" ||
          context.position === "statement-start"
        ) {
          // Don't auto-complete on empty lines or at statement start
          if (!context.partialToken || context.partialToken.length === 0) {
            return [];
          }
        }
      }

      return generateCompletions(document, context, index, catalog);
    },
  };
}

/**
 * One-shot completion without caching (for convenience).
 */
export function completeArchLex(
  request: CompletionRequest,
): readonly LanguageCompletion[] {
  const engine = createCompletionEngine(request.catalog);
  return engine.complete(request.document, request.offset, {
    trigger: request.trigger,
  });
}

function generateCompletions(
  document: LanguageDocument,
  context: CursorContext,
  index: CatalogIndex,
  catalog: CatalogMetadata,
): readonly LanguageCompletion[] {
  switch (context.position) {
    case "statement-start":
      return getStatementStartCompletions(document, context, index, catalog);

    case "resource-kind":
      return getResourceCompletions(document, context, index);

    case "directive-value":
      return getDirectiveValueCompletions(context, catalog);

    case "scope-kind":
      return getScopeCompletions(context, index);

    case "relationship-kind":
      return getRelationshipCompletions(document, context, index, catalog);

    default:
      return [];
  }
}

function getStatementStartCompletions(
  document: LanguageDocument,
  context: CursorContext,
  index: CatalogIndex,
  catalog: CatalogMetadata,
): readonly LanguageCompletion[] {
  const completions: LanguageCompletion[] = [];
  const replacement = {
    startOffset: context.offset,
    endOffset: context.offset,
  };

  // Add directives (suppress already declared)
  const directives = [
    {
      name: "provider",
      snippet: "provider ${1}",
      doc: "Select the default provider for unqualified resources.",
    },
    {
      name: "direction",
      snippet: "direction ${1|LR,RL,TB,BT|}",
      doc: "Set the graph layout direction.",
    },
    {
      name: "validation",
      snippet: "validation ${1|normal,strict,off|}",
      doc: "Set semantic validation behavior.",
    },
    {
      name: "theme",
      snippet: "theme ${1|light,dark|}",
      doc: "Set the rendered diagram theme.",
    },
    { name: "alias", snippet: "alias ${1}", doc: "Define a resource alias." },
    { name: "tags", snippet: "tags ${1}", doc: "Add resource tags." },
  ];

  // Suppress "direction", "validation", "theme" if any resource is declared (late directives)
  const hasResources = document.symbols.length > 0;

  for (const directive of directives) {
    if (document.declaredDirectives.has(directive.name)) continue;
    if (
      hasResources &&
      ["direction", "validation", "theme"].includes(directive.name)
    )
      continue;

    completions.push({
      id: `directive:${directive.name}`,
      label: directive.name,
      insertText: directive.snippet,
      filterText: directive.name,
      kind: "directive",
      documentation: directive.doc,
      replacement,
      sortScore: 0,
    });
  }

  // Add scope snippets (provider-aware)
  const supportedScopes = document.providerId
    ? index.getSupportedScopes(document.providerId)
    : catalog.containmentScopes;

  for (const scopeKind of supportedScopes) {
    completions.push({
      id: `scope:${scopeKind}`,
      label: scopeKind,
      insertText: `${scopeKind} \${1:name} {\n  $0\n}`,
      filterText: scopeKind,
      kind: "snippet",
      detail: `${scopeKind} scope`,
      replacement,
      sortScore: 100,
    });
  }

  // Add resource snippet if provider is set
  if (document.providerId) {
    completions.push({
      id: "snippet:resource",
      label: "resource declaration",
      insertText: "${1:name}: ${2:kind}",
      filterText: "resource",
      kind: "snippet",
      detail: "Declare a new resource",
      replacement,
      sortScore: 200,
    });
  }

  return completions;
}

function getResourceCompletions(
  document: LanguageDocument,
  context: CursorContext,
  index: CatalogIndex,
): readonly LanguageCompletion[] {
  const query = context.partialToken ?? "";
  const replacement = {
    startOffset: context.offset - query.length,
    endOffset: context.offset,
  };

  const completions: LanguageCompletion[] = [];

  // Determine which providers to search
  const providers = document.providerId
    ? [document.providerId]
    : index.getAllProviderIds();

  for (const providerId of providers) {
    const resources = index.listResources(providerId);

    for (const resource of resources) {
      const match = scoreBestMatch(query, {
        canonical: resource.id,
        aliases: resource.aliases ?? [],
        displayName: resource.displayName,
        searchTerms: resource.searchTerms ?? [],
      });

      if (!match && query.length > 0) continue;

      const baseScore = match?.score ?? 1000;

      // Apply semantic penalties
      let finalScore = baseScore;

      // Containment compatibility
      const innermostScope = context.scopePath[context.scopePath.length - 1];
      if (innermostScope && resource.allowedContainment) {
        const scopeKind = innermostScope.split(":")[0];
        if (!resource.allowedContainment.includes(scopeKind)) {
          finalScore += SEMANTIC_PENALTY.incompatibleContainment;
        }
      }

      // Scope distance penalty
      finalScore +=
        context.scopePath.length * SEMANTIC_PENALTY.parentScopeDistance;

      // Build insertion text
      const insertText = document.providerId
        ? resource.id
        : `${providerId}.${resource.id}`;

      completions.push({
        id: `resource:${providerId}:${resource.id}`,
        label: resource.displayName,
        insertText,
        filterText: [
          resource.id,
          resource.displayName,
          ...(resource.aliases ?? []),
          ...(resource.searchTerms ?? []),
        ].join(" "),
        kind: "resource",
        detail: `${providerId} · ${resource.category} · ${resource.id}`,
        replacement,
        sortScore: finalScore,
      });
    }
  }

  // Sort and deduplicate by providerId + canonicalId
  const seen = new Set<string>();
  return completions
    .sort((a, b) => a.sortScore - b.sortScore || a.id.localeCompare(b.id))
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
}

function getDirectiveValueCompletions(
  context: CursorContext,
  catalog: CatalogMetadata,
): readonly LanguageCompletion[] {
  if (!context.directiveName) return [];

  const replacement = {
    startOffset: context.offset,
    endOffset: context.offset,
  };

  // Provider directive: list available provider IDs
  if (context.directiveName === "provider") {
    return Object.keys(catalog.providers).map((providerId) => ({
      id: `provider:${providerId}`,
      label: providerId,
      insertText: providerId,
      filterText: providerId,
      kind: "enum-value" as const,
      detail: catalog.providers[providerId]?.name,
      replacement,
      sortScore: 0,
    }));
  }

  // Direction directive
  if (context.directiveName === "direction") {
    return catalog.directives.direction.map((value) => ({
      id: `direction:${value}`,
      label: value,
      insertText: value,
      filterText: value,
      kind: "enum-value" as const,
      replacement,
      sortScore: 0,
    }));
  }

  // Validation directive
  if (context.directiveName === "validation") {
    return catalog.directives.validation.map((value) => ({
      id: `validation:${value}`,
      label: value,
      insertText: value,
      filterText: value,
      kind: "enum-value" as const,
      replacement,
      sortScore: 0,
    }));
  }

  // Theme directive
  if (context.directiveName === "theme") {
    return catalog.directives.theme.map((value) => ({
      id: `theme:${value}`,
      label: value,
      insertText: value,
      filterText: value,
      kind: "enum-value" as const,
      replacement,
      sortScore: 0,
    }));
  }

  return [];
}

function getScopeCompletions(
  context: CursorContext,
  index: CatalogIndex,
): readonly LanguageCompletion[] {
  const replacement = {
    startOffset: context.offset,
    endOffset: context.offset,
  };

  const supportedScopes = context.providerId
    ? index.getSupportedScopes(context.providerId)
    : index.getContainmentScopes();

  return supportedScopes.map((scopeKind) => ({
    id: `scope:${scopeKind}`,
    label: scopeKind,
    insertText: scopeKind,
    filterText: scopeKind,
    kind: "scope" as const,
    detail: `${scopeKind} scope`,
    replacement,
    sortScore: 0,
  }));
}

function getRelationshipCompletions(
  document: LanguageDocument,
  context: CursorContext,
  index: CatalogIndex,
  catalog: CatalogMetadata,
): readonly LanguageCompletion[] {
  const replacement = {
    startOffset: context.offset,
    endOffset: context.offset,
  };

  // Merge core and provider relationship definitions
  const coreRelationships = catalog.language.relationships;
  const providerRelationships = document.providerId
    ? index.getRelationships(document.providerId)
    : [];

  // Provider definitions override core by kind
  const relationshipMap = new Map(
    coreRelationships.map((rel) => [rel.kind, rel]),
  );
  for (const rel of providerRelationships) {
    relationshipMap.set(rel.kind, rel);
  }

  const completions: LanguageCompletion[] = [];

  for (const rel of relationshipMap.values()) {
    const score = 0;

    // Apply semantic compatibility penalties if endpoints are resolved
    // (This would require resolving context.sourceName and context.targetName
    // against document.symbols - simplified for now)

    completions.push({
      id: `relationship:${rel.kind}`,
      label: rel.displayName,
      insertText: rel.kind,
      filterText: [rel.kind, rel.displayName, ...(rel.aliases ?? [])].join(" "),
      kind: "relationship",
      documentation: rel.documentation,
      replacement,
      sortScore: score,
    });
  }

  return completions.sort(
    (a, b) => a.sortScore - b.sortScore || a.id.localeCompare(b.id),
  );
}
