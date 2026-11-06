export function initCopyControls(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-copy]",
  )) {
    const scope = button.closest<HTMLElement>("[data-copy-scope]");
    const feedback = scope?.querySelector<HTMLElement>("[data-copy-status]");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy ?? "");
        if (feedback) feedback.textContent = "Copied to clipboard.";
      } catch {
        if (feedback)
          feedback.textContent =
            "Clipboard unavailable. Select and copy the text above.";
        const text = button
          .closest("[data-copy-container]")
          ?.querySelector("[data-copy-text]");
        if (text) {
          const disclosure = text.closest("details");
          if (disclosure) disclosure.open = true;
          const range = document.createRange();
          range.selectNodeContents(text);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    });
  }
}
