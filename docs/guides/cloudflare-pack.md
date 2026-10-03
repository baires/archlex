---
title: Cloudflare Pack
description: "Use the 92-resource Cloudflare catalog with bundled artwork, containment validation, and Cloudflare, AWS, GCP and Kubernetes examples."
---

# Cloudflare pack

ArchLex's Cloudflare provider recognizes 92 curated resources with bundled
Cloudflare product artwork. Use it for Cloudflare-only diagrams or combine
qualified Cloudflare resources with AWS, Google Cloud and Kubernetes. Catalog
version: `2026-09-30`. Recognition and artwork cover every ID listed below;
semantic validation checks explicit placement, not runtime networking.

## Register the provider

Register `cloudflareProvider()` from `@archlex/cloudflare` or its core re-export.
The provider ID is `cloudflare`.

```ts
import {
  awsProvider,
  cloudflareProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";

const archlex = createArchLex({
  providers: [cloudflareProvider(), awsProvider(), gcpProvider(), k8sProvider()],
});

const result = await archlex.render(`provider cloudflare
api: workers["Application entry"]
objects: r2["Application objects"]
api -[reads]-> objects`, { validation: "normal", theme: "dark" });

const catalog = archlex.getCatalog("cloudflare");
const services = catalog.providers.cloudflare.services;
```

The CLI, playground and MCP authoring tools recognize `provider cloudflare` and
qualified kinds such as `cloudflare.workers`. Paste an example below into the
playground, or save it as `diagram.archlex` and use the CLI:

```bash
archlex render diagram.archlex --validation normal --theme dark -o diagram.svg
archlex validate diagram.archlex --validation strict
```

Provider/core imports and bundled Cloudflare rendering make no network requests
and register no global icon loader. No Cloudflare CDN adapter is required. The
playground editor and other application dependencies may still need network
access during startup; offline diagram rendering does not imply offline startup.
See the [public API](/specs/public-api) for pipeline and browser mounting APIs.

## IDs, aliases and coverage

With `provider cloudflare`, use a canonical ID such as `workers`. In a mixed
provider document, use its registered alias `cloudflare.workers`. Every ID below
has this qualified alias, and lookup is case-insensitive. The node ID
before the colon, such as `api`, identifies a diagram instance; it is independent
of the catalog resource ID.

The curated catalog includes 92 resources from a pinned 126-icon source
inventory. The 34 excluded navigation, documentation and branding icons are not
architecture resources. Coverage is pinned, rather than a promise to include
every Cloudflare product or every future upstream icon. The provider's
`listServices()` and `archlex.getCatalog("cloudflare")` expose current IDs,
aliases and metadata.

Additional short aliases are supported when Cloudflare is the selected provider:

| Alias | Canonical ID |
| --- | --- |
| `cdn` | `cache` |
| `magic-wan` | `cloudflare-wan` |
| `bot-management` | `bots` |
| `magic-firewall` | `cloudflare-network-firewall` |
| `ssl-tls` | `ssl` |
| `cloudflare-one-client` | `warp-client` |

Prefer qualified canonical IDs in mixed-provider diagrams to make ownership clear.

Categories use the shared ArchLex taxonomy: AI uses `ai-ml`, delivery uses
`networking`, governance uses `management`, and observability uses `monitoring`.

