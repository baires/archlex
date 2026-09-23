# @archlex/cli

Command-line interface for ArchLex - cloud architecture diagrams with semantic validation.

## Installation

```bash
# Install globally
npm install -g @archlex/cli

# Or use with npx
npx @archlex/cli render diagram.arch
```

## Commands

Save diagram source as `.arch` files. The `.archlex` extension remains valid and is still accepted everywhere.

### `render` - Render diagrams to SVG or PNG

Render a ArchLex diagram to SVG or PNG format.

```bash
# Render to SVG (default)
archlex render diagram.arch

# Specify output file
archlex render diagram.arch --output diagram.svg

# Render to PNG (requires Playwright)
archlex render diagram.arch --output diagram.png

# Render with options
archlex render diagram.arch \
  --direction TB \
  --validation strict \
  --theme light \
  --output diagram.svg

# Read from stdin
cat diagram.arch | archlex render --stdin --output diagram.svg

# PNG with custom scale and background
archlex render diagram.arch \
  --output diagram.png \
  --scale 3 \
  --background-color white
```

**Options:**

- `-o, --output <path>` - Output file path (.svg or .png)
- `-d, --direction <direction>` - Layout direction: LR, RL, TB, BT (default: TB)
- `-v, --validation <mode>` - Validation mode: normal, strict, off (default: normal)
- `-t, --theme <theme>` - Theme: light, dark (default: dark)
- `-s, --scale <number>` - Scale factor for PNG export (default: 2)
- `-b, --background-color <color>` - Background color for PNG (default: transparent)
- `--stdin` - Read input from stdin

### `validate` - Validate diagrams

Validate a ArchLex diagram without rendering.

```bash
# Validate a file
archlex validate diagram.arch

# Validate with strict mode (default)
archlex validate diagram.arch --validation strict

# Validate from stdin
cat diagram.arch | archlex validate --stdin
```

**Options:**

- `-v, --validation <mode>` - Validation mode: normal, strict, off (default: strict)
- `--stdin` - Read input from stdin

**Exit Codes:**

- `0` - Success (no errors)
- `1` - Validation errors (when using strict mode)
- `2` - Fatal error (parse error, file not found)

### `examples` - Work with example diagrams

List and view example ArchLex diagrams.

```bash
# List all available examples
archlex examples list
archlex examples ls

# Get an example by ID
archlex examples get aws-3-tier-web

# Use an example as starting point
archlex examples get aws-3-tier-web > my-diagram.arch
```

**Available Examples:**

- `aws-3-tier-web` - Classic 3-tier web application (ALB + EC2 + RDS)
- `aws-serverless-api` - Serverless API with Lambda and DynamoDB
- `simple-lambda-s3` - Event-driven Lambda triggered by S3
- `gcp-microservices` - Microservices on Cloud Run with Pub/Sub

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate Diagrams

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      
      - name: Install ArchLex CLI
        run: npm install -g @archlex/cli
      
      - name: Validate diagrams
        run: |
          archlex validate docs/architecture/*.arch
      
      - name: Generate PNGs
        run: |
          for file in docs/architecture/*.arch; do
            archlex render "$file" --output "${file%.arch}.png"
          done
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: diagrams
          path: docs/architecture/*.png
```

### GitLab CI

```yaml
validate-diagrams:
  image: node:22
  script:
    - npm install -g @archlex/cli
    - archlex validate docs/**/*.arch

generate-diagrams:
  image: node:22
  script:
    - npm install -g @archlex/cli
    - |
      find docs -name "*.arch" -exec sh -c '
        archlex render "$1" --output "${1%.arch}.png"
      ' sh {} \;
  artifacts:
    paths:
      - docs/**/*.png
```

### Pre-commit Hook

Add to `.husky/pre-commit` or use lint-staged:

```bash
#!/bin/sh
archlex validate $(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(arch|archlex)$')
```

## PNG Export

PNG export requires Playwright's Chromium browser. The CLI will automatically download it on first use.

For CI/CD environments, you may want to cache the browser:

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}
```

## Input/Output

### Reading from stdin

```bash
# Pipe from file
cat diagram.arch | archlex render --stdin

# Pipe from command
echo "provider aws
vpc: vpc" | archlex render --stdin

# Chain commands
archlex examples get aws-3-tier-web | archlex validate --stdin
```

### Writing to stdout

When no `--output` is specified for the `render` command, SVG is written to stdout:

```bash
# Redirect to file
archlex render diagram.arch > output.svg

# Pipe to other tools
archlex render diagram.arch | svgo --input - --output optimized.svg
```

## Examples

### Batch Processing

```bash
# Validate all diagrams in a directory
for file in diagrams/*.arch; do
  archlex validate "$file" || echo "Failed: $file"
done

# Generate PNGs for all diagrams
find . -name "*.arch" -exec sh -c '
  archlex render "$1" --output "${1%.arch}.png" --scale 2
' sh {} \;
```

### Watch Mode (with external tools)

```bash
# Using watchexec
watchexec -w diagram.arch archlex render diagram.arch -o diagram.svg

# Using nodemon
nodemon --watch diagram.arch --exec "archlex render diagram.arch -o diagram.svg"
```

### Integration with Other Tools

```bash
# Optimize SVG output with svgo
archlex render diagram.arch | svgo --input - --output - > optimized.svg

# Convert to PDF with Inkscape
archlex render diagram.arch -o diagram.svg
inkscape diagram.svg --export-filename=diagram.pdf
```

## Development

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm build

# Link for local development
npm link

# Test the CLI
archlex --version
archlex render examples/aws-3-tier-web.archlex
```

## License

MIT
