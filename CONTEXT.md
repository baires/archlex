# ArchLex

ArchLex is a semantic cloud architecture diagramming library that compiles text-based architecture definitions into accessible, themeable SVG diagrams with automatic layout and semantic validation.

## Language

### Diagram Rendering

**MCP Tool Response**:
A JSON-RPC result returned by the `render_diagram` tool containing both a `content` array (for standard MCP clients) and a `structuredContent` object (for programmatic access). The content array includes a base64-encoded SVG image that clients can display directly.
_Avoid_: Tool result, render output

**MCP Apps Viewer**:
An interactive HTML5 document served as a `ui://` resource with MIME type `text/html;profile=mcp-app`. When a client supports MCP Apps (SEP-1865), it loads this viewer in a sandboxed iframe and pushes tool results into it via postMessage, enabling pan, zoom, and interactive diagram exploration.
_Avoid_: Diagram viewer, interactive viewer, UI resource

**Diagram Viewer**:
The specific MCP Apps viewer implementation at `ui://archlex/diagram-viewer` that receives `render_diagram` results and displays them with zoom controls and a playground link.
_Avoid_: Interactive UI, viewer component

**Base64 SVG Image**:
The embedded SVG diagram encoded as base64 in the MCP tool response's content array. This is the fallback rendering path for clients that don't support MCP Apps — the agent or client displays this image directly without the interactive viewer.
_Avoid_: Image response, SVG response, fallback image

### Client Capabilities

**MCP Apps-capable Client**:
An MCP client that implements the MCP Apps extension (SEP-1865), supporting `text/html;profile=mcp-app` resources. These clients load the Diagram Viewer when `render_diagram` is called, rather than displaying the base64 image. Examples: Claude Desktop (recent versions), potentially Codex and Gemini.
_Avoid_: Modern client, Apps client, SEP-1865 client

**Standard MCP Client**:
An MCP client that supports the core MCP protocol but not the MCP Apps extension. These clients receive the same tool response but only consume the base64 SVG image from the content array, ignoring the `_meta.ui.resourceUri` field.
_Avoid_: Legacy client, basic client, non-Apps client

**Structured Content**:
The `structuredContent` field in MCP tool responses, containing a typed JSON object with fields like `svg`, `diagnostics`, `playground_url`, `nodes_count`, and `edges_count`. This is programmatically accessible data mirroring the text content, used by MCP Apps viewers and potentially by agents for analysis.
_Avoid_: Metadata, structured response, JSON payload

### Rendering Paths

**Interactive Rendering Path**:
When an MCP Apps-capable client calls `render_diagram`, the client loads the Diagram Viewer iframe (because the tool declares `_meta.ui.resourceUri`), then pushes the tool result into it. The viewer parses `structuredContent.svg` and renders it with pan/zoom controls.
_Avoid_: MCP Apps path, viewer path, interactive flow

**Direct Rendering Path**:
When a standard MCP client or agent calls `render_diagram`, it receives the base64 SVG image in the content array and displays it inline without the interactive viewer. This is the fallback for clients that don't recognize `text/html;profile=mcp-app` or `_meta.ui` annotations.
_Avoid_: Fallback path, image path, non-interactive flow

**Agent Display Instruction**:
The guidance in the `render_diagram` tool description: "The AI assistant SHOULD display the rendered SVG image inline in its response." This instructs the agent (not the client) to include the image when presenting results to the user, regardless of which rendering path the client uses.
_Avoid_: Display hint, rendering instruction

### Implementation Status

**MCP Apps Adoption**:
MCP Apps (SEP-1865) is not yet implemented in any tested client (Claude Desktop, Codex, Gemini as of early 2025). The Diagram Viewer exists and follows the spec but remains untested in production. The Interactive Rendering Path is currently non-functional across all clients.
_Avoid_: MCP Apps support, client implementation status

**Base64 Image Rendering Issue**:
Agents receive the base64 SVG image in the content array but display raw SVG source code instead of rendering it as an image. The image is provably received (small thumbnails appear in client UIs) but agent display heuristics choose to show XML text under "Diagram Preview" headings rather than embedding the visual.
_Avoid_: Image display bug, agent behavior issue
