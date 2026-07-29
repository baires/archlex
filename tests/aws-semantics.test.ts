import { awsProvider } from "@cloudmer/aws";
import { createCloudMer } from "@cloudmer/core";
import { describe, expect, it } from "vitest";

describe("Phase 3: AWS Semantics & Rules Engine", () => {
  const cloudmer = createCloudMer({
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
      const res = await cloudmer.render(source);
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
      const res = await cloudmer.render(source);
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
      const res = await cloudmer.render(source);
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
      const res = await cloudmer.render(source);
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
      const res = await cloudmer.render(source);
      const unknownDiag = res.diagnostics.find(
        (d) => d.code === "AWS-CATALOG-UNKNOWN-RESOURCE-001",
      );
      expect(unknownDiag).toBeDefined();
      expect(unknownDiag?.severity).toBe("info");
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
