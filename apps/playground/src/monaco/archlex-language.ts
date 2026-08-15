import type * as Monaco from "monaco-editor";

/**
 * ArchLex language configuration for Monaco Editor
 */
export const archlexLanguageConfig: Monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: "#",
    blockComment: ["/*", "*/"],
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: '"', close: '"' },
  ],
};

/**
 * Monarch tokenizer for ArchLex syntax highlighting
 */
export const archlexTokensProvider: Monaco.languages.IMonarchLanguage = {
  keywords: [
    "provider",
    "direction",
    "validation",
    "account",
    "region",
    "vpc",
    "subnet",
    "cluster",
    "namespace",
    "aws",
    "gcp",
    "k8s",
  ],

  directions: ["LR", "RL", "TB", "BT"],

  validationModes: ["normal", "strict", "off"],

  operators: [">", "-[", "]->", "|"],

  tokenizer: {
    root: [
      // Comments
      [/#.*$/, "comment"],
      [/\/\*/, "comment", "@comment"],

      // Directives
      [
        /\b(provider|direction|validation)\b/,
        {
          cases: {
            "@keywords": "keyword",
          },
        },
      ],

      // Direction values
      [
        /\b(LR|RL|TB|BT)\b/,
        {
          cases: {
            "@directions": "type",
          },
        },
      ],

      // Validation modes
      [
        /\b(normal|strict|off)\b/,
        {
          cases: {
            "@validationModes": "type",
          },
        },
      ],

      // Providers
      [/\b(aws|gcp|k8s)\b/, "type.identifier"],

      // Container keywords
      [/\b(account|region|vpc|subnet|cluster|namespace)\b/, "keyword.control"],

      // Relationships
      [/-\[/, "operator", "@relationshipLabel"],
      [/\]->/, "operator"],
      [/>/, "operator"],
      [/\|/, "operator"],

      // Resource identifiers (word followed by colon)
      [/[a-zA-Z_][\w-]*\s*:/, "variable.name"],

      // Service kinds (after colon)
      [/:\s*[a-zA-Z_][\w-]*/, "type"],

      // Strings
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/"/, "string", "@string"],

      // Identifiers
      [/[a-zA-Z_][\w-]*/, "identifier"],

      // Whitespace
      [/[ \t\r\n]+/, "white"],

      // Delimiters
      [/[{}()]/, "@brackets"],
    ],

    comment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],

    string: [
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
    ],

    relationshipLabel: [
      [/[^\]]+/, "string"],
      [/\]->/, "operator", "@pop"],
    ],
  },
};

/**
 * Register ArchLex language with Monaco
 */
export function registerArchLexLanguage(monaco: typeof Monaco): void {
  // Register the language
  monaco.languages.register({ id: "archlex" });

  // Set language configuration
  monaco.languages.setLanguageConfiguration("archlex", archlexLanguageConfig);

  // Set tokens provider
  monaco.languages.setMonarchTokensProvider("archlex", archlexTokensProvider);
}
