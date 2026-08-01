import type { CdnProviderDefinition } from "@archlex/icons-core";

export const GCP_CDN_PROVIDER: CdnProviderDefinition = {
  provider: "gcp",
  baseUrl:
    "https://cdn.jsdelivr.net/gh/error505/azure-cloud-ai-visualizer@6b9e50e8f6e1e116644aafdd8f492ad041060149/frontend/public/gcp_icons",
  allowedHosts: ["cdn.jsdelivr.net"],
  releaseId: "6b9e50e8f6e1e116644aafdd8f492ad041060149",
  fileExtension: ".svg",
  mappings: {
    // Core Compute
    "cloud-functions": "Cloud-Functions",
    "cloud-run": "Cloud-Run",
    "compute-engine": "Compute-Engine",
    gke: "Google-Kubernetes-Engine",
    "app-engine": "App-Engine",
    batch: "Batch",

    // Storage & Databases
    "cloud-storage": "Cloud-Storage",
    bigquery: "BigQuery",
    "cloud-sql": "Cloud-SQL",
    firestore: "Firestore",
    bigtable: "Bigtable",
    "cloud-spanner": "Cloud-Spanner",
    datastore: "Datastore",
    memorystore: "Memorystore",
    filestore: "Filestore",
    "persistent-disk": "Persistent-Disk",

    // Messaging & Events
    "pub-sub": "PubSub",
    pubsub: "PubSub",
    "cloud-scheduler": "Cloud-Scheduler",
    "cloud-tasks": "Cloud-Tasks",
    workflows: "Workflows",
    eventarc: "Eventarc",

    // Networking
    vpc: "Virtual-Private-Cloud",
    "cloud-load-balancing": "Cloud-Load-Balancing",
    "cloud-cdn": "Cloud-CDN",
    "cloud-armor": "Cloud-Armor",
    "cloud-dns": "Cloud-DNS",
    "cloud-nat": "Cloud-NAT",
    "cloud-vpn": "Cloud-VPN",
    "cloud-interconnect": "Cloud-Interconnect",
    "private-service-connect": "Private-Service-Connect",
    "cloud-router": "Cloud-Router",
    "cloud-endpoints": "Cloud-Endpoints",
    "cloud-domains": "Cloud-Domains",
    "network-intelligence-center": "Network-Intelligence-Center",
    "network-connectivity-center": "Network-Connectivity-Center",
    "traffic-director": "Traffic-Director",

    // Security & Identity
    kms: "Key-Management-Service",
    "secret-manager": "Secret-Manager",
    "security-command-center": "Security-Command-Center",
    "binary-authorization": "Binary-Authorization",
    "certificate-manager": "Certificate-Manager",
    "web-risk": "Web-Risk",
    "identity-platform": "Identity-Platform",
    "access-context-manager": "Access-Context-Manager",
    "assured-workloads": "Assured-Workloads",
    "risk-manager": "Risk-Manager",

    // Management & Governance
    "cloud-logging": "Cloud-Logging",
    "cloud-monitoring": "Cloud-Monitoring",
    "cloud-trace": "Trace",
    "cloud-profiler": "Profiler",
    "error-reporting": "Error-Reporting",

    // Developer Tools
    "cloud-build": "Cloud-Build",
    "cloud-deploy": "Cloud-Deploy",
    "artifact-registry": "Artifact-Registry",
    "container-registry": "Container-Registry",
    "cloud-code": "Cloud-Code",
    "cloud-shell": "Cloud-Shell",

    // Analytics & AI/ML
    dataflow: "Dataflow",
    dataproc: "Dataproc",
    "cloud-composer": "Cloud-Composer",
    "data-fusion": "Cloud-Data-Fusion",
    "vertex-ai": "Vertex-AI",
    looker: "Looker",
    dataplex: "Dataplex",
    datastream: "Datastream",
    "analytics-hub": "Analytics-Hub",
    "speech-to-text": "Speech-To-Text",
    "text-to-speech": "Text-To-Speech",
    dialogflow: "Dialogflow",
    "data-catalog": "Data-Catalog",

    // API Management
    apigee: "Apigee-API-Platform",
    "api-gateway": "Cloud-API-Gateway",

    // IoT
    "cloud-iot": "Iot-Core",

    // Hybrid & Multi-cloud
    anthos: "Anthos",
    "anthos-service-mesh": "Anthos-Service-Mesh",

    // IoT
    "iot-core": "Iot-Core",

    // Gaming
    "game-servers": "Game-Servers",

    // Management & Governance
    "cloud-asset-inventory": "Cloud-Asset-Inventory",

    // Migration & Transfer
    "transfer-appliance": "Transfer-Appliance",
  },
  attribution: {
    source: "IcePanel GCP Icons",
    license: "Community",
    url: "https://gcpicons.com/",
  },
  timeoutMs: 10_000,
  maxResponseBytes: 256_000,
};
