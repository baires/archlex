import { createArchLex, gcpProvider } from "@archlex/core";
import { gcpProvider as gcpProviderFromPackage } from "@archlex/gcp";
import { describe, expect, it } from "vitest";

describe("GCP Semantics & Rules Engine", () => {
  const archlex = createArchLex({
    providers: [gcpProvider()],
  });

  describe("GCP-DATA-CLOUD-SQL-NETWORK-001 (Cloud SQL VPC Compatibility)", () => {
    it("passes when Cloud SQL and its client share the same VPC", async () => {
      const source = `
        provider gcp
        vpc main {
          app: compute-engine
          db: cloud-sql
        }
        app > db
      `;
      const res = await archlex.render(source);
      const networkDiags = res.diagnostics.filter(
        (d) => d.code === "GCP-DATA-CLOUD-SQL-NETWORK-001",
      );
      expect(networkDiags).toHaveLength(0);
    });

    it("emits a warning when Cloud SQL and its client reside in different VPCs", async () => {
      const source = `
        provider gcp
        vpc vpc1 {
          app: compute-engine
        }
        vpc vpc2 {
          db: cloud-sql
        }
        app > db
      `;
      const res = await archlex.render(source);
      const networkDiag = res.diagnostics.find(
        (d) => d.code === "GCP-DATA-CLOUD-SQL-NETWORK-001",
      );
      expect(networkDiag).toBeDefined();
      expect(networkDiag?.severity).toBe("warning");
      expect(networkDiag?.elements).toContain("vpc:vpc2/db");
      expect(networkDiag?.elements).toContain("vpc:vpc1/app");
    });

    it("promotes the warning to an error in strict mode", async () => {
      const source = `
        provider gcp
        validation strict
        vpc vpc1 {
          app: compute-engine
        }
        vpc vpc2 {
          db: cloud-sql
        }
        app > db
      `;
      const res = await archlex.render(source);
      const networkDiag = res.diagnostics.find(
        (d) => d.code === "GCP-DATA-CLOUD-SQL-NETWORK-001",
      );
      expect(networkDiag).toBeDefined();
      expect(networkDiag?.severity).toBe("error");
    });
  });

  describe("GCP-NETWORKING-SUBNET-CONTAINMENT-001", () => {
    it("emits a warning when a subnet is declared outside any VPC", async () => {
      const source = `
        provider gcp
        subnet private-a {
          app: compute-engine
        }
      `;
      const res = await archlex.render(source);
      const subnetDiag = res.diagnostics.find(
        (d) => d.code === "GCP-NETWORKING-SUBNET-CONTAINMENT-001",
      );
      expect(subnetDiag).toBeDefined();
      expect(subnetDiag?.severity).toBe("warning");
    });

    it("passes when a subnet is nested inside a VPC", async () => {
      const source = `
        provider gcp
        vpc main {
          subnet private-a {
            app: compute-engine
          }
        }
      `;
      const res = await archlex.render(source);
      const subnetDiags = res.diagnostics.filter(
        (d) => d.code === "GCP-NETWORKING-SUBNET-CONTAINMENT-001",
      );
      expect(subnetDiags).toHaveLength(0);
    });
  });

  describe("Unknown Resource Guidance", () => {
    it("emits GCP-CATALOG-UNKNOWN-RESOURCE-001 for unrecognized GCP resources", async () => {
      const source = `
        provider gcp
        foo: custom_unknown_gcp_service
      `;
      const res = await archlex.render(source);
      const unknownDiag = res.diagnostics.find(
        (d) => d.code === "GCP-CATALOG-UNKNOWN-RESOURCE-001",
      );
      expect(unknownDiag).toBeDefined();
      expect(unknownDiag?.severity).toBe("info");
    });
  });

  describe("Validation modes", () => {
    const source = `
      provider gcp
      subnet private-a {
        app: compute-engine
      }
    `;

    it("off skips provider diagnostics while catalog resolution still renders", async () => {
      const res = await archlex.render(source, { validation: "off" });
      const gcpDiags = res.diagnostics.filter((d) => d.code.startsWith("GCP-"));
      expect(gcpDiags).toHaveLength(0);
      const subnetNode = res.graph.nodes.find((n) => n.id.includes("app"));
      expect(subnetNode?.icon).toContain("<svg");
    });

    it("normal keeps warnings and strict promotes them", async () => {
      const normal = await archlex.render(source, { validation: "normal" });
      const strict = await archlex.render(source, { validation: "strict" });

      const normalDiag = normal.diagnostics.find(
        (d) => d.code === "GCP-NETWORKING-SUBNET-CONTAINMENT-001",
      );
      const strictDiag = strict.diagnostics.find(
        (d) => d.code === "GCP-NETWORKING-SUBNET-CONTAINMENT-001",
      );

      expect(normalDiag?.severity).toBe("warning");
      expect(strictDiag?.severity).toBe("error");
    });
  });

  it("resolves official GCP icon fragments without unsafe SVG content", () => {
    const provider = gcpProviderFromPackage();
    const serializedIcons = ["cloud-sql", "compute-engine", "pubsub"]
      .map((service) => provider.resolveService(service)?.iconSvg)
      .join("");

    expect(serializedIcons).not.toMatch(/https?:|<script|\son\w+=/i);
  });
});
