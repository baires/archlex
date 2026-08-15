import { K8S_GENERATED_ICONS } from "./generated.js";

export const K8S_ICON_PROVENANCE = {
  release: "kubernetes/community@43d6605-icons",
  sources: [
    "https://github.com/kubernetes/community/tree/43d6605709182dedb495a864930ece08666a1e67/icons/svg",
  ],
  commitSha: "43d6605709182dedb495a864930ece08666a1e67",
  retrievedAt: "2026-08-14T00:00:00Z",
} as const;

export const K8S_PHASE_ONE_ICONS: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(K8S_GENERATED_ICONS).map(([key, icon]) => [key, icon.svg]),
  );
