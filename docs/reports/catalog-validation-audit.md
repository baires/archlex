# Catalog Validation Baseline Audit Report

> **Date:** August 1, 2026  
> **Status:** Baseline Completed  
> **Scope:** `@archlex/aws` and `@archlex/gcp` Service Catalogs & Diagnostics Framework

---

## Executive Summary

This audit establishes the baseline statistics and validation coverage for the cloud service catalogs (`@archlex/aws` and `@archlex/gcp`). The objective is to identify existing validation gaps across static metadata, relationship constraints, service semantics, and CI tooling, establishing a blueprint for full catalog validation coverage.

---

## 1. Catalog Baseline Statistics

| Metric | AWS (`@archlex/aws`) | GCP (`@archlex/gcp`) | Total |
| :--- | :--- | :--- | :--- |
| **Total Services Defined** | 190+ services | 160+ services | 350+ services |
| **Missing Icons Tracking** | ~170 missing icons | ~160 missing icons | ~330 missing icons |
| **Active Rules Count** | 14 rules (across 9 category files) | 10 rules (across 8 category files) | 24 rules total |

---

## 2. Validation Coverage & Gaps Analysis

### A. Static Catalog Metadata Validation
- **Current State:** Basic index and resolving tests exist, but there is no automated static validator enforcing catalog metadata integrity at build time.
- **Gaps Identified:**
  - Canonical service ID format validation (e.g. lowercase kebab-case regex enforcement).
  - Non-empty `displayName` and valid `category` enum verification.
  - Alias uniqueness and conflict detection across providers.
  - Icon SVG presence and sanitization checks for all services.

### B. Relationship & Containment Constraints
- **Current State:** `allowedContainment` arrays exist on resource definitions, but containment references are not statically verified against registered catalog service IDs or boundary types.
- **Gaps Identified:**
  - Unvalidated `allowedContainment` entries referencing non-existent containers or invalid boundaries.
  - Absence of containment loop detection (e.g., self-containment or circular containment dependencies).
  - Lack of boundary placement verification (e.g. VPC, subnet, or region containment).

### C. Service Semantics & Architecture Rules
- **Current State:** AWS has 14 validation rules across 9 category files (networking, compute, database, storage, etc.); GCP has 10 rules across 8 category files.
- **Gaps Identified:**
  - Critical storage and database service placement rules are missing (e.g. EFS VPC placement, Aurora subnet placement, DynamoDB backup policies, S3 encryption guidance).
  - GCP resource containment rules (e.g. Cloud Storage VPC containment, BigQuery location constraints) need formalization.

### D. CI/CD & Build Tooling
- **Current State:** Catalog validation tests run during standard test execution, but there is no dedicated standalone runner script or CLI integration.
- **Gaps Identified:**
  - Lack of a fast standalone validation runner (`scripts/validate-catalog.mjs`).
  - Missing `validate:catalog` npm command and pre-commit hook integration in `.husky/pre-commit`.

---

## 3. Next Steps & Implementation Roadmap

1. **Taxonomy & Diagnostic Codes:** Define standardized `CATALOG001`-`CATALOG004` diagnostic codes in `@archlex/diagnostics`.
2. **Static Schema Validation:** Create `catalog-validator.ts` to validate service definition metadata and icons.
3. **Relationship Rules:** Implement `relationship-validator.ts` for containment and boundary reference validation.
4. **CLI & Script Runner:** Add `scripts/validate-catalog.mjs` and CLI sub-commands.
5. **Expanded Service Rules:** Complete missing AWS and GCP semantic architecture rules.
6. **CI/CD Integration:** Wire `pnpm validate:catalog` into `.husky/pre-commit` and `package.json`.
