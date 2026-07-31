import { describe, expect, it } from "vitest";
import {
  NODE_WIDTH_TIERS,
  charsPerLineForWidth,
  layoutNodeLabel,
  nodeWidthForLabel,
} from "./labels.js";

describe("charsPerLineForWidth", () => {
  it("derives deterministic character budgets from card width", () => {
    expect(charsPerLineForWidth(128)).toBe(16);
    expect(charsPerLineForWidth(160)).toBe(20);
    expect(charsPerLineForWidth(192)).toBe(25);
  });
});

describe("nodeWidthForLabel", () => {
  it("keeps short labels on the most compact tier", () => {
    expect(nodeWidthForLabel("Pub/Sub")).toBe(NODE_WIDTH_TIERS[0]);
    expect(nodeWidthForLabel("Amazon RDS")).toBe(NODE_WIDTH_TIERS[0]);
  });

  it("widens the card so canonical service names fit in two lines", () => {
    const tier = nodeWidthForLabel("Google Kubernetes Engine");
    expect(tier).toBe(160);
    expect(
      layoutNodeLabel("Google Kubernetes Engine", charsPerLineForWidth(tier)),
    ).toEqual({
      lines: ["Google Kubernetes", "Engine"],
      truncated: false,
    });
  });

  it("caps at the widest tier when every tier truncates", () => {
    expect(nodeWidthForLabel("Supercalifragilisticexpialidocious Name")).toBe(
      NODE_WIDTH_TIERS[NODE_WIDTH_TIERS.length - 1],
    );
  });
});
