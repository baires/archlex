import {
  type CompletionEngine,
  type LanguageCompletion,
  analyzeLanguageDocument,
  createCompletionEngine,
} from "@archlex/language-service";
import type { CatalogMetadata } from "@archlex/model";
import type * as Monaco from "monaco-editor";

interface CachedDocument {
  version: number;
  document: ReturnType<typeof analyzeLanguageDocument>;
}

export interface CompletionMetrics {
  record(durationMs: number): void;
}

export interface CompletionProviderOptions {
  metrics?: CompletionMetrics;
  analyze?: typeof analyzeLanguageDocument;
}

/**
 * Convert a language-service completion to a Monaco completion item.
 */
export function toMonacoCompletion(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  completion: LanguageCompletion,
): Monaco.languages.CompletionItem {
  const { replacement, insertText, kind } = completion;

  // Convert offset range to Monaco position range
  const startPosition = model.getPositionAt(replacement.startOffset);
  const endPosition = model.getPositionAt(replacement.endOffset);

  const range = {
    startLineNumber: startPosition.lineNumber,
    startColumn: startPosition.column,
    endLineNumber: endPosition.lineNumber,
    endColumn: endPosition.column,
  };

  // Map editor-neutral kinds to Monaco kinds
  let monacoKind: Monaco.languages.CompletionItemKind;
  switch (kind) {
    case "directive":
      monacoKind = monaco.languages.CompletionItemKind.Keyword;
      break;
    case "enum-value":
      monacoKind = monaco.languages.CompletionItemKind.EnumMember;
      break;
    case "scope":
      monacoKind = monaco.languages.CompletionItemKind.Class;
      break;
    case "resource":
      monacoKind = monaco.languages.CompletionItemKind.Class;
      break;
    case "symbol":
      monacoKind = monaco.languages.CompletionItemKind.Variable;
      break;
    case "relationship":
      monacoKind = monaco.languages.CompletionItemKind.Value;
      break;
    case "snippet":
      monacoKind = monaco.languages.CompletionItemKind.Snippet;
      break;
  }

  // Pad sort score to ensure stable sorting
  const sortText = `${String(completion.sortScore).padStart(8, "0")}:${completion.id}`;

  const item: Monaco.languages.CompletionItem = {
    label: completion.label,
    kind: monacoKind,
    insertText,
    filterText: completion.filterText,
    detail: completion.detail,
    documentation: completion.documentation
      ? { value: completion.documentation }
      : undefined,
    range,
    sortText,
  };

  // Mark snippets with the appropriate rule
  if (kind === "snippet") {
    item.insertTextRules =
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  }

  return item;
}

/**
 * Create a Monaco completion provider backed by the language service.
 */
export function createMonacoCompletionProvider(
  monaco: typeof Monaco,
  engine: CompletionEngine,
  options?: CompletionProviderOptions,
): Monaco.languages.CompletionItemProvider {
  const documentCache = new WeakMap<Monaco.editor.ITextModel, CachedDocument>();
  const analyze = options?.analyze ?? analyzeLanguageDocument;

  return {
    triggerCharacters: [":", ".", "[", "-"],

    provideCompletionItems(model, position, context) {
      const startedAt = performance.now();
      try {
        // Get or create cached document
        const version = model.getVersionId();
        let cached = documentCache.get(model);

        if (!cached || cached.version !== version) {
          const source = model.getValue();
          const document = analyze(source);
          cached = { version, document };
          documentCache.set(model, cached);
        }

        // Convert Monaco position to offset
        const offset = model.getOffsetAt(position);

        // Map Monaco trigger to editor-neutral trigger
        const trigger =
          context.triggerKind === monaco.languages.CompletionTriggerKind.Invoke
            ? "manual"
            : "automatic";

        // Get completions from language service
        const completions = engine.complete(cached.document, offset, {
          trigger,
        });

        // Convert to Monaco suggestions
        const suggestions = completions.map((completion) =>
          toMonacoCompletion(monaco, model, completion),
        );

        // Record metrics
        const duration = performance.now() - startedAt;
        options?.metrics?.record(duration);

        // Add performance entry for browser measurement
        try {
          performance.mark("archlex.completion.end");
          performance.measure("archlex.completion", {
            start: startedAt,
            duration,
          });
        } catch (e) {
          // Silently fail if performance API doesn't support this
        }

        return { suggestions };
      } catch (error) {
        // Contain failures - return empty suggestions
        console.error("Completion provider error:", error);
        return { suggestions: [] };
      }
    },
  };
}

/**
 * Register the language-service-backed completion provider for ArchLex.
 */
export function registerCompletionProvider(
  monaco: typeof Monaco,
  catalog: CatalogMetadata,
  options?: CompletionProviderOptions,
): Monaco.IDisposable {
  const engine = createCompletionEngine(catalog);
  const provider = createMonacoCompletionProvider(monaco, engine, options);
  return monaco.languages.registerCompletionItemProvider("archlex", provider);
}
