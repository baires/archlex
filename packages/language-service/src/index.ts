export { analyzeLanguageDocument } from "./document.js";
export { getCursorContext } from "./cursor-context.js";
export { createCatalogIndex } from "./catalog-index.js";
export type { CatalogIndex } from "./catalog-index.js";
export { createCompletionEngine, completeArchLex } from "./completions.js";
export type {
  CompletionEngine,
  CompletionKind,
  CompletionRequest,
  LanguageCompletion,
} from "./completions.js";
export { scoreTextMatch, scoreBestMatch, MATCH_SCORES } from "./matching.js";
export type { TextMatch, MatchTier } from "./matching.js";
export type {
  CursorContext,
  CursorPosition,
  DocumentSymbol,
  LanguageDocument,
  LanguageToken,
  OffsetRange,
} from "./types.js";
