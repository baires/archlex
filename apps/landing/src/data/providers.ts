import { catalogSize, type ExampleProvider } from "./examples";

export type ProviderFaq = { q: string; a: string };

export type ProviderPage = {
  provider: ExampleProvider;
  /** URL slug, e.g. "gcp" for /gcp-architecture-diagrams/. */
  slug: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  docs: { href: string; label: string };
  /** Playground gallery example rendered as the main diagram. */
  featuredExampleId?: string;
  /** Hand-made featured diagram with pre-rendered SVGs in public/diagrams. */
  featuredStatic?: {
    title: string;
    lead: string;
    file: string;
    source: string;
    light: string;
    dark: string;
    alt: string;
    width: number;
    height: number;
  };
  why: { title: string; body: string }[];
  faqs: ProviderFaq[];
};

const count = {
  aws: catalogSize("aws"),
  gcp: catalogSize("gcp"),
  cloudflare: catalogSize("cloudflare"),
  k8s: catalogSize("k8s"),
};

const agentFaq = (name: string): ProviderFaq => ({
  q: `Can an AI agent draw ${name} diagrams with ArchLex?`,
  a: `Yes. Install the agent skill with npx skills add baires/archlex, or connect the free hosted MCP server at https://mcp.archlex.dev/mcp. Claude Code, Cursor, Codex and other MCP clients can look up ${name} resources, validate the source, render SVG and return an editable playground link. No API key or account is required.`,
});

const awsThreeTier = `provider aws
direction LR
validation normal

account prod {
  region us-east-1 {
    vpc main {
      subnet public {
        alb: alb["Web Load Balancer"]
      }

      subnet private-app {
        web1: ec2["Web Server 1"]
        web2: ec2["Web Server 2"]
      }

      subnet private-db {
        db: rds["PostgreSQL Database"]
      }
    }
  }
}

alb -[routes]-> web1
alb -[routes]-> web2
web1 -[reads]-> db
web1 -[writes]-> db
web2 -[reads]-> db
web2 -[writes]-> db`;

