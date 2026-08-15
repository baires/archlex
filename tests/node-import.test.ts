import { describe, expect, it } from "vitest";

describe("Node 22 Built Package Import", () => {
  it("imports built @archlex/model ESM package", async () => {
    const model = await import("../packages/model/dist/index.js");
    expect(model).toBeDefined();
    expect(model.ArchLexAbortError).toBeDefined();
  });

  it("imports built @archlex/parser ESM package", async () => {
    const parser = await import("../packages/parser/dist/index.js");
    expect(parser).toBeDefined();
    expect(typeof parser.parse).toBe("function");
  });

  it("imports built @archlex/aws ESM package", async () => {
    const aws = await import("../packages/aws/dist/index.js");
    expect(aws).toBeDefined();
    expect(typeof aws.awsProvider).toBe("function");
  });

  it("imports built @archlex/k8s ESM package", async () => {
    const k8s = await import("../packages/k8s/dist/index.js");
    expect(k8s).toBeDefined();
    expect(typeof k8s.k8sProvider).toBe("function");
    expect(k8s.k8sProvider().resolveService("deployment")?.id).toBe(
      "deployment",
    );
  });

  it("imports built @archlex/layout-elk ESM package", async () => {
    const layout = await import("../packages/layout-elk/dist/index.js");
    expect(layout).toBeDefined();
    expect(typeof layout.createInlineLayoutEngine).toBe("function");
  });

  it("imports built @archlex/renderer-svg ESM package", async () => {
    const renderer = await import("../packages/renderer-svg/dist/index.js");
    expect(renderer).toBeDefined();
    expect(typeof renderer.createSvgRenderer).toBe("function");
  });

  it("imports built @archlex/core ESM package and executes end-to-end rendering in Node", async () => {
    const core = await import("../packages/core/dist/index.js");
    expect(core).toBeDefined();
    expect(typeof core.createArchLex).toBe("function");

    const archlex = core.createArchLex({
      providers: [core.awsProvider()],
    });

    const res = await archlex.render("rds-proxy > rds");
    expect(res.svg).toContain("<svg");
    expect(res.svg).toContain("rds-proxy");
    expect(res.ast.statements).toHaveLength(1);
  });
});
