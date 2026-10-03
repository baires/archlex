import { readFileSync } from "node:fs";
import {
  awsProvider,
  cloudflareProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";
import { describe, expect, it } from "vitest";

const engine = createArchLex({
  providers: [
    cloudflareProvider(),
    awsProvider(),
    gcpProvider(),
    k8sProvider(),
  ],
});
const fixtures = [
  { name: "standalone", kinds: ["dns", "workers", "waf", "cache", "r2"] },
  { name: "aws-public-edge", kinds: ["dns", "load-balancing", "waf", "alb"] },
  {
    name: "gcp-k8s-tunnel",
    kinds: [
      "dns",
      "access",
      "tunnel",
      "gke",
      "deployment",
      "service",
      "deployment",
    ],
  },
  {
    name: "aws-gcp-failover",
    kinds: ["dns", "load-balancing", "alb", "cloud-run"],
  },
];
const fixtureSource = (name: string): string =>
  readFileSync(
    new URL(`./fixtures/cloudflare/${name}.archlex`, import.meta.url),
    "utf8",
  );

describe("Cloudflare executable examples", () => {
  for (const fixture of fixtures) {
    for (const mode of ["normal", "strict", "off"] as const) {
      it(`${fixture.name} renders in ${mode}`, async () => {
        const result = await engine.render(fixtureSource(fixture.name), {
          validation: mode,
        });
        expect(result.diagnostics).toEqual([]);
        expect(
          result.graph.nodes.map((node) => node.serviceKind).sort(),
        ).toEqual([...fixture.kinds].sort());
        for (const node of result.graph.nodes) {
          expect(result.svg).toContain(`data-archlex-id="${node.id}"`);
          if (node.provider === "cloudflare")
            expect(node.icon).toContain("<svg");
        }
        expect(
          result.graph.edges.find((edge) => edge.source.endsWith("domain"))
            ?.label,
        ).toBe("DNS record selects entry point");
        if (
          fixture.name === "standalone" ||
          fixture.name === "aws-public-edge"
        ) {
          expect(
            result.graph.edges.find((edge) =>
              edge.source.endsWith("protection"),
            )?.kind,
          ).toBe("protects");
          expect(
            result.graph.edges.some(
              (edge) =>
                edge.source.endsWith("entry") &&
                edge.target.endsWith("protection"),
            ),
          ).toBe(false);
        }
        if (fixture.name === "gcp-k8s-tunnel") {
          const connector = result.graph.nodes.find((node) =>
            node.id.endsWith("connector"),
          );
          expect(connector?.provider).toBe("k8s");
          expect(connector?.serviceKind).toBe("deployment");
          expect(connector?.label).toBe("cloudflared");
          for (const kind of ["cluster", "namespace"])
            expect(
              result.graph.scopes.some(
                (scope) =>
                  scope.kind === kind &&
                  scope.childrenNodeIds.includes(connector?.id ?? ""),
              ),
            ).toBe(true);
          expect(
            result.graph.edges.find((edge) => edge.kind === "connects"),
          ).toMatchObject({
            source: connector?.id,
            target: "tunnel",
            label: "Outbound tunnel establishment",
          });
          expect(
            result.graph.edges.find((edge) => edge.source === "tunnel"),
          ).toMatchObject({
            target: connector?.id,
            kind: "proxies",
            label: "Requests over established tunnel",
          });
          expect(
            result.graph.edges.find((edge) => edge.source === "access-policy")
              ?.kind,
          ).toBe("authorizes");
        }
        if (fixture.name === "aws-gcp-failover") {
          const routes = result.graph.edges.filter(
            (edge) => edge.kind === "routes",
          );
          expect(routes).toHaveLength(2);
          expect(routes.map((edge) => edge.target).sort()).toEqual([
            "aws-origin",
            "gcp-origin",
          ]);
          expect(routes.map((edge) => edge.label)).toEqual([
            "Preferred pool endpoint; health unverified",
            "Fallback pool endpoint; policy unverified",
          ]);
        }
        if (fixture.name === "aws-public-edge") {
          expect(
            result.graph.edges.find((edge) => edge.kind === "proxies")?.label,
          ).toBe("HTTPS origin request");
        }
      });
      it(`${fixture.name} invalid placement in ${mode}`, async () => {
        const source = fixtureSource(fixture.name).replace(
          /(^|\n)(domain: [^\n]+|\s+domain: [^\n]+)/,
          "\nregion wrong {\n$2\n}",
        );
        const result = await engine.render(source, { validation: mode });
        const diagnostics = result.diagnostics.filter(
          (d) => d.code === "CLOUDFLARE-CONTAINMENT-001",
        );
        expect(diagnostics).toHaveLength(mode === "off" ? 0 : 1);
        if (mode !== "off")
          expect(diagnostics[0].severity).toBe(
            mode === "strict" ? "error" : "warning",
          );
      });
    }
  }
});
