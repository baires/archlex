import { describe, expect, it } from "vitest";
import { SITE_PROJECTS } from "../scripts/site-projects.mjs";

describe("SITE_PROJECTS", () => {
  it("exports exactly three site projects", () => {
    expect(SITE_PROJECTS).toHaveLength(3);
  });

  it("has landing site with correct configuration", () => {
    const landing = SITE_PROJECTS.find((p) => p.name === "landing");
    expect(landing).toBeDefined();
    expect(landing?.workspace).toBe("@archlex/landing");
    expect(landing?.outputDirectory).toBe("apps/landing/dist");
    expect(landing?.smokePath).toBe("/");
  });

  it("has playground site with correct configuration", () => {
    const playground = SITE_PROJECTS.find((p) => p.name === "playground");
    expect(playground).toBeDefined();
    expect(playground?.workspace).toBe("@archlex/playground");
    expect(playground?.outputDirectory).toBe("apps/playground/dist");
    expect(playground?.smokePath).toBe("/");
  });

  it("has docs site with correct configuration", () => {
    const docs = SITE_PROJECTS.find((p) => p.name === "docs");
    expect(docs).toBeDefined();
    expect(docs?.workspace).toBe("@archlex/docs");
    expect(docs?.outputDirectory).toBe("apps/docs/out");
    expect(docs?.smokePath).toBe("/");
  });

  it("has unique production domains", () => {
    const domains = SITE_PROJECTS.map((p) => p.domain);
    const uniqueDomains = new Set(domains);
    expect(uniqueDomains.size).toBe(3);
  });

  it("has valid production domains", () => {
    const landing = SITE_PROJECTS.find((p) => p.name === "landing");
    const playground = SITE_PROJECTS.find((p) => p.name === "playground");
    const docs = SITE_PROJECTS.find((p) => p.name === "docs");

    expect(landing?.domain).toBe("archlex.dev");
    expect(playground?.domain).toBe("playground.archlex.dev");
    expect(docs?.domain).toBe("docs.archlex.dev");
  });

  it("all projects have smoke paths set to /", () => {
    for (const project of SITE_PROJECTS) {
      expect(project.smokePath).toBe("/");
    }
  });

  it("all projects are frozen", () => {
    expect(Object.isFrozen(SITE_PROJECTS)).toBe(true);
    for (const project of SITE_PROJECTS) {
      expect(Object.isFrozen(project)).toBe(true);
    }
  });
});
