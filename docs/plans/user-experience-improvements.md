# CloudMer User Experience Improvements Plan

**Created**: 2026-07-31  
**Status**: Planning  
**Owner**: TBD

## Context

CloudMer has achieved comprehensive catalog coverage (422 services across AWS/GCP) and a solid rendering foundation. The playground application currently serves as a library demonstration tool with basic features: textarea editor, SVG export, 28 hardcoded examples, and localStorage persistence.

This plan focuses on transforming the playground into a production-grade development tool while adding CLI capabilities for CI/CD integration. The goal is to reduce friction for new users, enable advanced workflows, and unlock CloudMer adoption in automated environments.

**Current State:**
- Basic textarea editor (no Monaco despite spec mentioning it)
- Real-time preview with pan/zoom and two-way selection sync
- 28 static examples hardcoded in `examples.ts`
- SVG-only export (copy/download)
- No import functionality (file upload or URL loading)
- No CLI tool for command-line/CI usage
- No template generation system

**What Works Well:**
- Core rendering pipeline is robust and fast (150ms debounce)
- Clean architecture with separated concerns (Editor, Preview, Diagnostics)
- Theme support (dark/light) with system integration
- Validation modes (normal/strict/off) working correctly

---

## Phase 1: Quick Wins (2-3 weeks)

**Goal**: Deliver immediate user value with low implementation complexity.

### 1.1 Enhanced Error Display in Editor

**Complexity**: Low | **Value**: High

**Problem**: Diagnostics are shown in a separate panel, but the editor doesn't provide inline visual feedback for errors. Users must manually correlate line numbers between panels.

**Solution**: Add CSS-based error highlighting overlays on the textarea with hover tooltips.

**Implementation**:
- Create error overlay component that positions absolutely over textarea
- Parse diagnostic spans to calculate pixel positions using `getBoundingClientRect()`
- Render red underlines using positioned divs with border-bottom
- Add tooltips on hover showing error messages and remediation
- Sync scroll position between textarea and overlay

**Technical Details**:
- Use `::after` pseudo-elements for underline styling
- Calculate positions from line/column coordinates to pixels
- Handle multi-line errors with continuous underlines
- Performance: Update overlays only when diagnostics change (not on every keystroke)

**Files to Modify**:
- `apps/playground/src/components/Editor.tsx` - Add overlay rendering
- `apps/playground/src/styles.css` - Error styling
- Create: `apps/playground/src/components/ErrorOverlay.tsx`

**Success Criteria**:
- Errors visible inline within 100ms of rendering
- Tooltips show full diagnostic message + remediation
- No performance degradation on large files (>1000 lines)

---

### 1.2 File Import (Upload .cloudmer files)

**Complexity**: Low | **Value**: High

**Problem**: Users can only type code manually or select from examples. No way to load existing diagrams from disk.

**Solution**: Add file upload button that reads `.cloudmer` files using FileReader API.

**Implementation**:
- Add "Import" button to Toolbar next to existing export buttons
- Use hidden `<input type="file" accept=".cloudmer,text/plain">` element
- Read file content using FileReader API (`readAsText()`)
- Validate file extension before loading
- Show filename in UI status bar after successful import
- Bonus: Support drag-and-drop on editor pane