| ID | Display name | Category |
| --- | --- | --- |
| `workers` | Workers | compute |
| `ai-gateway` | AI Gateway | ai-ml |
| `ai-search` | AI Search | ai-ml |
| `workers-ai` | Workers AI | ai-ml |
| `agents` | Agents | compute |
| `browser-run` | Browser Run | compute |
| `containers` | Containers | compute |
| `dynamic-workers` | Dynamic Workers | compute |
| `pages` | Pages | compute |
| `sandbox` | Sandbox | compute |
| `workflows` | Workflows | compute |
| `automatic-platform-optimization` | Automatic Platform Optimization | networking |
| `cache` | Cache | networking |
| `client-ip-geolocation` | Client Ip Geolocation | networking |
| `client-side-security` | Client-side Security | networking |
| `google-tag-gateway` | Google Tag Gateway | networking |
| `images` | Images | networking |
| `moq` | Media over QUIC | networking |
| `realtime-kit` | RealtimeKit | networking |
| `realtime-sfu` | Realtime SFU | networking |
| `realtime-turn` | Realtime TURN | networking |
| `stream` | Stream | networking |
| `zaraz` | Zaraz | networking |
| `flagship` | Flagship | management |
| `registrar` | Registrar | management |
| `rules` | Rules | management |
| `ruleset-engine` | Ruleset Engine | management |
| `version-management` | Version Management | management |
| `email-routing` | Email Routing | messaging |
| `email-service` | Email Service | messaging |
| `pipelines` | Pipelines | messaging |
| `queues` | Queues | messaging |
| `resolver-1111` | 1.1.1.1 Resolver | networking |
| `aegis` | Cloudflare Aegis | networking |
| `argo-smart-routing` | Argo Smart Routing | networking |
| `byoip` | Bring Your Own IP | networking |
| `china-network` | China Network | networking |
| `cloudflare-mesh` | Cloudflare Mesh | networking |
| `cloudflare-wan` | Cloudflare WAN | networking |
| `dns` | DNS | networking |
| `health-checks` | Health Checks | networking |
| `load-balancing` | Load Balancing | networking |
| `magic-transit` | Magic Transit | networking |
| `multi-cloud-networking` | Multi-Cloud Networking | networking |
| `network-interconnect` | Cloudflare Network Interconnect | networking |
| `spectrum` | Spectrum | networking |
| `time-services` | Time Services | networking |
| `tunnel` | Tunnel | networking |
| `workers-vpc` | Workers VPC | networking |
| `analytics` | Analytics | monitoring |
| `dex` | Digital Experience Monitoring | monitoring |
| `log-explorer` | Log Explorer | monitoring |
| `logs` | Logs | monitoring |
| `network-error-logging` | Network Error Logging | monitoring |
| `radar` | Radar | monitoring |
| `web-analytics` | Web Analytics | monitoring |
| `access` | Access | security |
| `ai-crawl-control` | Ai Crawl Control | security |
| `api-shield` | Api Shield | security |
| `bots` | Bot Management | security |
| `browser-isolation` | Browser Isolation | security |
| `casb` | CASB | security |
| `cloudflare-challenges` | Cloudflare Challenges | security |
| `cloudflare-network-firewall` | Cloudflare Network Firewall | security |
| `data-localization` | Data Localization | security |
| `data-loss-prevention` | Data Loss Prevention | security |
| `ddos-protection` | DDoS Protection | security |
| `dmarc-management` | DMARC Management | security |
| `email-security` | Email Security | security |
| `firewall` | Firewall | security |
| `gateway` | Gateway | security |
| `key-transparency` | Key Transparency | security |
| `privacy-gateway` | Privacy Gateway | security |
| `privacy-pass` | Privacy Pass | security |
| `privacy-proxy` | Privacy Proxy | security |
| `security-center` | Security Center | security |
| `ssl` | SSL/TLS | security |
| `turnstile` | Turnstile | security |
| `waf` | WAF | security |
| `waiting-room` | Waiting Room | security |
| `warp-client` | Cloudflare One Client | security |
| `agent-memory` | Agent Memory | storage |
| `artifacts` | Artifacts | storage |
| `d1` | D1 | storage |
| `durable-objects` | Durable Objects | storage |
| `hyperdrive` | Hyperdrive | storage |
| `kv` | Workers KV | storage |
| `r2-data-catalog` | R2 Data Catalog | storage |
| `r2-sql` | R2 SQL | storage |
| `r2` | R2 | storage |
| `secrets-store` | Secrets Store | storage |
| `vectorize` | Vectorize | storage |

## Containment and validation depth

Place Cloudflare resources at the document root or within a logical `account`.
The account describes administrative grouping, not physical execution at an
edge location. Native origin workloads keep their own providers' scopes. Scope
names have no provider ownership field, so use qualified kinds and clear labels.
Presentation-only groups do not establish cloud execution placement.

