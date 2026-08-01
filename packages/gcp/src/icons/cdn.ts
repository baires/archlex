import type { CdnProviderDefinition } from "@archlex/icons-core";

export const GCP_CDN_PROVIDER: CdnProviderDefinition = {
  provider: "gcp",
  baseUrl:
    "https://cdn.jsdelivr.net/gh/error505/azure-cloud-ai-visualizer@6b9e50e8f6e1e116644aafdd8f492ad041060149/frontend/public/gcp_icons",
  allowedHosts: ["cdn.jsdelivr.net"],
  releaseId: "icepanel-gcp-2023-03-25",
  fileExtension: ".svg",
  mappings: {
    "cloud-functions": "Cloud-Functions",
    "cloud-run": "Cloud-Run",
    "cloud-storage": "Cloud-Storage",
    bigquery: "BigQuery",
    "cloud-sql": "Cloud-SQL",
    firestore: "Firestore",
    "pub-sub": "PubSub",
    pubsub: "PubSub",
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
  },
  integrity: {
    "cloud-functions":
      "4083203f7fc949eca008ad06b9495d89c3ceff7b3980948f6093bd4e7db4d734",
    "cloud-run":
      "97e1db08021eecae2a8c5124f382a9b451dc63deecaa87825dc5b396fab59c37",
    "cloud-storage":
      "2528d1bf4dce824c66e5a1421e22e1153e0661b296a48d310886d5cd09921fef",
    bigquery:
      "e1791cc5897c2e3b2e92cac472a5dd4ba2aa09e5d52b7d01efcff9f4e402d1e3",
    "cloud-sql":
      "ffdf8329a098d53313f4a8b10449b33e1cf9f139aaeb4a53e6564c1fad6b8b1b",
    firestore:
      "2452104b804806ec196f0cac9bb1f8c74884fede904f94f2adf8c7df4256c9d1",
    "pub-sub":
      "bd71cb16b24c5a368fc7913525e093f03e426d06e8917c1f255187e9f6c10217",
    pubsub: "bd71cb16b24c5a368fc7913525e093f03e426d06e8917c1f255187e9f6c10217",
    "cloud-scheduler":
      "f1880ba2be9c1f294af12a7c0594d535f94e860ea9a5262eb94236b133fce5f9",
    "cloud-tasks":
      "7e74840375dd10029a99e6ce25e41d38c4caae4f13c7af7a8f54fa699823cfbb",
    "compute-engine":
      "080178278d06fc5f87e180e8066a212c5d75236e2d11aaf02d40ce31756872a7",
    gke: "5f44dce3df0483bd0b1a344be07129e054f61cb5fa947aea022db3441c25db5e",
    "app-engine":
      "df6ddd07fef65c4ae1c96763b18de18c72a6f50a799d9079d6f59f88540c0c62",
    "cloud-cdn":
      "9138a21222f0eb31c6d61d6481b6d61b1f8d7dd05d19508d91af2ac6ca88b64b",
    "cloud-armor":
      "69f0e9c8d64b48cdeba1679922dee5e8ebf73747d18ceb553faebeebb0c15711",
    "cloud-dns":
      "c7908fbe9f86108c969c2df1494d825c6f1d9f83133a84e64a8860615f0906b2",
    "cloud-nat":
      "88428f716fe11510dfadf80e5fb356d3d62dac524705553df19a8c82064a00dc",
    vpc: "68ea0f50027d41b4a2733b3cbd7d1ecb825f0fbe230f64ff31bc9c97e22a79b4",
    "cloud-load-balancing":
      "ea8974dc8766309a616bc10c09c0f630c0ff6a5bb1e9664cc17c4fb1ec29ef11",
  },
  attribution: {
    source: "IcePanel GCP Icons",
    license: "Community",
    url: "https://gcpicons.com/",
  },
  timeoutMs: 10_000,
  maxResponseBytes: 256_000,
};
