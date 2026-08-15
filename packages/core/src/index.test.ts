import type { SanitizedIcon } from "@archlex/icons-core";
import { createInlineLayoutEngine } from "@archlex/layout-elk";
import type { LayoutEngine } from "@archlex/model";
import { describe, expect, it, vi } from "vitest";
import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "./index.js";

const fetchedAppRunnerIcon: SanitizedIcon = {
  key: "app-runner",
  provider: "aws",
  checksum: "sha256:app-runner",
  viewBox: "0 0 64 64",
  svgFragment:
    '<svg viewBox="0 0 64 64"><path fill="#123456" d="M0 0h64v64H0z"/></svg>',
};

const alternateAppRunnerIcon: SanitizedIcon = {
  ...fetchedAppRunnerIcon,
  checksum: "sha256:alternate-app-runner",
  svgFragment:
    '<svg viewBox="0 0 64 64"><path fill="#abcdef" d="M0 0h64v64H0z"/></svg>',
};

function createDirectionRecordingLayoutEngine(): {
  readonly engine: LayoutEngine;
  readonly directions: Array<string | undefined>;
} {
  const delegate = createInlineLayoutEngine();
  const directions: Array<string | undefined> = [];
  return {
    directions,
    engine: {
      id: "direction-recording-layout",
      async layout(graph, options) {
        directions.push(options?.direction);
        return delegate.layout(graph, options);
      },
    },
  };
}

function createCustomIconLayoutEngine(icon: string): LayoutEngine {
  return {
    id: "custom-layout",
    async layout() {
      return {
        graph: {
          width: 120,
          height: 100,
          nodes: [
            {
              id: "apprunner",
              x: 10,
              y: 10,
              width: 100,
              height: 80,
              label: "Custom App Runner",
              iconKey: "custom.authoritative",
              icon,
            },
          ],
          edges: [],
        },
        diagnostics: [],
        metadata: {
          engine: "custom-layout",
          fingerprint: "custom",
          durationMs: 0,
        },
      };
    },
  };
}

