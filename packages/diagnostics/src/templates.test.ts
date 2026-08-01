import { describe, expect, test } from "vitest";
import { interpolate } from "./templates.js";

describe("interpolate", () => {
  test("replaces template variables with context values", () => {
    const result = interpolate(
      "Resource '${id}' conflicts with declaration at ${line}:${column}",
      { id: "my-lambda", line: 10, column: 5 },
    );
    expect(result).toBe(
      "Resource 'my-lambda' conflicts with declaration at 10:5",
    );
  });

  test("handles missing context keys by leaving placeholder", () => {
    const result = interpolate("Error at ${line}:${column}", { line: 5 });
    expect(result).toBe("Error at 5:${column}");
  });

  test("handles extra context keys without error", () => {
    const result = interpolate("Error at ${line}", {
      line: 5,
      extra: "ignored",
    });
    expect(result).toBe("Error at 5");
  });

  test("returns string unchanged if no placeholders", () => {
    const result = interpolate("Simple message", { key: "value" });
    expect(result).toBe("Simple message");
  });
});
