# Monaco Language Intelligence Design

## Summary

ArchLex will replace the playground's hand-written Monaco completion lists and
line-based context checks with a shared, editor-neutral language service. The
service will read provider and language metadata, analyze incomplete ArchLex
source, and return context-aware completion results. The Monaco integration
will translate those results into Monaco types without owning AWS, Google Cloud,
Kubernetes, or grammar nomenclature.

Users will be able to search by canonical resource ID, provider display name,
accepted alias, acronym expansion, or common product name. Completion will
insert the canonical ArchLex spelling. For example, a user can type `elastic
kubernetes` and select `Amazon EKS`, while Monaco inserts `eks` in an AWS
document.

## Goals

- Give users language-aware completion across directives, scopes, resources,
  declarations, relationship endpoints, and relationship kinds.
- Make catalogs and language metadata the source of editor-visible terms.
- Insert canonical ArchLex syntax even when the user searches with another
  name.
- Handle incomplete and invalid source without interrupting editing.
- Keep the completion engine independent of Monaco, the DOM, rendering, and
  icon loading.
- Create a base for hover, rename, navigation, and a future LSP.

## Non-goals

- Build an LSP server or VS Code extension in this work.
- Change the parser so display names with spaces become valid resource kinds.
- Fetch provider metadata or icons during completion.
- Infer cloud configuration that the ArchLex graph does not represent.
- Replace Monaco's completion widget or keyboard behavior.

## Current state

`apps/playground/src/monaco/completions.ts` contains separate arrays for AWS,
Google Cloud, Kubernetes, directives, and relationship kinds. The provider
arrays cover a subset of each catalog and include spellings that can drift from
the provider packages. Regular expressions inspect the current line to choose a
list.

The core API already exposes most required provider data through
`ArchLex.getCatalog()`: canonical resource IDs, display names, aliases,
categories, containment rules, providers, directives, scopes, and relationship
kinds. Provider catalogs also resolve aliases to canonical resources. The new
design extends these contracts where they lack search and relationship
semantics.

## Architecture

### Metadata ownership

Provider packages own resource and provider nomenclature. The ArchLex language
layer owns directives, scope syntax, operators, and built-in relationship
definitions. Core combines those sources through one public introspection
contract.

The playground must not contain provider IDs, service IDs, aliases, display
names, scope names, directive values, or relationship kinds. Monaco-specific
trigger characters and completion-kind mappings may remain in the adapter
because Monaco defines those values.

Extend `ResourceDefinition` with discovery terms:

```ts
export interface ResourceDefinition {
  id: string;
  displayName: string;
  category: string;
  aliases: readonly string[];
  searchTerms?: readonly string[];
  iconKey?: string;
  allowedContainment?: readonly string[];
}
```

`aliases` remain valid ArchLex resource spellings. `searchTerms` help users find
a resource but do not become accepted syntax. Providers should use search terms
for acronym expansions, former product names, and common names that contain
spaces. A catalog entry for EKS can include `Elastic Kubernetes Service` as a
search term while preserving `eks` as its canonical ID.

Expand relationship metadata so the language service can explain and rank
relationship kinds:

```ts
export interface RelationshipDefinition {
  kind: string;
  displayName: string;
  aliases?: readonly string[];
  searchTerms?: readonly string[];
  documentation?: string;
  allowedSources?: readonly string[];
  allowedTargets?: readonly string[];
}
```

Move the `CatalogMetadata` contract from `@archlex/core` to `@archlex/model` and
re-export it from core. The contract will expose these fields plus structured
directive, scope, and operator definitions. Code that imports the core re-export
can continue to do so. Provider packages can add relationship constraints over
time; the language service treats missing constraints as unrestricted.

Catalog validation will reject:

- duplicate canonical IDs within a provider;
- aliases that resolve to more than one canonical resource;
- duplicate normalized aliases or search terms within one resource;
- invalid canonical IDs and aliases;
- relationship constraints that reference missing canonical resources.

Search terms may overlap between resources because terms such as `database`
can describe several services. Ranking resolves those matches.

### Editor-neutral language service

Add a workspace package named `@archlex/language-service`. It depends on the
parser and model contracts, not Monaco or React. It accepts catalog metadata
from the configured ArchLex instance.

The package exposes two operations with focused responsibilities:

