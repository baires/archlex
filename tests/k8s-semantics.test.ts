import { createArchLex, k8sProvider } from "@archlex/core";
import { describe, expect, it } from "vitest";

describe("Kubernetes Semantics & Rules Engine", () => {
  const archlex = createArchLex({ providers: [k8sProvider()] });

  it("warns about namespaces outside clusters and workloads outside namespaces", async () => {
    const result = await archlex.render(`provider k8s
namespace orphaned {
  api: deployment
}
worker: job`);

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "K8S-NAMESPACE-CLUSTER-CONTAINMENT-001",
          severity: "warning",
        }),
        expect.objectContaining({
          code: "K8S-NAMESPACE-WORKLOAD-CONTAINMENT-001",
          severity: "warning",
          elements: ["worker"],
        }),
      ]),
    );
  });

  it("accepts workloads nested inside a namespace and cluster", async () => {
    const result = await archlex.render(`provider k8s
cluster production {
  namespace web {
    api: deployment
  }
}`);

    expect(
      result.diagnostics.filter((diagnostic) =>
        diagnostic.code.includes("CONTAINMENT"),
      ),
    ).toHaveLength(0);
  });

  it("warns about unmanaged pods", async () => {
    const result = await archlex.render(`provider k8s
cluster production {
  namespace web {
    api: pod
  }
}`);

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "K8S-WORKLOAD-POD-MANAGED-001",
        severity: "warning",
      }),
    );
  });

  it("validates Service and Ingress targets", async () => {
    const result = await archlex.render(`provider k8s
cluster production {
  namespace web {
    gateway: ingress
    api: deployment
    backend: service
    gateway > api
  }
}`);

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "K8S-NETWORKING-INGRESS-TARGET-001",
          severity: "warning",
        }),
        expect.objectContaining({
          code: "K8S-NETWORKING-SERVICE-TARGET-001",
          severity: "warning",
        }),
      ]),
    );
  });

  it("validates PVC consumers and RBAC binding subjects", async () => {
    const result = await archlex.render(`provider k8s
cluster production {
  namespace web {
    data: persistentvolumeclaim
    grant: rolebinding
  }
}`);

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "K8S-STORAGE-PVC-UNBOUND-001" }),
        expect.objectContaining({ code: "K8S-RBAC-BINDING-SUBJECT-001" }),
      ]),
    );
  });

  it("reports unknown Kubernetes resources as informational guidance", async () => {
    const result = await archlex.render(
      "provider k8s\nwidget: custom-kubernetes-widget",
    );

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "K8S-CATALOG-UNKNOWN-RESOURCE-001",
        severity: "info",
      }),
    );
  });

  describe("validation modes", () => {
    const source = "provider k8s\napi: deployment";

    it("off skips Kubernetes diagnostics while preserving catalog resolution", async () => {
      const result = await archlex.render(source, { validation: "off" });
      expect(
        result.diagnostics.filter((diagnostic) =>
          diagnostic.code.startsWith("K8S-"),
        ),
      ).toHaveLength(0);
      expect(result.graph.nodes[0]?.icon).toContain("<svg");
    });

    it("normal keeps warnings and strict promotes them to errors", async () => {
      const normal = await archlex.render(source, { validation: "normal" });
      const strict = await archlex.render(source, { validation: "strict" });

      const code = "K8S-NAMESPACE-WORKLOAD-CONTAINMENT-001";
      expect(
        normal.diagnostics.find((item) => item.code === code)?.severity,
      ).toBe("warning");
      expect(
        strict.diagnostics.find((item) => item.code === code)?.severity,
      ).toBe("error");
    });
  });
});

describe("K8S-RELATIONSHIP-INVALID-ENDPOINT-001 (Relationship Endpoints)", () => {
  const archlex = createArchLex({ providers: [k8sProvider()] });
  const code = "K8S-RELATIONSHIP-INVALID-ENDPOINT-001";

  it("passes for service -[targets]-> deployment", async () => {
    const res = await archlex.render(`provider k8s
svc: service
app: deployment
svc -[targets]-> app`);
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });

  it("passes for ingress -[routes]-> service", async () => {
    const res = await archlex.render(`provider k8s
gateway: ingress
svc: service
app: deployment
gateway -[routes]-> svc
svc -[targets]-> app`);
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });

  it("warns when targets flows from a non-service", async () => {
    const res = await archlex.render(`provider k8s
app: deployment
svc: service
app -[targets]-> svc`);
    const diag = res.diagnostics.find((d) => d.code === code);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toContain("targets");
    expect(diag?.message).toContain("deployment");
  });

  it("warns when routes targets a workload instead of a service", async () => {
    const res = await archlex.render(`provider k8s
gateway: ingress
app: deployment
gateway -[routes]-> app`);
    const diag = res.diagnostics.find((d) => d.code === code);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe("warning");
    expect(diag?.message).toContain("routes");
    expect(diag?.message).toContain("service");
    // The ingress topology rule must not double-report a typed routes edge.
    expect(
      res.diagnostics.filter(
        (d) =>
          d.code === "K8S-NETWORKING-INGRESS-TARGET-001" &&
          d.message.includes("instead of a service"),
      ),
    ).toHaveLength(0);
  });

  it("promotes the warning to an error in strict mode", async () => {
    const res = await archlex.render(
      `provider k8s
app: deployment
svc: service
app -[targets]-> svc`,
      { validation: "strict" },
    );
    const diag = res.diagnostics.find((d) => d.code === code);
    expect(diag?.severity).toBe("error");
  });

  it("emits nothing in off mode", async () => {
    const res = await archlex.render(
      `provider k8s
app: deployment
svc: service
app -[targets]-> svc`,
      { validation: "off" },
    );
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });

  it("ignores edges with undeclared kinds or no kind", async () => {
    const res = await archlex.render(`provider k8s
app: deployment
svc: service
app -[connects]-> svc
app -> svc`);
    expect(res.diagnostics.filter((d) => d.code === code)).toHaveLength(0);
  });
});
