import type { CatalogManifest, SanitizedIcon } from "@archlex/model";
import {
  AWS_GENERATED_ICONS,
  AWS_GENERATED_ICON_MANIFEST_CHECKSUM,
} from "./generated.js";

const generatedIcons = Object.values(AWS_GENERATED_ICONS);

export const AWS_ICON_MANIFEST_CHECKSUM = AWS_GENERATED_ICON_MANIFEST_CHECKSUM;

export const AWS_SANITIZED_ICONS: Record<string, SanitizedIcon> =
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

export const AWS_CATALOG_MANIFEST: CatalogManifest = {
  releaseId: "2026-07-27-aws-official",
  retrievedAt: "2026-07-27T20:00:00Z",
  checksum: AWS_ICON_MANIFEST_CHECKSUM,
  services: [],
  icons: AWS_SANITIZED_ICONS,
};
