export type { CatalogIndex } from "./catalog-index.js";
export { createCatalogIndex } from "./catalog-index.js";
export type {
  CompletionEngine,
  CompletionKind,
  CompletionRequest,
  LanguageCompletion,
} from "./completions.js";
export { completeArchLex, createCompletionEngine } from "./completions.js";
export { getCursorContext } from "./cursor-context.js";
export { analyzeLanguageDocument } from "./document.js";
export type { MatchTier, TextMatch } from "./matching.js";
export { MATCH_SCORES, scoreBestMatch, scoreTextMatch } from "./matching.js";
export type {
  CursorContext,
  CursorPosition,
  DocumentSymbol,
  LanguageDocument,
  LanguageToken,
  OffsetRange,
} from "./types.js";
