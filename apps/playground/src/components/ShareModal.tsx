import { useEffect, useRef, useState } from "react";
import { shareClipboardText } from "../share.js";
import { Icon } from "./Icon.js";

export type ShareDialogState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; playgroundUrl: string; svgUrl: string };

interface ShareModalProps {
  state: ShareDialogState;
  onClose: () => void;
  onRetry: () => void;
}

export function ShareModal({ state, onClose, onRetry }: ShareModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [copyState, setCopyState] = useState<
    "idle" | "link" | "embed" | "error"
  >("idle");

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const copyText = async (value: string, kind: "link" | "embed") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(kind);
    } catch {
      setCopyState("error");
    }
  };

  const embedText =
    state.phase === "ready"
      ? shareClipboardText(state.svgUrl, state.playgroundUrl)
      : "";

  return (
    <div className="modal-backdrop share-modal-backdrop">
      <div
        ref={dialogRef}
        className="modal-dialog share-modal"
        // biome-ignore lint/a11y/useSemanticElements: custom modal dialog container
        role="dialog"
        aria-labelledby="share-modal-title"
        aria-describedby="share-modal-intro"
        aria-modal="true"
        aria-busy={state.phase === "loading"}
      >
        <div className="share-modal__masthead">
          <div className="share-modal__mark" aria-hidden="true">
            <Icon name="link" size={18} />
          </div>
          <button
            ref={closeRef}
            type="button"
            className="modal-close"
            aria-label="Close share dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="share-modal__content">
          <p className="share-modal__eyebrow">ARCHLEX · SHARE</p>
          <h2 id="share-modal-title" className="share-modal__title">
            {state.phase === "loading"
              ? "Preparing your link"
              : "Ready to share"}
          </h2>
          <p id="share-modal-intro" className="share-modal__intro">
            {state.phase === "loading"
              ? "Saving this diagram so anyone with the link can open it."
              : "Anyone with the link can open this diagram in the playground."}
          </p>

          {state.phase === "loading" ? (
            <output className="share-modal__loading" aria-live="polite">
              <span className="share-modal__spinner" aria-hidden="true" />
              <span>Creating a share link…</span>
            </output>
          ) : null}

          {state.phase === "error" ? (
            <div className="share-modal__error" role="alert">
              <Icon name="error" />
              <div>
                <strong>Couldn’t create the link</strong>
                <p>{state.message}</p>
              </div>
            </div>
          ) : null}

          {state.phase === "ready" ? (
            <div className="share-modal__options">
              <section className="share-choice share-choice--primary">
                <div className="share-choice__heading">
                  <div>
                    <h3>Playground link</h3>
                    <p>Opens the editable diagram in ArchLex.</p>
                  </div>
                  <span className="share-choice__tag">LINK</span>
                </div>
                <div className="share-link-field">
                  <input
                    aria-label="Share link"
                    readOnly
                    value={state.playgroundUrl}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    className="btn-primary share-copy-button"
                    onClick={() => void copyText(state.playgroundUrl, "link")}
                  >
                    <Icon name="clipboard" />
                    {copyState === "link" ? "Copied" : "Copy link"}
                  </button>
                </div>
              </section>

              <section className="share-choice">
                <div className="share-choice__heading">
                  <div>
                    <h3>Markdown embed</h3>
                    <p>Paste into a README or Markdown document.</p>
                  </div>
                  <span className="share-choice__tag">MD</span>
                </div>
                <pre className="share-embed-preview">{embedText}</pre>
                <button
                  type="button"
                  className="btn-secondary share-embed-copy"
                  onClick={() => void copyText(embedText, "embed")}
                >
                  <Icon name="clipboard" />
                  {copyState === "embed" ? "Embed copied" : "Copy embed"}
                </button>
              </section>
            </div>
          ) : null}

          {copyState === "error" ? (
            <output className="share-modal__copy-error">
              Clipboard access failed. Select the text above and copy it
              manually.
            </output>
          ) : null}
        </div>

        <div className="share-modal__footer">
          <span>ARCHLEX PLAYGROUND</span>
          {state.phase === "error" ? (
            <button type="button" className="btn-primary" onClick={onRetry}>
              Try again
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