```ts
export interface LanguageDocument {
  readonly source: string;
  readonly ast: DocumentAst;
  readonly symbols: readonly DocumentSymbol[];
  readonly tokens: readonly LanguageToken[];
}

export interface DocumentSymbol {
  readonly name: string;
  readonly resourceKind: string;
  readonly providerId?: string;
  readonly scopePath: readonly string[];
  readonly declarationOffset: number;
}

export interface LanguageToken {
  readonly kind: string;
  readonly image: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export type CompletionKind =
  | "directive"
  | "enum-value"
  | "scope"
  | "resource"
  | "symbol"
  | "relationship"
  | "snippet";

export interface CompletionRequest {
  readonly document: LanguageDocument;
  readonly offset: number;
  readonly catalog: CatalogMetadata;
}

export interface LanguageCompletion {
  readonly id: string;
  readonly label: string;
  readonly insertText: string;
  readonly filterText: string;
  readonly kind: CompletionKind;
  readonly detail?: string;
  readonly documentation?: string;
  readonly replacement: { startOffset: number; endOffset: number };
  readonly sortScore: number;
}

export function analyzeLanguageDocument(source: string): LanguageDocument;
export function completeArchLex(
  request: CompletionRequest,
): readonly LanguageCompletion[];
```

The package will use these public names and preserve the separation between
document analysis and completion calculation. The Monaco adapter can cache
`LanguageDocument` by model version and reuse it for more than one completion
request.

The analyzer will combine lexer tokens with the parser's recoverable AST. Tokens
identify the cursor's immediate grammar position. The partial AST supplies
directives, scopes, declared resources, and visible symbols. This combination
supports incomplete declarations without reimplementing the grammar through
regular expressions.

### Monaco adapter

`apps/playground/src/monaco/completions.ts` will register one Monaco provider
and translate `LanguageCompletion` values into Monaco completion items. It will
receive the catalog metadata from the existing `archlex` instance in
`App.tsx`. The adapter will:

- cache document analysis by Monaco model version;
- convert offset replacement spans to Monaco ranges;
- map editor-neutral completion kinds to Monaco kinds;
- pass `filterText`, `sortText`, details, and documentation to Monaco;
- declare trigger characters required by ArchLex syntax;
- dispose the completion registration when the editor unmounts.

The adapter will contain no provider or ArchLex vocabulary.

The same catalog metadata will feed the Monarch tokenizer and non-diagnostic
hover provider. Syntax highlighting will derive directives, values, scopes, and
providers from metadata. Hover will derive resource names, aliases, search
terms, and relationship documentation from metadata. Diagnostic hover keeps
priority over language help.

## Cursor contexts and suggestions

The language service classifies the cursor into one of these contexts:

| Context | Suggestions |
| --- | --- |
| Statement start | Available directives, valid scopes, declaration snippets, resources |
| Directive value | Values from language metadata |
| Scope kind | Provider-compatible scope kinds |
| Scope name | No catalog suggestions |
| Resource kind | Provider-aware canonical resources |
| Display label | No automatic suggestions |
| Relationship source | Visible declared instance names |
| Relationship target | Visible declared instance names |
| Relationship kind | Relationship definitions from metadata |
| Comment or string | No suggestions |

Manual invocation may show resource suggestions at a valid statement start.
Automatic completion stays quiet in comments, labels, and completed tokens.

The service will offer directives only before the first resource, scope, or
relationship statement. It will suppress directives that the document has
already declared. It will build declaration snippets from language metadata and
grammar-owned templates.

### Provider qualification

With `provider aws`, resource suggestions from AWS insert unqualified canonical
IDs such as `eks`. If the user types a provider prefix such as `gcp.`, the
service narrows the result set and inserts qualified canonical IDs such as
`gcp.gke`.

Without a provider directive, resource suggestions insert qualified IDs such as
`aws.eks`, `gcp.gke`, and `k8s.deployment`. This rule prevents ambiguous source
when an ArchLex instance registers several providers.

### Resource discovery

The service indexes each resource's canonical ID, display name, aliases, and
search terms. It normalizes case, whitespace, hyphens, underscores, and dots for
matching. It keeps the original values for display and insertion.

A resource completion displays the provider name, resource display name,
canonical ID, category, and accepted aliases. Acceptance inserts the canonical
ID under the qualification rules above. Search terms do not appear as insertion
text.

The service collapses all matches for one provider and canonical ID into one
completion. This prevents a resource with several aliases from occupying
several rows.

### Symbols and relationships

Document analysis builds a symbol table from named and implicit resource
declarations. Relationship endpoint completion respects lexical scope. It ranks
symbols in the current scope above symbols from parent and document scopes.
Symbols outside the current visibility path do not appear.

Relationship-kind completion reads definitions from the metadata contract. If
the service can resolve the source and target resource kinds, it boosts kinds
whose source and target constraints match. It keeps unrestricted and
incompatible kinds visible below compatible kinds so users can express custom
or diagnosable architectures.

## Ranking

The completion engine returns a stable order. It applies these text match tiers:

1. exact canonical ID;
2. canonical ID prefix;
3. exact alias or alias prefix;
4. display-name prefix;
5. tokenized display-name or search-term match;
6. fuzzy subsequence match.

Semantic boosts break ties and reorder close matches:

