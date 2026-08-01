# Documentation Cleanup Plan for Open Source Release

This document outlines what documentation to **keep**, **remove**, and **reorganize** for the open source release of ArchLex.

## 🎯 Goal
Prepare documentation for external contributors and users. Remove internal development artifacts, AI assistant configurations, and process-specific files that aren't relevant to open source contributors.

---

## ✅ KEEP - Essential for Open Source

### Root Level
- `PRODUCT.md` → **Move to `README.md`** and rewrite as user-facing introduction

### Core Documentation (`docs/`)
- `docs/README.md` - Main documentation index
- `docs/architecture/system-architecture.md` - System overview
- `docs/architecture/contribution-guide.md` - Contributor guide
- `docs/specs/language.md` - Language specification
- `docs/specs/public-api.md` - Public API documentation
- `docs/specs/aws-semantics.md` - AWS provider semantics
- `docs/specs/gcp-semantics.md` - GCP provider semantics
- `docs/specs/layout-rendering.md` - Layout and rendering details
- `docs/specs/playground.md` - Playground documentation
- `docs/errors/README.md` - Error system overview
- `docs/errors/index.md` - Error index
- `docs/errors/AL-*.md` - All error code documentation
- `docs/guides/relationship-types.md` - Relationship types guide
- `docs/guides/dynamic-cdn-icons.md` - Dynamic CDN icons guide
- `packages/cli/README.md` - CLI package documentation

### Keep with Review
- `docs/ROADMAP.md` - Review and make user-facing (remove internal milestones/dates)

---

## 🗑️ REMOVE - Internal Development Only

### Development Process Files
- `.changeset/*.md` - Internal changelog management (keep `.changeset/` dir structure)
- `docs/TODO.md` - Internal task tracking
- `docs/cdn-icon-complete-fix.md` - Implementation notes
- `docs/cdn-icon-comprehensive-implementation.md` - Implementation notes
- `docs/cdn-icon-fix-summary.md` - Implementation notes
- `docs/plans/` - **Entire directory** (internal planning)
- `docs/reports/` - **Entire directory** (internal audits)
- `docs/future/` - **Entire directory** (internal future planning)

### AI Assistant Configurations
- `.claude/` - **Entire directory** (Claude AI configuration)
- `.gemini/` - **Entire directory** (Gemini AI configuration)
- `.superpowers/` - **Entire directory** (AI task management)
- `docs/superpowers/` - **Entire directory** (AI-generated specs/plans)

### Catalog Expansion Tracking
- `docs/expansion/` - **Entire directory** (internal service expansion tracking)
  - These are internal tracking documents for service catalog expansion
  - The actual catalog is in code, not docs

---

## 📝 CREATE - Missing Essential Documentation

### Root Level (High Priority)
1. **`README.md`** - User-facing introduction
   - What is ArchLex?
   - Quick start guide
   - Features overview
   - Installation instructions
   - Basic usage examples
   - Link to full documentation

2. **`CONTRIBUTING.md`** - Contributor guidelines
   - Based on `docs/architecture/contribution-guide.md`
   - How to contribute
   - Development setup
   - Testing guidelines
   - Pull request process

3. **`LICENSE`** - Open source license file

4. **`CODE_OF_CONDUCT.md`** - Community standards

### Documentation Improvements
1. **`docs/getting-started.md`** - Quick start tutorial
2. **`docs/examples/`** - Usage examples directory
3. Update `docs/README.md` - Remove references to deleted internal docs

---

## 📊 Summary Statistics

**Current State:** 531 total markdown files
- Mostly in AI assistant directories (`.claude/`, `.gemini/`, `.superpowers/`)

**Files to Keep:** ~25 essential documentation files
**Files to Remove:** ~500+ internal/AI files

---

## 🚀 Execution Order

1. **Backup** - Create a backup branch before deletion
2. **Remove** - Delete internal directories (`.claude/`, `.gemini/`, `.superpowers/`, etc.)
3. **Clean** - Remove internal docs (`docs/expansion/`, `docs/plans/`, etc.)
4. **Create** - Add missing root-level files (`README.md`, `CONTRIBUTING.md`, etc.)
5. **Update** - Revise `docs/README.md` and `docs/ROADMAP.md`
6. **Review** - Final review of remaining documentation
7. **Commit** - Commit cleanup in logical chunks

---

## 📋 Checklist Format

```bash
# Remove AI assistant configs
rm -rf .claude .gemini .superpowers

# Remove internal development docs
rm -rf docs/expansion docs/plans docs/reports docs/future docs/superpowers

# Remove temporary implementation notes
rm docs/cdn-icon-*.md

# Remove internal task tracking
rm docs/TODO.md

# Review and clean changesets
# (manual review of .changeset/*.md)
```