**Technical Details**:
- Handle errors gracefully (invalid files, read failures)
- Clear selection when importing
- Reset scroll position to top after import
- Store imported filename in state (don't persist to localStorage)

**Files to Modify**:
- `apps/playground/src/components/Toolbar.tsx` - Add import button
- `apps/playground/src/App.tsx` - Add import handler

**Success Criteria**:
- Supports `.cloudmer` and `.txt` file extensions
- Drag-and-drop works on editor area
- Error messages for invalid files

---

### 1.3 URL Import (Load from Gist/Pastebin)

**Complexity**: Low | **Value**: Medium

**Problem**: Sharing diagrams requires manual copy/paste. No way to load from URLs.

**Solution**: Add "Import from URL" modal that fetches content from remote URLs.

**Implementation**:
- Create modal dialog with URL input field
- Support GitHub, Gist, and raw URL formats
- Automatically convert GitHub URLs to raw URLs:
  - `github.com/.../file.cloudmer` → `raw.githubusercontent.com/.../file.cloudmer`
  - `gist.github.com/...` → `gist.githubusercontent.com/.../raw/...`
- Fetch using native `fetch()` API with CORS handling
- Show loading spinner during fetch
- Handle network errors gracefully

**Technical Details**:
- CORS limitations: Only works with servers that allow cross-origin requests
- Timeout after 10 seconds
- Show clear error messages for CORS failures
- Suggest alternatives (download and import file)

**Files to Create**:
- `apps/playground/src/components/URLImportModal.tsx`

**Files to Modify**:
- `apps/playground/src/components/Toolbar.tsx` - Add "Import from URL" button
- `apps/playground/src/App.tsx` - Add URL import handler

**Success Criteria**:
- GitHub URLs automatically converted to raw format
- Gist URLs work correctly
- Clear error messages for CORS failures
- 10-second timeout with user feedback

---

### 1.4 PNG Export (Browser-based)

**Complexity**: Medium | **Value**: High

**Problem**: Only SVG export is available. Many users need PNG for documentation, presentations, and sharing.

**Solution**: Convert SVG to PNG using canvas API in the browser.

**Implementation**:
- Create utility function `svgToPng(svgString, scale)` 
- Convert SVG string to data URL
- Create temporary Image object and load SVG
- Create canvas element matching image dimensions
- Apply devicePixelRatio scaling for high-DPI displays
- Draw image to canvas using `drawImage()`
- Export canvas to PNG using `canvas.toDataURL('image/png')`
- Trigger download with blob URL

**Technical Details**:
- Default scale: 2x for high quality
- Maximum canvas size: 8192×8192 (browser limitation)
- Handle large diagrams by scaling down if needed
- Show warning if diagram exceeds canvas limits
- Clean up blob URLs after download

**Files to Create**:
- `apps/playground/src/utils/export.ts` - Export utilities

**Files to Modify**:
- `apps/playground/src/App.tsx` - Add PNG export handler
- `apps/playground/src/components/Toolbar.tsx` - Add "Export as PNG" button

**Success Criteria**:
- PNG exports at 2× resolution by default
- High-quality output suitable for documentation
- Handles diagrams up to 4096×4096 pixels
- Download filename: `cloudmer-diagram.png`

---

## Phase 2: Core Features (4-6 weeks)

**Goal**: Transform playground into a professional development tool.

### 2.1 Monaco Editor Integration

**Complexity**: High | **Value**: High

**Problem**: Textarea provides no IDE features (syntax highlighting, autocomplete, error squiggles, keyboard shortcuts).

**Solution**: Replace textarea with Monaco Editor and create custom language definition for CloudMer DSL.

**Implementation**:

**1. Install Dependencies**:
```bash
pnpm add @monaco-editor/react monaco-editor
```

**2. Create CloudMer Language Definition**:
- Define Monarch tokenizer for syntax highlighting
- Keywords: `provider`, `direction`, `validation`, `account`, `region`, `vpc`, `subnet`
- Operators: `>`, `-[`, `]->`, `|`, `{`, `}`
- Strings: Labels in `"quotes"`
- Comments: `#` and `/* */`

**3. Register Language**:
```typescript
monaco.languages.register({ id: 'cloudmer' });
monaco.languages.setMonarchTokensProvider('cloudmer', cloudmerTokens);
```

**4. Add Autocomplete Provider**:
- Extract service kinds from `@cloudmer/aws` and `@cloudmer/gcp` providers
- Suggest services based on provider directive
- Suggest relationship types from core knownRelationships
- Context-aware suggestions (inside blocks, after `-[`)

**5. Add Hover Provider**:
- Show service metadata on hover (category, description)
- Show relationship type descriptions
- Show diagnostic tooltips for errors

**6. Map Diagnostics to Markers**:
```typescript
monaco.editor.setModelMarkers(model, 'cloudmer', diagnostics.map(d => ({
  severity: d.severity === 'error' ? MarcoSeverity.Error : MarcoSeverity.Warning,
  startLineNumber: d.span.start.line,
  startColumn: d.span.start.column,
  endLineNumber: d.span.end.line,
  endColumn: d.span.end.column,
  message: d.message
})));
```

**Technical Details**:
- Lazy load Monaco (code splitting) to reduce initial bundle
- Use Web Worker for tokenization (Monaco does this automatically)
- Theme synchronization: map CloudMer themes to Monaco themes
- Preserve 150ms debounce for rendering
- Two-way selection sync still works via `data-cloudmer-id`

**Bundle Impact**: +3MB (Monaco is large, but lazy loaded)

**Files to Create**:
- `apps/playground/src/monaco/cloudmer-lang.ts` - Language definition
- `apps/playground/src/monaco/completions.ts` - Autocomplete provider
- `apps/playground/src/monaco/hover.ts` - Hover provider
- `apps/playground/src/monaco/diagnostics.ts` - Diagnostic mapper

**Files to Modify**:
- `apps/playground/src/components/Editor.tsx` - Replace textarea with Monaco
- `apps/playground/package.json` - Add dependencies
- `apps/playground/vite.config.ts` - Configure Monaco worker loading

**Success Criteria**:
- Syntax highlighting for all CloudMer constructs
- Autocomplete suggests valid services based on provider
- Diagnostics appear as inline squiggles
- Hover shows service/relationship descriptions
- Performance: No lag on typing (tokenization in worker)

---

### 2.2 Template Generation System

**Complexity**: Medium | **Value**: High

**Problem**: 28 examples are hardcoded static text. Users can't customize templates for their needs.

**Solution**: Create parameterized template system with wizard UI.

**Implementation**:

**1. Template Schema**:
```typescript
interface TemplateParameter {
  name: string;
  type: 'choice' | 'multi-select' | 'number' | 'boolean' | 'text';
  label: string;
  description: string;
  default: any;
  options?: Array<{ value: string; label: string }>;
}

interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  parameters: TemplateParameter[];
  generate: (params: Record<string, any>) => string;
}
```

**2. Convert Examples to Templates**:

Example: "3-Tier Web Application"
```typescript
{
  id: 'aws-3-tier-web',
  title: '3-Tier Web Application',
  parameters: [
    {
      name: 'database',
      type: 'choice',
      label: 'Database Type',
      options: [
        { value: 'rds', label: 'RDS (PostgreSQL)' },
        { value: 'dynamodb', label: 'DynamoDB' },
        { value: 'aurora', label: 'Aurora Serverless' }
      ]
    },
    {
      name: 'caching',
      type: 'boolean',
      label: 'Enable ElastiCache',
      default: true
    },
    {
      name: 'regions',
      type: 'number',
      label: 'Number of Regions',
      default: 1,
      min: 1,
      max: 3
    }
  ],
  generate: (params) => {
    // Generate CloudMer source based on parameters
    return `provider aws
direction LR

alb > ecs
${params.caching ? 'ecs -[caches]-> elasticache' : ''}
ecs -[writes]-> ${params.database}`;
  }
}
```

**3. Template Wizard UI**:
- Modal dialog with form inputs
- Parameter types rendered as appropriate controls
- Real-time preview of generated code
- "Generate" button loads code into editor
- "Copy" button copies to clipboard without loading

**4. Template Discovery**:
- Group templates by category in dropdown
- Search/filter by name and description
- Show parameter count badge
- Mark templates as "Simple", "Intermediate", "Advanced"

**Migration Plan**:
- Phase 1: Keep static examples, add 5 templates
- Phase 2: Convert popular examples to templates
- Phase 3: All examples as templates (backward compatibility via zero-parameter templates)

**Files to Create**:
- `apps/playground/src/templates/index.ts` - Template registry
- `apps/playground/src/templates/aws-3-tier.ts` - Example template
- `apps/playground/src/templates/aws-serverless-api.ts` - Example template
- `apps/playground/src/templates/gcp-data-warehouse.ts` - Example template
- `apps/playground/src/components/TemplateWizard.tsx` - Template wizard UI

**Files to Modify**:
- `apps/playground/src/App.tsx` - Add template wizard state
- `apps/playground/src/components/Toolbar.tsx` - Add "New from Template" button
- `apps/playground/src/examples.ts` - Keep for backward compatibility

**Success Criteria**:
- 10+ parameterized templates available
- Template wizard is intuitive (no documentation needed)
- Generated code is valid and renders correctly
- Templates reduce setup time by 80% for common patterns

---

### 2.3 CLI Tool

**Complexity**: Medium | **Value**: High

**Problem**: No command-line interface for CI/CD, batch processing, or automation.

**Solution**: Create `@cloudmer/cli` package with render, validate, and utility commands.

**Implementation**:

**1. Package Structure**:
```
packages/cli/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── commands/
│   │   ├── render.ts     # Render command
│   │   ├── validate.ts   # Validate command
│   │   └── examples.ts   # Examples command
│   └── utils/
│       ├── output.ts     # PNG/PDF export
│       └── errors.ts     # Error handling
├── package.json
└── tsconfig.json
```

**2. Commands**:

```bash
# Render to SVG
cloudmer render diagram.cloudmer --output diagram.svg

# Render to PNG (requires Playwright)
cloudmer render diagram.cloudmer --output diagram.png --scale 2

# Render with options
cloudmer render diagram.cloudmer --direction TB --validation strict --theme light

# Validate only
cloudmer validate diagram.cloudmer

# List examples
cloudmer examples list

# Get example
cloudmer examples get aws-3-tier-web > my-diagram.cloudmer
```

**3. PNG Export** (requires headless browser):
- Install Playwright for headless rendering
- Render SVG to HTML page
- Screenshot with Playwright
- More reliable than canvas for complex SVGs

**4. Exit Codes**:
- `0` - Success
- `1` - Validation errors (when using `--validation strict`)
- `2` - Fatal error (parse error, file not found)

**5. CI/CD Integration Examples**:

```yaml
# GitHub Actions
- name: Validate CloudMer diagrams
  run: |
    npm install -g @cloudmer/cli
    cloudmer validate docs/architecture/*.cloudmer
    
- name: Generate diagram PNGs
  run: |
    for file in docs/*.cloudmer; do
      cloudmer render "$file" --output "${file%.cloudmer}.png"
    done
```

**Technical Details**:
- Use commander.js for CLI framework
- Use chalk for colored output
- Use ora for spinners during rendering
- Stream output for large files
- Support stdin/stdout for piping

**Files to Create**:
- `packages/cli/src/index.ts`
- `packages/cli/src/commands/render.ts`
- `packages/cli/src/commands/validate.ts`
- `packages/cli/src/commands/examples.ts`
- `packages/cli/src/utils/output.ts`
- `packages/cli/package.json`
- `packages/cli/README.md` - CLI documentation

**Dependencies**:
- `commander` - CLI framework
- `chalk` - Terminal colors
- `ora` - Spinners
- `playwright` (optional) - PNG export

**Success Criteria**:
- CLI installable via `npm install -g @cloudmer/cli`
- Render command produces identical output to playground
- Validate command shows clear error messages
- Performance: <2s for typical diagrams
- Works on Linux, macOS, Windows

---

### 2.4 Share Links (Optional - Backend Required)

**Complexity**: High | **Value**: Medium

**Problem**: No way to share diagrams without manual copy/paste.

**Solution Option A** (No Backend): Compress and encode in URL hash  
**Solution Option B** (Backend): Store in KV store with short IDs

**Implementation (Option A - URL Hash)**:

```typescript
import LZString from 'lz-string';

// Encode
function encodeShareLink(source: string): string {
  const compressed = LZString.compressToEncodedURIComponent(source);
  return `${window.location.origin}/#${compressed}`;
}

