# Playground Command Bar and Centered Zoom

## Goal

Reduce the playground header's visual density and make preview zoom feel controlled on a trackpad. The redesign must preserve quick access to frequent actions, keep less-frequent diagram configuration discoverable, and make every zoom operation originate from the visible viewport center.

## Design direction

Use a restrained industrial command bar that matches the existing technical canvas. The bar should read in three clear groups: product identity, working context, and actions. Controls should be compact and precise rather than decorative, with the existing shared color, spacing, border, focus, and motion tokens providing visual continuity.

The memorable interaction is a calm workspace: the header exposes only what is needed for the current task, while the diagram expands and contracts around the user's field of view instead of chasing the pointer.

## Command bar hierarchy

The command bar retains the ARCHLEX wordmark at the left. The example selector follows as the primary working-context control and presents its purpose and current example in one compact control rather than a separate persistent label beside a long field.

The right side contains the following actions:

- Import and Export remain visible and adjacent because they are primary file operations.
- A labeled Settings button opens a compact popover containing Layout direction and Validation mode.
- Theme and fullscreen remain icon buttons with accessible names and tooltips.

Layout direction and validation remain fully controlled values. Changing either setting takes effect immediately and leaves the settings popover open so users can evaluate combinations without repeatedly reopening it. Clicking outside, pressing Escape, or choosing the Settings trigger again closes the popover. Focus returns to the trigger when Escape closes it.

The popover uses clear field labels and concise supporting descriptions. Layout direction explains the diagram flow; Validation mode explains how strictly the source is checked. The trigger indicates the open state with `aria-expanded` and references the popover with `aria-controls`.

## Responsive behavior

The command bar remains a single row and must not create a second band of controls. At narrower widths, supporting text and nonessential visible labels are shortened before controls are moved. If space becomes constrained, secondary icon actions may join the settings surface, while Example and the Import/Export file-action group remain prioritized.

The control order and DOM order stay aligned. Keyboard focus remains visible, touch targets remain usable, and no action is available only through hover.

## Preview zoom behavior

All zoom operations use the geometric center of the preview viewport as their anchor:

- trackpad pinch gestures;
- ordinary wheel zoom handled by the preview;
- Zoom in and Zoom out buttons.

Centered zoom preserves the diagram coordinate currently under the viewport center. Existing pan is therefore adjusted proportionally as scale changes rather than reset. Fit Diagram still computes a fit scale and centers the diagram, while Actual Size still resets to 100% with zero pan.

Trackpad input uses the magnitude of `deltaY` through a damped proportional curve instead of converting every event into the same fixed step. Small gestures produce small scale changes, larger gestures remain responsive, and each individual event is capped to prevent sudden jumps. Scale continues to use the existing minimum and maximum bounds. Button zoom uses a predictable centered step and the same center-anchoring helper.

The preview continues to prevent browser zoom only for wheel events inside its viewport. Gestures elsewhere retain their normal browser behavior.

## Component boundaries

- `CommandBar` owns the visible hierarchy and settings trigger.
- A focused settings popover component owns open/close behavior, focus handling, and the two diagram configuration fields.
- `Preview` owns wheel event wiring and preview pan/zoom state.
- Pure preview-transform helpers own scale clamping, damped wheel-to-scale conversion, and center-anchored pan calculations.
- Playground CSS owns the command-bar grouping, popover presentation, and responsive reductions.

No renderer, DSL, import/export data flow, or persistence changes are included.

## Error handling and accessibility

Existing rendering and import/export errors remain unchanged. The settings surface uses native labeled form controls, closes on Escape and outside interaction, and exposes its state to assistive technology. Existing accessible names for icon actions and preview controls remain intact.

Reduced-motion preferences disable nonessential popover transitions. Zoom is direct manipulation and remains immediate, but it does not add cosmetic animation that could lag behind trackpad input.

## Testing and verification

Implementation will proceed test-first. Pure transform tests will verify:

- small trackpad deltas produce smaller changes than large deltas;
- per-event zoom changes are capped;
- zoom remains clamped to the supported scale range;
- centered zoom adjusts pan so the diagram coordinate beneath the viewport center stays fixed;
- button and wheel paths share centered anchoring.

Component and browser checks will verify:

- layout and validation are absent from the always-visible header and available in Settings;
- the settings popover opens and closes by trigger, outside click, and Escape;
- focus and accessible state are correct;
- the command bar remains a single row at supported responsive widths;
- Import, Export, theme, and fullscreen behavior remain functional;
- trackpad-style wheel events feel gradual and never zoom toward the pointer;
- light, dark, standard, narrow, and fullscreen layouts remain visually coherent.

