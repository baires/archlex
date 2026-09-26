import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShareModal } from "./ShareModal.js";

describe("ShareModal", () => {
  it("keeps sharing actions compact while preserving the one-time revoke token", () => {
    const html = renderToStaticMarkup(
      <ShareModal
        state={{
          phase: "ready",
          id: "share-id",
          playgroundUrl: "https://share.archlex.dev/s/share-id",
          svgUrl: "https://share.archlex.dev/s/share-id.svg",
          revokeToken: "one-time-token",
        }}
        onClose={() => undefined}
        onRetry={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(html).toContain("Copy link");
    expect(html).toContain("Copy Markdown");
    expect(html).toContain("one-time-token");
    expect(html).toContain("shown only once");
    expect(html).toContain("<details");
  });
});
