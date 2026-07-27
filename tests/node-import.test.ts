import { describe, expect, it } from "vitest";

describe("Node 22 Built Package Import", () => {
  it("imports built @cloudmer/model ESM package", async () => {
    const model = await import("../packages/model/dist/index.js");
    expect(model).toBeDefined();
    expect(model.CloudMerAbortError).toBeDefined();
  });

  it("imports built @cloudmer/parser ESM package", async () => {
    const parser = await import("../packages/parser/dist/index.js");
    expect(parser).toBeDefined();
    expect(typeof parser.parse).toBe("function");
  });

  it("imports built @cloudmer/aws ESM package", async () => {
    const aws = await import("../packages/aws/dist/index.js");
    expect(aws).toBeDefined();
    expect(typeof aws.awsProvider).toBe("function");
  });

  it("imports built @cloudmer/layout-elk ESM package", async () => {
    const layout = await import("../packages/layout-elk/dist/index.js");
    expect(layout).toBeDefined();
    expect(typeof layout.createInlineLayoutEngine).toBe("function");
  });

  it("imports built @cloudmer/renderer-svg ESM package", async () => {
    const renderer = await import("../packages/renderer-svg/dist/index.js");
    expect(renderer).toBeDefined();
    expect(typeof renderer.createSvgRenderer).toBe("function");
  });

  it("imports built @cloudmer/core ESM package and executes end-to-end rendering in Node", async () => {
    const core = await import("../packages/core/dist/index.js");
    expect(core).toBeDefined();
    expect(typeof core.createCloudMer).toBe("function");

    const cloudmer = core.createCloudMer({
      providers: [core.awsProvider()],
    });

    const res = await cloudmer.render("rds-proxy > rds");
    expect(res.svg).toContain("<svg");
    expect(res.svg).toContain("rds-proxy");
    expect(res.ast.statements).toHaveLength(1);
  });
});
