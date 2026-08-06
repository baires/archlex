#!/usr/bin/env node

import { SITE_PROJECTS } from "./site-projects.mjs";

/**
 * Verifies a site is accessible and returns HTML.
 * @param {Object} project - Site project definition
 * @param {string} project.name - Site name for error messages
 * @param {string} project.domain - Production domain
 * @param {string} project.smokePath - Path to verify
 * @param {Function} [fetchFn] - Fetch function (for testing)
 * @returns {Promise<void>}
 */
export async function verifySite(project, fetchFn = fetch) {
  const url = `https://${project.domain}${project.smokePath}`;

  try {
    const response = await fetchFn(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(
        `${project.name} site failed verification at ${url}: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      throw new Error(
        `${project.name} site failed verification at ${url}: expected text/html, got ${contentType}`,
      );
    }
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error(
        `${project.name} site failed verification at ${url}: request timeout`,
      );
    }
    throw error;
  }
}

/**
 * Verifies all sites concurrently.
 * @returns {Promise<void>}
 */
export async function verifySites() {
  // Allow environment variable overrides
  const urlOverrides = {
    landing: process.env.LANDING_URL,
    playground: process.env.PLAYGROUND_URL,
    docs: process.env.DOCS_URL,
  };

  const projects = SITE_PROJECTS.map((project) => {
    const overrideUrl = urlOverrides[project.name];
    if (overrideUrl) {
      // Parse override URL to extract domain and path
      const url = new URL(overrideUrl);
      return {
        ...project,
        domain: url.host,
        smokePath: url.pathname === "/" ? project.smokePath : url.pathname,
      };
    }
    return project;
  });

  const results = await Promise.allSettled(
    projects.map((project) => verifySite(project)),
  );

  const failures = results
    .map((result, index) => ({
      result,
      project: projects[index],
    }))
    .filter(({ result }) => result.status === "rejected");

  if (failures.length > 0) {
    console.error("Site verification failures:");
    for (const { result, project } of failures) {
      console.error(`  ✗ ${project.name}: ${result.reason.message}`);
    }
    throw new Error(
      `${failures.length} of ${projects.length} sites failed verification`,
    );
  }

  console.log(`✓ All ${projects.length} sites verified successfully`);
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await verifySites();
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