- selected or explicit provider;
- containment compatibility with the current scope;
- symbol visibility distance;
- relationship source and target compatibility.

The engine uses canonical provider ID and canonical resource ID as the final tie
breaker. The same input, cursor, and catalog produce the same order.

Containment compatibility changes rank instead of filtering the list. Users can
still select a resource that provider validation will flag or explain.

## Recovery and failure handling

The parser already returns partial source structures and diagnostics. The
language analyzer will retain useful tokens and symbols when the source contains
an unfinished brace, directive, resource declaration, arrow, or relationship
kind. If AST recovery cannot classify the cursor, token context will return a
small, conservative suggestion set.

Catalog validation catches malformed metadata during development and release
checks. At runtime, the language service skips a malformed catalog entry. It
must not throw through Monaco's provider callback.

Completion performs no network, rendering, layout, icon, storage, or React state
work. It remains available while the render pipeline runs or reports errors.

## Performance

The playground will create catalog search indexes once for each catalog version.
The Monaco adapter will cache language analysis by model URI and version. A
completion request will inspect the cached document and indexed metadata.

The language-service completion calculation must finish within 20 milliseconds
at the 95th percentile on a reference document with the full registered catalog.
The Monaco provider callback must finish within 50 milliseconds at the 95th
percentile in the browser fixture. Tests will verify cache invalidation and
prevent catalog indexing on each keystroke. Performance checks will record warm
requests and exclude Monaco widget rendering.

## Accessibility and interaction

The feature will use Monaco's keyboard navigation, focus management, and screen
reader support. Completion labels and details will identify both the human name
and canonical spelling. Documentation will state which text Monaco inserts.

Users can type a query, move through results, accept a completion, and continue
editing without using a pointer. Browser tests will cover this path.

## Testing

### Language-service unit tests

Table-driven tests will cover:

- each cursor context and replacement span;
- incomplete syntax and parser recovery;
- directive ordering and duplicate suppression;
- provider selection, explicit qualification, and provider-less qualification;
- canonical insertion from ID, display name, alias, and search-term queries;
- normalization, fuzzy matching, deduplication, and stable ranking;
- containment ranking;
- named and implicit symbols, lexical visibility, and shadowing;
- relationship compatibility ranking;
- comments and quoted labels returning no automatic suggestions.

### Metadata contract tests

Each registered provider will prove that every canonical catalog resource
appears in generated completion data. Catalog validation tests will cover the
new search-term and relationship constraints. Public API tests will confirm
that `getCatalog()` exposes the complete metadata.

### Monaco and browser tests

Adapter tests will cover range conversion, completion-kind mapping, trigger
characters, cache invalidation, and disposal. Playground browser tests will use
the keyboard to:

1. type `elastic kubernetes` in an AWS resource position and accept `eks`;
2. complete canonical resources under selected, explicit, and missing providers;
3. declare named resources and complete them as relationship endpoints;
4. complete a relationship kind in partial arrow syntax;
5. confirm that comments and labels do not open unwanted suggestions.

## Documentation and versioning

Update the public API, language, playground, and provider semantic specs with
the metadata and completion behavior. Generate downstream documentation
resources through the repository scripts. Add changesets for each published
package whose public contract changes, including `@archlex/model`,
`@archlex/core`, provider packages when their metadata changes, and the new
`@archlex/language-service` package.

## Delivery sequence

### Increment 1: Metadata and validation

Add search and relationship metadata, expose it through `getCatalog()`, populate
high-value discovery terms, and strengthen catalog validation. This increment
gives all consumers a complete introspection contract.

### Increment 2: Language service

Add document analysis, symbol extraction, cursor classification, matching, and
ranking in `@archlex/language-service`. Unit and contract tests will establish
the editor-neutral behavior.

### Increment 3: Monaco integration

Replace the playground's lists and regular expressions with the language
service adapter. Add caching, lifecycle cleanup, keyboard browser tests, and
documentation updates.

Each increment must pass its package tests, typecheck, and lint checks. The
completed change must also run `pnpm validate:catalog`, `pnpm generate-docs`,
`pnpm build:docs`, `pnpm verify:sites`, and `pnpm check`.

## Acceptance criteria

- No provider or language vocabulary remains hard-coded in the playground's
  completion implementation.
- A user can find any registered resource by canonical ID or display name.
- Catalog entries with aliases or search terms support those queries and insert
  the canonical ID.
- Completion applies the approved provider qualification rules.
- Monaco completes visible node names and relationship kinds in partial source.
- Completion ranks provider, containment, scope, and relationship-compatible
  results without hiding diagnosable choices.
- Incomplete or invalid source does not disable completion or throw into Monaco.
- The language service runs without Monaco, React, DOM APIs, rendering, icons,
  or network access.
- Unit, contract, adapter, browser, catalog, documentation, and repository checks
  pass.
