import { AWS_GENERATED_ICONS } from "./generated.js";

export const AWS_ICON_PROVENANCE = {
  release: "04302026",
  source: "https://aws.amazon.com/architecture/icons/",
  archiveSha256:
    "699fe7a2481aa712b6b74faff0aaab6382d3bb7243bba3abd3ba909d6bf7b912",
} as const;

export const AWS_PHASE_ONE_ICONS: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(AWS_GENERATED_ICONS).map(([key, icon]) => [key, icon.svg]),
  );
