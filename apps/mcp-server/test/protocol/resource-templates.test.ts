import {
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  ResourceTemplateSchema,
} from "@modelcontextprotocol/core";
import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
  UriTemplate,
} from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";
import worker from "../../src/index.js";
import { MODERN_PROTOCOL_VERSION } from "../../src/protocol/constants.js";
import { paginate } from "../../src/protocol/pagination.js";
import { listResourceTemplates } from "../../src/resource-templates.js";

function modernRequest(
  method: string,
  id: string,
  params: Record<string, unknown> = {},
): Request {
  return new Request("https://mcp.archlex.dev/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": MODERN_PROTOCOL_VERSION,
      "Mcp-Method": method,
      ...(typeof params.uri === "string" ? { "Mcp-Name": params.uri } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: {
        ...params,
        _meta: {
          [PROTOCOL_VERSION_META_KEY]: MODERN_PROTOCOL_VERSION,
          [CLIENT_CAPABILITIES_META_KEY]: {},
        },
      },
    }),
  });
}

describe("resource templates", () => {
  test("lists only real schema-valid RFC 6570 families with cache metadata", async () => {
    const response = await worker.fetch(
      modernRequest("resources/templates/list", "templates-list"),
    );
    expect(response.status).toBe(200);
    const message = (await response.json()) as {
      result: Record<string, unknown> & { resourceTemplates: unknown[] };
    };

    expect(
      ListResourceTemplatesResultSchema.safeParse(message.result).success,
    ).toBe(true);
    expect(
      message.result.resourceTemplates.every(
        (template) => ResourceTemplateSchema.safeParse(template).success,
      ),
    ).toBe(true);
    expect(message.result.resourceTemplates).toEqual([
      {
        name: "ArchLex documentation",
        uriTemplate: "archlex://docs/{+path}",
        description:
          "Published ArchLex documentation by repository-relative path.",
        mimeType: "text/markdown",
      },
      {
        name: "ArchLex examples",
        uriTemplate: "archlex://examples/{name}",
        description: "Runnable ArchLex examples by name.",
        mimeType: "text/plain",
      },
    ]);
    expect(message.result).toMatchObject({
      resultType: "complete",
      ttlMs: 3_600_000,
      cacheScope: "public",
      _meta: { "io.modelcontextprotocol/serverInfo": expect.any(Object) },
    });
    expect(
      message.result.resourceTemplates.map((template) => {
        const parsed = new UriTemplate(
          (template as { uriTemplate: string }).uriTemplate,
        );
        return parsed.expand({
          path: "guides/mcp-server",
          name: "aws-microservices",
        });
      }),
    ).toEqual([
      "archlex://docs/guides/mcp-server",
      "archlex://examples/aws-microservices",
    ]);

    const first = paginate(listResourceTemplates(), undefined, 1);
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toEqual(expect.any(String));
    const final = paginate(listResourceTemplates(), first.nextCursor, 1);
    expect(final.items).toHaveLength(1);
    expect(final.nextCursor).toBeUndefined();
  });

  test("reads an expanded template URI through the literal resource allowlist", async () => {
    const response = await worker.fetch(
      modernRequest("resources/read", "template-read", {
        uri: "archlex://docs/guides/mcp-server",
      }),
    );
    const message = (await response.json()) as {
      result: unknown;
      error?: unknown;
    };
    expect(response.status, JSON.stringify(message.error)).toBe(200);
    expect(ReadResourceResultSchema.safeParse(message.result).success).toBe(
      true,
    );

    const denied = await worker.fetch(
      modernRequest("resources/read", "template-denied", {
        uri: "archlex://docs/private/not-published",
      }),
    );
    expect(denied.status).toBe(400);
    await expect(denied.json()).resolves.toMatchObject({
      error: { code: -32602, message: "Resource not found" },
    });
  });

  test("rejects an invalid templates-list cursor at the HTTP boundary", async () => {
    const response = await worker.fetch(
      modernRequest("resources/templates/list", "templates-invalid-cursor", {
        cursor: "not-an-opaque-cursor",
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32602 },
    });
  });
});
