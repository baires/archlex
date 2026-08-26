import { awsProvider } from "@archlex/aws";
import { createArchLex } from "@archlex/core";
import { gcpProvider } from "@archlex/gcp";
import { k8sProvider } from "@archlex/k8s";
import { expect, test } from "vitest";
import { iconLoader } from "../apps/playground/src/icon-loader.js";

test("AWS aurora icon loads successfully", async () => {
  const archlex = createArchLex({ providers: [awsProvider()] });
  const prepared = archlex.prepare("provider aws\naurora");
  expect(prepared.graph.nodes[0]?.icon).toContain("<svg");

  const { icons, diagnostics } = await iconLoader.loadIcons([
    { provider: "aws", key: "aurora" },
  ]);

  expect(diagnostics).toHaveLength(0);
  expect(icons.get("aws:aurora")).toBeDefined();
  expect(icons.get("aws:aurora")?.key).toBe("aurora");
});

test("AWS neptune icon loads successfully", async () => {
  const archlex = createArchLex({ providers: [awsProvider()] });
  const prepared = archlex.prepare("provider aws\nneptune");
  expect(prepared.graph.nodes[0]?.icon).toContain("<svg");

  const { icons, diagnostics } = await iconLoader.loadIcons([
    { provider: "aws", key: "neptune" },
  ]);

  expect(diagnostics).toHaveLength(0);
  expect(icons.get("aws:neptune")).toBeDefined();
});

test("GCP cloud-armor icon loads successfully", async () => {
  const archlex = createArchLex({ providers: [gcpProvider()] });
  const prepared = archlex.prepare("provider gcp\ncloud-armor");
  expect(prepared.graph.nodes[0]?.icon).toContain("<svg");

  const { icons, diagnostics } = await iconLoader.loadIcons([
    { provider: "gcp", key: "cloud-armor" },
  ]);

  expect(diagnostics).toHaveLength(0);
  expect(icons.get("gcp:cloud-armor")).toBeDefined();
});

test("GCP cloud-nat icon loads successfully", async () => {
  const archlex = createArchLex({ providers: [gcpProvider()] });
  const prepared = archlex.prepare("provider gcp\ncloud-nat");
  expect(prepared.graph.nodes[0]?.icon).toContain("<svg");

  const { icons, diagnostics } = await iconLoader.loadIcons([
    { provider: "gcp", key: "cloud-nat" },
  ]);

  expect(diagnostics).toHaveLength(0);
  expect(icons.get("gcp:cloud-nat")).toBeDefined();
});

test("Kubernetes deployment icon loads successfully", async () => {
  const archlex = createArchLex({ providers: [k8sProvider()] });
  const prepared = archlex.prepare("provider k8s\ndeployment");
  expect(prepared.graph.nodes[0]?.icon).toContain("<svg");

  const { icons, diagnostics } = await iconLoader.loadIcons([
    { provider: "k8s", key: "deployment" },
  ]);

  expect(diagnostics).toHaveLength(0);
  expect(icons.get("k8s:deployment")).toBeDefined();
});
