# Plan: Add Validation Rules for AWS Services

## Goal
Add comprehensive validation rules for the 422 AWS services currently in the catalog to ensure data quality and consistency.

## Current State
- Catalog has 422 services defined
- Minimal validation exists
- No systematic validation coverage

## Tasks

### 1. Audit Current Validation Coverage
- [ ] Review existing validation rules in the codebase
- [ ] Identify which services have validation vs. which don't
- [ ] Document current validation patterns
- [ ] List gaps in validation coverage

### 2. Define Validation Rule Categories
- [ ] Service metadata validation (name, description, category)
- [ ] Relationship validation (valid sources/targets, cardinality)
- [ ] Icon/visual property validation
- [ ] Cross-service consistency rules

### 3. Create Validation Schema
- [ ] Design validation rule structure
- [ ] Define severity levels (error, warning, info)
- [ ] Create rule taxonomy/categories
- [ ] Document validation rule format

### 4. Implement Core Validation Rules
- [ ] Required field validation
- [ ] Enum/category validation
- [ ] Icon path validation
- [ ] Description quality checks (length, format)

### 5. Implement Relationship Validation
- [ ] Valid relationship type per service pair
- [ ] Bidirectional relationship consistency
- [ ] Cardinality rules
- [ ] Self-reference validation

### 6. Build Validation Runner
- [ ] Create validation execution framework
- [ ] Implement rule registration system
- [ ] Add batch validation capability
- [ ] Generate validation reports

### 7. Add Service-Specific Rules
- [ ] Identify service categories needing specific rules
- [ ] Add compute service validation
- [ ] Add storage service validation
- [ ] Add networking service validation
- [ ] Add database service validation

### 8. Create Validation Tooling
- [ ] CLI command for validation
- [ ] Pre-commit hook integration
- [ ] CI/CD validation step
- [ ] Validation report formatter

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
