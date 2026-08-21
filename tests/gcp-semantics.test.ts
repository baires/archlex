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

  describe("GCP-STORAGE-CLOUD-STORAGE-PUBLIC-001 (Cloud Storage Security Guidance)", () => {
    it("emits GCP-STORAGE-CLOUD-STORAGE-PUBLIC-001 info guidance when Cloud Storage bucket connects from Cloud CDN", async () => {
      const source = `
        provider gcp
        cdn: cloud-cdn
        bucket: cloud-storage
        cdn > bucket
      `;
      const res = await archlex.render(source);
      const storageDiag = res.diagnostics.find(
        (d) => d.code === "GCP-STORAGE-CLOUD-STORAGE-PUBLIC-001",
      );
      expect(storageDiag).toBeDefined();
      expect(storageDiag?.severity).toBe("info");
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

describe("GCP-RELATIONSHIP-INVALID-ENDPOINT-001 (Relationship Endpoints)", () => {
  const archlex = createArchLex({
    providers: [gcpProviderFromPackage()],
  });
  const code = "GCP-RELATIONSHIP-INVALID-ENDPOINT-001";

  it("passes when a typed relationship connects supported services", async () => {
    const res = await archlex.render(
      "fn: cloud-functions\nstore: cloud-storage\nfn -[writes]-> store",
    );
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });

  it("warns when the source does not support the relationship kind", async () => {
    const res = await archlex.render(
      "table: bigquery\nfn: cloud-functions\ntable -[orchestrates]-> fn",
    );
    const diag = res.diagnostics.find((d) => d.code === code);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toContain("orchestrates");
    expect(diag?.message).toContain("bigquery");
  });

  it("warns when the target does not support the relationship kind", async () => {
    const res = await archlex.render(
      "fn: cloud-functions\ndb: cloud-sql\nfn -[encrypts]-> db",
    );
    const diag = res.diagnostics.find((d) => d.code === code);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toContain("cloud-kms");
  });

  it("promotes the warning to an error in strict mode", async () => {
    const res = await archlex.render(
      "fn: cloud-functions\ndb: cloud-sql\nfn -[encrypts]-> db",
      { validation: "strict" },
    );
    const diag = res.diagnostics.find((d) => d.code === code);
    expect(diag?.severity).toBe("error");
  });

  it("emits nothing in off mode", async () => {
    const res = await archlex.render(
      "fn: cloud-functions\ndb: cloud-sql\nfn -[encrypts]-> db",
      { validation: "off" },
    );
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });

  it("ignores edges with undeclared kinds or no kind", async () => {
    const res = await archlex.render(
      "fn: cloud-functions\ndb: cloud-sql\nfn -[connects]-> db\nfn -> db",
    );
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });
});

describe("GCP integration rules use relationship kinds", () => {
  const archlex = createArchLex({
    providers: [gcpProviderFromPackage()],
  });

  it("accepts a typed orchestrates edge for Workflows targets", async () => {
    const res = await archlex.render(
      "wf: workflows\nfn: cloud-functions\nwf -[orchestrates]-> fn",
    );
    expect(
      res.diagnostics.filter(
        (d) => d.code === "GCP-INTEGRATION-WORKFLOWS-TARGETS-001",
      ),
    ).toHaveLength(0);
  });

  it("accepts a typed triggers edge for Eventarc targets", async () => {
    const res = await archlex.render(
      "bus: eventarc\nfn: cloud-functions\nbus -[triggers]-> fn",
    );
    expect(
      res.diagnostics.filter(
        (d) => d.code === "GCP-INTEGRATION-EVENTARC-TARGETS-001",
      ),
    ).toHaveLength(0);
  });
});