describe("prepared rendering", () => {
  it("prepares unresolved icon requests and parse plus analysis diagnostics", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const prepared = archlex.prepare("apprunner ->\nunknown-service");

    expect(prepared.iconRequests).toEqual([
      { provider: "aws", key: "app-runner" },
    ]);
    expect(prepared.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "AL-PARSE-MISSING-ENDPOINT",
        "AL-SEM-UNKNOWN-RESOURCE",
      ]),
    );
  });

  it("renders a prepared graph with injected icons deterministically", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const prepared = archlex.prepare("apprunner");
    const icons = new Map([["aws:app-runner", fetchedAppRunnerIcon]]);

    const first = await archlex.renderPrepared(prepared, { icons });
    const second = await archlex.renderPrepared(prepared, { icons });

    expect(first.svg).toContain("#123456");
    expect(first.graph.nodes[0]?.icon).toBe(fetchedAppRunnerIcon.svgFragment);
    expect(prepared.graph.nodes[0]?.icon).toBeUndefined();
    expect(second.svg).toBe(first.svg);
  });

  it("preserves custom layout-engine icons when no registry is supplied", async () => {
    const layoutEngine = createCustomIconLayoutEngine(
      '<svg viewBox="0 0 10 10"><circle fill="#fedcba" cx="5" cy="5" r="5"/></svg>',
    );
    const archlex = createArchLex({
      providers: [awsProvider()],
      layoutEngine,
    });

    const result = await archlex.render("apprunner");

    expect(result.layout.nodes[0]).toMatchObject({
      iconKey: "custom.authoritative",
      icon: expect.stringContaining("#fedcba"),
    });
    expect(result.svg).toContain("#fedcba");
    expect(result.svg).toContain('data-archlex-icon="custom.authoritative"');
  });

  it("injects only icon data into custom layout-engine output", async () => {
    const layoutEngine = createCustomIconLayoutEngine(
      '<svg viewBox="0 0 10 10"><rect fill="#000000" width="10" height="10"/></svg>',
    );
    const archlex = createArchLex({
      providers: [awsProvider()],
      layoutEngine,
    });

    const result = await archlex.render("apprunner", {
      icons: new Map([["aws:app-runner", fetchedAppRunnerIcon]]),
    });

    expect(result.layout.nodes[0]).toMatchObject({
      iconKey: "custom.authoritative",
      icon: fetchedAppRunnerIcon.svgFragment,
    });
  });

  it("renders the current registry when cached geometry is reused", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const prepared = archlex.prepare("apprunner");

    const first = await archlex.renderPrepared(prepared, {
      icons: new Map([["aws:app-runner", fetchedAppRunnerIcon]]),
    });
    const second = await archlex.renderPrepared(prepared, {
      icons: new Map([["aws:app-runner", alternateAppRunnerIcon]]),
    });

    expect(first.svg).toContain("#123456");
    expect(second.svg).toContain("#abcdef");
    expect(second.svg).not.toContain("#123456");
  });

  it("preserves prepared direction, overrides, and abort signals", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const prepared = archlex.prepare("direction TB\nrds > ecs");

    const fromSource = await archlex.renderPrepared(prepared);
    const overridden = await archlex.renderPrepared(prepared, {
      direction: "LR",
    });
    const controller = new AbortController();
    controller.abort();

    expect(fromSource.layout.nodes[0]?.x).toBe(fromSource.layout.nodes[1]?.x);
    expect(overridden.layout.nodes[0]?.y).toBe(overridden.layout.nodes[1]?.y);
    await expect(
      archlex.renderPrepared(prepared, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "ArchLexAbortError" });
  });

  it("honors validation directives and prepare option overrides", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const source = "validation off\nrole: iam-role";

    const fromSource = archlex.prepare(source);
    const overridden = archlex.prepare(source, { validation: "strict" });

    expect(
      fromSource.diagnostics.find(
        (diagnostic) => diagnostic.code === "AWS-SECURITY-UNATTACHED-ROLE-001",
      ),
    ).toBeUndefined();
    expect(overridden.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "AWS-SECURITY-UNATTACHED-ROLE-001",
          severity: "error",
        }),
      ]),
    );
  });

  it("does not carry invalid or late direction directives into layout", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const invalid = archlex.prepare("direction SIDEWAYS\nrds");
    const late = archlex.prepare("rds\ndirection TB");

    expect(invalid.direction).toBeUndefined();
    expect(late.direction).toBeUndefined();
  });

  it("keeps legacy render behavior for a late direction directive", async () => {
    const { engine, directions } = createDirectionRecordingLayoutEngine();
    const archlex = createArchLex({
      providers: [awsProvider()],
      layoutEngine: engine,
    });

    const late = await archlex.render("rds > ecs\ndirection TB");
    const explicit = await archlex.render("rds > ecs", { direction: "TB" });

    expect(directions).toEqual(["TB", "TB"]);
    expect(late.layout).toEqual(explicit.layout);
    expect(late.metadata).toEqual(explicit.metadata);
    expect(late.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "AL-STRUCT-LATE-DIRECTIVE",
    );
  });

  it("keeps legacy render fallback for an invalid direction directive", async () => {
    const { engine, directions } = createDirectionRecordingLayoutEngine();
    const archlex = createArchLex({
      providers: [awsProvider()],
      layoutEngine: engine,
    });

    const invalid = await archlex.render("direction SIDEWAYS\nrds > ecs");

    expect(directions).toEqual(["SIDEWAYS"]);
    expect(invalid.layout.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: "rds", x: 12, y: 146 },
      { id: "ecs", x: 12, y: 12 },
    ]);
    expect(invalid.metadata).toMatchObject({ width: 152, height: 250 });
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "AL-STRUCT-INVALID-DIRECTIVE",
    );
  });

  it("parses and analyzes only once through the compatible render API", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const parse = vi.spyOn(archlex, "parse");
    const analyze = vi.spyOn(archlex, "analyze");

    await archlex.render("apprunner", {
      icons: new Map([["aws:app-runner", fetchedAppRunnerIcon]]),
    });

    expect(parse).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledTimes(1);
  });
});

