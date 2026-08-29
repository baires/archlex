import { CompleteResultSchema } from "@modelcontextprotocol/core";
import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import worker from "../../src/index.js";
import { MODERN_PROTOCOL_VERSION } from "../../src/protocol/constants.js";

function completionRequest(
  ref: Record<string, unknown>,
  argument: { name: string; value: string },
): Request {
  const method = "completion/complete";
  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
      "Mcp-Method": method,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "completion-1",
      method,
      params: {
        ref,
        argument,
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    }),
  });
}

async function completionValues(request: Request): Promise<string[]> {
  const response = await worker.fetch(request);
  expect(response.status).toBe(200);
  const message = (await response.json()) as {
    result: { completion: { values: string[] } };
  };
  expect(CompleteResultSchema.safeParse(message.result).success).toBe(true);
  return message.result.completion.values;
}

describe("completion/complete", () => {
  test("completes a real prompt argument from its declared domain", async () => {
    await expect(
      completionValues(
        completionRequest(
          { type: "ref/prompt", name: "architect_cloud_infrastructure" },
          { name: "provider", value: "g" },
        ),
      ),
    ).resolves.toEqual(["gcp"]);
  });

  test("completes resource-template variables from published resources", async () => {
    const values = await completionValues(
      completionRequest(
        { type: "ref/resource", uri: "archlex://docs/{+path}" },
        { name: "path", value: "guides/" },
      ),
    );
    expect(values).toEqual([
      "guides/agents",
      "guides/dynamic-cdn-icons",
      "guides/mcp-server",
      "guides/relationship-types",
    ]);
  });

  test("rejects completion references outside prompts and resource templates", async () => {
    const response = await worker.fetch(
      completionRequest(
        { type: "ref/tool", name: "render_diagram" },
        { name: "format", value: "s" },
      ),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32602 },
    });
  });

  test("advertises completions only after the supported handlers are active", async () => {
    const response = await worker.fetch(
      new Request("https://mcp.archlex.dev/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
          "Mcp-Method": "server/discover",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "discover-completions",
          method: "server/discover",
          params: {
            _meta: {
              [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
              [CLIENT_CAPABILITIES_META_KEY]: {},
            },
          },
        }),
      }),
    );
    const message = (await response.json()) as {
      result: { capabilities: Record<string, unknown> };
    };
    expect(message.result.capabilities).toMatchObject({ completions: {} });
  });
});
