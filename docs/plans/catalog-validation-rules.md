# Plan: Add Validation Rules for AWS Services

## Goal
Add comprehensive validation rules for the 422 AWS services currently in the catalog to ensure data quality and consistency.

## Current State
- Catalog has 422 services defined
- Minimal validation exists
- No systematic validation coverage

## Tasks

### 1. Audit Current Validation Coverage
- [x] Review existing validation rules in the codebase
- [x] Identify which services have validation vs. which don't
- [x] Document current validation patterns
- [x] List gaps in validation coverage

### 2. Define Validation Rule Categories
- [x] Service metadata validation (name, description, category)
- [x] Relationship validation (valid sources/targets, cardinality)
- [x] Icon/visual property validation
- [x] Cross-service consistency rules

### 3. Create Validation Schema
- [x] Design validation rule structure
- [x] Define severity levels (error, warning, info)
- [x] Create rule taxonomy/categories
- [x] Document validation rule format

### 4. Implement Core Validation Rules
- [x] Required field validation
- [x] Enum/category validation
- [x] Icon path validation
- [x] Description quality checks (length, format)

### 5. Implement Relationship Validation
- [x] Valid relationship type per service pair
- [x] Bidirectional relationship consistency
- [x] Cardinality rules
- [x] Self-reference validation

### 6. Build Validation Runner
- [x] Create validation execution framework
- [x] Implement rule registration system
- [x] Add batch validation capability
- [x] Generate validation reports

### 7. Add Service-Specific Rules
- [x] Identify service categories needing specific rules
- [x] Add compute service validation
- [x] Add storage service validation
- [x] Add networking service validation
- [x] Add database service validation

### 8. Create Validation Tooling
- [x] CLI command for validation
- [x] Pre-commit hook integration
- [x] CI/CD validation step
- [x] Validation report formatter

## Success Criteria
- All 422 services pass basic validation rules
- No services missing required metadata
- Relationship rules prevent invalid connections
- Validation runs automatically in CI/CD
- Clear, actionable error messages

## Non-Goals
- Runtime validation in the renderer (focus on build-time)
- User input validation (catalog is static)
- Performance optimization of validation (can be slow)

## Open Questions
- Should validation be blocking or warning-only?
- How to handle legacy/deprecated services?
- Should we validate against AWS service catalog API?