describe("catalog language metadata", () => {
  it("returns structured grammar and provider metadata", () => {
    const archlex = createArchLex({
      providers: [awsProvider(), gcpProvider(), k8sProvider()],
    });

    const catalog = archlex.getCatalog();

    expect(catalog.language.directives.map(({ name }) => name)).toEqual([
      "provider",
      "direction",
      "validation",
      "theme",
    ]);
    expect(catalog.language.scopes.map(({ kind }) => kind)).toEqual([
      "account",
      "region",
      "vpc",
      "subnet",
      "cluster",
      "namespace",
    ]);
    expect(catalog.language.relationships).toContainEqual(
      expect.objectContaining({ kind: "connects" }),
    );
    expect(catalog.providers.aws?.supportedScopes).toEqual([
      "account",
      "region",
      "vpc",
      "subnet",
    ]);
  });

  it("recognizes provider relationship definitions", () => {
    const archlex = createArchLex({ providers: [k8sProvider()] });
    const prepared = archlex.prepare(
      "provider k8s\nservice -[targets]-> deployment",
    );

    expect(
      prepared.diagnostics.some(
        ({ code }) => code === "AL-SEM-UNKNOWN-RELATIONSHIP",
      ),
    ).toBe(false);
  });
});

describe("Phase 1 canonical rendering", () => {
  it("renders the complete RDS Proxy to RDS to ECS chain", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const result = await archlex.render("rds-proxy > rds > ecs");

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes.map((node) => node.id)).toEqual([
      "rds-proxy",
      "rds",
      "ecs",
    ]);
    expect(result.graph.edges).toHaveLength(2);
    expect(result.graph.nodes.every((node) => node.icon)).toBe(true);
    expect(result.svg).toContain("Amazon RDS Proxy");
    expect(result.svg).toContain("Amazon RDS");
    expect(result.svg).toContain("Amazon ECS");
    expect(result.svg).toContain('data-archlex-icon="aws.rds-proxy"');
  });

  it("returns byte-identical SVG for repeated canonical renders", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const first = await archlex.render("rds-proxy > rds > ecs");
    const second = await archlex.render("rds-proxy > rds > ecs");

    expect(second.svg).toBe(first.svg);
  });

  it("forwards diagram colors without adding a themed canvas", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const light = await archlex.render("rds-proxy > rds > ecs", {
      theme: "light",
    });
    const dark = await archlex.render("rds-proxy > rds > ecs", {
      theme: "dark",
    });

    expect(light.svg).not.toContain("archlex-canvas");
    expect(dark.svg).not.toContain("archlex-canvas");
    expect(light.svg).toContain('class="archlex-node-surface"');
    expect(light.svg).toContain('fill="#ffffff"');
    expect(dark.svg).toContain('class="archlex-node-surface"');
    expect(dark.svg).toContain('fill="#1f2937"');
  });
});

