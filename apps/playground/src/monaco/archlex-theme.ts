import type * as Monaco from "monaco-editor";

/**
 * ArchLex theme for Monaco Editor (Dark)
 * Matches the ArchLex design system dark theme
 */
export const archlexDarkTheme: Monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    // Comments - muted and italic
    { token: "comment", foreground: "526067", fontStyle: "italic" },

    // Keywords - accent teal, bold for emphasis
    { token: "keyword", foreground: "63d7c6", fontStyle: "bold" },
    { token: "keyword.control", foreground: "63d7c6", fontStyle: "bold" },

    // Types and identifiers - info blue
    { token: "type", foreground: "72b7e5" },
    { token: "type.identifier", foreground: "72b7e5" },

    // Strings - warning amber for visibility
    { token: "string", foreground: "e9b949" },
    { token: "string.invalid", foreground: "ff6b78" },
    { token: "string.escape", foreground: "7ee5d6" },

    // Variables and resource names - text-1 bold
    { token: "variable.name", foreground: "d9dfdc", fontStyle: "bold" },

    // Operators - text-2 for subtle hierarchy
    { token: "operator", foreground: "8d9994" },

    // Default identifiers - text-1
    { token: "identifier", foreground: "d9dfdc" },
  ],
  colors: {
    // Editor background - surface-1
    "editor.background": "#0f1417",
    "editor.foreground": "#d9dfdc",

    // Line highlighting - surface-2
    "editor.lineHighlightBackground": "#171d20",
    "editor.lineHighlightBorder": "#00000000",

    // Selection - accent with transparency
    "editor.selectionBackground": "#63d7c633",
    "editor.inactiveSelectionBackground": "#63d7c619",
    "editor.selectionHighlightBackground": "#63d7c619",

    // Cursor - accent teal
    "editorCursor.foreground": "#63d7c6",

    // Line numbers - text-2 and line-strong
    "editorLineNumber.foreground": "#526067",
    "editorLineNumber.activeForeground": "#8d9994",

    // Indent guides - line and line-strong
    "editorIndentGuide.background": "#2d373b",
    "editorIndentGuide.activeBackground": "#526067",

    // Whitespace markers
    "editorWhitespace.foreground": "#2d373b",

    // Gutter (line numbers area) - matches editor background
    "editorGutter.background": "#0f1417",

    // Active line number gutter
    "editorGutter.modifiedBackground": "#e9b94966",
    "editorGutter.addedBackground": "#63d7c666",
    "editorGutter.deletedBackground": "#ff6b7866",

    // Widgets (autocomplete, hover)
    "editorWidget.background": "#171d20",
    "editorWidget.border": "#526067",
    "editorSuggestWidget.background": "#171d20",
    "editorSuggestWidget.border": "#526067",
    "editorSuggestWidget.selectedBackground": "#2d373b",
    "editorSuggestWidget.highlightForeground": "#63d7c6",
    "editorHoverWidget.background": "#171d20",
    "editorHoverWidget.border": "#526067",

    // Scrollbar - subtle
    "scrollbar.shadow": "#00000000",
    "editorOverviewRuler.border": "#00000000",
    "scrollbarSlider.background": "#52606733",
    "scrollbarSlider.hoverBackground": "#52606766",
    "scrollbarSlider.activeBackground": "#52606799",

    // Find/search match highlighting
    "editor.findMatchBackground": "#e9b94966",
    "editor.findMatchHighlightBackground": "#e9b94933",
    "editor.findRangeHighlightBackground": "#2d373b",

    // Bracket matching
    "editorBracketMatch.background": "#63d7c619",
    "editorBracketMatch.border": "#63d7c6",

    // Error/warning squiggles
    "editorError.foreground": "#ff6b78",
    "editorWarning.foreground": "#e9b949",
    "editorInfo.foreground": "#72b7e5",
  },
};

/**
 * ArchLex theme for Monaco Editor (Light)
 * Matches the ArchLex design system light theme
 */
