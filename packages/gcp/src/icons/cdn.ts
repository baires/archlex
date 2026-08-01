import type { CdnProviderConfig } from "@archlex/icons";

export const GCP_CDN_CONFIG: CdnProviderConfig = {
  provider: "gcp",
  name: "icepanel-gcp",
  baseUrl: "https://icon.icepanel.io/GCP/svg",
  fileExtension: ".svg",
  attribution: {
    source: "IcePanel GCP Icons",
    license: "Community",
    url: "https://gcpicons.com/",
  },
};

export const GCP_ICON_NAME_MAPPING: Record<string, string> = {
  "cloud-functions": "Cloud-Functions",
  "cloud-run": "Cloud-Run",
  "cloud-storage": "Cloud-Storage",
  bigquery: "BigQuery",
  "cloud-sql": "Cloud-SQL",
  firestore: "Firestore",
  "pub-sub": "Cloud-Pub-Sub",
  "cloud-scheduler": "Cloud-Scheduler",
  "cloud-tasks": "Cloud-Tasks",
  "compute-engine": "Compute-Engine",
  gke: "Google-Kubernetes-Engine",
  "app-engine": "App-Engine",
  "cloud-cdn": "Cloud-CDN",
  "cloud-armor": "Cloud-Armor",
  "cloud-dns": "Cloud-DNS",
  "cloud-nat": "Cloud-NAT",
  vpc: "Virtual-Private-Cloud",
  "cloud-load-balancing": "Cloud-Load-Balancing",
};

// Register provider automatically only in Node.js environments
// Browser environments cannot use IconLoader due to Node.js dependencies
// Use dynamic import to avoid loading @archlex/icons in browser bundles
if (typeof process !== "undefined" && process.versions?.node) {
  import("@archlex/icons").then(({ IconLoader }) => {
    IconLoader.registerProvider("gcp", GCP_CDN_CONFIG, GCP_ICON_NAME_MAPPING);
  });
}