describe("Phase 2 semantic graph", () => {
  it("builds stable containment IDs and resolves names lexically", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const parsed = archlex.parse(`account production {
  region us-east-1 {
    vpc application {
      subnet private-a {
        api: ecs
        database: rds
        api -[writes]->|SQL| database
      }
    }
  }
}`);

    const result = archlex.analyze(parsed.ast);

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.scopes.map((scope) => scope.id)).toEqual([
      "account:production",
      "account:production/region:us-east-1",
      "account:production/region:us-east-1/vpc:application",
      "account:production/region:us-east-1/vpc:application/subnet:private-a",
    ]);
    expect(result.graph.nodes.map((node) => node.id)).toEqual([
      "account:production/region:us-east-1/vpc:application/subnet:private-a/api",
      "account:production/region:us-east-1/vpc:application/subnet:private-a/database",
    ]);
    expect(result.graph.edges[0]).toMatchObject({
      source:
        "account:production/region:us-east-1/vpc:application/subnet:private-a/api",
      target:
        "account:production/region:us-east-1/vpc:application/subnet:private-a/database",
      kind: "writes",
      label: "SQL",
    });
  });

  it("keeps the first duplicate ID and diagnoses later declarations", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const parsed = archlex.parse("api: ecs\napi: rds");

    const result = archlex.analyze(parsed.ast);

    expect(result.graph.nodes).toHaveLength(1);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "api",
      serviceKind: "ecs",
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "AL-STRUCT-DUPLICATE-ID",
    );
  });

  it("preserves unknown resources and custom relationships with information diagnostics", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const parsed = archlex.parse(
      "source: future-service\nsource -[streams]-> sink",
    );

    const result = archlex.analyze(parsed.ast);

    expect(result.graph.nodes.map((node) => node.id)).toEqual([
      "source",
      "sink",
    ]);
    expect(result.graph.edges[0]).toMatchObject({ kind: "streams" });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "AL-SEM-UNKNOWN-RESOURCE",
          severity: "info",
        }),
        expect.objectContaining({
          code: "AL-SEM-UNKNOWN-RELATIONSHIP",
          severity: "info",
        }),
      ]),
    );
  });

  it("reverses semantic endpoints for a reverse arrow", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const result = archlex.analyze(archlex.parse("ecs <- rds").ast);

    expect(result.graph.edges[0]).toMatchObject({
      source: "rds",
      target: "ecs",
      arrow: "<-",
    });
  });

  it("keeps a valid endpoint connected to a recovered placeholder", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const parsed = archlex.parse("ecs ->");

    const result = archlex.analyze(parsed.ast);

    expect(result.graph.nodes.map((node) => node.id)).toEqual([
      "ecs",
      "__missing_endpoint_1",
    ]);
    expect(result.graph.edges[0]).toMatchObject({
      source: "ecs",
      target: "__missing_endpoint_1",
    });
  });

  it("keeps a valid right endpoint when the left endpoint is missing", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const parsed = archlex.parse("-> rds");

    const result = archlex.analyze(parsed.ast);

    expect(result.graph.nodes.map((node) => node.id)).toEqual([
      "rds",
      "__missing_endpoint_1",
    ]);
    expect(result.graph.edges[0]).toMatchObject({
      source: "__missing_endpoint_1",
      target: "rds",
    });
  });

  it("uses source direction unless a render call overrides it", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const fromSource = await archlex.render("direction TB\nrds > ecs");
    const overridden = await archlex.render("direction TB\nrds > ecs", {
      direction: "LR",
    });

    expect(fromSource.layout.nodes[0]?.x).toBe(fromSource.layout.nodes[1]?.x);
    expect(fromSource.layout.nodes[0]?.y).not.toBe(
      fromSource.layout.nodes[1]?.y,
    );
    expect(overridden.layout.nodes[0]?.y).toBe(overridden.layout.nodes[1]?.y);
    expect(overridden.layout.nodes[0]?.x).not.toBe(
      overridden.layout.nodes[1]?.x,
    );
  });

  it("reports duplicate and late directives while keeping the first value", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const parsed = archlex.parse(
      "direction TB\ndirection LR\nrds\nvalidation off",
    );

    const result = archlex.analyze(parsed.ast);

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "AL-STRUCT-DUPLICATE-DIRECTIVE",
      "AL-STRUCT-LATE-DIRECTIVE",
    ]);
  });

  it("rejects invalid directive values without replacing defaults", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const result = archlex.analyze(
      archlex.parse("direction SIDEWAYS\nvalidation maximum\nrds").ast,
    );

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "AL-STRUCT-INVALID-DIRECTIVE",
      "AL-STRUCT-INVALID-DIRECTIVE",
    ]);
  });
});

describe("display labels and instance names", () => {
  it("shows the instance name for named resources and keeps the service name accessible", () => {
    const archlex = createArchLex({ providers: [gcpProvider()] });
    const result = archlex.analyze(archlex.parse("web: compute-engine").ast);

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "web",
      label: "web",
      accessibleName: "web (Compute Engine)",
    });
  });

  it("keeps the service display name for implicit resources without an accessible name override", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const result = archlex.analyze(archlex.parse("rds").ast);

    expect(result.graph.nodes[0]).toMatchObject({
      id: "rds",
      label: "Amazon RDS",
    });
    expect(result.graph.nodes[0].accessibleName).toBeUndefined();
  });

  it("prefers a display label over the instance name and service name", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const result = archlex.analyze(archlex.parse('db: rds["Primary DB"]').ast);

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "db",
      label: "Primary DB",
      accessibleName: "Primary DB (Amazon RDS)",
    });
  });

  it("applies display labels written on chain nodes", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const result = archlex.analyze(archlex.parse('rds["Primary"] > ecs').ast);

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "rds",
      label: "Primary",
    });
  });

  it("applies a chain label to a previously named instance", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const result = archlex.analyze(
      archlex.parse('api: ecs\napi["Gateway"] > rds').ast,
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "api",
      label: "Gateway",
      accessibleName: "Gateway (Amazon ECS)",
    });
  });

  it("keeps the first display label and diagnoses a conflicting later one", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const result = archlex.analyze(
      archlex.parse('rds["A"] > ecs\nrds["B"] > lambda').ast,
    );

    expect(result.graph.nodes.find((node) => node.id === "rds")?.label).toBe(
      "A",
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "AL-STRUCT-CONFLICTING-LABEL",
          severity: "info",
          elements: ["rds"],
        }),
      ]),
    );
  });

  it("lets declaration labels win over chain labels", () => {
    const archlex = createArchLex({ providers: [awsProvider()] });
    const result = archlex.analyze(
      archlex.parse('rds["Decl"]\nrds["Chain"] > ecs').ast,
    );

    expect(result.graph.nodes.find((node) => node.id === "rds")?.label).toBe(
      "Decl",
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "AL-STRUCT-CONFLICTING-LABEL",
    );
  });
});

