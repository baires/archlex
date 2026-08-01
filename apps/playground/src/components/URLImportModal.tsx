import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon.js";

interface URLImportModalProps {
  onImport: (content: string) => void;
  onClose: () => void;
}

export function URLImportModal({ onImport, onClose }: URLImportModalProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlInputRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const convertToRawUrl = (inputUrl: string): string => {
    try {
      const urlObj = new URL(inputUrl);

      // Convert GitHub file URLs to raw URLs
      if (urlObj.hostname === "github.com") {
        const pathParts = urlObj.pathname.split("/");
        // /owner/repo/blob/branch/path/to/file.archlex
        if (pathParts[3] === "blob") {
          pathParts[3] = ""; // Remove "blob"
          return `https://raw.githubusercontent.com${pathParts.join("/")}`;
        }
      }

      // Convert Gist URLs to raw URLs
      if (urlObj.hostname === "gist.github.com") {
        const gistId = urlObj.pathname.split("/")[2];
        return `https://gist.githubusercontent.com${urlObj.pathname}/raw`;
      }

      // Return as-is for other URLs
      return inputUrl;
    } catch {
      return inputUrl;
    }
  };

  const handleImport = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const rawUrl = convertToRawUrl(url.trim());
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(rawUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`,
        );
      }

      const content = await response.text();
      onImport(content);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError("Request timed out after 10 seconds");
        } else if (err.message.includes("Failed to fetch")) {
          setError(
            "CORS error: The server doesn't allow cross-origin requests. Try downloading the file and importing it instead.",
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleImport();
  };

  return (
    <div className="modal-backdrop">
      <div
        ref={modalRef}
        className="modal-dialog"
        // biome-ignore lint/a11y/useSemanticElements: custom modal dialog container
        role="dialog"
        aria-labelledby="url-import-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="url-import-title" className="modal-title">
            Import from URL
          </h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-description">
              Enter a URL to a ArchLex diagram file. GitHub and Gist URLs are
              automatically converted to raw format.
            </p>

            <div className="form-field">
              <label htmlFor="url-input" className="form-label">
                URL
              </label>
              <input
                ref={urlInputRef}
                id="url-input"
                type="url"
                className="form-input"
                placeholder="https://github.com/user/repo/blob/main/diagram.archlex"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error ? (
              <div className="modal-error" role="alert">
                <Icon name="error" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!url.trim() || isLoading}
            >
              {isLoading ? "Importing..." : "Import"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
