import { gsap } from "gsap";
import { exampleUrl, reviewSources } from "../data/site";

export function initReviewBench(): void {
  const bench = document.querySelector<HTMLElement>("[data-review-bench]");
  if (!bench) return;
  let state: "valid" | "warning" = "valid";
  let connection: "invoke" | "store" = "store";
  const toggle = bench.querySelector<HTMLButtonElement>("[data-review-toggle]");
  const title = bench.querySelector<HTMLElement>("[data-review-title]");
  const description = bench.querySelector<HTMLElement>(
    "[data-review-description]",
  );
  const status = bench.querySelector<HTMLElement>("[data-review-status]");
  const diagnostic = bench.querySelector<HTMLElement>(
    "[data-review-diagnostic]",
  );
  const link = bench.querySelector<HTMLAnchorElement>(
    "[data-review-playground]",
  );
  const relationship = bench.querySelector<HTMLElement>(
    "[data-source-relationship]",
  );
  const toggleLabel = bench.querySelector<HTMLElement>(
    "[data-review-toggle-label]",
  );
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function apply(animate: boolean): void {
    if (!bench) return;
    const needsReview = state === "warning";
    bench.dataset.state = state;
    bench.dataset.connection = connection;
    for (const variant of bench.querySelectorAll<HTMLElement>(
      "[data-review-variant]",
    )) {
      variant.hidden = variant.dataset.reviewVariant !== state;
    }
    for (const button of bench.querySelectorAll<HTMLButtonElement>(
      "[data-connection-choice]",
    )) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.connectionChoice === connection),
      );
    }
    for (const line of bench.querySelectorAll<HTMLElement>(
      "[data-source-connection]",
    )) {
      line.classList.toggle(
        "is-selected",
        line.dataset.sourceConnection === connection,
      );
    }
    if (relationship)
      relationship.textContent = needsReview ? "invokes" : "writes";
    if (status)
      status.textContent = needsReview
        ? "△ 1 semantic warning"
        : "✓ Checks passed";
    if (diagnostic) diagnostic.hidden = !needsReview;
    if (toggleLabel)
      toggleLabel.textContent = needsReview
        ? "Correct to writes"
        : "Introduce a mistake";
    toggle?.setAttribute("aria-pressed", String(needsReview));
    if (link) link.href = exampleUrl(reviewSources[state]);

    if (title && description) {
      if (connection === "invoke") {
        title.textContent = "An API invokes a function.";
        description.textContent =
          "API Gateway → Lambda is a supported “invokes” relationship.";
      } else if (needsReview) {
        title.textContent = "DynamoDB cannot be an “invokes” target.";
        description.textContent =
          "The diagram still draws. The provider rules catch the meaning. Use “writes” for this connection.";
      } else {
        title.textContent = "A function writes to a database.";
        description.textContent =
          "Lambda → DynamoDB is a supported “writes” relationship.";
      }
    }

    // One state owns source, endpoints, result, feedback and the editor link.
    for (const node of bench.querySelectorAll<SVGElement>(".archlex-node")) {
      const id = node.dataset.archlexId;
      node.classList.toggle(
        "is-inspected",
        connection === "store"
          ? id === "worker" || id === "data"
          : id === "api" || id === "worker",
      );
    }
    for (const edge of bench.querySelectorAll<SVGElement>(".archlex-edge")) {
      const isStore =
        edge.dataset.archlexId?.includes("worker") &&
        edge.dataset.archlexId?.includes("data");
      edge.classList.toggle(
        "is-inspected",
        connection === "store" ? Boolean(isStore) : !isStore,
      );
    }
    if (animate && !reduced.matches) {
      gsap.fromTo(
        bench.querySelectorAll(
          ".review-variant:not([hidden]) .review-svg, .review-inspector__message",
        ),
        { opacity: 0.45, y: 5 },
        {
          opacity: 1,
          y: 0,
          duration: 0.32,
          ease: "power2.out",
          overwrite: true,
        },
      );
    }
  }

  if (toggle) {
    toggle.disabled = false;
    toggle.addEventListener("click", () => {
      state = state === "valid" ? "warning" : "valid";
      connection = "store";
      apply(true);
    });
  }
  for (const button of bench.querySelectorAll<HTMLButtonElement>(
    "[data-connection-choice]",
  )) {
    button.disabled = false;
    button.addEventListener("click", () => {
      connection =
        button.dataset.connectionChoice === "invoke" ? "invoke" : "store";
      apply(true);
    });
  }
  apply(false);
}
