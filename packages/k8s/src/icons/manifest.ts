import type { CatalogManifest, SanitizedIcon } from "@archlex/model";
import {
  K8S_GENERATED_ICONS,
  K8S_GENERATED_ICON_MANIFEST_CHECKSUM,
} from "./generated.js";

const generatedIcons = Object.values(K8S_GENERATED_ICONS);

export const K8S_ICON_MANIFEST_CHECKSUM = K8S_GENERATED_ICON_MANIFEST_CHECKSUM;

export const K8S_SANITIZED_ICONS: Record<string, SanitizedIcon> =
  Object.fromEntries(
    generatedIcons.map((icon) => {
      const key = icon.key.replace(".", "-");
      return [
        key,
        {
          key,
          checksum: icon.checksum,
          viewBox: icon.viewBox,
          svgFragment: icon.svg.replace(/\sxmlns="[^"]*"/, ""),
        },
      ];
    }),
  );

export const K8S_CATALOG_MANIFEST: CatalogManifest = {
  releaseId: "2026-08-14-k8s-official",
  retrievedAt: "2026-08-14T00:00:00Z",
  checksum: K8S_ICON_MANIFEST_CHECKSUM,
  services: [],
  icons: K8S_SANITIZED_ICONS,
};
