# Conversion Notes — Moon Inclination

## Behaviour model (one paragraph)

The demonstrator shows the Moon's orbit about the Earth **viewed edge-on to the
ecliptic plane** (the green horizontal line). The Moon's orbit is tilted
`initInclination = 5°` to the ecliptic, so as the Moon travels around its orbit it
rises above and sinks below the ecliptic, crossing it at two nodes. Time is measured
by `dateNow` (days). Each frame the main controller advances `dateNow` by
`speed · Δt` (when animating) and drives two angles: the orbital-plane orientation
`theta = 360·(dateNow mod eclipseYear)/eclipseYear` and the Moon's orbital angle
`secondaryAngle = 360·(dateNow mod siderealPeriod)/siderealPeriod`. Because the plane
orientation is keyed to the **eclipse year (346.62 days)** rather than the calendar
year (365 days), the line of nodes regresses and the **eclipse seasons drift earlier
through the calendar year after year** — the pedagogical point. The upper-left
*enlargement* magnifies the region around the Earth (zoom factor 5.786) so you can see
whether, near a node, the Moon passes above, below, or across the Earth's line — i.e.
whether an eclipse is possible. The bottom *time strip* is a scrolling calendar with a
fixed red "now" pointer and yellow "eclipse season" blocks spaced every
`eclipseYear/2 = 173.31` days.

## Source of truth / the missing foundation folder

This decompiled sim folder did **not** contain a `foundation/` subfolder (unlike its
siblings in the workspace). Per the workspace convention — every sibling sim carries a
byte-identical copy of the shared KL-UNL foundation — the foundation files were copied
from the workspace's shared foundation. The `.js`/`.css` files are byte-for-byte
identical across all sims (verified by md5). For `contents.json`, the workspace's
top-level shared copy is itself **invalid JSON** (a raw newline inside one string,
line 200); the cleaned, valid copy used by the sibling sims was used instead. It
already contained a `mooninc` entry.

## The one permitted contents.json edit

`mooninc` already existed in `contents.json`, but its **Help** text was a copy-paste
placeholder describing the *Lunar Phases* simulator ("…its phase, and its position in
an observer's sky…"), which is not what this demonstrator does. The original Flash sim
carried **no** Help/About text of its own (nothing in `texts/`), so there was no
verbatim source to preserve. The Help `content` was rewritten to accurately describe
*this* demonstrator's panels and controls. `meta`, and the generic UNL `about`
boilerplate, were left as found. This is the only content change to any foundation
file; the `.js`/`.css` files are untouched.

## AS1 → HTML5 mapping

| ActionScript source | HTML5 port |
|---|---|
| `frame_1/DoAction.as` `update()` | `update()` in simulation.js — same `dateNow += speed·Δt`, `theta`, `secondaryAngle` |
| `mod(n,m)` (positive modulo) | `mod()` — identical |
| `changeSpeed(arg)` → `speed = arg/1000` | `applySpeed()` — identical; slider 0–30, default 2.5 |
| `SimpOrbSys.as` `precomp()` (matrix r1..r9) | `precomp()` — line-for-line |
| `SimpOrbSys.update()` (moon sx,sy,sz + depth) | `projectMoon()` + z-order in `renderOrbit()` |
| `SimpOrbSys.drawPath()` (curveTo tessellation, front/back halves) | `drawPathData()` + `drawPathHalf()` with `quadraticCurveTo`; back α=0.10, front α=0.30, black hairline — matches `lineStyle(0,0,10/30)` |
| `updateZoomWindow()` zf=5.786, depth swap | `renderEnlarge()` — canvas edge is the ZoomMask |
| `TimeStrip.as` calendar + seasons scroll | `renderTime()` — 1 px = 1 day; seasons every 173.31 days |
| `TimeStrip` `onPress/onMouseMove/onRelease` drag | pointer events on `timeCanvas` + `pause()/resume()` |
| `FCheckBoxSymbol` × 4 | native `<input type="checkbox">` |
| `Slider v2` | native `<input type="range">` |
| `FUIComponent` framework | not ported; only observable behaviour reproduced |

### Constants (verbatim from the AS)

```
eclipseYear    = 346.62      siderealPeriod = 27.3
initInclination= 5 (deg)     scale          = 250
zoomFactor     = 5.786       seasonSpacing  = eclipseYear/2 = 173.31
speed default  = 2.5 days/sec (min 0, max 30);  internal speed = value/1000
```

## Reused exported assets vs. code-drawn

- **Reused as-is** (copied to `assets/`): the Earth sphere (`shapes/31.svg` →
  `assets/earth.svg`, blue radial gradient) and the Moon sphere (`shapes/36.svg` →
  `assets/moon.svg`, grey). Both are drawn with `ctx.drawImage` at the original
  sizes (Earth 9 px / 48 px, Moon 3 px / 14 px) and scaled ×3 for "exaggerate body
  sizes". A gradient-circle fallback draws only if the SVG has not finished loading.
- **Code-drawn** (no exported file — built at runtime by the AS): the orbit path,
  the green ecliptic line (`shape 75` is a 1-px line — trivially redrawn), the
  calendar ticks/labels, the yellow eclipse-season blocks, and the red "now" marker.

## Layout replication (Goal C) and deviations

The panel structure mirrors the original screenshot: *enlargement* (upper-left),
*controls* (upper-right: speed slider + four checkboxes), the *orbit* view (middle,
with the green ecliptic line and its label), and the *time strip* (bottom). Two
intentional divergences, in service of accessibility/KL-UNL usage (priority B > C):

1. **Controls were lifted out of the canvas** into a real KL-UNL control panel
   (native slider + checkboxes) instead of being overlaid on the stage as in Flash.
   This gives full keyboard/screen-reader support and clean reflow to a single
   column on phones. The visual grouping (enlargement left, controls right) is kept.
2. **Epoch of the calendar.** The scroll rate (1 px/day), the eclipse-season spacing
   (173.31 days), and the "one season centred on the marker when
   `dateNow mod 173.31 = 0`" relationship are reproduced exactly. Day 0 is placed at
   Jan 1 with an eclipse season centred there, matching the original's relative
   layout; the absolute calendar epoch of the demonstrator is arbitrary (it teaches
   the *drift*, not a real-world date).

## Notes

- No equations exist in this sim; MathJax is used for the numeric readouts (speed
  value + unit, and the slider's 0/30 endpoints) so every on-screen number/unit is
  MathJax-typeset (right-click → "Show Math As…").
- `prefers-reduced-motion`: the animation starts **paused** (the "animate" checkbox
  unchecked) and the user opts in; Reset honours the same reduced-motion default.
