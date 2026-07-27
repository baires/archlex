import { awsProvider, createCloudMer } from "@cloudmer/core";
import { mountSvg } from "@cloudmer/core/browser";
import { useEffect, useRef, useState } from "react";

const cloudmer = createCloudMer({ providers: [awsProvider()] });
const initialSource = "rds-proxy > rds > ecs";

export function App() {
  const [source, setSource] = useState(initialSource);
  const [diagnostics, setDiagnostics] = useState<readonly string[]>([]);
  const [status, setStatus] = useState("Rendering…");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("Rendering…");

    cloudmer
      .render(source, { signal: controller.signal })
      .then((result) => {
        if (!previewRef.current) return;
        mountSvg(previewRef.current, result.svg);
        setDiagnostics(
          result.diagnostics.map(
            (diagnostic) => `${diagnostic.code}: ${diagnostic.message}`,
          ),
        );
        setStatus("Ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus(error instanceof Error ? error.message : "Render failed");
      });

    return () => controller.abort();
  }, [source]);

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Cloud architecture as code</p>
          <h1>CloudMer</h1>
        </div>
        <output className="status" aria-live="polite">
          {status}
        </output>
      </header>

      <section className="workspace" aria-label="CloudMer playground">
        <div className="editor-pane">
          <label htmlFor="source">CloudMer source</label>
          <textarea
            id="source"
            spellCheck={false}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
          <p className="hint">Try: rds-proxy &gt; rds &gt; ecs</p>
        </div>

        <div className="preview-pane">
          <h2>Architecture preview</h2>
          <div ref={previewRef} className="preview" aria-live="polite" />
        </div>
      </section>

      <section className="diagnostics" data-testid="diagnostics">
        <h2>Diagnostics</h2>
        {diagnostics.length === 0 ? (
          <p>No diagnostics</p>
        ) : (
          <ul>
            {diagnostics.map((diagnostic) => (
              <li key={diagnostic}>{diagnostic}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