// Decode
function decodeShareLink(hash: string): string | null {
  if (!hash.startsWith('#')) return null;
  return LZString.decompressFromEncodedURIComponent(hash.slice(1));
}
```

**Limitations**:
- URL length limit ~2000 characters (most diagrams fit)
- No analytics or tracking
- No expiration

**Implementation (Option B - Backend)**:

```typescript
// Vercel Edge Function
// api/share.ts
export default async function handler(req: Request) {
  if (req.method === 'POST') {
    const { source } = await req.json();
    const id = generateShortId(); // e.g., "a3x9kf"
    await kv.set(`share:${id}`, source, { ex: 60 * 60 * 24 * 30 }); // 30 days
    return Response.json({ id, url: `${origin}/share/${id}` });
  }
  
  // GET /api/share/:id
  const id = req.url.split('/').pop();
  const source = await kv.get(`share:${id}`);
  return Response.json({ source });
}
```

**Recommendation**: Start with Option A (URL hash). Add backend if demand is high.

**Files to Create** (Option A):
- `apps/playground/src/utils/share.ts` - URL encoding utilities

**Files to Modify**:
- `apps/playground/src/App.tsx` - Check URL hash on load
- `apps/playground/src/components/Toolbar.tsx` - Add "Share" button
- `apps/playground/package.json` - Add `lz-string` dependency

**Success Criteria**:
- Share link copies to clipboard
- Shared diagrams load correctly from URL
- No data loss for diagrams <500 lines

---

## Phase 3: Advanced Features (6-8 weeks)

**Goal**: Add power-user features that differentiate CloudMer from competitors.

### 3.1 Visual Node Positioning (Drag/Drop)

**Complexity**: High | **Value**: Medium

**Problem**: Layout is fully automatic. Users can't adjust node positions for presentations or aesthetics.

**Solution**: Add drag handles to nodes with position override system.

**Implementation**:

**Challenge**: ELK layout engine may not support fixed positions. Two approaches:

**Approach A** (Position Hints):
- Extend CloudMer DSL with position hints:
  ```
  app: ecs @position(100, 200)
  ```
- Pass hints to ELK as initial positions
- ELK still routes edges automatically

**Approach B** (Lock Layout):
- Add "Lock Layout" toggle that disables automatic layout
- Store positions in localStorage per diagram
- Manual edge routing (complex)

**Recommendation**: Start with Approach A (position hints).

**Technical Details**:
- Add drag handles to SVG nodes
- Calculate delta from drag start
- Update position in graph state
- Re-render with fixed positions
- Show grid snapping and alignment guides

**Files to Create**:
- `apps/playground/src/components/DragHandle.tsx`
- `apps/playground/src/utils/positioning.ts`

**Files to Modify**:
- `apps/playground/src/components/Preview.tsx` - Add drag interaction
- `apps/playground/src/App.tsx` - Store position overrides
- `packages/layout-elk/src/index.ts` - Support position hints

**Success Criteria**:
- Nodes draggable with mouse
- Grid snapping to 10px increments
- Alignment guides show when nodes align
- Positions preserved across renders
- "Reset Layout" button restores automatic positioning

---

### 3.2 PDF Export

**Complexity**: Medium | **Value**: Medium

**Problem**: No PDF export for documentation or archival purposes.

**Solution**: Use jsPDF + svg2pdf.js to convert SVG to PDF.

**Implementation**:

```typescript
import jsPDF from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';

