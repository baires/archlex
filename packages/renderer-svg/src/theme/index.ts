export interface ThemeTokens {
  background: string;
  nodeFill: string;
  nodeStroke: string;
  textFill: string;
  edgeStroke: string;
  arrowFill: string;
}

export const lightTheme: ThemeTokens = {
  background: "#ffffff",
  nodeFill: "#f8fafc",
  nodeStroke: "#0284c7",
  textFill: "#0f172a",
  edgeStroke: "#64748b",
  arrowFill: "#64748b",
};

export const darkTheme: ThemeTokens = {
  background: "#0f172a",
  nodeFill: "#1e293b",
  nodeStroke: "#38bdf8",
  textFill: "#f8fafc",
  edgeStroke: "#94a3b8",
  arrowFill: "#94a3b8",
};
