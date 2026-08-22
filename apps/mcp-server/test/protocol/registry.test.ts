import { describe, expect, test } from "vitest";

describe("shared MCP registry", () => {
  test("exposes tools in the established deterministic order", async () => {
    const registry = await import("../../src/registry.js").catch(() => ({}));
    const listTools = Reflect.get(registry, "listTools");
    expect(listTools).toBeTypeOf("function");
    expect(
      listTools({ enableMcpApps: false }).map(
        (tool: { name: string }) => tool.name,
      ),
    ).toEqual([
      "render_diagram",
      "validate_diagram",
      "get_cloud_catalog",
      "generate_playground_url",
    ]);
  });

  test("keeps MCP Apps metadata opt-in", async () => {
    const { listTools } = await import("../../src/registry.js");
    expect(listTools({ enableMcpApps: false })[0]._meta).toBeUndefined();
    expect(listTools({ enableMcpApps: true })[0]._meta).toEqual({
      ui: { resourceUri: "ui://archlex/diagram-viewer" },
    });
  });

  test("lists and reads the established static resources", async () => {
    const { listResources, readResource } = await import(
      "../../src/registry.js"
    );
    const resources = listResources();
    expect(resources.map((resource) => resource.uri)).toContain(
      "archlex://docs/dsl-syntax",
    );
    expect(resources.map((resource) => resource.uri)).toContain(
      "archlex://examples/aws-microservices",
    );
    const result = readResource("archlex://docs/dsl-syntax");
    const content = result.contents[0];
    expect(content && "text" in content ? content.text : undefined).toContain(
      "ArchLex",
    );
  });

  test("lists and resolves the established prompt", async () => {
    const { getPrompt, listPrompts } = await import("../../src/registry.js");
    expect(listPrompts().map((prompt) => prompt.name)).toEqual([
      "architect_cloud_infrastructure",
    ]);
    const result = getPrompt("architect_cloud_infrastructure", {
      provider: "aws",
      requirements: "Public API",
    });
    const content = result.messages[0]?.content;
    expect(content?.type === "text" ? content.text : undefined).toContain(
      "provider 'aws'",
    );
  });

  test("delegates callable domain behavior", async () => {
    const { callTool } = await import("../../src/registry.js");
    const result = await callTool(
      "generate_playground_url",
      { source: 'app: ecs["API"]' },
      { enableMcpApps: false },
    );
    const text = result.content.find((item) => item.type === "text");
    expect(text?.type === "text" ? text.text : undefined).toContain(
      "https://playground.archlex.dev/",
    );
  });
});
