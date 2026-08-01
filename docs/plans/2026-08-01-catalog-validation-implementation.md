# Catalog Validation Rules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all 8 sections of the Catalog Validation Rules plan by introducing static catalog auditing, validation taxonomy, catalog metadata & relationship validators, expanded service-specific rules, a CLI/build runner script, and CI/pre-commit integration.

**Architecture:** Extend `@archlex/diagnostics`, `@archlex/aws`, `@archlex/gcp`, and `@archlex/cli` to support both static catalog validation (validating `ResourceDefinition` catalogs at build time) and dynamic diagram validation (evaluating `CloudGraph` architecture rules at lint/compile time).

**Tech Stack:** TypeScript, Vitest, Node.js, Turbo, Commander, ArchLex Core & Diagnostics SDK.

---

## Tasks

### Task 1: Catalog Audit & Baseline Statistics (Section 1)

**Files:**
- Create: `docs/reports/catalog-validation-audit.md`
- Create: `tests/catalog-audit.test.ts`

**Step 1: Write failing test for catalog audit metrics**

```typescript
// tests/catalog-audit.test.ts
import { describe, expect, it } from "vitest";
import { AWS_SERVICE_CATALOG } from "@archlex/aws";
import { GCP_SERVICE_CATALOG } from "@archlex/gcp";

describe("Task 1: Catalog Audit Metrics", () => {
  it("audits total service count and category distributions", () => {
    expect(AWS_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(190);
    expect(GCP_SERVICE_CATALOG.size).toBeGreaterThanOrEqual(160);
  });
});
```

**Step 2: Run test to verify**

Run: `npx vitest run tests/catalog-audit.test.ts`
Expected: PASS

**Step 3: Write initial audit document**

Create `docs/reports/catalog-validation-audit.md` listing current catalog sizes, active rules, and coverage gaps across AWS and GCP categories.

**Step 4: Commit**

```bash
git add tests/catalog-audit.test.ts docs/reports/catalog-validation-audit.md
git commit -m "docs: add catalog validation audit report and baseline audit tests"
```

---

### Task 2: Define Validation Rule Taxonomy & Diagnostic Codes (Section 2)

**Files:**
- Modify: `packages/model/src/types.ts`
- Modify: `packages/diagnostics/src/types.ts`
- Modify: `packages/diagnostics/src/registry.ts`

**Step 1: Write failing test for catalog diagnostic codes**

```typescript
// packages/diagnostics/src/registry.test.ts
import { describe, expect, it } from "vitest";
import { CATALOG_DIAGNOSTIC_CODES } from "./registry.js";

describe("Task 2: Diagnostic Code Taxonomy", () => {
  it("exports catalog diagnostic codes", () => {
    expect(CATALOG_DIAGNOSTIC_CODES.INVALID_METADATA).toBe("CATALOG001");
    expect(CATALOG_DIAGNOSTIC_CODES.INVALID_RELATIONSHIP).toBe("CATALOG002");
    expect(CATALOG_DIAGNOSTIC_CODES.MISSING_ICON).toBe("CATALOG003");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/diagnostics/src/registry.test.ts`
Expected: FAIL with missing `CATALOG_DIAGNOSTIC_CODES` export.

**Step 3: Implement Diagnostic Codes in `packages/diagnostics/src/registry.ts`**

Define `CATALOG_DIAGNOSTIC_CODES` with codes for metadata, relationships, icons, and cross-service rules.

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/diagnostics/src/registry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/diagnostics/src/
git commit -m "feat(diagnostics): define catalog validation diagnostic taxonomy and codes"
```

---

### Task 3: Create Static Catalog Validation Schema & Core Rules (Sections 3 & 4)

**Files:**
- Create: `packages/diagnostics/src/catalog-validator.ts`
- Create: `packages/diagnostics/src/catalog-validator.test.ts`
- Modify: `packages/diagnostics/src/index.ts`

**Step 1: Write failing test for catalog definition validator**

```typescript
// packages/diagnostics/src/catalog-validator.test.ts
import { describe, expect, it } from "vitest";
import { validateCatalogDefinition } from "./catalog-validator.js";