export const providerPages: ProviderPage[] = [
  {
    provider: "aws",
    slug: "aws",
    name: "AWS",
    title: "AWS Architecture Diagrams as Code | ArchLex",
    description: `Draw AWS architecture as code with ${count.aws} services and official icons. ArchLex checks diagram resources, scopes and typed connections, then renders SVG.`,
    h1: "AWS architecture diagrams as code.",
    lede: `Describe your AWS architecture in a few lines of text. ArchLex validates placement and connections against its ${count.aws}-service AWS catalog, then renders a clean SVG with official AWS Architecture Icons.`,
    docs: {
      href: "https://docs.archlex.dev/specs/aws-semantics/",
      label: "AWS reference",
    },
    featuredStatic: {
      title: "A three-tier web app on AWS.",
      lead: "An Application Load Balancer in a public subnet, two EC2 web servers in a private subnet, and an RDS database in its own subnet, all inside one VPC.",
      file: "three-tier.arch",
      source: awsThreeTier,
      light: "/diagrams/aws-3-tier-light.svg",
      dark: "/diagrams/aws-3-tier-dark.svg",
      alt: "AWS three-tier architecture: a load balancer routes to two EC2 web servers that read from and write to an RDS PostgreSQL database inside a VPC",
      width: 1051,
      height: 468,
    },
    why: [
      {
        title: "It knows AWS structure.",
        body: "Accounts, regions, VPCs, and subnets are real scopes, so every resource is drawn in the same place it lives in your account.",
      },
      {
        title: "It catches mistakes.",
        body: "Rules cover subnet containment, network placement, security groups, event targets, IAM attachment, and relationship kinds, and each problem comes back with a diagnostic code.",
      },
      {
        title: "It reviews like code.",
        body: "The source is plain text, so architecture changes show up as small, readable diffs in pull requests, and the same source always renders the same SVG.",
      },
      {
        title: "It uses official icons.",
        body: "Services render with the official AWS Architecture Icons instead of generic boxes.",
      },
    ],
    faqs: [
      {
        q: "Which AWS services can I draw?",
        a: `The AWS catalog has ${count.aws} entries across networking, compute, storage, databases, security, observability, integration, analytics, AI, developer tools, migration, media, IoT, hybrid, and management. Unknown kinds still render as generic nodes and report AWS-CATALOG-UNKNOWN-RESOURCE-001.`,
      },
      {
        q: "Does ArchLex inspect my AWS account?",
        a: "No. ArchLex checks the diagram you write: known resources, accounts, regions, VPCs, subnets and typed relationships. It does not read your account or infer IAM policies, security group rules, routes or runtime configuration.",
      },
      {
        q: "Does it use the official AWS icons?",
        a: "Yes. Bundled services render with the official AWS Architecture Icons, imported into sanitized SVG fragments. Additional catalog IDs map to a pinned, allowlisted AWS icon source.",
      },
      agentFaq("AWS"),
    ],
  },
  {
    provider: "gcp",
    slug: "gcp",
    name: "Google Cloud",
    title: "Google Cloud (GCP) Architecture Diagrams as Code | ArchLex",
    description: `Write GCP architecture diagrams as code with ${count.gcp} Google Cloud services and official icons. ArchLex checks VPC placement and typed relationships, then renders SVG.`,
    h1: "Google Cloud architecture diagrams as code.",
    lede: `Describe Cloud Run, GKE, Pub/Sub, BigQuery and the rest of your Google Cloud architecture in plain text. ArchLex checks it against a ${count.gcp}-service GCP catalog and renders SVG with official Google Cloud icons.`,
    docs: {
      href: "https://docs.archlex.dev/specs/gcp-semantics/",
      label: "Google Cloud reference",
    },
    featuredExampleId: "gcp-vpc-architecture",
    why: [
      {
        title: "Organization, region and VPC scopes.",
        body: "An account models an organization or folder, region models regional placement, and vpc with subnet models network containment, so resources sit where they run.",
      },
      {
        title: "Rules written for Google Cloud.",
        body: "Checks cover subnet containment, network placement, Cloud SQL connectivity, Workflows and Eventarc targets, IAP backends, storage and analytics placement, and GKE Autopilot configuration.",
      },
      {
        title: "Typed relationships, not loose arrows.",
        body: "Relationship kinds declare allowed sources and targets. An edge that breaks them returns GCP-RELATIONSHIP-INVALID-ENDPOINT-001 with a fix, instead of silently drawing.",
      },
      {
        title: "Official Google Cloud artwork.",
        body: "Icons come from pinned official Google Cloud archives and are sanitized before rendering.",
      },
    ],
    faqs: [
      {
        q: "Which Google Cloud services are supported?",
        a: `The GCP catalog has ${count.gcp} entries across networking, compute, storage, databases, security, observability, integration, analytics, AI, developer tools, containers, hybrid, healthcare, retail, maps and management. Unknown kinds render as generic nodes and report GCP-CATALOG-UNKNOWN-RESOURCE-001.`,
      },
      {
        q: "Does ArchLex read my GCP project?",
        a: "No. It validates the diagram source only. Rules use facts in the graph and do not infer firewall contents, IAM policy, peering or service configuration.",
      },
      {
        q: "Can I combine Google Cloud with AWS, Cloudflare or Kubernetes?",
        a: "Yes. Register several providers and use qualified kinds such as gcp.cloud-run or gcp.pubsub next to aws.lambda, cloudflare.workers or k8s.deployment in one diagram. Each provider validates its own nodes.",
      },
      agentFaq("Google Cloud"),
    ],
  },
  {
    provider: "cloudflare",
    slug: "cloudflare",
    name: "Cloudflare",
    title: "Cloudflare Architecture Diagrams as Code | ArchLex",
    description: `Diagram Cloudflare Workers, R2, D1, Tunnel and WAF as code with ${count.cloudflare} Cloudflare resources and bundled artwork. Connect them to AWS, GCP or Kubernetes origins.`,
    h1: "Cloudflare architecture diagrams as code.",
    lede: `Draw Workers, R2, D1, Durable Objects, Tunnel, Access, WAF and the rest of your Cloudflare setup from plain text. ArchLex recognizes ${count.cloudflare} Cloudflare resources and connects them to origins on AWS, Google Cloud or Kubernetes.`,
    docs: {
      href: "https://docs.archlex.dev/guides/cloudflare-pack/",
      label: "Cloudflare pack guide",
    },
    featuredExampleId: "cloudflare-aws-public-edge",
    why: [
      {
        title: "Edge and origin in one picture.",
        body: "Qualified kinds such as cloudflare.workers, aws.alb and gcp.cloud-run let one diagram show the Cloudflare edge and the origins behind it.",
      },
      {
        title: "Placement that matches Cloudflare.",
        body: "Cloudflare resources belong at the document root or in a logical account. Putting one inside a region, VPC, subnet, cluster or namespace reports CLOUDFLARE-CONTAINMENT-001 with a fix.",
      },
      {
        title: "A curated catalog.",
        body: `${count.cloudflare} resources cover compute, storage, AI, networking, security and observability, from Workers and Queues to Access, Gateway and Turnstile.`,
      },
      {
        title: "Bundled product artwork.",
        body: "Icons are bundled from the Cloudflare documentation icon directory under CC BY 4.0, with attribution kept in exported SVG. No CDN request is needed to render.",
      },
    ],
    faqs: [
      {
        q: "Which Cloudflare products can I draw?",
        a: `ArchLex recognizes ${count.cloudflare} curated Cloudflare resources, including Workers, Pages, R2, D1, KV, Durable Objects, Queues, Workers AI, Tunnel, Access, Gateway, WAF, DNS and Load Balancing. Every ID also has a qualified alias such as cloudflare.workers.`,
      },
      {
        q: "Does ArchLex verify my Cloudflare configuration?",
        a: "No. It checks explicit placement in the diagram. The graph contains no DNS records, policy configuration or observed health, so it does not verify connectivity, WAF or Access effectiveness, or failover.",
      },
      {
        q: "Is ArchLex affiliated with Cloudflare?",
        a: "No. ArchLex is a community project and is not sponsored, endorsed or maintained by Cloudflare. Cloudflare names and trademarks remain with their owners.",
      },
      agentFaq("Cloudflare"),
    ],
  },
  {
    provider: "k8s",
    slug: "kubernetes",
    name: "Kubernetes",
    title: "Kubernetes Architecture Diagrams as Code | ArchLex",
    description: `Write Kubernetes architecture diagrams as code with ${count.k8s} resources. ArchLex checks cluster and namespace containment and Service, Ingress and volume relationships.`,
    h1: "Kubernetes architecture diagrams as code.",
    lede: `Describe clusters, namespaces, Deployments, Services, Ingresses and volumes in plain text. ArchLex checks them against ${count.k8s} Kubernetes resources and renders SVG with the Kubernetes community icons.`,
    docs: {
      href: "https://docs.archlex.dev/specs/k8s-semantics/",
      label: "Kubernetes reference",
    },
    featuredExampleId: "k8s-microservices",
    why: [
      {
        title: "Clusters and namespaces are real scopes.",
        body: "Namespaces belong inside clusters and workloads belong inside namespaces. A workload or namespace in the wrong place reports a containment diagnostic.",
      },
      {
        title: "Kubernetes relationships.",
        body: "routes (Ingress to Service), targets (Service to workload), mounts, binds (PersistentVolumeClaim to PersistentVolume), scales (HorizontalPodAutoscaler to workload) and schedules-on (Pod to Node) are checked against declared endpoints.",
      },
      {
        title: "Common mistakes, caught.",
        body: "Rules flag bare Pods, Services without workloads, Ingresses without Service routing, unbound claims and RBAC bindings without a subject.",
      },
      {
        title: "Community icons.",
        body: "Resources render with the Kubernetes community icon set, pinned to a fixed commit and sanitized before rendering.",
      },
    ],
    faqs: [
      {
        q: "Which Kubernetes resources are supported?",
        a: `${count.k8s} resources across workloads, networking, configuration, storage, scaling, policy, RBAC, extensibility and control-plane components. Aliases such as deploy, svc and pvc work in the editor.`,
      },
      {
        q: "Does ArchLex read my cluster or manifests?",
        a: "No. It validates the diagram source. Rules do not infer selectors, RBAC policy contents, storage provisioning, admission policy or cluster runtime state.",
      },
      {
        q: "Can I show a cluster running on AWS or Google Cloud?",
        a: "Yes. Use qualified kinds such as k8s.deployment with aws.* or gcp.* resources, or put Cloudflare Tunnel in front of a cluster. The gallery includes a Cloudflare Tunnel into GKE example.",
      },
      agentFaq("Kubernetes"),
    ],
  },
];

export const providerPath = (page: Pick<ProviderPage, "slug">): string =>
  `/${page.slug}-architecture-diagrams/`;

export function providerPage(provider: ExampleProvider): ProviderPage {
  const page = providerPages.find((item) => item.provider === provider);
  if (!page) throw new Error(`No provider page for ${provider}`);
  return page;
}
