# Playground Specification

## Purpose and layout

The playground is the public API's reference consumer, not a collaboration product. Desktop uses a resizable editor/preview split with diagnostics below; narrow screens use Editor and Preview tabs. The header provides examples, direction, validation, theme, copy SVG, and download SVG.

It ships shorthand, nested-valid, and invalid RDS Proxy examples.

## Monaco and render loop

Monaco receives ArchLex tokens, comments, brackets, provider-derived completion, and diagnostic markers. MVP does not implement an LSP.

Changes debounce for 150 ms. Each render aborts its predecessor. The previous successful SVG stays visible while pending. Expected errors update the partial diagram; internal errors preserve the prior SVG and show a separate banner.

Controls override source directives only when explicitly locked by the user; otherwise they reflect source values.

## Selection, persistence, and export

SVG selection uses `data-archlex-id` and `ElementMapping` to reveal source. Cursor movement highlights the narrowest mapped element. Playground selection styling never enters exported SVG.

Versioned local state stores source, example/custom mode, explicit overrides, theme, and pane sizes. Invalid JSON or unsupported versions fall back safely.

Copy/download uses the latest successful SVG. Filenames use a sanitized title or `archlex-diagram.svg`. Output includes theme and accessibility content but excludes selection state and editor UI.

## Accessibility

Controls and resize operations work by keyboard. Diagnostic count changes are announced without replaying every diagnostic per keystroke. Focus survives SVG replacement. Editor/preview relationships and shortcuts are documented in-app.

## Non-goals

Accounts, backend persistence, collaboration, sharing, remote execution, runtime icon downloads, PNG/PDF export, drag positioning, direct diagram editing, LSP, VS Code extension, and mobile-native UI.

## Acceptance scenarios

- Editing shorthand updates a deterministic preview.
- Malformed input produces markers and partial SVG.
- Source, SVG, and diagnostics selection synchronize both ways.
- Stale ELK results never replace newer output.
- Reload restores valid local state and ignores corruption.
- Copy/download reflects the latest successful render without selection state.