`CLOUDFLARE-CONTAINMENT-001` reports a recognized Cloudflare node belonging to a
`region`, `vpc`, `subnet`, `cluster` or `namespace`. It checks all explicit ancestor
memberships, including forbidden ancestors outside a nested account, and emits
one diagnostic per affected node. It ignores foreign-provider and unknown kinds.
Move the managed Cloudflare node to root/account and connect it to the origin.

| Mode | Containment result |
| --- | --- |
| `normal` | Warning with node location and remediation |
| `strict` | Error with the same location and remediation |
| `off` | Provider containment validation skipped |

Core syntax, unresolved-resource and structural diagnostics remain separate;
`off` does not suppress parser errors. An unrecognized Cloudflare kind produces
the core `AL-SEM-UNKNOWN-RESOURCE` diagnostic rather than a Cloudflare networking
rule. With several registered providers, each validates its own nodes; graph
edges between providers are preserved for rendering.

For an invalid variant of any example, wrap its `domain` declaration in
`region wrong { ... }`, leaving the relationships unchanged. That Cloudflare
node produces the containment warning/error in normal/strict and no containment
diagnostic in off. Moving it back to root/account fixes the represented placement.

The graph contains no DNS records, policy configuration, Kubernetes selectors,
origin-pool configuration, monitors, protocol settings or observed health. It
therefore does not verify connectivity, WAF/Access effectiveness, endpoint
selection or failover. Partial diagrams need not include a DNS node, Worker,
connector, security capability or two origins to be valid.

## Connectors and flow labels

`cloudflare.tunnel` represents the managed tunnel. Represent the origin-side
`cloudflared` process as a native workload, such as
`k8s.deployment["cloudflared"]` inside its namespace. A VM connector uses its
AWS/GCP host identity. Client products such as `warp-client` remain logical
catalog identities; their presence does not establish deployment or connectivity.

| Intent | Diagram representation |
| --- | --- |
| DNS mapping | Untyped edge labeled `DNS record selects entry point`; not an HTTP hop |
| Public origin request | `proxies` with an explicit request label |
| Tunnel establishment | Connector `connects` to Tunnel, labeled outbound establishment |
| Request through Tunnel | Tunnel `proxies` to connector, then connector to Service |
| Security capability | WAF `protects` or Access `authorizes` the entry point |
| Caching capability | `caches`, labeled with eligible responses |
| Origin steering | `routes` to native origins, labeled preference/fallback intent |

WAF, Access and cache are capability associations, not mandatory appliances in a
physical hop chain. Origin-pool labels express intent without creating synthetic
pool resources or certifying health. Relationship kinds use the existing
[relationship vocabulary](/guides/relationship-types); no `resolves` kind is introduced.

## Executable examples

The playground's **Example** picker includes these four architectures in its
**Cloudflare** group: Workers & R2 Application, Public Edge to AWS, Tunnel into
GCP Kubernetes, and AWS/GCP Origin Steering. Picker examples select Cloudflare as
the document default; native origin resources remain explicitly qualified.

The source blocks below are the CF18/CF19 fixtures. Their valid forms render without
spurious diagnostics in normal, strict and off modes; containment variants test
the mode-specific behavior described above. They are architecture intent, not
Cloudflare configuration exports or connectivity tests.