describe("Multi-provider dispatch", () => {
  it("resolves qualified gcp kinds through the GCP provider in an aws document", async () => {
    const archlex = createArchLex({
      providers: [awsProvider(), gcpProvider()],
    });

    const result = await archlex.render("provider aws\nrds > gcp.pubsub");

    const pubsub = result.graph.nodes.find((node) => node.id === "gcp.pubsub");
    expect(pubsub?.provider).toBe("gcp");
    expect(pubsub?.serviceKind).toBe("pubsub");
    expect(pubsub?.label).toBe("Pub/Sub");
    expect(pubsub?.icon).toContain("<svg");
    expect(result.svg).toContain('data-archlex-icon="gcp.pubsub"');
  });

  it("resolves unqualified kinds through the gcp document provider", async () => {
    const archlex = createArchLex({
      providers: [awsProvider(), gcpProvider()],
    });

    const result = await archlex.render("provider gcp\ncloud-run > cloud-sql");

    expect(result.graph.nodes.map((node) => node.provider)).toEqual([
      "gcp",
      "gcp",
    ]);
    expect(result.graph.nodes.every((node) => node.icon)).toBe(true);
    expect(result.svg).toContain("Cloud Run");
    expect(result.svg).toContain("Cloud SQL");
    expect(result.svg).toContain('data-archlex-icon="gcp.cloud-run"');
  });

  it("resolves Kubernetes kinds through the k8s document provider", async () => {
    const archlex = createArchLex({
      providers: [awsProvider(), gcpProvider(), k8sProvider()],
    });

    const result = await archlex.render(`provider k8s
cluster production {
  namespace web {
    api: deployment
  }
}`);

    expect(result.graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "k8s",
          serviceKind: "deployment",
          label: "api",
        }),
      ]),
    );
    expect(result.svg).toContain('data-archlex-icon="k8s.deployment"');
  });
});

describe("theme directive", () => {
  it("reports invalid theme value", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const prepared = archlex.prepare("theme blue\nrds");

    expect(prepared.diagnostics.map((d) => d.code)).toContain(
      "AL-STRUCT-INVALID-DIRECTIVE",
    );
    expect(prepared.theme).toBeUndefined();
  });

  it("reports duplicate theme directive", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const prepared = archlex.prepare("theme dark\ntheme light\nrds");

    expect(prepared.diagnostics.map((d) => d.code)).toContain(
      "AL-STRUCT-DUPLICATE-DIRECTIVE",
    );
    expect(prepared.theme).toBe("dark");
  });

  it("reports late theme directive", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const prepared = archlex.prepare("rds\ntheme dark");

    expect(prepared.diagnostics.map((d) => d.code)).toContain(
      "AL-STRUCT-LATE-DIRECTIVE",
    );
  });

  it("exposes theme in prepared diagram", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const prepared = archlex.prepare("theme light\nrds");

    expect(prepared.diagnostics).toEqual([]);
    expect(prepared.theme).toBe("light");
  });

  it("uses source theme when no option provided", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const result = await archlex.render("theme light\nrds");

    // Light theme uses white node fill
    expect(result.svg).toContain('fill="#ffffff"');
  });

  it("option overrides source theme", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const result = await archlex.render("theme light\nrds", { theme: "dark" });

    // Dark theme uses dark gray node fill
    expect(result.svg).toContain('fill="#1f2937"');
  });

  it("uses renderer default when no source directive and no option", async () => {
    const archlex = createArchLex({ providers: [awsProvider()] });

    const result = await archlex.render("rds");

    // Default is dark with dark gray node fill
    expect(result.svg).toContain('fill="#1f2937"');
  });
});
