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
