import ecsIcon from "./ecs.svg?raw";
import rdsProxyIcon from "./rds-proxy.svg?raw";
import rdsIcon from "./rds.svg?raw";

export const AWS_ICON_PROVENANCE = {
  release: "04302026",
  source: "https://aws.amazon.com/architecture/icons/",
  archiveSha256:
    "699fe7a2481aa712b6b74faff0aaab6382d3bb7243bba3abd3ba909d6bf7b912",
} as const;

export const AWS_PHASE_ONE_ICONS: Readonly<Record<string, string>> = {
  "aws.rds-proxy": rdsProxyIcon,
  "aws.rds": rdsIcon,
  "aws.ecs": ecsIcon,
};
