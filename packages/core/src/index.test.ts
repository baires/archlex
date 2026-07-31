import { describe, expect, it } from "vitest";
import { awsProvider, createCloudMer, gcpProvider } from "./index.js";

describe("Phase 1 canonical rendering", () => {
  it("renders the complete RDS Proxy to RDS to ECS chain", async () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });

    const result = await cloudmer.render("rds-proxy > rds > ecs");

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
    expect(result.svg).toContain('data-cloudmer-icon="aws.rds-proxy"');
  });

  it("returns byte-identical SVG for repeated canonical renders", async () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });

    const first = await cloudmer.render("rds-proxy > rds > ecs");
    const second = await cloudmer.render("rds-proxy > rds > ecs");

    expect(second.svg).toBe(first.svg);
  });

  it("forwards the selected light and dark themes to the SVG renderer", async () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });

    const light = await cloudmer.render("rds-proxy > rds > ecs", {
      theme: "light",
    });
    const dark = await cloudmer.render("rds-proxy > rds > ecs", {
      theme: "dark",
    });

    expect(light.svg).toContain(
      '<rect class="cloudmer-canvas" width="100%" height="100%" fill="#ffffff"',
    );
    expect(dark.svg).toContain(
      '<rect class="cloudmer-canvas" width="100%" height="100%" fill="#111827"',
    );
  });
});

