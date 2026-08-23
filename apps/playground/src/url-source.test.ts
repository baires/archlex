import { describe, expect, it } from "vitest";
import { resolveInitialSource, sourceFromSearch } from "./url-source.js";

const MCP_CODE_QUERY =
  "code=direction%20LR%0Aprovider%20aws%0A%0Acdn%3A%20cloudfront%5B%22Global%20CDN%22%5D%0Aapi%3A%20api-gateway%5B%22Public%20API%22%5D%0Ahandler%3A%20lambda%5B%22Order%20Handler%22%5D%0Aorders%3A%20dynamodb%5B%22Orders%20Table%22%5D%0Aevents%3A%20eventbridge%5B%22Order%20Events%22%5D%0A%0Acdn%20-%5Broutes%5D-%3E%20api%0Aapi%20-%5Binvokes%5D-%3E%20handler%0Ahandler%20-%5Bwrites%5D-%3E%20orders%0Ahandler%20-%5Bpublishes%5D-%3E%20events";

const MCP_SOURCE = `direction LR
provider aws

cdn: cloudfront["Global CDN"]
api: api-gateway["Public API"]
handler: lambda["Order Handler"]
orders: dynamodb["Orders Table"]
events: eventbridge["Order Events"]

cdn -[routes]-> api
api -[invokes]-> handler
handler -[writes]-> orders
handler -[publishes]-> events`;

describe("sourceFromSearch", () => {
  it("decodes MCP playground ?code= deep links", () => {
    expect(sourceFromSearch(`?${MCP_CODE_QUERY}`)).toBe(MCP_SOURCE);
  });

  it("returns undefined when code is missing or empty", () => {
    expect(sourceFromSearch("")).toBeUndefined();
    expect(sourceFromSearch("?theme=dark")).toBeUndefined();
    expect(sourceFromSearch("?code=")).toBeUndefined();
  });
});

describe("resolveInitialSource", () => {
  it("prefers the URL code over persisted editor state", () => {
    expect(
      resolveInitialSource(
        `?${MCP_CODE_QUERY}`,
        "provider aws\necs",
        "fallback",
      ),
    ).toBe(MCP_SOURCE);
  });

  it("uses persisted source when the URL has no code", () => {
    expect(resolveInitialSource("", "provider aws\necs", "fallback")).toBe(
      "provider aws\necs",
    );
  });

  it("uses the fallback when neither URL nor persistence has source", () => {
    expect(resolveInitialSource("", "   ", "fallback")).toBe("fallback");
    expect(resolveInitialSource("", null, "fallback")).toBe("fallback");
  });
});
