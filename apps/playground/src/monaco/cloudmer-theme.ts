import type * as Monaco from "monaco-editor";

/**
 * CloudMer theme for Monaco Editor (Dark)
 */
export const cloudmerDarkTheme: Monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "526067", fontStyle: "italic" },
    { token: "keyword", foreground: "63d7c6", fontStyle: "bold" },
    { token: "keyword.control", foreground: "63d7c6", fontStyle: "bold" },
    { token: "type", foreground: "72b7e5" },
    { token: "type.identifier", foreground: "72b7e5" },
    { token: "string", foreground: "e9b949" },
    { token: "string.invalid", foreground: "ff6b78" },
    { token: "string.escape", foreground: "7ee5d6" },
    { token: "variable.name", foreground: "d9dfdc", fontStyle: "bold" },
    { token: "operator", foreground: "8d9994" },
    { token: "identifier", foreground: "d9dfdc" },
  ],
  colors: {
    "editor.background": "#0f1417",
    "editor.foreground": "#d9dfdc",
    "editor.lineHighlightBackground": "#171d20",
    "editor.selectionBackground": "#2d373b",
    "editor.inactiveSelectionBackground": "#1a2125",
    "editorCursor.foreground": "#63d7c6",
    "editorLineNumber.foreground": "#526067",
    "editorLineNumber.activeForeground": "#8d9994",
    "editorIndentGuide.background": "#2d373b",
    "editorIndentGuide.activeBackground": "#526067",
    "editorWhitespace.foreground": "#2d373b",
  },
};

/**
 * CloudMer theme for Monaco Editor (Light)
 */
export const cloudmerLightTheme: Monaco.editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "909a94", fontStyle: "italic" },
    { token: "keyword", foreground: "087f70", fontStyle: "bold" },
    { token: "keyword.control", foreground: "087f70", fontStyle: "bold" },
    { token: "type", foreground: "246a9b" },
    { token: "type.identifier", foreground: "246a9b" },
    { token: "string", foreground: "9a6400" },
    { token: "string.invalid", foreground: "b4232f" },
    { token: "string.escape", foreground: "0a9985" },
    { token: "variable.name", foreground: "18201c", fontStyle: "bold" },
    { token: "operator", foreground: "59635d" },
    { token: "identifier", foreground: "18201c" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#18201c",
    "editor.lineHighlightBackground": "#f7f8f6",
    "editor.selectionBackground": "#e8ebe8",
    "editor.inactiveSelectionBackground": "#f2f3f1",
    "editorCursor.foreground": "#087f70",
    "editorLineNumber.foreground": "#909a94",
    "editorLineNumber.activeForeground": "#59635d",
    "editorIndentGuide.background": "#e8ebe8",
    "editorIndentGuide.activeBackground": "#c8ceca",
    "editorWhitespace.foreground": "#e8ebe8",
  },
};

/**
 * Register CloudMer themes with Monaco
 */
export function registerCloudMerThemes(monaco: typeof Monaco): void {
  monaco.editor.defineTheme("cloudmer-dark", cloudmerDarkTheme);
  monaco.editor.defineTheme("cloudmer-light", cloudmerLightTheme);
}