describe("Phase 2 semantic graph", () => {
  it("builds stable containment IDs and resolves names lexically", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const parsed = cloudmer.parse(`account production {
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

    const result = cloudmer.analyze(parsed.ast);

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
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const parsed = cloudmer.parse("api: ecs\napi: rds");

    const result = cloudmer.analyze(parsed.ast);

    expect(result.graph.nodes).toHaveLength(1);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "api",
      serviceKind: "ecs",
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "CM-STRUCT-DUPLICATE-ID",
    );
  });

  it("preserves unknown resources and custom relationships with information diagnostics", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const parsed = cloudmer.parse(
      "source: future-service\nsource -[streams]-> sink",
    );

    const result = cloudmer.analyze(parsed.ast);

    expect(result.graph.nodes.map((node) => node.id)).toEqual([
      "source",
      "sink",
    ]);
    expect(result.graph.edges[0]).toMatchObject({ kind: "streams" });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CM-SEM-UNKNOWN-RESOURCE",
          severity: "info",
        }),
        expect.objectContaining({
          code: "CM-SEM-UNKNOWN-RELATIONSHIP",
          severity: "info",
        }),
      ]),
    );
  });

  it("reverses semantic endpoints for a reverse arrow", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const result = cloudmer.analyze(cloudmer.parse("ecs <- rds").ast);

    expect(result.graph.edges[0]).toMatchObject({
      source: "rds",
      target: "ecs",
      arrow: "<-",
    });
  });

  it("keeps a valid endpoint connected to a recovered placeholder", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const parsed = cloudmer.parse("ecs ->");

    const result = cloudmer.analyze(parsed.ast);

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
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const parsed = cloudmer.parse("-> rds");

    const result = cloudmer.analyze(parsed.ast);

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
    const cloudmer = createCloudMer({ providers: [awsProvider()] });

    const fromSource = await cloudmer.render("direction TB\nrds > ecs");
    const overridden = await cloudmer.render("direction TB\nrds > ecs", {
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
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const parsed = cloudmer.parse(
      "direction TB\ndirection LR\nrds\nvalidation off",
    );

    const result = cloudmer.analyze(parsed.ast);

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "CM-STRUCT-DUPLICATE-DIRECTIVE",
      "CM-STRUCT-LATE-DIRECTIVE",
    ]);
  });

  it("rejects invalid directive values without replacing defaults", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const result = cloudmer.analyze(
      cloudmer.parse("direction SIDEWAYS\nvalidation maximum\nrds").ast,
    );

    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "CM-STRUCT-INVALID-DIRECTIVE",
      "CM-STRUCT-INVALID-DIRECTIVE",
    ]);
  });
});

describe("display labels and instance names", () => {
  it("shows the instance name for named resources and keeps the service name accessible", () => {
    const cloudmer = createCloudMer({ providers: [gcpProvider()] });
    const result = cloudmer.analyze(cloudmer.parse("web: compute-engine").ast);

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "web",
      label: "web",
      accessibleName: "web (Compute Engine)",
    });
  });

  it("keeps the service display name for implicit resources without an accessible name override", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const result = cloudmer.analyze(cloudmer.parse("rds").ast);

    expect(result.graph.nodes[0]).toMatchObject({
      id: "rds",
      label: "Amazon RDS",
    });
    expect(result.graph.nodes[0].accessibleName).toBeUndefined();
  });

  it("prefers a display label over the instance name and service name", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const result = cloudmer.analyze(
      cloudmer.parse('db: rds["Primary DB"]').ast,
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "db",
      label: "Primary DB",
      accessibleName: "Primary DB (Amazon RDS)",
    });
  });

  it("applies display labels written on chain nodes", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const result = cloudmer.analyze(cloudmer.parse('rds["Primary"] > ecs').ast);

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "rds",
      label: "Primary",
    });
  });

  it("applies a chain label to a previously named instance", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const result = cloudmer.analyze(
      cloudmer.parse('api: ecs\napi["Gateway"] > rds').ast,
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.graph.nodes[0]).toMatchObject({
      id: "api",
      label: "Gateway",
      accessibleName: "Gateway (Amazon ECS)",
    });
  });

  it("keeps the first display label and diagnoses a conflicting later one", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const result = cloudmer.analyze(
      cloudmer.parse('rds["A"] > ecs\nrds["B"] > lambda').ast,
    );

    expect(result.graph.nodes.find((node) => node.id === "rds")?.label).toBe(
      "A",
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CM-STRUCT-CONFLICTING-LABEL",
          severity: "info",
          elements: ["rds"],
        }),
      ]),
    );
  });

  it("lets declaration labels win over chain labels", () => {
    const cloudmer = createCloudMer({ providers: [awsProvider()] });
    const result = cloudmer.analyze(
      cloudmer.parse('rds["Decl"]\nrds["Chain"] > ecs').ast,
    );

    expect(result.graph.nodes.find((node) => node.id === "rds")?.label).toBe(
      "Decl",
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "CM-STRUCT-CONFLICTING-LABEL",
    );
  });
});

describe("Multi-provider dispatch", () => {
  it("resolves qualified gcp kinds through the GCP provider in an aws document", async () => {
    const cloudmer = createCloudMer({
      providers: [awsProvider(), gcpProvider()],
    });

    const result = await cloudmer.render("provider aws\nrds > gcp.pubsub");

    const pubsub = result.graph.nodes.find((node) => node.id === "gcp.pubsub");
    expect(pubsub?.provider).toBe("gcp");
    expect(pubsub?.serviceKind).toBe("pubsub");
    expect(pubsub?.label).toBe("Pub/Sub");
    expect(pubsub?.icon).toContain("<svg");
    expect(result.svg).toContain('data-cloudmer-icon="gcp.pubsub"');
  });

  it("resolves unqualified kinds through the gcp document provider", async () => {
    const cloudmer = createCloudMer({
      providers: [awsProvider(), gcpProvider()],
    });

    const result = await cloudmer.render("provider gcp\ncloud-run > cloud-sql");

    expect(result.graph.nodes.map((node) => node.provider)).toEqual([
      "gcp",
      "gcp",
    ]);
    expect(result.graph.nodes.every((node) => node.icon)).toBe(true);
    expect(result.svg).toContain("Cloud Run");
    expect(result.svg).toContain("Cloud SQL");
    expect(result.svg).toContain('data-cloudmer-icon="gcp.cloud-run"');
  });
});
