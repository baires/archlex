import { describe, expect, it } from "vitest";
import { createRenderCommand } from "../commands/render.js";
import { createValidateCommand } from "../commands/validate.js";
import { defaultSvgPath, diagramId, isDiagramFile } from "./diagram-file.js";

describe("diagram files", () => {
  it("accepts .arch and .archlex", () => {
    expect(isDiagramFile("diagram.arch")).toBe(true);
    expect(isDiagramFile("diagram.archlex")).toBe(true);
    expect(isDiagramFile("diagram.txt")).toBe(false);
  });

  it("derives ids from either extension", () => {
    expect(diagramId("aws-3-tier-web.arch")).toBe("aws-3-tier-web");
    expect(diagramId("aws-3-tier-web.archlex")).toBe("aws-3-tier-web");
  });

  it("strips either extension when defaulting to svg", () => {
    expect(defaultSvgPath("/tmp/diagram.arch")).toBe("/tmp/diagram.svg");
    expect(defaultSvgPath("/tmp/diagram.archlex")).toBe("/tmp/diagram.svg");
    expect(defaultSvgPath("/tmp/diagram.architecture")).toBe(
      "/tmp/diagram.architecture",
    );
  });
});

describe("command help", () => {
  it("names .arch before .archlex", () => {
    for (const command of [createRenderCommand(), createValidateCommand()]) {
      const description = command.registeredArguments[0]?.description ?? "";
      expect(description).toContain(".arch or .archlex");
    }
  });
});
