# Progressive Icon Rendering Design

## Summary

The playground currently waits for every unresolved provider icon to load before it renders a diagram. A cold render of the GCP healthcare example took 5,993 ms because five remote icons were on the critical path; rendering the same graph after those icons were cached took 12 ms.

The playground will instead render usable diagram geometry immediately and hydrate unresolved icons in the background. The status bar will report the base diagram as ready independently from a subtle icon-loading status.

## Goals

- Remove remote icon requests from the critical path to the first usable diagram.
- Preserve bundled icons during the initial render.
- Keep node geometry stable while remote icons appear.
- Make the status bar distinguish diagram readiness from icon hydration.
- Prevent aborted or stale hydration work from updating a newer diagram.
- Preserve the usable base diagram if background icon hydration fails.

## Non-goals

- Changing the icon CDN providers, mappings, timeout, or concurrency.
- Prefetching every icon in the AWS or GCP catalog.
- Patching icon markup directly into the rendered SVG DOM.
- Changing the core layout or SVG renderer APIs.
- Adding new user-facing icon diagnostics in this change.

## Architecture

The playground render pipeline will prepare the source once. It will then begin two independent operations from that prepared diagram:

1. Render the prepared graph without an injected remote icon registry.
2. Load only the unresolved icon requests through the existing browser icon loader.

These operations start together so icon network time overlaps parsing and layout. The base render resolves first in the expected case and is immediately published to the UI. Nodes with icons already bundled by their provider keep those icons; only nodes represented by `PreparedDiagram.iconRequests` temporarily render without icon artwork.

After remote icon loading finishes, the pipeline calls `renderPrepared` again with the loaded icon registry. The ELK layout engine's geometry fingerprint excludes icon artwork, so this second call reuses cached geometry. The renderer produces a complete SVG with icons without moving nodes or repeating ELK calculation.

The progressive pipeline will expose the two phases separately rather than returning only one final promise. This lets the React layer update readiness after the base phase and update only the SVG after hydration.

## UI State and Status

The existing `isRendering` state describes only the base diagram render:

- It becomes `true` when a debounced render is scheduled.
- It becomes `false` as soon as the base diagram is committed.
- `renderDurationMs` measures from the start of the base render to that commit and is not extended by remote icon loading.

A separate `isLoadingIcons` state describes background hydration:

- It is `true` only when the prepared diagram has unresolved icon requests and their load is pending.
- It is `false` when there are no unresolved icons, hydration succeeds, hydration fails, or the operation is cancelled.

The status bar continues to display `Ready · N ms` after the base render. While hydration is pending, it also displays a visually secondary `Loading icons…` message. The hydration message is not part of the diagram's ready label and must not replace the ready state.

Hydrating icons updates `currentSvg` but does not reset selection, zoom, diagnostics, render duration, or readiness. Because geometry remains stable, the preview should not refit or visibly jump.

## Concurrency and Cancellation

Every debounced render retains the existing operation ID and `AbortController` protections. Both base rendering and icon loading receive the same abort signal.

Each phase checks that its operation is still current before mutating React state. When source, direction, validation, or theme changes:

- the previous controller is aborted;
- pending base and hydration results are ignored;
- the next operation owns all subsequent state updates.

Direction and theme changes still run the normal base phase. A cached icon loader may satisfy hydration immediately, but the same stale-operation rules apply.

## Errors

A base-render error remains a full render failure and follows the existing diagnostics behavior.

An icon-loading or hydrated-render error is non-fatal after a successful base render. The playground keeps the base SVG, clears `isLoadingIcons`, and does not replace the diagram with an error state. Expected abort errors remain silent.

The icon loader's current fallback behavior remains unchanged. When it resolves with fallback icons and warnings, the hydrated SVG is applied; icon warnings remain separate from ArchLex semantic diagnostics as they are today.

## Testing

Pipeline tests will prove that:

- the base phase can resolve while icon loading is still pending;
- hydration adds a remote icon after the base SVG is available;
- no hydration phase is needed when there are no unresolved icon requests;
- aborting rejects or suppresses pending work as expected;
- a later operation cannot be overwritten by an earlier hydration result;
- icon-loading failure does not invalidate an already successful base result.

Status-bar tests will prove that `Ready · N ms` and `Loading icons…` can be displayed simultaneously and that the hydration message disappears independently.

The implementation will be verified with the playground unit tests, TypeScript type checking, a production build, and a browser reproduction using a cold remote-icon example.

## Success Criteria

- A remote-icon diagram becomes visible as soon as its base layout completes instead of waiting for CDN requests.
- The reported ready duration excludes background icon network time.
- A separate subtle `Loading icons…` indicator remains visible only during hydration.
- Icons appear without node movement after loading.
- Editing or changing settings during hydration never applies stale SVG output.
- Remote icon failure leaves the base diagram usable.
