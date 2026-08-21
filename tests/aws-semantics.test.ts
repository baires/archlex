import { awsProvider } from "@archlex/aws";
import { createArchLex } from "@archlex/core";
import { describe, expect, it } from "vitest";

describe("Phase 3: AWS Semantics & Rules Engine", () => {
  const archlex = createArchLex({
    providers: [awsProvider()],
  });

  describe("AWS-RDS-PROXY-NETWORK-001 (RDS Proxy VPC Compatibility)", () => {
    it("passes when RDS Proxy and RDS share the same VPC", async () => {
      const source = `
        vpc main {
          proxy: rds-proxy
          db: rds
        }
        proxy > db
      `;
      const res = await archlex.render(source);
      const networkErrors = res.diagnostics.filter(
        (d) => d.code === "AWS-RDS-PROXY-NETWORK-001",
      );
      expect(networkErrors).toHaveLength(0);
    });

    it("emits AWS-RDS-PROXY-NETWORK-001 error when RDS Proxy and RDS reside in different VPCs", async () => {
      const source = `
        vpc vpc1 {
          proxy: rds-proxy
        }
        vpc vpc2 {
          db: rds
        }
        proxy > db
      `;
      const res = await archlex.render(source);
      const networkError = res.diagnostics.find(
        (d) => d.code === "AWS-RDS-PROXY-NETWORK-001",
      );
      expect(networkError).toBeDefined();
      expect(networkError?.severity).toBe("error");
      expect(networkError?.elements).toContain("vpc:vpc1/proxy");
      expect(networkError?.elements).toContain("vpc:vpc2/db");
    });
  });

  describe("Subnet Containment & Security Rules", () => {
    it("emits AWS-NETWORKING-SUBNET-CONTAINMENT-001 when subnet is declared outside VPC", async () => {
      const source = `
        subnet private-a {
          api: ecs
        }
      `;
      const res = await archlex.render(source);
      const subnetDiag = res.diagnostics.find(
        (d) => d.code === "AWS-NETWORKING-SUBNET-CONTAINMENT-001",
      );
      expect(subnetDiag).toBeDefined();
      expect(subnetDiag?.severity).toBe("warning");
    });

    it("emits AWS-SECURITY-UNATTACHED-ROLE-001 when IAM role has no relationships", async () => {
      const source = `
        app_role: iam-role
      `;
      const res = await archlex.render(source);
      const roleDiag = res.diagnostics.find(
        (d) => d.code === "AWS-SECURITY-UNATTACHED-ROLE-001",
      );
      expect(roleDiag).toBeDefined();
      expect(roleDiag?.severity).toBe("warning");
    });
  });

  describe("Unknown Resource Guidance", () => {
    it("emits AWS-CATALOG-UNKNOWN-RESOURCE-001 for unrecognized AWS resources", async () => {
      const source = `
        foo: custom_unknown_aws_service
      `;
      const res = await archlex.render(source);
      const unknownDiag = res.diagnostics.find(
        (d) => d.code === "AWS-CATALOG-UNKNOWN-RESOURCE-001",
      );
      expect(unknownDiag).toBeDefined();
      expect(unknownDiag?.severity).toBe("info");
    });
  });

  describe("Service Placement Rules", () => {
    describe("AWS-STORAGE-EFS-VPC-PLACEMENT-001 (EFS VPC Placement)", () => {
      it("passes when EFS file system is inside a VPC", async () => {
        const source = `
          vpc main {
            fs: efs
          }
        `;
        const res = await archlex.render(source);
        const efsDiags = res.diagnostics.filter(
          (d) => d.code === "AWS-STORAGE-EFS-VPC-PLACEMENT-001",
        );
        expect(efsDiags).toHaveLength(0);
      });

      it("emits AWS-STORAGE-EFS-VPC-PLACEMENT-001 warning when EFS file system is outside a VPC", async () => {
        const source = `
          fs: efs
        `;
        const res = await archlex.render(source);
        const efsDiag = res.diagnostics.find(
          (d) => d.code === "AWS-STORAGE-EFS-VPC-PLACEMENT-001",
        );
        expect(efsDiag).toBeDefined();
        expect(efsDiag?.severity).toBe("warning");
      });
    });

    describe("AWS-DATA-AURORA-SUBNET-PLACEMENT-001 (Aurora Subnet Placement)", () => {
      it("passes when Aurora DB is inside a subnet or VPC scope", async () => {
        const source = `
          vpc main {
            subnet private {
              db: aurora
            }
          }
        `;
        const res = await archlex.render(source);
        const auroraDiags = res.diagnostics.filter(
          (d) => d.code === "AWS-DATA-AURORA-SUBNET-PLACEMENT-001",
        );
        expect(auroraDiags).toHaveLength(0);
      });

      it("emits AWS-DATA-AURORA-SUBNET-PLACEMENT-001 warning when Aurora DB is uncontained", async () => {
        const source = `
          db: aurora
        `;
        const res = await archlex.render(source);
        const auroraDiag = res.diagnostics.find(
          (d) => d.code === "AWS-DATA-AURORA-SUBNET-PLACEMENT-001",
        );
        expect(auroraDiag).toBeDefined();
        expect(auroraDiag?.severity).toBe("warning");
      });
    });
  });

  it("resolves official AWS icon fragments without unsafe SVG content", () => {
    const provider = awsProvider();
    const serializedIcons = ["rds-proxy", "rds", "ecs"]
      .map((service) => provider.resolveService(service)?.iconSvg)
      .join("");

    expect(serializedIcons).not.toMatch(/https?:|<script|\son\w+=/i);
  });
});