async function exportToPdf(svgString: string, options: {
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
}) {
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'px',
    format: options.pageSize
  });
  
  const svgElement = new DOMParser()
    .parseFromString(svgString, 'image/svg+xml')
    .documentElement;
  
  await svg2pdf(svgElement, pdf, {
    x: 0,
    y: 0,
    width: pdf.internal.pageSize.getWidth(),
    height: pdf.internal.pageSize.getHeight()
  });
  
  pdf.save('cloudmer-diagram.pdf');
}
```

**Technical Details**:
- Maintain vector quality (not rasterized)
- Handle large diagrams with auto-scaling
- Add metadata (title, author, creation date)
- Support custom page sizes

**Files to Modify**:
- `apps/playground/src/utils/export.ts` - Add PDF export
- `apps/playground/src/components/Toolbar.tsx` - Add "Export as PDF"
- `apps/playground/package.json` - Add dependencies

**Dependencies**:
- `jspdf` (~500KB)
- `svg2pdf.js` (~100KB)

**Success Criteria**:
- PDF exports maintain vector quality
- A4 and Letter page sizes supported
- Metadata includes diagram title and date
- File size reasonable (<5MB for typical diagrams)

---

### 3.3 Interactive Visual Editing (Context Menu)

**Complexity**: High | **Value**: Medium

**Problem**: All edits must be made in code. No visual editing capabilities.

**Solution**: Add right-click context menu on nodes with edit actions.

**Implementation**:

**Context Menu Actions**:
- "Connect to..." → Opens node picker → Appends relationship to source
- "Change Service Type" → Opens dropdown → Replaces service kind
- "Edit Label" → Inline input → Updates display label
- "Delete Node" → Removes resource declaration
- "Duplicate" → Creates copy with incremented ID

**Challenge**: Requires inverse transformation from graph back to source code.

**Two Approaches**:

**Approach A** (AST Manipulation):
- Parse source to AST
- Find node in AST by ID
- Modify AST node
- Regenerate source from AST
- Preserve formatting where possible

**Approach B** (Track Visual Changes Separately):
- Store visual edits in separate state
- Merge with source code at render time
- Don't modify source directly
- "Apply Changes" button writes back to source

**Recommendation**: Start with Approach B (safer, easier).

**Technical Details**:
- Create `ContextMenu` component with absolute positioning
- Click outside to close
- Keyboard navigation (arrow keys, Enter, Escape)
- Actions generate CloudMer code snippets
- Show preview before applying

**Files to Create**:
- `apps/playground/src/components/ContextMenu.tsx`
- `apps/playground/src/utils/code-generation.ts`

**Files to Modify**:
- `apps/playground/src/components/Preview.tsx` - Add right-click handler
- `apps/playground/src/App.tsx` - Track visual changes

**Success Criteria**:
- Context menu appears on right-click
- "Connect to..." adds valid relationships
- "Delete" removes node from source
- Changes preserve code formatting
- Undo/redo support for visual edits

---

### 3.4 Advanced Template Discovery

**Complexity**: Medium | **Value**: Low

**Problem**: Template dropdown is flat and unsorted as templates grow.

**Solution**: Create template gallery with previews, search, and filtering.

**Implementation**:

**Gallery Features**:
- Grid layout with thumbnail previews (mini SVG renders)
- Search by name and description (fuzzy matching)
- Filter by category, provider, complexity
- Tag system (aws, gcp, simple, intermediate, advanced)
- Sort by popularity, recency, alphabetical

**Template Metadata**:
```typescript
interface TemplateMetadata {
  complexity: 'simple' | 'intermediate' | 'advanced';
  tags: string[];
  estimatedTime: number; // minutes to customize
  popularity?: number; // usage count (if backend exists)
}
```

**Files to Create**:
- `apps/playground/src/components/TemplateGallery.tsx`
- `apps/playground/src/components/TemplateCard.tsx`
- `apps/playground/src/components/TemplateSearch.tsx`

**Files to Modify**:
- `apps/playground/src/templates/index.ts` - Add metadata
- `apps/playground/src/App.tsx` - Add gallery modal

**Success Criteria**:
- Gallery shows 10+ templates with thumbnails
- Search finds templates by partial name match
- Filters work correctly (category, provider, tags)
- Template details show parameters and description

---

## Implementation Priorities

### Recommended Order

**Weeks 1-3** (Phase 1 - Quick Wins):
1. File Import (1 week)
2. Enhanced Error Display + PNG Export (1 week)
3. URL Import (1 week)

**Weeks 4-9** (Phase 2 - Core Features):
4. Monaco Editor Integration (3 weeks) - Biggest impact
5. CLI Tool (2 weeks) - Unlocks CI/CD
6. Template System (2 weeks) - User onboarding
7. Share Links (1 week, optional)

**Weeks 10-17** (Phase 3 - Advanced):
8. PDF Export (1 week)
9. Visual Node Positioning (3 weeks)
10. Interactive Visual Editing (3 weeks)
11. Advanced Template Discovery (1 week)

---

## Technical Considerations

### Bundle Size Impact

| Feature | Size Impact | Mitigation |
|---------|-------------|------------|
| Monaco Editor | +3MB | Lazy load, code split |
| jsPDF + svg2pdf | +600KB | Lazy load on export |
| lz-string | +5KB | Minimal, always load |
| Playwright (CLI) | N/A | Optional dependency |

### Browser Compatibility

- Target: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- PNG export: Limited by canvas size (8192×8192)
- Monaco: Requires ES2015+ (no IE11)
- Share links: Limited by URL length (~2000 chars)

### Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Render (small) | <100ms | ~80ms ✅ |
| Render (medium) | <500ms | ~300ms ✅ |
| File import | <50ms | N/A |
| PNG export | <2s | N/A |
| CLI render | <2s | N/A |

---

## Success Metrics

### Phase 1 (Quick Wins)
- File import usage: >30% of sessions
- PNG export: >50% of export operations
- Error discovery time: <10s (vs manual line scanning)

### Phase 2 (Core Features)
- Monaco editor satisfaction: NPS >8
- CLI weekly active users: >100
- Template usage: >60% of new diagrams
- Setup time reduction: 80% with templates

### Phase 3 (Advanced Features)
- Visual editing adoption: >20% of power users
- PDF export: >10% of export volume
- Custom positions: >5% of diagrams

---

## Verification

After each phase, verify:

1. **Functionality**: All features work as specified
2. **Performance**: Metrics meet targets (render time, bundle size)
3. **Usability**: User testing with 5+ participants
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Cross-browser**: Test on Chrome, Firefox, Safari, Edge
6. **Mobile**: Basic functionality on tablets (desktop focus)

---

## Critical Files

**Phase 1**:
- `apps/playground/src/App.tsx`
- `apps/playground/src/components/Editor.tsx`
- `apps/playground/src/components/Toolbar.tsx`
- `apps/playground/src/utils/export.ts` (new)

**Phase 2**:
- `apps/playground/src/monaco/cloudmer-lang.ts` (new)
- `apps/playground/src/templates/index.ts` (new)
- `packages/cli/src/index.ts` (new)

**Phase 3**:
- `apps/playground/src/components/ContextMenu.tsx` (new)
- `apps/playground/src/utils/positioning.ts` (new)
