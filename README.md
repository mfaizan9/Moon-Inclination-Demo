# Moon Inclination — HTML5

An accessible HTML5 port of the Flash *Moon Inclination* demonstrator, built on the
shared KL-UNL foundation.

## It must be served over HTTP — it will NOT run from a double-clicked file

Opening `index.html` directly (a `file://` path) shows a broken/empty masthead.
The KL-UNL masthead component (`foundation/kl-unl-masthead.js`) loads its title and
its Help/About text with `fetch('foundation/contents.json')`, and browsers block
`fetch()` of local files over `file://` for security (the same-origin policy). Served
over HTTP the fetch succeeds and the sim loads normally.

## How to run it locally

From **inside this `html5/` folder**, start any static file server:

```
# Python 3
python3 -m http.server 8123
#   then open  http://localhost:8123/

# Node
npx serve
#   (or)  npx http-server

# VS Code
#   Use the "Live Server" extension and "Open with Live Server".
```

Because you serve from inside `html5/`, the sim is at the server root, so the URL is
`http://localhost:8123/` — not `.../html5/index.html`.

## Production

When deployed to the KL-UNL cloud host (served over HTTP/HTTPS) it just works. The
`file://` limitation only affects local double-clicking.

## What's here

```
index.html          KL-UNL scaffold: .app-shell + <kl-unl-masthead> + panels
foundation/         shared KL-UNL files, copied in UNCHANGED
                    (kl-unl-masthead.js, kl-unl.css, kl-unl.js, contents.json)
styles/styles.css   sim-specific styles only (foundation is never edited)
simulation.js       all simulation logic (ported from the decompiled ActionScript)
assets/             reused exported vector art (earth.svg, moon.svg) + local MathJax
CONVERSION_NOTES.md  behaviour model, AS→HTML5 mapping, deviations
ACCESSIBILITY.md     WCAG affordances, keyboard map, screen-reader wording
```

No build step, no bundler, no framework, no CDN. The only runtime fetches are local:
`foundation/contents.json` and the bundled MathJax under `assets/mathjax/`.
