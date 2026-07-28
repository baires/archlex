import { awsProvider } from "@cloudmer/aws";
import { createCloudMer } from "@cloudmer/core";
import { describe, expect, it } from "vitest";

describe("Phase 3: Validation Policy Engine (normal, strict, off)", () => {
  const cloudmer = createCloudMer({
    providers: [awsProvider()],
  });

  const sourceWithWarning = `
    subnet orphan {
      api: ecs
    }
  `;

  it("normal mode preserves warning severities", async () => {
    const res = await cloudmer.render(sourceWithWarning, {
      validation: "normal",
    });
    const diag = res.diagnostics.find(
      (d) => d.code === "AWS-NETWORKING-SUBNET-CONTAINMENT-001",
    );
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
  });

  it("strict mode promotes warning severities to errors", async () => {
    const res = await cloudmer.render(sourceWithWarning, {
      validation: "strict",
    });
    const diag = res.diagnostics.find(
      (d) => d.code === "AWS-NETWORKING-SUBNET-CONTAINMENT-001",
    );
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("error");
  });

  it("off mode skips provider validation pass while preserving structural parse results", async () => {
    const res = await cloudmer.render(sourceWithWarning, { validation: "off" });
    const diag = res.diagnostics.find(
      (d) => d.code === "AWS-NETWORKING-SUBNET-CONTAINMENT-001",
    );
    expect(diag).toBeUndefined();
    expect(res.svg).toContain("<svg");
    expect(res.ast.statements).toBeDefined();
  });
});