describe("AWS-RELATIONSHIP-INVALID-ENDPOINT-001 (Relationship Endpoints)", () => {
  const archlex = createArchLex({
    providers: [awsProvider()],
  });
  const code = "AWS-RELATIONSHIP-INVALID-ENDPOINT-001";

  it("passes when a typed relationship connects supported services", async () => {
    const res = await archlex.render(
      "fn: lambda\ndb: dynamodb\nfn -[writes]-> db",
    );
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });

  it("warns when the source does not support the relationship kind", async () => {
    const res = await archlex.render(
      "table: dynamodb\nfn: lambda\ntable -[orchestrates]-> fn",
    );
    const diag = res.diagnostics.find((d) => d.code === code);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toContain("orchestrates");
    expect(diag?.message).toContain("dynamodb");
  });

  it("warns when the target does not support the relationship kind", async () => {
    const res = await archlex.render(
      "fn: lambda\ndb: rds\nfn -[encrypts]-> db",
    );
    const diag = res.diagnostics.find((d) => d.code === code);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toContain("kms");
  });

  it("promotes the warning to an error in strict mode", async () => {
    const res = await archlex.render(
      "fn: lambda\ndb: rds\nfn -[encrypts]-> db",
      { validation: "strict" },
    );
    const diag = res.diagnostics.find((d) => d.code === code);
    expect(diag?.severity).toBe("error");
  });

  it("emits nothing in off mode", async () => {
    const res = await archlex.render(
      "fn: lambda\ndb: rds\nfn -[encrypts]-> db",
      { validation: "off" },
    );
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });

  it("ignores edges with undeclared kinds or no kind", async () => {
    const res = await archlex.render(
      "fn: lambda\ndb: rds\nfn -[connects]-> db\nfn -> db",
    );
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });
});

describe("AWS integration rules use relationship kinds", () => {
  const archlex = createArchLex({
    providers: [awsProvider()],
  });

  it("accepts a typed orchestrates edge for Step Functions targets", async () => {
    const res = await archlex.render(
      "sf: step-functions\nfn: lambda\nsf -[orchestrates]-> fn",
    );
    expect(
      res.diagnostics.filter(
        (d) => d.code === "AWS-INTEGRATION-STEP-FUNCTIONS-TARGETS-001",
      ),
    ).toHaveLength(0);
  });

  it("accepts a typed triggers edge for EventBridge targets", async () => {
    const res = await archlex.render(
      "bus: eventbridge\nfn: lambda\nbus -[triggers]-> fn",
    );
    expect(
      res.diagnostics.filter(
        (d) => d.code === "AWS-INTEGRATION-EVENTBRIDGE-TARGETS-001",
      ),
    ).toHaveLength(0);
  });

  it("accepts a typed writes edge for Kinesis Firehose destinations", async () => {
    const res = await archlex.render(
      "stream: kinesis-firehose\nbucket: s3\nstream -[writes]-> bucket",
    );
    expect(
      res.diagnostics.filter(
        (d) => d.code === "AWS-ANALYTICS-KINESIS-FIREHOSE-DESTINATION-001",
      ),
    ).toHaveLength(0);
  });
});
