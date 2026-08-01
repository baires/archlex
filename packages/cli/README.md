# @cloudmer/cli

Command-line interface for CloudMer - cloud architecture diagrams with semantic validation.

## Installation

```bash
# Install globally
npm install -g @cloudmer/cli

# Or use with npx
npx @cloudmer/cli render diagram.cloudmer
```

## Commands

### `render` - Render diagrams to SVG or PNG

Render a CloudMer diagram to SVG or PNG format.

```bash
# Render to SVG (default)
cloudmer render diagram.cloudmer

# Specify output file
cloudmer render diagram.cloudmer --output diagram.svg

# Render to PNG (requires Playwright)
cloudmer render diagram.cloudmer --output diagram.png

# Render with options
cloudmer render diagram.cloudmer \
  --direction TB \
  --validation strict \
  --theme light \
  --output diagram.svg

# Read from stdin
cat diagram.cloudmer | cloudmer render --stdin --output diagram.svg

# PNG with custom scale and background
cloudmer render diagram.cloudmer \
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

Validate a CloudMer diagram without rendering.

```bash
# Validate a file
cloudmer validate diagram.cloudmer

# Validate with strict mode (default)
cloudmer validate diagram.cloudmer --validation strict

# Validate from stdin
cat diagram.cloudmer | cloudmer validate --stdin
```

**Options:**

- `-v, --validation <mode>` - Validation mode: normal, strict, off (default: strict)
- `--stdin` - Read input from stdin

**Exit Codes:**

- `0` - Success (no errors)
- `1` - Validation errors (when using strict mode)
- `2` - Fatal error (parse error, file not found)

### `examples` - Work with example diagrams

List and view example CloudMer diagrams.

```bash
# List all available examples
cloudmer examples list
cloudmer examples ls

# Get an example by ID
cloudmer examples get aws-3-tier-web

# Use an example as starting point
cloudmer examples get aws-3-tier-web > my-diagram.cloudmer
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
      
      - name: Install CloudMer CLI
        run: npm install -g @cloudmer/cli
      
      - name: Validate diagrams
        run: |
          cloudmer validate docs/architecture/*.cloudmer
      
      - name: Generate PNGs
        run: |
          for file in docs/architecture/*.cloudmer; do
            cloudmer render "$file" --output "${file%.cloudmer}.png"
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
    - npm install -g @cloudmer/cli
    - cloudmer validate docs/**/*.cloudmer

generate-diagrams:
  image: node:22
  script:
    - npm install -g @cloudmer/cli
    - |
      find docs -name "*.cloudmer" -exec sh -c '
        cloudmer render "$1" --output "${1%.cloudmer}.png"
      ' sh {} \;
  artifacts:
    paths:
      - docs/**/*.png
```

### Pre-commit Hook

Add to `.husky/pre-commit` or use lint-staged:

```bash
#!/bin/sh
cloudmer validate $(git diff --cached --name-only --diff-filter=ACMR | grep '\.cloudmer$')
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
cat diagram.cloudmer | cloudmer render --stdin

# Pipe from command
echo "provider aws
vpc: vpc" | cloudmer render --stdin

# Chain commands
cloudmer examples get aws-3-tier-web | cloudmer validate --stdin
```

### Writing to stdout

When no `--output` is specified for the `render` command, SVG is written to stdout:

```bash
# Redirect to file
cloudmer render diagram.cloudmer > output.svg

# Pipe to other tools
cloudmer render diagram.cloudmer | svgo --input - --output optimized.svg
```

## Examples

### Batch Processing

```bash
# Validate all diagrams in a directory
for file in diagrams/*.cloudmer; do
  cloudmer validate "$file" || echo "Failed: $file"
done

# Generate PNGs for all diagrams
find . -name "*.cloudmer" -exec sh -c '
  cloudmer render "$1" --output "${1%.cloudmer}.png" --scale 2
' sh {} \;
```

### Watch Mode (with external tools)

```bash
# Using watchexec
watchexec -w diagram.cloudmer cloudmer render diagram.cloudmer -o diagram.svg

# Using nodemon
nodemon --watch diagram.cloudmer --exec "cloudmer render diagram.cloudmer -o diagram.svg"
```

### Integration with Other Tools

```bash
# Optimize SVG output with svgo
cloudmer render diagram.cloudmer | svgo --input - --output - > optimized.svg

# Convert to PDF with Inkscape
cloudmer render diagram.cloudmer -o diagram.svg
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
cloudmer --version
cloudmer render examples/aws-3-tier-web.cloudmer
```

## License

MIT
