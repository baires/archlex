import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusBar } from "./StatusBar.js";

const sharedProps = {
  provider: "aws" as const,
  cursor: { line: 1, column: 1 },
  summary: { error: 0, warning: 0, info: 0, total: 0 },
  activeFilter: "all" as const,
  isRendering: false,
  renderDurationMs: 37,
  operationMessage: null,
  onOpenDiagnostics: () => undefined,
};

describe("StatusBar", () => {
  it("shows readiness while unresolved icons hydrate", () => {
    const html = renderToStaticMarkup(
      <StatusBar {...sharedProps} isLoadingIcons={true} />,
    );

    expect(html).toContain("Ready · 37 ms");
    expect(html).toContain("Loading icons…");
  });

  it("removes only the hydration status after icons load", () => {
    const html = renderToStaticMarkup(
      <StatusBar {...sharedProps} isLoadingIcons={false} />,
    );

    expect(html).toContain("Ready · 37 ms");
    expect(html).not.toContain("Loading icons…");
  });
});
