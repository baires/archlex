import type { ResourceDefinition } from "@archlex/model";
import { defineService } from "../builder.js";

export const initialServices: ResourceDefinition[] = [
  // Boundaries
  defineService({
    id: "account",
    displayName: "Google Cloud Organization",
    category: "boundary",
    aliases: ["gcp-account", "organization", "folder"],
  }),
  defineService({
    id: "region",
    displayName: "Google Cloud Region",
    category: "boundary",
    aliases: ["gcp-region"],
  }),
  defineService({
    id: "project",
    displayName: "Google Cloud Project",
    category: "boundary",
    aliases: ["gcp.project", "gcp-project"],
  }),

  // Networking
  defineService({
    id: "vpc",
    displayName: "VPC Network",
    category: "networking",
    aliases: ["gcp.vpc", "vpc-network"],
  }),
  defineService({
    id: "subnet",
    displayName: "VPC Subnet",
    category: "networking",
    aliases: ["gcp.subnet"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "cloud-load-balancing",
    displayName: "Cloud Load Balancing",
    category: "networking",
    aliases: ["gcp.cloud-load-balancing", "lb", "load-balancer"],
  }),
  defineService({
    id: "cloud-dns",
    displayName: "Cloud DNS",
    category: "networking",
    aliases: ["gcp.cloud-dns", "dns"],
  }),
  defineService({
    id: "cloud-cdn",
    displayName: "Cloud CDN",
    category: "networking",
    aliases: ["gcp.cloud-cdn", "cdn"],
  }),

  // Compute
  defineService({
    id: "compute-engine",
    displayName: "Compute Engine",
    category: "compute",
    aliases: ["gcp.compute-engine", "gce", "vm"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "cloud-run",
    displayName: "Cloud Run",
    category: "compute",
    aliases: ["gcp.cloud-run", "run"],
  }),
  defineService({
    id: "cloud-functions",
    displayName: "Cloud Functions",
    category: "compute",
    aliases: ["gcp.cloud-functions", "functions", "gcf"],
  }),
  defineService({
    id: "gke",
    displayName: "Google Kubernetes Engine",
    category: "compute",
    aliases: ["gcp.gke", "kubernetes"],
    allowedContainment: ["subnet"],
  }),

  // Data
  defineService({
    id: "cloud-sql",
    displayName: "Cloud SQL",
    category: "database",
    aliases: ["gcp.cloud-sql", "sql"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "cloud-spanner",
    displayName: "Cloud Spanner",
    category: "database",
    aliases: ["gcp.cloud-spanner", "spanner"],
  }),
  defineService({
    id: "firestore",
    displayName: "Cloud Firestore",
    category: "database",
    aliases: ["gcp.firestore", "firestore-db"],
  }),
  defineService({
    id: "bigtable",
    displayName: "Bigtable",
    category: "database",
    aliases: ["gcp.bigtable", "big-table"],
  }),
  defineService({
    id: "memorystore",
    displayName: "Memorystore",
    category: "database",
    aliases: ["gcp.memorystore", "redis"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "cloud-storage",
    displayName: "Cloud Storage",
    category: "storage",
    aliases: ["gcp.cloud-storage", "gcs", "bucket"],
  }),

  // Messaging & Events
  defineService({
    id: "pubsub",
    displayName: "Pub/Sub",
    category: "messaging",
    aliases: ["gcp.pubsub", "pub-sub"],
  }),
  defineService({
    id: "cloud-tasks",
    displayName: "Cloud Tasks",
    category: "messaging",
    aliases: ["gcp.cloud-tasks", "tasks"],
  }),

  // Analytics & AI
  defineService({
    id: "bigquery",
    displayName: "BigQuery",
    category: "analytics",
    aliases: ["gcp.bigquery", "bq"],
  }),
  defineService({
    id: "dataflow",
    displayName: "Dataflow",
    category: "analytics",
    aliases: ["gcp.dataflow"],
  }),
  defineService({
    id: "dataproc",
    displayName: "Dataproc",
    category: "analytics",
    aliases: ["gcp.dataproc"],
  }),
  defineService({
    id: "looker",
    displayName: "Looker",
    category: "analytics",
    aliases: ["gcp.looker"],
  }),
  defineService({
    id: "dataplex",
    displayName: "Dataplex",
    category: "analytics",
    aliases: ["gcp.dataplex"],
  }),
  defineService({
    id: "datastream",
    displayName: "Datastream",
    category: "analytics",
    aliases: ["gcp.datastream"],
  }),
  defineService({
    id: "vertex-ai",
    displayName: "Vertex AI",
    category: "ai-ml",
    aliases: ["gcp.vertex-ai", "vertex"],
  }),

  // Identity & Security
  defineService({
    id: "iam",
    displayName: "Identity and Access Management",
    category: "identity",
    aliases: ["gcp.iam", "identity"],
  }),
  defineService({
    id: "secret-manager",
    displayName: "Secret Manager",
    category: "security",
    aliases: ["gcp.secret-manager", "secrets"],
  }),

  // Tier 1: Networking
  defineService({
    id: "cloud-nat",
    displayName: "Cloud NAT",
    category: "networking",
    aliases: ["gcp.cloud-nat", "nat"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "cloud-vpn",
    displayName: "Cloud VPN",
    category: "networking",
    aliases: ["gcp.cloud-vpn", "vpn"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-interconnect",
    displayName: "Cloud Interconnect",
    category: "networking",
    aliases: ["gcp.cloud-interconnect", "interconnect"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "private-service-connect",
    displayName: "Private Service Connect",
    category: "networking",
    aliases: ["gcp.private-service-connect", "psc"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "cloud-router",
    displayName: "Cloud Router",
    category: "networking",
    aliases: ["gcp.cloud-router"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "vpc-service-controls",
    displayName: "VPC Service Controls",
    category: "security",
    aliases: ["gcp.vpc-service-controls"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "firewall",
    displayName: "Cloud Firewall",
    category: "security",
    aliases: ["gcp.firewall"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "cloud-armor",
    displayName: "Cloud Armor",
    category: "security",
    aliases: ["gcp.cloud-armor"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "network-endpoint-groups",
    displayName: "Network Endpoint Groups",
    category: "networking",
    aliases: ["gcp.network-endpoint-groups", "neg"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "cloud-domains",
    displayName: "Cloud Domains",
    category: "networking",
    aliases: ["gcp.cloud-domains"],
    allowedContainment: ["project"],
  }),

  // Tier 1: Compute
  defineService({
    id: "cloud-workstations",
    displayName: "Cloud Workstations",
    category: "compute",
    aliases: ["gcp.cloud-workstations", "workstations"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "batch",
    displayName: "Batch",
    category: "compute",
    aliases: ["gcp.batch"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "app-engine",
    displayName: "App Engine",
    category: "compute",
    aliases: ["gcp.app-engine", "gae"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-shell",
    displayName: "Cloud Shell",
    category: "compute",
    aliases: ["gcp.cloud-shell"],
    allowedContainment: ["project"],
  }),

  // Tier 1: Storage
  defineService({
    id: "persistent-disk",
    displayName: "Persistent Disk",
    category: "storage",
    aliases: ["gcp.persistent-disk", "pd"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "filestore",
    displayName: "Filestore",
    category: "storage",
    aliases: ["gcp.filestore"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "archive-storage",
    displayName: "Archive Storage",
    category: "storage",
    aliases: ["gcp.archive-storage"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "transfer-service",
    displayName: "Storage Transfer Service",
    category: "storage",
    aliases: ["gcp.transfer-service"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "transfer-appliance",
    displayName: "Transfer Appliance",
    category: "storage",
    aliases: ["gcp.transfer-appliance"],
    allowedContainment: ["project"],
  }),

  // Tier 1: Database
  defineService({
    id: "alloydb",
    displayName: "AlloyDB",
    category: "database",
    aliases: ["gcp.alloydb", "alloydb-for-postgresql"],
    allowedContainment: ["subnet"],
  }),
  defineService({
    id: "cloud-memcached",
    displayName: "Memorystore for Memcached",
    category: "database",
    aliases: ["gcp.cloud-memcached", "memcached"],
    allowedContainment: ["vpc"],
  }),
  defineService({
    id: "datastore",
    displayName: "Cloud Datastore",
    category: "database",
    aliases: ["gcp.datastore"],
    allowedContainment: ["region"],
  }),

  // Tier 1: Security
  defineService({
    id: "cloud-kms",
    displayName: "Cloud KMS",
    category: "security",
    aliases: ["gcp.cloud-kms", "kms"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "security-command-center",
    displayName: "Security Command Center",
    category: "security",
    aliases: ["gcp.security-command-center", "scc"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "binary-authorization",
    displayName: "Binary Authorization",
    category: "security",
    aliases: ["gcp.binary-authorization"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "certificate-manager",
    displayName: "Certificate Manager",
    category: "security",
    aliases: ["gcp.certificate-manager"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-hsm",
    displayName: "Cloud HSM",
    category: "security",
    aliases: ["gcp.cloud-hsm", "hsm"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "recaptcha-enterprise",
    displayName: "reCAPTCHA Enterprise",
    category: "security",
    aliases: ["gcp.recaptcha-enterprise"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "web-risk",
    displayName: "Web Risk",
    category: "security",
    aliases: ["gcp.web-risk"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "identity-platform",
    displayName: "Identity Platform",
    category: "identity",
    aliases: ["gcp.identity-platform"],
    allowedContainment: ["project"],
  }),

  // Tier 1: Monitoring
  defineService({
    id: "cloud-monitoring",
    displayName: "Cloud Monitoring",
    category: "monitoring",
    aliases: ["gcp.cloud-monitoring", "monitoring"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "cloud-logging",
    displayName: "Cloud Logging",
    category: "monitoring",
    aliases: ["gcp.cloud-logging", "logging"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "cloud-trace",
    displayName: "Cloud Trace",
    category: "monitoring",
    aliases: ["gcp.cloud-trace", "trace"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "cloud-profiler",
    displayName: "Cloud Profiler",
    category: "monitoring",
    aliases: ["gcp.cloud-profiler", "profiler"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "error-reporting",
    displayName: "Error Reporting",
    category: "monitoring",
    aliases: ["gcp.error-reporting"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "cloud-debugger",
    displayName: "Cloud Debugger",
    category: "monitoring",
    aliases: ["gcp.cloud-debugger", "debugger"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "operations",
    displayName: "Cloud Operations",
    category: "monitoring",
    aliases: ["gcp.operations"],
    allowedContainment: ["project"],
  }),

  // Tier 2: Application Integration
  defineService({
    id: "cloud-scheduler",
    displayName: "Cloud Scheduler",
    category: "integration",
    aliases: ["gcp.cloud-scheduler", "scheduler"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "workflows",
    displayName: "Workflows",
    category: "integration",
    aliases: ["gcp.workflows"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "eventarc",
    displayName: "Eventarc",
    category: "integration",
    aliases: ["gcp.eventarc"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-composer",
    displayName: "Cloud Composer",
    category: "integration",
    aliases: ["gcp.cloud-composer", "composer", "airflow"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "apigee",
    displayName: "Apigee API Management",
    category: "integration",
    aliases: ["gcp.apigee"],
    allowedContainment: ["region"],
  }),

  // Tier 2: Analytics
  defineService({
    id: "dataproc",
    displayName: "Dataproc",
    category: "analytics",
    aliases: ["gcp.dataproc"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "dataform",
    displayName: "Dataform",
    category: "analytics",
    aliases: ["gcp.dataform"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "looker",
    displayName: "Looker",
    category: "analytics",
    aliases: ["gcp.looker"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "data-fusion",
    displayName: "Cloud Data Fusion",
    category: "analytics",
    aliases: ["gcp.data-fusion", "datafusion"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "dataplex",
    displayName: "Dataplex",
    category: "analytics",
    aliases: ["gcp.dataplex"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "datastream",
    displayName: "Datastream",
    category: "analytics",
    aliases: ["gcp.datastream"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "pubsub-lite",
    displayName: "Pub/Sub Lite",
    category: "integration",
    aliases: ["gcp.pubsub-lite", "pubsublite"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "analytics-hub",
    displayName: "Analytics Hub",
    category: "analytics",
    aliases: ["gcp.analytics-hub"],
    allowedContainment: ["region"],
  }),

  // Tier 2: AI/ML
  defineService({
    id: "ai-platform",
    displayName: "AI Platform",
    category: "ai-ml",
    aliases: ["gcp.ai-platform"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "automl",
    displayName: "AutoML",
    category: "ai-ml",
    aliases: ["gcp.automl"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "recommendations-ai",
    displayName: "Recommendations AI",
    category: "ai-ml",
    aliases: ["gcp.recommendations-ai"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "vision-ai",
    displayName: "Vision AI",
    category: "ai-ml",
    aliases: ["gcp.vision-ai", "cloud-vision"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "natural-language-ai",
    displayName: "Natural Language AI",
    category: "ai-ml",
    aliases: ["gcp.natural-language-ai", "cloud-natural-language"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "speech-to-text",
    displayName: "Speech-to-Text",
    category: "ai-ml",
    aliases: ["gcp.speech-to-text", "cloud-speech"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "text-to-speech",
    displayName: "Text-to-Speech",
    category: "ai-ml",
    aliases: ["gcp.text-to-speech"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "translation-ai",
    displayName: "Translation AI",
    category: "ai-ml",
    aliases: ["gcp.translation-ai", "cloud-translation"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "document-ai",
    displayName: "Document AI",
    category: "ai-ml",
    aliases: ["gcp.document-ai"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "video-intelligence",
    displayName: "Video Intelligence API",
    category: "ai-ml",
    aliases: ["gcp.video-intelligence", "cloud-video-intelligence"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "dialogflow",
    displayName: "Dialogflow",
    category: "ai-ml",
    aliases: ["gcp.dialogflow"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "contact-center-ai",
    displayName: "Contact Center AI",
    category: "ai-ml",
    aliases: ["gcp.contact-center-ai", "ccai"],
    allowedContainment: ["region"],
  }),

  // Tier 2: Developer Tools
  defineService({
    id: "cloud-build",
    displayName: "Cloud Build",
    category: "devtools",
    aliases: ["gcp.cloud-build", "cloudbuild"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-deploy",
    displayName: "Cloud Deploy",
    category: "devtools",
    aliases: ["gcp.cloud-deploy"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "artifact-registry",
    displayName: "Artifact Registry",
    category: "devtools",
    aliases: ["gcp.artifact-registry"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "source-repositories",
    displayName: "Cloud Source Repositories",
    category: "devtools",
    aliases: ["gcp.source-repositories", "source-repos"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-code",
    displayName: "Cloud Code",
    category: "devtools",
    aliases: ["gcp.cloud-code"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-sdk",
    displayName: "Cloud SDK",
    category: "devtools",
    aliases: ["gcp.cloud-sdk", "gcloud"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "skaffold",
    displayName: "Skaffold",
    category: "devtools",
    aliases: ["gcp.skaffold"],
    allowedContainment: ["region"],
  }),

  // Tier 2: Containers
  defineService({
    id: "gke-autopilot",
    displayName: "GKE Autopilot",
    category: "containers",
    aliases: ["gcp.gke-autopilot", "autopilot"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "gke-enterprise",
    displayName: "GKE Enterprise",
    category: "containers",
    aliases: ["gcp.gke-enterprise", "anthos"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "container-registry",
    displayName: "Container Registry",
    category: "containers",
    aliases: ["gcp.container-registry", "gcr"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-run-jobs",
    displayName: "Cloud Run Jobs",
    category: "compute",
    aliases: ["gcp.cloud-run-jobs"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "anthos-service-mesh",
    displayName: "Anthos Service Mesh",
    category: "containers",
    aliases: ["gcp.anthos-service-mesh", "asm"],
    allowedContainment: ["region"],
  }),

  // Tier 2: API Management
  defineService({
    id: "cloud-endpoints",
    displayName: "Cloud Endpoints",
    category: "integration",
    aliases: ["gcp.cloud-endpoints", "endpoints"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "api-gateway",
    displayName: "API Gateway",
    category: "integration",
    aliases: ["gcp.api-gateway"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "apigee-hybrid",
    displayName: "Apigee Hybrid",
    category: "integration",
    aliases: ["gcp.apigee-hybrid"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "apigee-x",
    displayName: "Apigee X",
    category: "integration",
    aliases: ["gcp.apigee-x"],
    allowedContainment: ["region"],
  }),

  // Tier 2: Identity & Access
  defineService({
    id: "cloud-identity",
    displayName: "Cloud Identity",
    category: "identity",
    aliases: ["gcp.cloud-identity"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "iap",
    displayName: "Identity-Aware Proxy",
    category: "security",
    aliases: ["gcp.iap", "identity-aware-proxy"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "access-context-manager",
    displayName: "Access Context Manager",
    category: "security",
    aliases: ["gcp.access-context-manager", "acm"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "managed-ad",
    displayName: "Managed Service for Microsoft AD",
    category: "identity",
    aliases: ["gcp.managed-ad", "managed-microsoft-ad"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-identity-engine",
    displayName: "Cloud Identity Engine",
    category: "identity",
    aliases: ["gcp.cloud-identity-engine"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "workforce-identity-federation",
    displayName: "Workforce Identity Federation",
    category: "identity",
    aliases: ["gcp.workforce-identity-federation", "wif"],
    allowedContainment: ["account"],
  }),

  // Tier 3: IoT (legacy)
  defineService({
    id: "iot-core",
    displayName: "Cloud IoT Core",
    category: "integration",
    aliases: ["gcp.iot-core", "iot"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Media Services
  defineService({
    id: "transcoder-api",
    displayName: "Transcoder API",
    category: "compute",
    aliases: ["gcp.transcoder-api", "transcoder"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "video-intelligence-api",
    displayName: "Video Intelligence API",
    category: "ai-ml",
    aliases: ["gcp.video-intelligence-api"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "live-stream-api",
    displayName: "Live Stream API",
    category: "compute",
    aliases: ["gcp.live-stream-api", "livestream"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "media-cdn",
    displayName: "Media CDN",
    category: "networking",
    aliases: ["gcp.media-cdn"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Gaming
  defineService({
    id: "game-servers",
    displayName: "Game Servers",
    category: "compute",
    aliases: ["gcp.game-servers", "agones"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "play-games-services",
    displayName: "Google Play Games Services",
    category: "compute",
    aliases: ["gcp.play-games-services"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Business Applications
  defineService({
    id: "chrome-enterprise",
    displayName: "Chrome Enterprise",
    category: "management",
    aliases: ["gcp.chrome-enterprise"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "cloud-search",
    displayName: "Cloud Search",
    category: "management",
    aliases: ["gcp.cloud-search"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "workspace-apis",
    displayName: "Google Workspace APIs",
    category: "management",
    aliases: ["gcp.workspace-apis", "workspace"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "appsheet",
    displayName: "AppSheet",
    category: "management",
    aliases: ["gcp.appsheet"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Specialized Compute
  defineService({
    id: "bare-metal-solution",
    displayName: "Bare Metal Solution",
    category: "compute",
    aliases: ["gcp.bare-metal-solution", "bms"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "vmware-engine",
    displayName: "VMware Engine",
    category: "compute",
    aliases: ["gcp.vmware-engine", "gcve"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "anthos-vmware",
    displayName: "Anthos on VMware",
    category: "containers",
    aliases: ["gcp.anthos-vmware"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "anthos-aws",
    displayName: "Anthos on AWS",
    category: "containers",
    aliases: ["gcp.anthos-aws"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "anthos-azure",
    displayName: "Anthos on Azure",
    category: "containers",
    aliases: ["gcp.anthos-azure"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Migration Services
  defineService({
    id: "database-migration",
    displayName: "Database Migration Service",
    category: "management",
    aliases: ["gcp.database-migration", "dms"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "migrate-compute-engine",
    displayName: "Migrate for Compute Engine",
    category: "management",
    aliases: ["gcp.migrate-compute-engine"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "migrate-anthos",
    displayName: "Migrate for Anthos",
    category: "management",
    aliases: ["gcp.migrate-anthos"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "bigquery-transfer",
    displayName: "BigQuery Data Transfer Service",
    category: "analytics",
    aliases: ["gcp.bigquery-transfer", "bq-transfer"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-data-transfer",
    displayName: "Cloud Data Transfer",
    category: "management",
    aliases: ["gcp.cloud-data-transfer"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "rapid-migration-assessment",
    displayName: "Rapid Migration Assessment",
    category: "management",
    aliases: ["gcp.rapid-migration-assessment", "rma"],
    allowedContainment: ["project"],
  }),

  // Tier 3: API Management (Extended)
  defineService({
    id: "endpoints-service-management",
    displayName: "Cloud Endpoints Service Management",
    category: "integration",
    aliases: ["gcp.endpoints-service-management"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "endpoints-service-control",
    displayName: "Cloud Endpoints Service Control",
    category: "integration",
    aliases: ["gcp.endpoints-service-control"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "service-infrastructure",
    displayName: "Service Infrastructure",
    category: "integration",
    aliases: ["gcp.service-infrastructure"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Identity (Extended)
  defineService({
    id: "cloud-identity-premium",
    displayName: "Cloud Identity Premium",
    category: "identity",
    aliases: ["gcp.cloud-identity-premium"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "context-aware-access",
    displayName: "Context-Aware Access",
    category: "security",
    aliases: ["gcp.context-aware-access"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "beyondcorp-enterprise",
    displayName: "BeyondCorp Enterprise",
    category: "security",
    aliases: ["gcp.beyondcorp-enterprise", "beyondcorp"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "assured-workloads",
    displayName: "Assured Workloads",
    category: "security",
    aliases: ["gcp.assured-workloads"],
    allowedContainment: ["account"],
  }),

  // Tier 3: Healthcare & Life Sciences
  defineService({
    id: "cloud-healthcare-api",
    displayName: "Cloud Healthcare API",
    category: "management",
    aliases: ["gcp.cloud-healthcare-api", "healthcare"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-life-sciences",
    displayName: "Cloud Life Sciences",
    category: "management",
    aliases: ["gcp.cloud-life-sciences", "life-sciences"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "medical-imaging-suite",
    displayName: "Medical Imaging Suite",
    category: "management",
    aliases: ["gcp.medical-imaging-suite"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Retail & Commerce
  defineService({
    id: "retail-api",
    displayName: "Retail API",
    category: "management",
    aliases: ["gcp.retail-api", "retail"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "product-discovery",
    displayName: "Discovery AI for Retail",
    category: "management",
    aliases: ["gcp.product-discovery"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Security (Extended)
  defineService({
    id: "chronicle",
    displayName: "Chronicle Security Operations",
    category: "security",
    aliases: ["gcp.chronicle"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "cloud-asset-inventory",
    displayName: "Cloud Asset Inventory",
    category: "security",
    aliases: ["gcp.cloud-asset-inventory", "asset-inventory"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "policy-intelligence",
    displayName: "Policy Intelligence",
    category: "security",
    aliases: ["gcp.policy-intelligence"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "risk-manager",
    displayName: "Risk Manager",
    category: "security",
    aliases: ["gcp.risk-manager"],
    allowedContainment: ["account"],
  }),

  // Tier 3: Networking (Extended)
  defineService({
    id: "network-intelligence-center",
    displayName: "Network Intelligence Center",
    category: "networking",
    aliases: ["gcp.network-intelligence-center", "nic"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "network-connectivity-center",
    displayName: "Network Connectivity Center",
    category: "networking",
    aliases: ["gcp.network-connectivity-center", "ncc"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "traffic-director",
    displayName: "Traffic Director",
    category: "networking",
    aliases: ["gcp.traffic-director"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "service-directory",
    displayName: "Service Directory",
    category: "networking",
    aliases: ["gcp.service-directory"],
    allowedContainment: ["region"],
  }),

  // Tier 3: Management Tools
  defineService({
    id: "deployment-manager",
    displayName: "Cloud Deployment Manager",
    category: "devtools",
    aliases: ["gcp.deployment-manager"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "config-connector",
    displayName: "Config Connector",
    category: "devtools",
    aliases: ["gcp.config-connector"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-billing",
    displayName: "Cloud Billing API",
    category: "management",
    aliases: ["gcp.cloud-billing", "billing"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "recommender",
    displayName: "Recommender",
    category: "management",
    aliases: ["gcp.recommender"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "active-assist",
    displayName: "Active Assist",
    category: "management",
    aliases: ["gcp.active-assist"],
    allowedContainment: ["project"],
  }),

  // Tier 3: Data Governance
  defineService({
    id: "data-catalog",
    displayName: "Data Catalog",
    category: "management",
    aliases: ["gcp.data-catalog"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "dlp",
    displayName: "Cloud Data Loss Prevention",
    category: "security",
    aliases: ["gcp.dlp", "data-loss-prevention"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "sensitive-data-protection",
    displayName: "Sensitive Data Protection",
    category: "security",
    aliases: ["gcp.sensitive-data-protection"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Edge/Hybrid
  defineService({
    id: "distributed-cloud-edge",
    displayName: "Google Distributed Cloud Edge",
    category: "compute",
    aliases: ["gcp.distributed-cloud-edge", "gdc-edge"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "distributed-cloud-hosted",
    displayName: "Google Distributed Cloud Hosted",
    category: "compute",
    aliases: ["gcp.distributed-cloud-hosted", "gdc-hosted"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "edge-tpu",
    displayName: "Edge TPU",
    category: "compute",
    aliases: ["gcp.edge-tpu"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "gdc-virtual",
    displayName: "Google Distributed Cloud Virtual",
    category: "compute",
    aliases: ["gcp.gdc-virtual"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Maps & Location
  defineService({
    id: "maps-platform",
    displayName: "Google Maps Platform",
    category: "management",
    aliases: ["gcp.maps-platform", "maps"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "places-api",
    displayName: "Places API",
    category: "management",
    aliases: ["gcp.places-api"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "routes-api",
    displayName: "Routes API",
    category: "management",
    aliases: ["gcp.routes-api"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "geocoding-api",
    displayName: "Geocoding API",
    category: "management",
    aliases: ["gcp.geocoding-api"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "street-view-api",
    displayName: "Street View API",
    category: "management",
    aliases: ["gcp.street-view-api"],
    allowedContainment: ["project"],
  }),

  // Tier 4: Content & Media
  defineService({
    id: "youtube-data-api",
    displayName: "YouTube Data API",
    category: "management",
    aliases: ["gcp.youtube-data-api", "youtube"],
    allowedContainment: ["project"],
  }),

  // Tier 4: AI/ML Extended
  defineService({
    id: "dialogflow-cx",
    displayName: "Dialogflow CX",
    category: "ai-ml",
    aliases: ["gcp.dialogflow-cx"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "ccai-platform",
    displayName: "Contact Center AI Platform",
    category: "ai-ml",
    aliases: ["gcp.ccai-platform"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "cloud-talent-solution",
    displayName: "Cloud Talent Solution",
    category: "ai-ml",
    aliases: ["gcp.cloud-talent-solution"],
    allowedContainment: ["region"],
  }),

  // Tier 4: Security Extended
  defineService({
    id: "chronicle-soar",
    displayName: "Chronicle SOAR",
    category: "security",
    aliases: ["gcp.chronicle-soar"],
    allowedContainment: ["account"],
  }),

  // Tier 4: Management & Governance
  defineService({
    id: "cloud-foundation-toolkit",
    displayName: "Cloud Foundation Toolkit",
    category: "devtools",
    aliases: ["gcp.cloud-foundation-toolkit", "cft"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "cloud-resource-manager",
    displayName: "Cloud Resource Manager",
    category: "management",
    aliases: ["gcp.cloud-resource-manager", "crm"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "cloud-billing-budget",
    displayName: "Cloud Billing Budget",
    category: "management",
    aliases: ["gcp.cloud-billing-budget"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "cloud-quotas",
    displayName: "Cloud Quotas",
    category: "management",
    aliases: ["gcp.cloud-quotas"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "infrastructure-manager",
    displayName: "Infrastructure Manager",
    category: "devtools",
    aliases: ["gcp.infrastructure-manager"],
    allowedContainment: ["region"],
  }),
  defineService({
    id: "policy-simulator",
    displayName: "Policy Simulator",
    category: "security",
    aliases: ["gcp.policy-simulator"],
    allowedContainment: ["account"],
  }),

  // Tier 4: Collaboration & Productivity
  defineService({
    id: "workspace",
    displayName: "Google Workspace",
    category: "management",
    aliases: ["gcp.workspace"],
    allowedContainment: ["account"],
  }),
  defineService({
    id: "gmail-api",
    displayName: "Gmail API",
    category: "management",
    aliases: ["gcp.gmail-api"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "calendar-api",
    displayName: "Calendar API",
    category: "management",
    aliases: ["gcp.calendar-api"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "drive-api",
    displayName: "Drive API",
    category: "management",
    aliases: ["gcp.drive-api"],
    allowedContainment: ["project"],
  }),

  // Tier 4: Testing & QA
  defineService({
    id: "firebase-test-lab",
    displayName: "Firebase Test Lab",
    category: "devtools",
    aliases: ["gcp.firebase-test-lab", "test-lab"],
    allowedContainment: ["project"],
  }),
  defineService({
    id: "cloud-testing",
    displayName: "Cloud Testing",
    category: "devtools",
    aliases: ["gcp.cloud-testing"],
    allowedContainment: ["project"],
  }),
];

export const GCP_SERVICE_CATALOG = new Map<string, ResourceDefinition>();
export const GCP_ALIAS_MAP = new Map<string, string>();

for (const service of initialServices) {
  GCP_SERVICE_CATALOG.set(service.id, service);
  GCP_ALIAS_MAP.set(service.id, service.id);
  for (const alias of service.aliases) {
    GCP_ALIAS_MAP.set(alias.toLowerCase(), service.id);
  }
}

export function resolveGcpService(
  kindOrAlias: string,
): ResourceDefinition | undefined {
  const normalized = kindOrAlias.toLowerCase();
  const canonicalId = GCP_ALIAS_MAP.get(normalized) ?? normalized;
  return GCP_SERVICE_CATALOG.get(canonicalId);
}
