# Plan: Improve Error Messages

## Goal
Enhance all error messages throughout the application to be clear, actionable, and helpful for users debugging issues.

## Current State
- Generic error messages that don't guide users
- Missing context in error outputs
- No suggestions for fixing issues
- Inconsistent error message formatting
- Technical jargon without explanation

## Tasks

### 1. Audit Current Error Messages
- [ ] Catalog all error messages in the codebase
- [ ] Identify error sources (validation, rendering, parsing, API)
- [ ] Review user-reported error confusion
- [ ] Document current error message patterns
- [ ] Rate clarity of each error message

### 2. Define Error Message Standards
- [ ] Clear problem statement format
- [ ] Context inclusion requirements
- [ ] Actionable next steps format
- [ ] Error code/category system
- [ ] Severity levels (error, warning, info)
- [ ] Consistent formatting/styling

### 3. Categorize Error Types
- [ ] Validation errors (invalid data)
- [ ] Rendering errors (display issues)
- [ ] Relationship errors (invalid connections)
- [ ] Service errors (missing/unknown services)
- [ ] Configuration errors (setup issues)
- [ ] Data errors (malformed input)
- [ ] System errors (unexpected failures)

### 4. Create Error Message Templates
For each error type:
- [ ] Problem description template
- [ ] Context information template
- [ ] Suggested actions template
- [ ] Related documentation links template
- [ ] Example correct usage template

### 5. Improve Validation Error Messages
Current: "Validation failed"
Better: "Service 'my-lambda' is missing required field 'runtime'. Add a runtime like 'nodejs18.x' to the service definition."

- [ ] Field-level validation errors
- [ ] Type validation errors
- [ ] Constraint validation errors
- [ ] Relationship validation errors
- [ ] Schema validation errors

### 6. Improve Rendering Error Messages
Current: "Render error"
Better: "Cannot render node 'my-ec2': Icon file '/icons/ec2.svg' not found. Check that the service icon path is correct in the catalog."

- [ ] Layout errors
- [ ] Icon loading errors
- [ ] Label rendering errors
- [ ] Edge rendering errors
- [ ] SVG generation errors

### 7. Add Contextual Information
- [ ] Show affected service/relationship names
- [ ] Include file paths and line numbers
- [ ] Display actual vs. expected values
- [ ] Show related configuration
- [ ] Link to relevant documentation

### 8. Provide Actionable Suggestions
- [ ] "Did you mean X?" suggestions
- [ ] Step-by-step fix instructions
- [ ] Code snippet examples
- [ ] Links to patterns/examples
- [ ] Command to run for fix

### 9. Improve Error Recovery
- [ ] Graceful degradation messages
- [ ] Partial success indicators
- [ ] Fallback behavior explanations
- [ ] Recovery suggestions
- [ ] Retry guidance

### 10. Create Error Documentation
- [ ] Error code reference
- [ ] Common errors and solutions
- [ ] Troubleshooting guide
- [ ] FAQ for error messages
- [ ] Debug mode documentation

### 11. Add Developer-Friendly Details
- [ ] Stack traces (in debug mode)
- [ ] Internal state information
- [ ] Validation rule details
- [ ] Related error context
- [ ] Error correlation IDs

### 12. Implement Error Message Testing
- [ ] Test suite for error messages
- [ ] Verify error message clarity
- [ ] Test actionable suggestions work
- [ ] Validate error context accuracy
- [ ] Check documentation links

### 13. Create Error Message Examples
Before and after for common errors:

**Validation Error**
- Before: `Error: Invalid service`
- After: `Service 'my-service' has invalid type 'storage'. Valid types are: compute, database, networking, analytics. See: docs/catalog/service-types.md`

**Relationship Error**
- Before: `Invalid relationship`
- After: `Cannot create 'stores-data' relationship from S3 to Lambda. S3 can trigger Lambda using 'triggers' relationship instead. Example: s3-bucket --triggers--> lambda-function`

**Missing Required Field**
- Before: `Required field missing`
- After: `Service 'my-rds' is missing required field 'engine'. Add one of: postgres, mysql, mariadb, oracle, sqlserver. Example: { "id": "my-rds", "type": "database", "engine": "postgres" }`

**Icon Error**
- Before: `Icon not found`
- After: `Cannot load icon for service 'my-custom-service'. Icon path '/icons/custom.svg' does not exist. Either:\n  1. Add the icon file to src/icons/custom.svg\n  2. Use a standard service type with a built-in icon\n  3. Set icon: null to use default icon`

### 14. Localization Preparation
- [ ] Externalize error message strings
- [ ] Support message templates
- [ ] Error code system for localization
- [ ] Separate technical details from user messages

### 15. Error Analytics Integration
- [ ] Track which errors occur most
- [ ] Monitor error message helpfulness
- [ ] Identify confusing errors
- [ ] Prioritize error message improvements

## Deliverables
- Error message style guide
- Rewritten error messages throughout codebase
- Error code reference documentation
- Common errors troubleshooting guide
- Error message test suite

## Success Criteria
- Users can understand what went wrong
- Error messages provide actionable next steps
- Context helps users locate the issue
- Suggestions actually fix the problem
- Consistent formatting across all errors
- Reduced support requests about error meanings

## Non-Goals
- Translating to multiple languages (prepare for it)
- Automated error fixing (just suggest)
- Hiding technical details completely (debug mode)
- Preventing all errors (focus on clarity)

## Open Questions
- Should we collect error message feedback from users?
- How verbose should default error messages be?
- Should errors link to online documentation or inline help?
- Error severity levels—how many do we need?
