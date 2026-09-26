import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImportMenu } from "./ImportMenu.js";
import { URLImportModal } from "./URLImportModal.js";

describe("arch import", () => {
  it("accepts .arch and .archlex files", () => {
    const html = renderToStaticMarkup(
      <ImportMenu
        onImportFile={() => undefined}
        onOpenUrlImport={() => undefined}
      />,
    );

    expect(html).toContain('accept=".arch,.archlex,.txt,text/plain"');
  });

  it("mentions .arch in the URL import placeholder", () => {
    const html = renderToStaticMarkup(
      <URLImportModal onImport={() => undefined} onClose={() => undefined} />,
    );

    expect(html).toContain(
      'placeholder="https://github.com/user/repo/blob/main/diagram.arch"',
    );
  });
});