- [Cloudflare-only application](#cloudflare-only-application)
- [Public edge to AWS](#public-edge-to-aws)
- [Tunnel into Kubernetes on GCP](#tunnel-into-kubernetes-on-gcp)
- [AWS/GCP origin steering](#awsgcp-origin-steering)

### Cloudflare-only application

DNS selects a Worker entry point. WAF and cache attach as capabilities; the
Worker reads R2 objects.

[Fixture source](https://github.com/baires/archlex/blob/main/tests/fixtures/cloudflare/standalone.archlex).

```archlex
provider cloudflare
direction LR
account cloudflare-production {
  domain: dns["app.example.com"]
  entry: workers["Application entry"]
  protection: waf["WAF policy"]
  response-cache: cache["Response caching"]
  objects: r2["Application objects"]
  domain ->|DNS record selects entry point| entry
  protection -[protects]-> entry
  response-cache -[caches]->|Eligible application responses| entry
  entry -[reads]-> objects
}
```

### Public edge to AWS

Cloudflare DNS selects the edge entry. An HTTPS origin request reaches an AWS
ALB in its native subnet, while WAF remains a capability association.

[Fixture source](https://github.com/baires/archlex/blob/main/tests/fixtures/cloudflare/aws-public-edge.archlex).

```archlex
provider aws
direction LR
account cloudflare-production {
  domain: cloudflare.dns["app.example.com"]
  entry: cloudflare.load-balancing["Cloudflare entry point"]
  protection: cloudflare.waf["WAF policy"]
  domain ->|DNS record selects entry point| entry
  protection -[protects]-> entry
}
account aws-production {
  region us-east-1 {
    vpc application {
      subnet public {
        origin: aws.alb["AWS origin"]
      }
    }
  }
}
entry -[proxies]->|HTTPS origin request| origin
```

### Tunnel into Kubernetes on GCP

The managed Tunnel remains at root. The cloudflared Deployment lives in the
Kubernetes namespace with the application Service and Deployment. Establishment
and request flow have separate, opposite arrows. The GKE edge records hosting
context; it does not establish machine-readable ownership of the cluster.

[Fixture source](https://github.com/baires/archlex/blob/main/tests/fixtures/cloudflare/gcp-k8s-tunnel.archlex).

```archlex
provider k8s
direction LR
domain: cloudflare.dns["internal.example.com"]
access-policy: cloudflare.access["Employee access policy"]
tunnel: cloudflare.tunnel["Application tunnel"]
gke-host: gcp.gke["GCP hosting context"]
cluster production {
  namespace web {
    connector: k8s.deployment["cloudflared"]
    backend: k8s.service["Application Service"]
    application: k8s.deployment["Application"]
    connector -[proxies]->|HTTP to Service| backend
    backend -[targets]-> application
  }
}
domain ->|DNS record selects entry point| tunnel
access-policy -[authorizes]-> tunnel
connector -[connects]->|Outbound tunnel establishment| tunnel
tunnel -[proxies]->|Requests over established tunnel| connector
gke-host ->|Hosts connector workload; conceptual association| connector
```

### AWS/GCP origin steering

Routing labels distinguish preferred and fallback endpoints. They explicitly
leave health and steering policy unverified; the diagram does not prove failover.

[Fixture source](https://github.com/baires/archlex/blob/main/tests/fixtures/cloudflare/aws-gcp-failover.archlex).

```archlex
provider cloudflare
direction LR
domain: dns["app.example.com"]
steering: load-balancing["Origin steering"]
aws-origin: aws.alb["AWS preferred endpoint"]
gcp-origin: gcp.cloud-run["GCP fallback endpoint"]
domain ->|DNS record selects entry point| steering
steering -[routes]->|Preferred pool endpoint; health unverified| aws-origin
steering -[routes]->|Fallback pool endpoint; policy unverified| gcp-origin
```

## Artwork provenance and export

All included artwork is bundled from the Cloudflare documentation icon directory
at revision `48f601bf4293fa9032505f858656d0db5b559131`. The project uses CC BY 4.0
repository content as its artwork distribution basis, recorded in the package
[NOTICE](https://github.com/baires/archlex/blob/main/packages/cloudflare/NOTICE.md)
and `LICENSE-ARTWORK`.
ArchLex software remains MIT licensed. Creator/source/license attribution and an
indication of changes are retained in the generated icon descriptions.

Sanitization removes unsafe SVG content. A white backing provides contrast in
both themes. Original glyph geometry, proportions, and viewBox are preserved.
Monochrome ink is recolored to `#f6821f`; white clip-path fills stay white.
Exported SVG embeds the artwork and attribution,
with unique internal fragment IDs and accessible resource names. Keep the
attribution when redistributing exported diagrams; package notices also include
`LICENSE-ARTWORK` and the software `LICENSE`.

Cloudflare names and trademarks remain with their owners. CC BY 4.0 does not
grant trademark rights. ArchLex is a community project and is not sponsored,
endorsed or maintained by Cloudflare.

For repository maintenance, `pnpm validate:catalog` checks Cloudflare catalog
completeness, aliases, scopes and artwork mappings;
`pnpm --filter @archlex/cloudflare icons:check` checks deterministic bundled
artwork. Source updates require a separately reviewed revision and inventory.
