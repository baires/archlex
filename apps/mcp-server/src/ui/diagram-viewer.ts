/**
 * MCP Apps (SEP-1865) diagram viewer.
 *
 * Self-contained HTML5 document served as a `ui://` resource with MIME type
 * `text/html;profile=mcp-app`. MCP-Apps-capable hosts render it in a sandboxed
 * iframe and push tool results into it over JSON-RPC/postMessage.
 *
 * The inline script speaks the protocol by hand (no SDK) so the document has
 * zero external dependencies and works under the spec's restrictive default
 * CSP (`connect-src 'none'`, inline scripts/styles only). It intentionally
 * avoids JS template literals so the TypeScript template string stays safe.
 */

export const DIAGRAM_VIEWER_URI = "ui://archlex/diagram-viewer";

export const DIAGRAM_VIEWER_MIME_TYPE = "text/html;profile=mcp-app";

/**
 * Extract diagram viewer payload from a tool result.
 * Supports both SVG (from structuredContent.svg) and PNG (from content[].type === "image").
 */
export function extractDiagramViewerPayload(result: {
  content?: Array<{
    type: string;
    data?: string;
    mimeType?: string;
    text?: string;
  }>;
  structuredContent?: {
    svg?: string;
    playground_url?: string;
    diagnostics?: unknown[];
  };
}): { image: string; playgroundUrl?: string; diagnostics?: unknown[] } | null {
  // Prefer SVG from structuredContent
  if (result.structuredContent?.svg) {
    return {
      image: result.structuredContent.svg,
      playgroundUrl: result.structuredContent.playground_url,
      diagnostics: result.structuredContent.diagnostics,
    };
  }

  // Fallback to PNG from content array
  const imageContent = result.content?.find(
    (c) => c.type === "image" && c.data && c.mimeType === "image/png",
  );
  if (imageContent?.data) {
    return {
      image: `data:image/png;base64,${imageContent.data}`,
      playgroundUrl: result.structuredContent?.playground_url,
      diagnostics: result.structuredContent?.diagnostics,
    };
  }

  return null;
}

export const DIAGRAM_VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ArchLex Diagram</title>
<style>
  :root {
    color-scheme: light dark;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--color-background-primary, transparent);
    color: var(--color-text-primary, #64748b);
    font-family: var(--font-sans, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  }
  #viewer {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100vh;
    cursor: grab;
  }
  #viewer.dragging { cursor: grabbing; }
  #stage {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
  }
  #stage svg, #stage img {
    display: block;
    max-width: none;
  }
  #toolbar {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 4px 6px;
    border-radius: var(--border-radius-md, 8px);
    background: var(--color-background-secondary, rgba(100, 116, 139, 0.12));
    border: 1px solid var(--color-border-primary, rgba(100, 116, 139, 0.25));
    font-size: 12px;
    user-select: none;
    z-index: 10;
  }
  #toolbar button, #toolbar a {
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
  }
  #toolbar button:hover, #toolbar a:hover {
    background: var(--color-background-tertiary, rgba(100, 116, 139, 0.2));
  }
  #zoom-label {
    min-width: 42px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  #status {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    opacity: 0.75;
    pointer-events: none;
  }
  #errors {
    display: none;
    margin: 8px;
    padding: 8px 12px;
    border-radius: var(--border-radius-md, 8px);
    background: var(--color-background-danger, rgba(220, 38, 38, 0.12));
    color: var(--color-text-danger, #dc2626);
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
  }
</style>
</head>
<body>
<div id="errors"></div>
<div id="viewer">
  <div id="stage"></div>
  <div id="status">Waiting for diagram&hellip;</div>
  <div id="toolbar" hidden>
    <button id="zoom-out" title="Zoom out">&minus;</button>
    <span id="zoom-label">100%</span>
    <button id="zoom-in" title="Zoom in">+</button>
    <button id="zoom-fit" title="Fit to container">Fit</button>
    <a id="open-playground" href="#" title="Open in ArchLex playground">Playground &#8599;</a>
  </div>
