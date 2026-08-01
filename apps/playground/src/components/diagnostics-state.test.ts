import type { Diagnostic } from "@archlex/model";
import { describe, expect, it } from "vitest";
import {
  createRenderIssue,
  summarizeStatusDiagnostics,
} from "./diagnostics-state.js";

const warning: Diagnostic = {
  severity: "warning",
  code: "AL-WARNING",
  message: "Warning",
  span: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 2, offset: 1 },
  },
  elements: [],
};

describe("diagnostics status state", () => {
  it("adds a durable render issue to status counts without changing semantic diagnostics", () => {
    const issue = createRenderIssue(new Error("layout worker stopped"));

    expect(summarizeStatusDiagnostics([warning], issue)).toEqual({
      error: 1,
      warning: 1,
      info: 0,
      total: 2,
    });
    expect(issue).toEqual({
      id: "playground-render-failure",
      severity: "error",
      title: "Internal render failure",
      detail: "layout worker stopped",
      recovery:
        "The last successful diagram is still shown. Review the source or render options and try again.",
    });
    expect(warning.severity).toBe("warning");
  });
});
