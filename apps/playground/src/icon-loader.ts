import { AWS_CDN_PROVIDER } from "@archlex/aws";
import { GCP_CDN_PROVIDER } from "@archlex/gcp";
import { createBrowserIconLoader } from "@archlex/icons-browser";

export const iconLoader = createBrowserIconLoader({
  providers: [AWS_CDN_PROVIDER, GCP_CDN_PROVIDER],
});