</div>
<script>
(function () {
  "use strict";

  // ---------- minimal MCP Apps (SEP-1865) postMessage protocol ----------

  var nextId = 1;
  var pending = {};

  function postMessage(message) {
    window.parent.postMessage(message, "*");
  }

  function sendRequest(method, params) {
    var id = nextId++;
    return new Promise(function (resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject };
      postMessage({ jsonrpc: "2.0", id: id, method: method, params: params });
    });
  }

  function sendNotification(method, params) {
    postMessage({ jsonrpc: "2.0", method: method, params: params });
  }

  function sendResult(id, result) {
    postMessage({ jsonrpc: "2.0", id: id, result: result });
  }

  // ---------- viewer state ----------

  var stage = document.getElementById("stage");
  var viewer = document.getElementById("viewer");
  var status = document.getElementById("status");
  var toolbar = document.getElementById("toolbar");
  var errorsBox = document.getElementById("errors");
  var zoomLabel = document.getElementById("zoom-label");
  var playgroundLink = document.getElementById("open-playground");

  var view = { scale: 1, tx: 0, ty: 0 };
  var hostContext = {};
  var openLinksSupported = false;

  function applyTransform() {
    stage.style.transform =
      "translate(" + view.tx + "px, " + view.ty + "px) scale(" + view.scale + ")";
    zoomLabel.textContent = Math.round(view.scale * 100) + "%";
  }

  function diagramSize() {
    var svg = stage.querySelector("svg");
    if (svg) {
      var viewBox = svg.getAttribute("viewBox");
      if (viewBox) {
        var parts = viewBox.split(/\\s+/).map(Number);
        if (parts.length === 4 && parts.every(isFinite)) {
          return { width: parts[2], height: parts[3] };
        }
      }
      var rect = svg.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width / view.scale, height: rect.height / view.scale };
      }
    }
    var img = stage.querySelector("img");
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return { width: img.naturalWidth, height: img.naturalHeight };
    }
    return null;
  }

  function fitToContainer() {
    var size = diagramSize();
    if (!size) return;
    var availW = viewer.clientWidth - 16;
    var availH = viewer.clientHeight - 16;
    var scale = Math.min(availW / size.width, availH / size.height, 4);
    view.scale = Math.max(scale, 0.05);
    view.tx = (viewer.clientWidth - size.width * view.scale) / 2;
    view.ty = (viewer.clientHeight - size.height * view.scale) / 2;
    applyTransform();
  }

  function zoomBy(factor) {
    var cx = viewer.clientWidth / 2;
    var cy = viewer.clientHeight / 2;
    var next = Math.min(Math.max(view.scale * factor, 0.05), 8);
    view.tx = cx - ((cx - view.tx) / view.scale) * next;
    view.ty = cy - ((cy - view.ty) / view.scale) * next;
    view.scale = next;
    applyTransform();
  }

  document.getElementById("zoom-in").addEventListener("click", function () {
    zoomBy(1.25);
  });
  document.getElementById("zoom-out").addEventListener("click", function () {
    zoomBy(0.8);
  });
  document.getElementById("zoom-fit").addEventListener("click", fitToContainer);

  viewer.addEventListener("wheel", function (event) {
    if (stage.querySelector("svg") || stage.querySelector("img")) {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 1.1 : 0.9);
    }
  }, { passive: false });

  var drag = null;
  viewer.addEventListener("pointerdown", function (event) {
    // Don't start a drag (or capture the pointer) from toolbar controls,
    // otherwise their click events are suppressed.
    if (event.target.closest && event.target.closest("#toolbar")) return;
    drag = { x: event.clientX, y: event.clientY, tx: view.tx, ty: view.ty };
    viewer.classList.add("dragging");
    viewer.setPointerCapture(event.pointerId);
  });
  viewer.addEventListener("pointermove", function (event) {
    if (!drag) return;
    view.tx = drag.tx + (event.clientX - drag.x);
    view.ty = drag.ty + (event.clientY - drag.y);
    applyTransform();
  });
  viewer.addEventListener("pointerup", function () {
    drag = null;
    viewer.classList.remove("dragging");
  });

  playgroundLink.addEventListener("click", function (event) {
    var url = playgroundLink.getAttribute("data-url");
    if (openLinksSupported && url) {
      event.preventDefault();
      sendRequest("ui/open-link", { url: url }).catch(function () {
        window.open(url, "_blank");
      });
    }
  });

  // ---------- host context / theming ----------

  function applyHostContext(context) {
    hostContext = Object.assign({}, hostContext, context || {});
    if (hostContext.theme) {
      document.documentElement.style.colorScheme = hostContext.theme;
    }
    var variables =
      hostContext.styles && hostContext.styles.variables
        ? hostContext.styles.variables
        : {};
    for (var key in variables) {
      if (Object.prototype.hasOwnProperty.call(variables, key)) {
        document.documentElement.style.setProperty(key, variables[key]);
      }
    }
    var dims = hostContext.containerDimensions;
    if (dims) {
      if (typeof dims.height === "number") {
        viewer.style.height = "100vh";
      } else if (typeof dims.maxHeight === "number") {
        viewer.style.height = "auto";
        viewer.style.maxHeight = dims.maxHeight + "px";
        viewer.style.minHeight = "120px";
      }
      if (typeof dims.maxWidth === "number") {
        viewer.style.maxWidth = dims.maxWidth + "px";
      }
    }
  }

  // ---------- tool data ----------

  function findPayload(result) {
    // Prefer SVG from structuredContent
    if (result && result.structuredContent && result.structuredContent.svg) {
      return {
        type: "svg",
        data: result.structuredContent.svg,
        playground_url: result.structuredContent.playground_url,
        diagnostics: result.structuredContent.diagnostics,
      };
    }
    // Fallback to PNG from content array
    var content = (result && result.content) || [];
    for (var i = 0; i < content.length; i++) {
      if (content[i].type === "image" && content[i].data && content[i].mimeType === "image/png") {
        return {
          type: "png",
          data: content[i].data,
          playground_url: result.structuredContent && result.structuredContent.playground_url,
          diagnostics: result.structuredContent && result.structuredContent.diagnostics,
        };
      }
    }
    // Legacy: try parsing text content as JSON
    for (var i = 0; i < content.length; i++) {
      if (content[i].type === "text") {
        try {
          var parsed = JSON.parse(content[i].text);
          if (parsed && parsed.svg) {
            return {
              type: "svg",
              data: parsed.svg,
              playground_url: parsed.playground_url,
              diagnostics: parsed.diagnostics,
            };
          }
        } catch (e) {
          // not JSON, keep looking
        }
      }
    }
    return null;
  }

  function renderErrors(diagnostics) {
    var errors = (diagnostics || []).filter(function (d) {
      return d && d.severity === "error";
    });
    if (errors.length === 0) {
      errorsBox.style.display = "none";
      return;
    }
    errorsBox.textContent = errors
      .map(function (d) {
        return "[" + d.code + "] " + d.message;
      })
      .join("\\n");
    errorsBox.style.display = "block";
  }

  function handleToolResult(result) {
    var payload = findPayload(result);
    if (!payload) {
      status.textContent = result && result.isError
        ? "Diagram rendering failed."
        : "No diagram in tool result.";
      return;
    }

    // Clear stage
    stage.innerHTML = "";

    if (payload.type === "svg") {
      stage.innerHTML = payload.data;
      var svg = stage.querySelector("svg");
      if (svg) {
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        var size = diagramSize();
        if (size) {
          svg.setAttribute("width", String(size.width));
          svg.setAttribute("height", String(size.height));
        }
      }
    } else if (payload.type === "png") {
      var img = document.createElement("img");
      img.src = "data:image/png;base64," + payload.data;
      img.style.maxWidth = "none";
      img.style.height = "auto";
      img.onload = function () {
        fitToContainer();
        reportSize();
      };
      stage.appendChild(img);
    }

    renderErrors(payload.diagnostics);
    if (payload.playground_url) {
      playgroundLink.setAttribute("data-url", payload.playground_url);
      playgroundLink.setAttribute("href", payload.playground_url);
      playgroundLink.setAttribute("target", "_blank");
      playgroundLink.setAttribute("rel", "noopener noreferrer");
    } else {
      playgroundLink.hidden = true;
    }
    status.style.display = "none";
    toolbar.hidden = false;
    fitToContainer();
    reportSize();
  }

  // ---------- size reporting ----------

  var lastReported = { width: 0, height: 0 };
  function reportSize() {
    var width = Math.ceil(document.body.scrollWidth);
    var height = Math.ceil(document.body.scrollHeight);
    if (width !== lastReported.width || height !== lastReported.height) {
      lastReported = { width: width, height: height };
      sendNotification("ui/notifications/size-changed", {
        width: width,
        height: height,
      });
    }
  }

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(function () {
      reportSize();
    }).observe(document.body);
  }

  // ---------- message handling ----------

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.jsonrpc !== "2.0") return;

    // Response to a pending request
    if (typeof data.id !== "undefined" && pending[data.id]) {
      var entry = pending[data.id];
      delete pending[data.id];
      if (data.error) {
        entry.reject(new Error(data.error.message || "Request failed"));
      } else {
        entry.resolve(data.result);
      }
      return;
    }

    // Host -> View request
    if (data.method && typeof data.id !== "undefined") {
      if (data.method === "ping") {
        sendResult(data.id, {});
      } else if (data.method === "ui/resource-teardown") {
        sendResult(data.id, {});
      } else {
        postMessage({
          jsonrpc: "2.0",
          id: data.id,
          error: { code: -32601, message: "Method not found: " + data.method },
        });
      }
      return;
    }

    // Host -> View notifications
    if (data.method === "ui/notifications/tool-result") {
      handleToolResult(data.params);
    } else if (data.method === "ui/notifications/tool-cancelled") {
      status.textContent = "Rendering cancelled.";
    } else if (data.method === "ui/notifications/host-context-changed") {
      applyHostContext(data.params);
    }
  });

  // ---------- lifecycle ----------

  sendRequest("ui/initialize", {
    protocolVersion: "2026-01-26",
    clientInfo: { name: "archlex-diagram-viewer", version: "0.1.0" },
    capabilities: {},
    appCapabilities: { availableDisplayModes: ["inline"] },
  })
    .then(function (result) {
      openLinksSupported = Boolean(
        result && result.hostCapabilities && result.hostCapabilities.openLinks,
      );
      if (result && result.hostContext) {
        applyHostContext(result.hostContext);
      }
      sendNotification("ui/notifications/initialized", {});
      status.textContent = "Rendering diagram\\u2026";
    })
    .catch(function () {
      // Host does not speak MCP Apps: keep the static placeholder.
      status.textContent = "Diagram preview unavailable in this client.";
    });
})();
</script>
</body>
</html>
`;
