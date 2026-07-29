export interface ThemeTokens {
  background: string;
  scopeFill: string;
  scopeStroke: string;
  scopeTextFill: string;
  nodeFill: string;
  nodeStroke: string;
  textFill: string;
  textMuted?: string;
  edgeStroke: string;
  edgeHoverStroke?: string;
  arrowFill: string;
  errorStroke: string;
  warningMarker: string;
  infoMarker: string;
}

export const lightTheme: ThemeTokens = {
  background: "#ffffff",
  scopeFill: "#f7f8fa",
  scopeStroke: "#84909f",
  scopeTextFill: "#344054",
  nodeFill: "#ffffff",
  nodeStroke: "#84909f",
  textFill: "#101828",
  textMuted: "#667085",
  edgeStroke: "#667085",
  edgeHoverStroke: "#475467",
  arrowFill: "#667085",
  errorStroke: "#dc2626",
  warningMarker: "#d97706",
  infoMarker: "#1570ef",
};

export const darkTheme: ThemeTokens = {
  background: "#111827",
  scopeFill: "#172131",
  scopeStroke: "#64748b",
  scopeTextFill: "#e2e8f0",
  nodeFill: "#1f2937",
  nodeStroke: "#64748b",
  textFill: "#f8fafc",
  textMuted: "#cbd5e1",
  edgeStroke: "#94a3b8",
  edgeHoverStroke: "#cbd5e1",
  arrowFill: "#94a3b8",
  errorStroke: "#ef4444",
  warningMarker: "#f59e0b",
  infoMarker: "#60a5fa",
};