export const archlexLightTheme: Monaco.editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    // Comments - muted and italic
    { token: "comment", foreground: "909a94", fontStyle: "italic" },

    // Keywords - accent teal, bold for emphasis
    { token: "keyword", foreground: "087f70", fontStyle: "bold" },
    { token: "keyword.control", foreground: "087f70", fontStyle: "bold" },

    // Types and identifiers - info blue
    { token: "type", foreground: "246a9b" },
    { token: "type.identifier", foreground: "246a9b" },

    // Strings - warning amber
    { token: "string", foreground: "9a6400" },
    { token: "string.invalid", foreground: "b4232f" },
    { token: "string.escape", foreground: "0a9985" },

    // Variables and resource names - text-1 bold
    { token: "variable.name", foreground: "18201c", fontStyle: "bold" },

    // Operators - text-2
    { token: "operator", foreground: "59635d" },

    // Default identifiers - text-1
    { token: "identifier", foreground: "18201c" },
  ],
  colors: {
    // Editor background - surface-1 (white)
    "editor.background": "#ffffff",
    "editor.foreground": "#18201c",

    // Line highlighting - diagram-canvas for subtle contrast
    "editor.lineHighlightBackground": "#f7f8f6",
    "editor.lineHighlightBorder": "#00000000",

    // Selection - accent with transparency
    "editor.selectionBackground": "#087f7033",
    "editor.inactiveSelectionBackground": "#087f7019",
    "editor.selectionHighlightBackground": "#087f7019",

    // Cursor - accent teal
    "editorCursor.foreground": "#087f70",

    // Line numbers - text-2 and line-strong
    "editorLineNumber.foreground": "#909a94",
    "editorLineNumber.activeForeground": "#59635d",

    // Indent guides - line and line-strong
    "editorIndentGuide.background": "#e8ebe8",
    "editorIndentGuide.activeBackground": "#c8ceca",

    // Whitespace markers
    "editorWhitespace.foreground": "#e8ebe8",

    // Gutter (line numbers area)
    "editorGutter.background": "#ffffff",

    // Active line number gutter
    "editorGutter.modifiedBackground": "#9a640066",
    "editorGutter.addedBackground": "#087f7066",
    "editorGutter.deletedBackground": "#b4232f66",

    // Widgets (autocomplete, hover)
    "editorWidget.background": "#ffffff",
    "editorWidget.border": "#c8ceca",
    "editorSuggestWidget.background": "#ffffff",
    "editorSuggestWidget.border": "#c8ceca",
    "editorSuggestWidget.selectedBackground": "#e8ebe8",
    "editorSuggestWidget.highlightForeground": "#087f70",
    "editorHoverWidget.background": "#ffffff",
    "editorHoverWidget.border": "#c8ceca",

    // Scrollbar - subtle
    "scrollbar.shadow": "#00000000",
    "editorOverviewRuler.border": "#00000000",
    "scrollbarSlider.background": "#c8ceca33",
    "scrollbarSlider.hoverBackground": "#c8ceca66",
    "scrollbarSlider.activeBackground": "#c8ceca99",

    // Find/search match highlighting
    "editor.findMatchBackground": "#9a640066",
    "editor.findMatchHighlightBackground": "#9a640033",
    "editor.findRangeHighlightBackground": "#e8ebe8",

    // Bracket matching
    "editorBracketMatch.background": "#087f7019",
    "editorBracketMatch.border": "#087f70",

    // Error/warning squiggles
    "editorError.foreground": "#b4232f",
    "editorWarning.foreground": "#9a6400",
    "editorInfo.foreground": "#246a9b",
  },
};

/**
 * Register ArchLex themes with Monaco
 */
export function registerArchLexThemes(monaco: typeof Monaco): void {
  monaco.editor.defineTheme("archlex-dark", archlexDarkTheme);
  monaco.editor.defineTheme("archlex-light", archlexLightTheme);
}
