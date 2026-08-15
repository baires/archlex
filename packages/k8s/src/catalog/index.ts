import type { ResourceDefinition } from "@archlex/model";
import { defineService } from "../builder.js";

export const initialServices: ResourceDefinition[] = [
  // Boundaries
  defineService({
    id: "cluster",
    displayName: "Kubernetes Cluster",
    category: "boundary",
    aliases: ["k8s.cluster"],
  }),
  defineService({
    id: "namespace",
    displayName: "Namespace",
    category: "boundary",
    aliases: ["k8s.namespace", "ns"],
    allowedContainment: ["cluster"],
  }),

  // Workloads
  defineService({
    id: "pod",
    displayName: "Pod",
    category: "containers",
    aliases: ["k8s.pod", "po"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "deployment",
    displayName: "Deployment",
    category: "containers",
    aliases: ["k8s.deployment", "deploy"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "replicaset",
    displayName: "ReplicaSet",
    category: "containers",
    aliases: ["k8s.replicaset", "rs"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "replicationcontroller",
    displayName: "ReplicationController",
    category: "containers",
    aliases: ["k8s.replicationcontroller", "rc"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "statefulset",
    displayName: "StatefulSet",
    category: "containers",
    aliases: ["k8s.statefulset", "sts"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "daemonset",
    displayName: "DaemonSet",
    category: "containers",
    aliases: ["k8s.daemonset", "ds"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "job",
    displayName: "Job",
    category: "containers",
    aliases: ["k8s.job"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "cronjob",
    displayName: "CronJob",
    category: "containers",
    aliases: ["k8s.cronjob", "cj"],
    allowedContainment: ["namespace", "cluster"],
  }),

  // Networking & Discovery
  defineService({
    id: "service",
    displayName: "Service",
    category: "networking",
    aliases: ["k8s.service", "svc"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "ingress",
    displayName: "Ingress",
    category: "networking",
    aliases: ["k8s.ingress", "ing"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "ingressclass",
    displayName: "IngressClass",
    category: "networking",
    aliases: ["k8s.ingressclass"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "networkpolicy",
    displayName: "NetworkPolicy",
    category: "networking",
    aliases: ["k8s.networkpolicy", "netpol"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "endpoints",
    displayName: "Endpoints",
    category: "networking",
    aliases: ["k8s.endpoints", "ep"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "endpointslice",
    displayName: "EndpointSlice",
    category: "networking",
    aliases: ["k8s.endpointslice"],
    allowedContainment: ["namespace", "cluster"],
  }),

  // Config & Storage
  defineService({
    id: "configmap",
    displayName: "ConfigMap",
    category: "management",
    aliases: ["k8s.configmap", "cm"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "secret",
    displayName: "Secret",
    category: "management",
    aliases: ["k8s.secret"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "persistentvolume",
    displayName: "PersistentVolume",
    category: "storage",
    aliases: ["k8s.persistentvolume", "pv"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "persistentvolumeclaim",
    displayName: "PersistentVolumeClaim",
    category: "storage",
    aliases: ["k8s.persistentvolumeclaim", "pvc"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "storageclass",
    displayName: "StorageClass",
    category: "storage",
    aliases: ["k8s.storageclass", "sc"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "volume",
    displayName: "Volume",
    category: "storage",
    aliases: ["k8s.volume", "vol"],
    allowedContainment: ["namespace", "cluster"],
  }),

  // Autoscaling & Policy
  defineService({
    id: "horizontalpodautoscaler",
    displayName: "HorizontalPodAutoscaler",
    category: "management",
    aliases: ["k8s.horizontalpodautoscaler", "hpa"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "verticalpodautoscaler",
    displayName: "VerticalPodAutoscaler",
    category: "management",
    aliases: ["k8s.verticalpodautoscaler", "vpa"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "poddisruptionbudget",
    displayName: "PodDisruptionBudget",
    category: "management",
    aliases: ["k8s.poddisruptionbudget", "pdb"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "resourcequota",
    displayName: "ResourceQuota",
    category: "management",
    aliases: ["k8s.resourcequota", "quota"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "limitrange",
    displayName: "LimitRange",
    category: "management",
    aliases: ["k8s.limitrange", "limits"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "priorityclass",
    displayName: "PriorityClass",
    category: "management",
    aliases: ["k8s.priorityclass", "pc"],
    allowedContainment: ["cluster"],
  }),

  // RBAC & Security
  defineService({
    id: "serviceaccount",
    displayName: "ServiceAccount",
    category: "security",
    aliases: ["k8s.serviceaccount", "sa"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "role",
    displayName: "Role",
    category: "security",
    aliases: ["k8s.role"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "clusterrole",
    displayName: "ClusterRole",
    category: "security",
    aliases: ["k8s.clusterrole", "c-role"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "rolebinding",
    displayName: "RoleBinding",
    category: "security",
    aliases: ["k8s.rolebinding", "rb"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "clusterrolebinding",
    displayName: "ClusterRoleBinding",
    category: "security",
    aliases: ["k8s.clusterrolebinding", "crb"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "podsecuritypolicy",
    displayName: "PodSecurityPolicy",
    category: "security",
    aliases: ["k8s.podsecuritypolicy", "psp"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "user",
    displayName: "User",
    category: "security",
    aliases: ["k8s.user"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "group",
    displayName: "Group",
    category: "security",
    aliases: ["k8s.group"],
    allowedContainment: ["cluster"],
  }),

  // Extensibility
  defineService({
    id: "customresourcedefinition",
    displayName: "CustomResourceDefinition",
    category: "integration",
    aliases: ["k8s.customresourcedefinition", "crd"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "apiservice",
    displayName: "APIService",
    category: "integration",
    aliases: ["k8s.apiservice"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "mutatingwebhookconfiguration",
    displayName: "MutatingWebhookConfiguration",
    category: "integration",
    aliases: ["k8s.mutatingwebhookconfiguration"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "validatingwebhookconfiguration",
    displayName: "ValidatingWebhookConfiguration",
    category: "integration",
    aliases: ["k8s.validatingwebhookconfiguration"],
    allowedContainment: ["cluster"],
  }),

  // Control Plane & Nodes
  defineService({
    id: "control-plane",
    displayName: "Control Plane",
    category: "management",
    aliases: ["k8s.control-plane"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "apiserver",
    displayName: "kube-apiserver",
    category: "management",
    aliases: ["k8s.apiserver", "api"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "scheduler",
    displayName: "kube-scheduler",
    category: "management",
    aliases: ["k8s.scheduler", "sched"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "controller-manager",
    displayName: "kube-controller-manager",
    category: "management",
    aliases: ["k8s.controller-manager", "c-m"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "cloud-controller-manager",
    displayName: "cloud-controller-manager",
    category: "management",
    aliases: ["k8s.cloud-controller-manager", "c-c-m"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "etcd",
    displayName: "etcd",
    category: "management",
    aliases: ["k8s.etcd"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "kubelet",
    displayName: "kubelet",
    category: "management",
    aliases: ["k8s.kubelet"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "kube-proxy",
    displayName: "kube-proxy",
    category: "management",
    aliases: ["k8s.kube-proxy", "k-proxy"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "node",
    displayName: "Node",
    category: "compute",
    aliases: ["k8s.node", "no"],
    allowedContainment: ["cluster"],
  }),

  // Add-ons
  defineService({
    id: "coredns",
    displayName: "CoreDNS",
    category: "networking",
    aliases: ["k8s.coredns", "kube-dns"],
    allowedContainment: ["namespace", "cluster"],
  }),

  // Cluster-scoped Resources (no bundled icon yet)
  defineService({
    id: "lease",
    displayName: "Lease",
    category: "management",
    aliases: ["k8s.lease"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "certificatesigningrequest",
    displayName: "CertificateSigningRequest",
    category: "security",
    aliases: ["k8s.certificatesigningrequest", "csr"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "runtimeclass",
    displayName: "RuntimeClass",
    category: "compute",
    aliases: ["k8s.runtimeclass"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "csidriver",
    displayName: "CSIDriver",
    category: "storage",
    aliases: ["k8s.csidriver"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "csinode",
    displayName: "CSINode",
    category: "storage",
    aliases: ["k8s.csinode"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "csistoragecapacity",
    displayName: "CSIStorageCapacity",
    category: "storage",
    aliases: ["k8s.csistoragecapacity"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "podtemplate",
    displayName: "PodTemplate",
    category: "containers",
    aliases: ["k8s.podtemplate"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "flowschema",
    displayName: "FlowSchema",
    category: "management",
    aliases: ["k8s.flowschema"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "prioritylevelconfiguration",
    displayName: "PriorityLevelConfiguration",
    category: "management",
    aliases: ["k8s.prioritylevelconfiguration"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "event",
    displayName: "Event",
    category: "management",
    aliases: ["k8s.event", "ev"],
    allowedContainment: ["namespace", "cluster"],
  }),
  defineService({
    id: "ipaddress",
    displayName: "IPAddress",
    category: "networking",
    aliases: ["k8s.ipaddress"],
    allowedContainment: ["cluster"],
  }),
  defineService({
    id: "servicecidr",
    displayName: "ServiceCIDR",
    category: "networking",
    aliases: ["k8s.servicecidr"],
    allowedContainment: ["cluster"],
  }),
];

export const K8S_SERVICE_CATALOG = new Map<string, ResourceDefinition>();
export const K8S_ALIAS_MAP = new Map<string, string>();

for (const service of initialServices) {
  K8S_SERVICE_CATALOG.set(service.id, service);
  K8S_ALIAS_MAP.set(service.id, service.id);
  for (const alias of service.aliases) {
    K8S_ALIAS_MAP.set(alias.toLowerCase(), service.id);
  }
}

export function resolveK8sService(
  kindOrAlias: string,
): ResourceDefinition | undefined {
  const normalized = kindOrAlias.toLowerCase();
  const canonicalId = K8S_ALIAS_MAP.get(normalized) ?? normalized;
  return K8S_SERVICE_CATALOG.get(canonicalId);
}
