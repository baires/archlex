# Issue Tracker Configuration

**Tracker type:** GitHub Issues

**Repository:** `baires/archlex`

## Workflow

Issues for this repository are tracked in GitHub Issues. Use the `gh` CLI to create, update, and query issues.

### Creating issues

```bash
gh issue create --title "Title" --body "Description"
```

Add labels during creation:

```bash
gh issue create --title "Title" --body "Description" --label "needs-triage"
```

### Querying issues

```bash
# List open issues
gh issue list

# List issues with a specific label
gh issue list --label "ready-for-agent"

# View a specific issue
gh issue view <issue-number>
```

### Updating issues

```bash
# Add a label
gh issue edit <issue-number> --add-label "ready-for-agent"

# Remove a label
gh issue edit <issue-number> --remove-label "needs-triage"

# Close an issue
gh issue close <issue-number>
```

## PRs as a request surface

**Disabled.** External pull requests are not automatically triaged as incoming work. If you want external PRs to enter the triage queue, change this flag to **Enabled** and describe the workflow.
