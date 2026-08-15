import { AWS_CDN_PROVIDER } from "@archlex/aws";
import { GCP_CDN_PROVIDER } from "@archlex/gcp";
import { K8S_CDN_PROVIDER } from "@archlex/k8s";
import { expect, test } from "@playwright/test";
import { installIconFixtureRoutes } from "./visual-platform.mjs";

const AWS_ICON_URL = `${AWS_CDN_PROVIDER.baseUrl}/${AWS_CDN_PROVIDER.mappings["app-runner"]}.svg`;
const GCP_ICON_URL = `${GCP_CDN_PROVIDER.baseUrl}/${GCP_CDN_PROVIDER.mappings["cloud-run"]}.svg`;
const K8S_ICON_URL = `${K8S_CDN_PROVIDER.baseUrl}/${K8S_CDN_PROVIDER.mappings.deployment}.svg`;
const UNEXPECTED_ICON_URL =
  "https://unpkg.com/not-the-configured-icon-path.svg";

test("intercepts all configured provider bases and aborts unexpected external icon paths", async ({
  page,
}) => {
  const fellThroughToNetwork = [];
  await page.route("https://**/*", (route) => {
    fellThroughToNetwork.push(route.request().url());
    return route.abort("blockedbyclient");
  });
  await installIconFixtureRoutes(page);
  await page.setContent("<!doctype html><title>Icon routing fixture</title>");

  const results = await page.evaluate(
    async ({ awsUrl, gcpUrl, k8sUrl, unexpectedUrl }) => {
      const request = async (url) => {
        try {
          const response = await fetch(url);
          return { status: response.status, body: await response.text() };
        } catch {
          return { status: 0, body: "aborted" };
        }
      };

      return {
        aws: await request(awsUrl),
        gcp: await request(gcpUrl),
        k8s: await request(k8sUrl),
        unexpected: await request(unexpectedUrl),
      };
    },
    {
      awsUrl: AWS_ICON_URL,
      gcpUrl: GCP_ICON_URL,
      k8sUrl: K8S_ICON_URL,
      unexpectedUrl: UNEXPECTED_ICON_URL,
    },
  );

  expect(new URL(AWS_CDN_PROVIDER.baseUrl).hostname).toBe("unpkg.com");
  expect(new URL(GCP_CDN_PROVIDER.baseUrl).hostname).toBe("cdn.jsdelivr.net");
  expect(new URL(K8S_CDN_PROVIDER.baseUrl).hostname).toBe("cdn.jsdelivr.net");
  expect(results.aws).toEqual({
    status: 200,
    body: '<svg viewBox="0 0 24 24"><path fill="#123456" d="M0 0h24v24z"/></svg>\n',
  });
  expect(results.gcp).toEqual({
    status: 503,
    body: "deterministic GCP icon fixture failure",
  });
  expect(results.k8s).toEqual({
    status: 200,
    body: '<svg viewBox="0 0 24 24"><path fill="#123456" d="M0 0h24v24z"/></svg>\n',
  });
  expect(results.unexpected).toEqual({ status: 0, body: "aborted" });
  expect(fellThroughToNetwork).toEqual([]);
});
