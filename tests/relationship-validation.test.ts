import type { ResourceDefinition } from "@archlex/model";
import { describe, expect, test } from "vitest";
import {
  CATALOG_DIAGNOSTIC_CODES,
  validateCatalogContainment,
} from "../packages/diagnostics/src/index.js";

describe("Task 4: Relationship & Containment Rule Validation", () => {
  test("valid catalog with valid allowedContainment produces 0 diagnostics (array input)", () => {
    const services: ResourceDefinition[] = [
      {
        id: "vpc",
        displayName: "Virtual Private Cloud",
        category: "networking",
        aliases: ["vpc"],
      },
      {
        id: "subnet",
        displayName: "Subnet",
        category: "networking",
        aliases: ["subnet"],
        allowedContainment: ["vpc"],
      },
      {
        id: "alb",
        displayName: "Application Load Balancer",
        category: "networking",
        aliases: ["alb"],
        allowedContainment: ["subnet"],
      },
    ];

    const diagnostics = validateCatalogContainment(services);
    expect(diagnostics).toHaveLength(0);
  });

  test("valid catalog with valid allowedContainment produces 0 diagnostics (Map input)", () => {
    const services = new Map<string, ResourceDefinition>([
      [
        "vpc",
        {
          id: "vpc",
          displayName: "Virtual Private Cloud",
          category: "networking",
          aliases: ["vpc"],
        },
      ],
      [
        "subnet",
        {
          id: "subnet",
          displayName: "Subnet",
          category: "networking",
          aliases: ["subnet"],
          allowedContainment: ["vpc"],
        },
      ],
    ]);

    const diagnostics = validateCatalogContainment(services);
    expect(diagnostics).toHaveLength(0);
  });

  test("valid catalog referencing valid boundary kinds (e.g. region, account) produces 0 diagnostics", () => {
    const services: ResourceDefinition[] = [
      {
        id: "vpc",
        displayName: "VPC",
        category: "networking",
        aliases: [],
        allowedContainment: ["region", "account"],
      },
    ];

    const diagnostics = validateCatalogContainment(services);
    expect(diagnostics).toHaveLength(0);
  });

  test("service referencing non-existent service ID in allowedContainment produces CATALOG002 diagnostic", () => {
    const invalidService: ResourceDefinition = {
      id: "my-service",
      displayName: "My Service",
      category: "compute",
      aliases: [],
      allowedContainment: ["non-existent-container"],
    };

    const catalogMap = new Map([["my-service", invalidService]]);
    const diagnostics = validateCatalogContainment(catalogMap);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    const diag = diagnostics.find(
      (d) => d.code === CATALOG_DIAGNOSTIC_CODES.INVALID_RELATIONSHIP,
    );
    expect(diag).toBeDefined();
    expect(diag?.code).toBe("CATALOG002");
    expect(diag?.severity).toBe("error");
    expect(diag?.message).toContain("non-existent-container");
  });

  test("service listing its own ID in allowedContainment (self-containment loop) produces CATALOG002 diagnostic", () => {
    const selfContainmentService: ResourceDefinition = {
      id: "my-service",
      displayName: "My Service",
      category: "compute",
      aliases: [],
      allowedContainment: ["my-service"],
    };

    const services = [selfContainmentService];
    const diagnostics = validateCatalogContainment(services);

    expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    const diag = diagnostics.find(
      (d) => d.code === CATALOG_DIAGNOSTIC_CODES.INVALID_RELATIONSHIP,
    );
    expect(diag).toBeDefined();
    expect(diag?.code).toBe("CATALOG002");
    expect(diag?.severity).toBe("error");
    expect(diag?.message).toContain("self-containment loop");
  });
});
