import { AWS_CDN_PROVIDER } from "@archlex/aws";
import { GCP_CDN_PROVIDER } from "@archlex/gcp";
import { createBrowserIconLoader } from "@archlex/icons-browser";
import { K8S_CDN_PROVIDER } from "@archlex/k8s";

export const iconLoader = createBrowserIconLoader({
  providers: [AWS_CDN_PROVIDER, GCP_CDN_PROVIDER, K8S_CDN_PROVIDER],
});