describe("Task 3 & 4: Catalog Definition Validator", () => {
  it("validates a resource definition metadata", () => {
    const validService = {
      id: "ec2",
      displayName: "Amazon EC2",
      category: "compute",
      aliases: ["instance"],
    };
    const result = validateCatalogDefinition(validService as any);
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("flags invalid ID and empty displayName", () => {
    const invalidService = {
      id: "Invalid ID!",
      displayName: "",
      category: "unknown",
      aliases: [],
    };
    const result = validateCatalogDefinition(invalidService as any);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/diagnostics/src/catalog-validator.test.ts`
Expected: FAIL with `validateCatalogDefinition` missing.

**Step 3: Implement `catalog-validator.ts`**

Implement ID regex verification, category enum check, non-empty displayName check, alias uniqueness check, and icon presence verification.

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/diagnostics/src/catalog-validator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/diagnostics/src/catalog-validator.ts packages/diagnostics/src/catalog-validator.test.ts packages/diagnostics/src/index.ts
git commit -m "feat(diagnostics): add static catalog definition validator and core rules"
```

---

### Task 4: Relationship & Containment Rule Validation (Section 5)

**Files:**
- Create: `packages/diagnostics/src/relationship-validator.ts`
- Create: `tests/relationship-validation.test.ts`

**Step 1: Write failing test for relationship validation**

```typescript
// tests/relationship-validation.test.ts
import { describe, expect, it } from "vitest";
import { validateCatalogContainment } from "../packages/diagnostics/src/relationship-validator.js";

describe("Task 5: Relationship & Containment Validation", () => {
  it("detects invalid allowedContainment references", () => {
    const invalidContainmentService = {
      id: "my-service",
      displayName: "My Service",
      category: "compute",
      aliases: [],
      allowedContainment: ["non-existent-container"],
    };
    const catalogMap = new Map([["my-service", invalidContainmentService as any]]);
    const diagnostics = validateCatalogContainment(catalogMap);
    expect(diagnostics.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/relationship-validation.test.ts`
Expected: FAIL with missing module/function.

**Step 3: Implement `validateCatalogContainment`**

Check that every entry in `allowedContainment` points to a registered service ID or valid boundary type (e.g. `vpc`, `region`, `subnet`, `account`). Prevent self-containment loops.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/relationship-validation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/diagnostics/src/relationship-validator.ts tests/relationship-validation.test.ts
git commit -m "feat(diagnostics): add relationship containment and boundary integrity validation"
```

---

### Task 5: Build Catalog Validation CLI Command & Standalone Script (Section 6)

**Files:**
- Create: `scripts/validate-catalog.mjs`
- Modify: `packages/cli/src/commands/validate.ts`
- Create: `packages/cli/src/commands/validate-catalog.ts`

**Step 1: Write failing test for catalog validation CLI output**

```typescript
// tests/cli-validate-catalog.test.ts
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

describe("Task 6: Catalog Validation CLI/Script", () => {
  it("runs standalone catalog validator script cleanly", () => {
    const output = execSync("node scripts/validate-catalog.mjs", { encoding: "utf-8" });
    expect(output).toContain("Catalog Validation");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cli-validate-catalog.test.ts`
Expected: FAIL due to missing `scripts/validate-catalog.mjs`.

**Step 3: Implement `scripts/validate-catalog.mjs` & CLI sub-command**

Build the node script that imports `@archlex/aws` and `@archlex/gcp` catalogs, executes static metadata and relationship rules, and prints a formatted diagnostic report.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/cli-validate-catalog.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/validate-catalog.mjs packages/cli/src/commands/
git commit -m "feat(cli): add standalone catalog validation runner script and CLI integration"
```

---

### Task 6: Add Service-Specific Architecture Rules for AWS & GCP (Section 7)

**Files:**
- Modify: `packages/aws/src/rules/storage.ts` (or `data.ts`)
- Modify: `packages/aws/src/rules/database.ts`
- Modify: `packages/aws/src/rules/index.ts`
- Modify: `packages/gcp/src/rules/storage.ts` (or `data.ts`)
- Modify: `packages/gcp/src/rules/index.ts`
- Modify: `tests/aws-semantics.test.ts`
- Modify: `tests/gcp-semantics.test.ts`

**Step 1: Write failing test for new service-specific semantic rules**

```typescript
// tests/aws-semantics.test.ts (add test block)
it("enforces EFS VPC containment and Aurora subnet rules", () => {
  // test graph with invalid uncontained EFS
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/aws-semantics.test.ts`
Expected: FAIL

**Step 3: Implement missing rules**
- AWS: `efsVpcPlacementRule`, `auroraSubnetPlacementRule`, `dynamoDbBackupRule`, `s3EncryptionGuidanceRule`.
- GCP: `cloudStorageBucketVpcRule`, `bigQueryLocationRule`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/aws-semantics.test.ts tests/gcp-semantics.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/aws/src/rules/ packages/gcp/src/rules/ tests/aws-semantics.test.ts tests/gcp-semantics.test.ts
git commit -m "feat(rules): expand service-specific validation rules for AWS and GCP catalogs"
```

---

### Task 7: CI/CD & Husky Pre-commit Tooling (Section 8)

**Files:**
- Modify: `package.json`
- Modify: `.husky/pre-commit`

**Step 1: Add `validate:catalog` npm script to `package.json`**

```json
"scripts": {
  "validate:catalog": "node scripts/validate-catalog.mjs"
}
```

**Step 2: Test script execution**

Run: `pnpm validate:catalog`
Expected: Successful validation run with report output.

**Step 3: Add `pnpm validate:catalog` step to `.husky/pre-commit`**

**Step 4: Commit**

```bash
git add package.json .husky/pre-commit
git commit -m "ci: integrate catalog validation script into package.json and pre-commit hook"
```

---

### Task 8: Verification & Final Audit Report

**Files:**
- Update: `docs/plans/catalog-validation-rules.md`
- Update: `docs/reports/catalog-validation-audit.md`

**Step 1: Run complete test suite**

Run: `pnpm test` and `pnpm validate:catalog`

**Step 2: Check off all 8 task sections in `docs/plans/catalog-validation-rules.md`**

**Step 3: Commit**

```bash
git add docs/plans/catalog-validation-rules.md docs/reports/catalog-validation-audit.md
git commit -m "docs: mark catalog validation rules plan as fully implemented and verified"
```

---

## Verification Plan

### Automated Tests
- `npx vitest run tests/catalog-audit.test.ts`
- `npx vitest run packages/diagnostics/src/registry.test.ts`
- `npx vitest run packages/diagnostics/src/catalog-validator.test.ts`
- `npx vitest run tests/relationship-validation.test.ts`
- `npx vitest run tests/aws-semantics.test.ts`
- `npx vitest run tests/gcp-semantics.test.ts`
- `pnpm validate:catalog`
- `pnpm test`

### Manual Verification
- Run `node scripts/validate-catalog.mjs` directly in terminal and verify stdout formatting and warning counts.
