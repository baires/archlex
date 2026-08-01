import { awsProvider } from "@archlex/aws";
import { createArchLex } from "@archlex/core";
import { gcpProvider } from "@archlex/gcp";
import { expect, test } from "vitest";
import { iconLoader } from "../apps/playground/src/icon-loader.js";

test("AWS aurora icon loads successfully", async () => {
  const archlex = createArchLex({ providers: [awsProvider()] });
  const prepared = archlex.prepare("provider aws\naurora");

  expect(prepared.iconRequests).toHaveLength(1);
  expect(prepared.iconRequests[0]).toMatchObject({
    provider: "aws",
    key: "aurora",
  });

  const { icons, diagnostics } = await iconLoader.loadIcons(
    prepared.iconRequests,
  );

  expect(diagnostics).toHaveLength(0);
  expect(icons.size).toBe(1);
  expect(icons.get("aws:aurora")).toBeDefined();
  expect(icons.get("aws:aurora")?.key).toBe("aurora");
});

test("AWS neptune icon loads successfully", async () => {
  const archlex = createArchLex({ providers: [awsProvider()] });
  const prepared = archlex.prepare("provider aws\nneptune");

  const { icons, diagnostics } = await iconLoader.loadIcons(
    prepared.iconRequests,
  );

  expect(diagnostics).toHaveLength(0);
  expect(icons.size).toBe(1);
  expect(icons.get("aws:neptune")).toBeDefined();
});

test("GCP cloud-armor icon loads successfully", async () => {
  const archlex = createArchLex({ providers: [gcpProvider()] });
  const prepared = archlex.prepare("provider gcp\ncloud-armor");

  const { icons, diagnostics } = await iconLoader.loadIcons(
    prepared.iconRequests,
  );

  expect(diagnostics).toHaveLength(0);
  expect(icons.size).toBe(1);
  expect(icons.get("gcp:cloud-armor")).toBeDefined();
});

test("GCP cloud-nat icon loads successfully", async () => {
  const archlex = createArchLex({ providers: [gcpProvider()] });
  const prepared = archlex.prepare("provider gcp\ncloud-nat");

  const { icons, diagnostics } = await iconLoader.loadIcons(
    prepared.iconRequests,
  );

  expect(diagnostics).toHaveLength(0);
  expect(icons.size).toBe(1);
  expect(icons.get("gcp:cloud-nat")).toBeDefined();
});
