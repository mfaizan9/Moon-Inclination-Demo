# Accessibility Notes — Moon Inclination

Target: WCAG 2.1 AA (AAA where reasonable). Human screen-reader QA (NVDA + VoiceOver)
is still required — this documents the affordances built in.

## Structure & semantics
- Single `<h1>` is rendered by `<kl-unl-masthead>` (the sim adds none).
- `<main>` with four labelled `<section class="panel">` regions (enlargement,
  controls, orbit, timeline), each with a heading; non-skipping hierarchy.
- `<html lang="en">`. Every control has a real `<label>` / `<legend>`.

## Text alternatives for the canvases (1.1.1)
The three canvases are `role="img"` (enlargement, orbit) / `role="slider"` (timeline)
with live-updated text equivalents:
- **Orbit** `#orbit-desc`: e.g. *"Edge-on view of the moon's orbit (tilted 5 degrees)…
  Moon 4.6 degrees below the ecliptic plane; Jul, calendar day 183 of 365."*
- **Enlargement** `#enlarge-desc`: describes whether the moon is above/below/on the
  ecliptic, in degrees.
- The `#live` region (`aria-live="polite"`) announces committed changes: reset,
  animation running/paused, and (on drag/keyboard commit) the full date + eclipse-
  season status + moon latitude.

## Units are always spoken (supervisor requirement)
Every value is announced **with its quantity name and unit**, never a bare number:
- Speed slider `aria-valuetext`: *"speed 2.5 days per second"*.
- Timeline `aria-valuetext`: *"Calendar day 183 of 365, Jul; eclipse season. Moon 4.6
  degrees below the ecliptic plane."* (units spelled as words: *days*, *degrees*).
- The moon's ecliptic latitude is given in **degrees** (`β = asin(sin i · sin θ)`),
  with direction *above / below / on* the plane.

## Keyboard (2.1.1 / 2.4.7)
- **Speed** — native `<input type="range">`: Left/Down decrement, Right/Up increment,
  PageUp/Down larger steps, Home/End min/max (all free from the native control).
- **Checkboxes** — native, Space toggles.
- **Timeline (the draggable element)** is fully keyboard-operable, matching the mouse
  drag:
  - **Tab** reaches it (visible focus ring); **click/tap** also focuses it.
  - **Left/Right (and Down/Up)** = ±1 day; **PageUp/PageDown** = ±1 month;
    **Home** = start (day 0); **End** = one eclipse year forward.
  - Scrubbing by keyboard pauses the animation (so the step is observable) and
    announces the new date with units on each commit.
  - Tab moves away normally (no trap); canvas pointer handlers do not swallow keys.

## Color & contrast (1.4.1 / 1.4.11)
- Palette via KL-UNL CSS variables. State is **never** encoded by colour alone:
  eclipse seasons are named ("eclipse season") in text and in the spoken description,
  not just shown as yellow; the ecliptic plane is labelled in words. The green
  ecliptic line (`#009900` on white ≈ 3.4:1) is a graphical object supplemented by
  the always-available text label and description.

## Motion (2.2.2 / 2.3.3)
- The "animate" checkbox is the Pause/Play control (no motion cannot be stopped).
- `prefers-reduced-motion: reduce` → the sim loads **paused**; the user opts into
  motion. Reset preserves that reduced-motion default. Nothing flashes > 3×/sec.

## Zoom / reflow (1.4.4 / 1.4.10)
- Body text ≥ 1.125rem, all sizing in rem/%/fr; usable at 200% zoom without clipping.
- Canvases keep their original internal coordinates and scale via CSS
  (`width:100%; height:auto`), so physics/parity math is unchanged at any size.
- Layout reflows from desktop → iPad → phone portrait (single column, no horizontal
  scroll) using the foundation's 56rem collapse plus sim breakpoints in `styles.css`.

## Touch
- Pointer Events drive the timeline drag (mouse + touch share one path);
  `touch-action: none` on the timeline canvas so dragging doesn't scroll the page.
  No hover-only affordances. Native controls meet the ≥44px target size.

## Math (MathJax)
- The numeric readouts (speed value + unit; slider 0/30 endpoints) are typeset by
  MathJax (tex-svg), so right-clicking them opens the MathJax menu ("Show Math As…").
  The MathJax context menu is not disabled or overridden. This sim contains no
  equations; the descriptive labels *speed (days/sec)* and the calendar month/"now"
  text are plain words (not mathematical notation) and are left as accessible text.

## Known limitations (human QA still needed)
- The scrolling calendar month labels and the "eclipse season" labels are drawn on
  the timeline canvas (they scroll continuously); an audio-only equivalent is provided
  through the timeline `aria-valuetext` and the live region (current day/month/eclipse
  status), which convey the same information non-visually.
- Screen-reader phrasing has been designed against NVDA and VoiceOver behaviour but
  should be confirmed with real assistive-technology testing.
