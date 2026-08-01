import type * as Monaco from "monaco-editor";

/**
 * CloudMer language configuration for Monaco Editor
 */
export const cloudmerLanguageConfig: Monaco.languages.LanguageConfiguration = {
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
 * Monarch tokenizer for CloudMer syntax highlighting
 */
export const cloudmerTokensProvider: Monaco.languages.IMonarchLanguage = {
  keywords: [
    "provider",
    "direction",
    "validation",
    "account",
    "region",
    "vpc",
    "subnet",
    "aws",
    "gcp",
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
      [/\b(aws|gcp)\b/, "type.identifier"],

      // Container keywords
      [/\b(account|region|vpc|subnet)\b/, "keyword.control"],

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
 * Register CloudMer language with Monaco
 */
export function registerCloudMerLanguage(monaco: typeof Monaco): void {
  // Register the language
  monaco.languages.register({ id: "cloudmer" });

  // Set language configuration
  monaco.languages.setLanguageConfiguration("cloudmer", cloudmerLanguageConfig);

  // Set tokens provider
  monaco.languages.setMonarchTokensProvider("cloudmer", cloudmerTokensProvider);
}
