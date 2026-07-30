import { GCP_GENERATED_ICONS } from "./generated.js";

export const GCP_ICON_PROVENANCE = {
  release: "2025-icon-system+legacy-fallback",
  sources: [
    "https://services.google.com/fh/files/misc/core-products-icons.zip",
    "https://services.google.com/fh/files/misc/google-cloud-legacy-icons.zip",
  ],
  archiveSha256: {
    coreProducts:
      "6531a10f58bc599c24d9a455d81dd757c1a03c3c43da9cddf639b859c1c1eece",
    legacy: "a6d9d7921758042538b462f03cf64614c2cebd96743b3ed63580a769fc7de3e9",
  },
  retrievedAt: "2026-07-29T00:00:00Z",
} as const;

export const GCP_PHASE_ONE_ICONS: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(GCP_GENERATED_ICONS).map(([key, icon]) => [key, icon.svg]),
  );
