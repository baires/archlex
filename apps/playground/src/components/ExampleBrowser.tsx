import { awsProvider } from "@archlex/aws";
import { cloudflareProvider, createArchLex } from "@archlex/core";
import { gcpProvider } from "@archlex/gcp";
import { k8sProvider } from "@archlex/k8s";
import { useEffect, useRef, useState } from "react";
import {
  type ArchitectureExample,
  EXAMPLE_PROVIDERS,
  EXAMPLE_PROVIDER_LABELS,
  EXAMPLE_USE_CASES,
} from "../examples.js";
import { iconLoader } from "../icon-loader.js";
import { renderProgressively } from "../render-pipeline.js";

const previewEngine = createArchLex({
  providers: [
    awsProvider(),
    gcpProvider(),
    k8sProvider(),
    cloudflareProvider(),
  ],
});

export function ExampleBrowser({
  examples,
  theme,
  onSelectExample,
}: {
  examples: readonly ArchitectureExample[];
  theme: "light" | "dark";
  onSelectExample: (example: ArchitectureExample) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [useCase, setUseCase] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const results = examples.filter(
    (example) =>
      (provider === "all" || example.provider === provider) &&
      (useCase === "all" || example.useCase === useCase) &&
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .every((word) =>
          `${example.title} ${example.description} ${example.useCase} ${EXAMPLE_PROVIDER_LABELS[example.provider]} ${example.source}`
            .toLowerCase()
            .includes(word),
        ),
  );
  const selected = results.find((example) => example.id === selectedId);

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      search.current?.focus();
    } else dialog.current?.close();
  }, [open]);

  useEffect(() => {
    setSvg(null);
    setFailed(false);
    if (!open || !selected) return;
    const controller = new AbortController();
    const update = (value: string) => {
      if (!controller.signal.aborted) setSvg(value);
    };
    try {
      const operation = renderProgressively(
        previewEngine,
        iconLoader,
        selected.source,
        { theme, signal: controller.signal },
      );
      void operation.base
        .then((result) => update(result.svg))
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
      void operation.hydrated
        ?.then((result) => update(result.renderResult.svg))
        .catch(() => {});
    } catch {
      setFailed(true);
    }
    return () => controller.abort();
  }, [open, selected, theme]);

  useEffect(() => {
    if (selectedId && window.matchMedia("(max-width: 640px)").matches) {
      dialog.current
        ?.querySelector<HTMLButtonElement>(".example-browser__back")
        ?.focus();
    }
  }, [selectedId]);

  return (
    <>
      <button
        type="button"
        className="btn-secondary examples-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Explore examples
      </button>
      <dialog
        ref={dialog}
        className={`example-browser${selected ? " has-preview" : ""}`}
        aria-labelledby="example-browser-title"
        onClose={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "button:not([disabled]), input, select, [href]",
            ),
          ).filter((control) => control.getClientRects().length > 0);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="example-browser__header">
          <div>
            <h2 id="example-browser-title">Explore examples</h2>
          </div>
          <button
            type="button"
            className="btn-secondary"
            aria-label="Close examples"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="example-browser__filters">
          <label className="visually-hidden" htmlFor="example-search">
            Search examples
          </label>
          <input
            ref={search}
            id="example-search"
            type="search"
            placeholder="Search architectures, services, or use cases…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedId(null);
            }}
          />
          <fieldset className="example-browser__providers">
            <legend className="visually-hidden">Provider</legend>
            {(["all", ...EXAMPLE_PROVIDERS] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={provider === value}
                onClick={() => {
                  setProvider(value);
                  setUseCase("all");
                  setSelectedId(null);
                }}
              >
                {value === "all" ? "All" : EXAMPLE_PROVIDER_LABELS[value]}
              </button>
            ))}
          </fieldset>
          <div className="example-browser__filter-row">
            <label htmlFor="example-use-case">Use case</label>
            <select
              id="example-use-case"
              value={useCase}
              onChange={(event) => {
                setUseCase(event.target.value);
                setSelectedId(null);
              }}
            >
              <option value="all">All use cases</option>
              {EXAMPLE_USE_CASES.filter((value) =>
                examples.some(
                  (example) =>
                    example.useCase === value &&
                    (provider === "all" || example.provider === provider),
                ),
              ).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <output>
              {results.length} {results.length === 1 ? "example" : "examples"}
            </output>
          </div>
        </div>
        <div
          className={`example-browser__body${selected ? " has-selection" : ""}`}
        >
          <div className="example-browser__results" aria-label="Examples">
            {results.length === 0 ? (
              <div className="example-browser__empty">
                <h3>No matching examples</h3>
                <p>Try another search or clear your filters.</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setQuery("");
                    setProvider("all");
                    setUseCase("all");
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              results.map((example) => (
                <button
                  type="button"
                  className="example-browser__result"
                  key={example.id}
                  aria-pressed={selected?.id === example.id}
                  onClick={() => setSelectedId(example.id)}
                >
                  <strong>{example.title}</strong>
                  <span className="example-browser__meta">
                    {EXAMPLE_PROVIDER_LABELS[example.provider]} ·{" "}
                    {example.useCase}
                  </span>
                  <span>{example.description}</span>
                </button>
              ))
            )}
          </div>
          <section
            className="example-browser__detail"
            aria-label="Architecture preview"
          >
            {selected ? (
              <>
                <button
                  type="button"
                  className="btn-secondary example-browser__back"
                  onClick={() => setSelectedId(null)}
                >
                  ← Back to examples
                </button>
                <div
                  className="example-browser__diagram"
                  aria-busy={!svg && !failed}
                >
                  {svg ? (
                    <img
                      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                      alt={`${selected.title} architecture diagram`}
                    />
                  ) : (
                    <output>
                      {failed
                        ? "Preview unavailable. You can still load this example."
                        : "Rendering preview…"}
                    </output>
                  )}
                </div>
                <span className="example-browser__meta">
                  {EXAMPLE_PROVIDER_LABELS[selected.provider]} ·{" "}
                  {selected.useCase}
                </span>
                <h3>{selected.title}</h3>
                <p>{selected.description}</p>
                <p className="example-browser__notice">
                  Loading replaces the current editor contents.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    onSelectExample(selected);
                    setOpen(false);
                  }}
                >
                  Load example
                </button>
              </>
            ) : (
              <div className="example-browser__empty">
                <h3>Find your starting point</h3>
                <p>
                  Select an example to inspect its architecture before loading
                  it into the editor.
                </p>
              </div>
            )}
          </section>
        </div>
      </dialog>
    </>
  );
}
