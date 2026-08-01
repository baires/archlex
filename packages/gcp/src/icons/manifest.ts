import type { CatalogManifest, SanitizedIcon } from "@archlex/model";
import {
  GCP_GENERATED_ICONS,
  GCP_GENERATED_ICON_MANIFEST_CHECKSUM,
} from "./generated.js";

const generatedIcons = Object.values(GCP_GENERATED_ICONS);

export const GCP_ICON_MANIFEST_CHECKSUM = GCP_GENERATED_ICON_MANIFEST_CHECKSUM;

export const GCP_SANITIZED_ICONS: Record<string, SanitizedIcon> =
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

export const GCP_CATALOG_MANIFEST: CatalogManifest = {
  releaseId: "2026-07-29-gcp-official",
  retrievedAt: "2026-07-29T00:00:00Z",
  checksum: GCP_ICON_MANIFEST_CHECKSUM,
  services: [],
  icons: GCP_SANITIZED_ICONS,
};
