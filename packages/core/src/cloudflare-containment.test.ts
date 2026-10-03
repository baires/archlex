import type { ValidationMode } from "@archlex/model";
import { describe, expect, it } from "vitest";
import { awsProvider, cloudflareProvider, createArchLex } from "./index.js";

const engine = createArchLex({
  providers: [cloudflareProvider(), awsProvider()],
});
const parse = (source: string) => engine.parse(source).ast;
const code = "CLOUDFLARE-CONTAINMENT-001";

describe("Cloudflare represented containment", () => {
  for (const scope of ["region", "vpc", "subnet", "cluster", "namespace"]) {
    for (const mode of ["normal", "strict", "off"] as const) {
      it(`${scope}: ${mode}`, () => {
        const result = engine.analyze(
          parse(`provider cloudflare\n${scope} origin {\n api: workers\n}`),
          { validation: mode },
        );
        const diagnostics = result.diagnostics.filter((d) => d.code === code);
        expect(diagnostics).toHaveLength(mode === "off" ? 0 : 1);
        if (mode !== "off") {
          expect(diagnostics[0].severity).toBe(
            mode === "strict" ? "error" : "warning",
          );
          expect(diagnostics[0].elements).toEqual([result.graph.nodes[0].id]);
          expect(diagnostics[0].span).toEqual(result.graph.nodes[0].span);
          expect(diagnostics[0].remediation).toMatch(/root.*account/);
        }
      });
    }
  }
  it("checks all ancestors and emits once per node", () => {
    const result = engine.analyze(
      parse(
        "provider cloudflare\nregion origin {\n vpc network {\n account logical {\n api: workers\n}\n}\n}",
      ),
    );
    expect(result.diagnostics.filter((d) => d.code === code)).toHaveLength(1);
  });
  it("accepts root/account and ignores foreign resources in native scopes", () => {
    const result = engine.analyze(
      parse(
        "provider cloudflare\nroot: workers\naccount logical {\n store: r2\n}\nregion us-east-1 {\n vpc network {\n subnet public {\n origin: aws.alb\n}\n}\n}\nroot -[proxies]-> origin",
      ),
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.graph.edges).toHaveLength(1);
  });
  it("supports qualified Cloudflare nodes with a foreign document provider", () => {
    const result = engine.analyze(
      parse("provider aws\nregion us-east-1 {\n api: cloudflare.workers\n}"),
    );
    expect(result.diagnostics.filter((d) => d.code === code)).toHaveLength(1);
  });
  it("uses membership rather than scope-like node IDs and skips unknown identities", () => {
    const graph = engine.analyze(
      parse("provider cloudflare\napi: workers"),
    ).graph;
    const node = graph.nodes[0];
    for (const mode of ["normal", "strict", "off"] satisfies ValidationMode[]) {
      expect(
        cloudflareProvider().validateGraph(
          { ...graph, nodes: [{ ...node, id: "region:fake/api" }] },
          mode,
        ),
      ).toEqual([]);
      expect(
        cloudflareProvider().validateGraph(
          {
            nodes: [
              { ...node, provider: "aws" },
              { ...node, id: "unknown", serviceKind: "unknown" },
            ],
            edges: [],
            scopes: [
              {
                id: "arbitrary",
                kind: "region",
                name: "origin",
                childrenNodeIds: [node.id, "unknown"],
              },
            ],
          },
          mode,
        ),
      ).toEqual([]);
      expect(
        cloudflareProvider().validateGraph(
          {
            ...graph,
            scopes: [
              {
                id: "visual",
                kind: "group",
                name: "presentation",
                childrenNodeIds: [node.id],
              },
            ],
          },
          mode,
        ),
      ).toEqual([]);
    }
  });
});
