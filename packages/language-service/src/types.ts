import type { DocumentAst, ScopeKind } from "@archlex/model";

export interface LanguageToken {
  readonly kind: string;
  readonly image: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface OffsetRange {
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface DocumentSymbol {
  readonly name: string;
  readonly resourceKind: string;
  readonly providerId?: string;
  readonly scopePath: readonly string[];
  readonly declarationOffset: number;
}

export interface LanguageDocument {
  readonly source: string;
  readonly ast: DocumentAst;
  readonly tokens: readonly LanguageToken[];
  readonly symbols: readonly DocumentSymbol[];
  readonly providerId?: string;
  readonly declaredDirectives: ReadonlySet<string>;
}
