#!/usr/bin/env node

/**
 * Static site project definitions for Cloudflare Pages deployment.
 * Each project defines its build output, domain, and verification paths.
 */
export const SITE_PROJECTS = Object.freeze([
	Object.freeze({
		name: "landing",
		workspace: "@archlex/landing",
		outputDirectory: "apps/landing/dist",
		domain: "archlex.dev",
		smokePath: "/",
	}),
	Object.freeze({
		name: "playground",
		workspace: "@archlex/playground",
		outputDirectory: "apps/playground/dist",
		domain: "playground.archlex.dev",
		smokePath: "/",
	}),
	Object.freeze({
		name: "docs",
		workspace: "@archlex/docs",
		outputDirectory: "apps/docs/out",
		domain: "docs.archlex.dev",
		smokePath: "/",
	}),
]);
