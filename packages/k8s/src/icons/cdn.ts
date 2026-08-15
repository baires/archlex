import type { CdnProviderDefinition } from "@archlex/icons-core";

// Icons are served from the official Kubernetes community icon set via the
// jsDelivr GitHub mirror, pinned to an immutable commit. Mapping values are
// paths relative to baseUrl (the icon set spans resources/,
// infrastructure_components/, and control_plane_components/ directories).
export const K8S_CDN_PROVIDER: CdnProviderDefinition = {
  provider: "k8s",
  baseUrl:
    "https://cdn.jsdelivr.net/gh/kubernetes/community@43d6605709182dedb495a864930ece08666a1e67/icons/svg",
  allowedHosts: ["cdn.jsdelivr.net"],
  releaseId: "43d6605709182dedb495a864930ece08666a1e67",
  fileExtension: ".svg",
  mappings: {
    // Workloads
    pod: "resources/unlabeled/pod",
    deployment: "resources/unlabeled/deploy",
    replicaset: "resources/unlabeled/rs",
    statefulset: "resources/unlabeled/sts",
    daemonset: "resources/unlabeled/ds",
    job: "resources/unlabeled/job",
    cronjob: "resources/unlabeled/cronjob",

    // Networking & Discovery
    service: "resources/unlabeled/svc",
    ingress: "resources/unlabeled/ing",
    networkpolicy: "resources/unlabeled/netpol",
    endpoints: "resources/unlabeled/ep",

    // Config & Storage
    configmap: "resources/unlabeled/cm",
    secret: "resources/unlabeled/secret",
    persistentvolume: "resources/unlabeled/pv",
    persistentvolumeclaim: "resources/unlabeled/pvc",
    storageclass: "resources/unlabeled/sc",
    volume: "resources/unlabeled/vol",

    // Autoscaling & Policy
    horizontalpodautoscaler: "resources/unlabeled/hpa",
    resourcequota: "resources/unlabeled/quota",
    limitrange: "resources/unlabeled/limits",

    // RBAC & Security
    serviceaccount: "resources/unlabeled/sa",
    role: "resources/unlabeled/role",
    clusterrole: "resources/unlabeled/c-role",
    rolebinding: "resources/unlabeled/rb",
    clusterrolebinding: "resources/unlabeled/crb",
    podsecuritypolicy: "resources/unlabeled/psp",
    user: "resources/unlabeled/user",
    group: "resources/unlabeled/group",

    // Extensibility
    customresourcedefinition: "resources/unlabeled/crd",

    // Boundaries & Infrastructure
    namespace: "resources/unlabeled/ns",
    node: "infrastructure_components/unlabeled/node",
    "control-plane": "infrastructure_components/unlabeled/control-plane",
    etcd: "infrastructure_components/unlabeled/etcd",

    // Control Plane Components
    apiserver: "control_plane_components/labeled/api",
    scheduler: "control_plane_components/labeled/sched",
    "controller-manager": "control_plane_components/labeled/c-m",
    "cloud-controller-manager": "control_plane_components/labeled/c-c-m",
    kubelet: "control_plane_components/labeled/kubelet",
    "kube-proxy": "control_plane_components/labeled/k-proxy",
  },
  attribution: {
    source: "Kubernetes Community Icons",
    license: "Apache-2.0 OR CC-BY-4.0",
    url: "https://github.com/kubernetes/community/tree/main/icons",
  },
  timeoutMs: 10_000,
  maxResponseBytes: 256_000,
};
