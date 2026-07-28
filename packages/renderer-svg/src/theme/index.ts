export interface ThemeTokens {
  background: string;
  scopeFill: string;
  scopeStroke: string;
  scopeTextFill: string;
  nodeFill: string;
  nodeStroke: string;
  textFill: string;
  edgeStroke: string;
  arrowFill: string;
  errorStroke: string;
  warningMarker: string;
  infoMarker: string;
}

export const lightTheme: ThemeTokens = {
  background: "#ffffff",
  scopeFill: "#f1f5f9",
  scopeStroke: "#cbd5e1",
  scopeTextFill: "#334155",
  nodeFill: "#f8fafc",
  nodeStroke: "#0284c7",
  textFill: "#0f172a",
  edgeStroke: "#64748b",
  arrowFill: "#64748b",
  errorStroke: "#ef4444",
  warningMarker: "#f59e0b",
  infoMarker: "#3b82f6",
};

export const darkTheme: ThemeTokens = {
  background: "#0f172a",
  scopeFill: "#1e293b",
  scopeStroke: "#334155",
  scopeTextFill: "#94a3b8",
  nodeFill: "#1e293b",
  nodeStroke: "#38bdf8",
  textFill: "#f8fafc",
  edgeStroke: "#94a3b8",
  arrowFill: "#94a3b8",
  errorStroke: "#ef4444",
  warningMarker: "#f59e0b",
  infoMarker: "#3b82f6",
};
