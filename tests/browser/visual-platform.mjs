import { readFile } from "node:fs/promises";
import { AWS_CDN_PROVIDER } from "@archlex/aws";
import { GCP_CDN_PROVIDER } from "@archlex/gcp";

const ICON_FIXTURE = await readFile(
  new URL("../fixtures/icons/runtime-service.svg", import.meta.url),
  "utf8",
);
const PROVIDER_BASES = [AWS_CDN_PROVIDER, GCP_CDN_PROVIDER].map((provider) => {
  const url = new URL(provider.baseUrl);
  return {
    provider: provider.provider,
    origin: url.origin,
    pathnamePrefix: `${url.pathname.replace(/\/$/, "")}/`,
  };
});

export function visualSnapshotsSupported(platform = process.platform) {
  return platform === "darwin";
}

export async function installIconFixtureRoutes(page) {
  await page.route("**/*", (route) => {
    const requestUrl = new URL(route.request().url());
    const provider = PROVIDER_BASES.find(
      (candidate) =>
        requestUrl.origin === candidate.origin &&
        requestUrl.pathname.startsWith(candidate.pathnamePrefix),
    );

    if (provider?.provider === "aws") {
      return route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: ICON_FIXTURE,
        headers: {
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        },
      });
    }

    if (provider?.provider === "gcp") {
      return route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "deterministic GCP icon fixture failure",
        headers: {
          "access-control-allow-origin": "*",
          "cache-control": "no-store",
        },
      });
    }

    if (requestUrl.protocol === "http:" || requestUrl.protocol === "https:") {
      const isLocal =
        requestUrl.hostname === "127.0.0.1" ||
        requestUrl.hostname === "localhost";
      const resourceType = route.request().resourceType();
      if (!isLocal && (resourceType === "fetch" || resourceType === "xhr")) {
        return route.abort("blockedbyclient");
      }
    }

    return route.fallback();
  });
}

export async function replaceEditorSource(page, source) {
  const editorSurface = page.locator(".monaco-editor .view-lines");
  await editorSurface.click({ position: { x: 8, y: 8 } });
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(source);
}
