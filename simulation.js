/* ============================================================================
   Moon Inclination demonstrator  --  HTML5 port of moon_inclination009.swf
   ----------------------------------------------------------------------------
   Behaviour is ported verbatim from the decompiled ActionScript (AS1):
     scripts/frame_1/DoAction.as      (main controller: update/setDate/mod ...)
     scripts/SimpOrbSys.as            (3-D orbit projection + orbit path)
     scripts/TimeStrip.as             (scrolling calendar + eclipse seasons)
     scripts/Slider v2.as, FCheckBoxSymbol.as (native controls here instead)
   Presentation follows the KL-UNL foundation + WCAG 2.1 AA (see ACCESSIBILITY.md).
   Single state object; one render() redraws every canvas + the live region.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ constants
     Copied VERBATIM from the ActionScript source. */
  var ECLIPSE_YEAR    = 346.62;   // _global.eclipseYear   (TimeStrip.as:14)
  var SIDEREAL_PERIOD = 27.3;     // _global.siderealPeriod (DoAction.as:78)
  var INIT_INCL       = 5;        // initInclination (deg)  (PlaceObject SimpOrbSys)
  var SCALE           = 250;      // SimpOrbSys _scale      (SimpOrbSys.as:11)
  var ZOOM_FACTOR     = 5.786;    // updateZoomWindow zf    (DoAction.as:15)
  var SPEED_DEFAULT   = 2.5;      // changeSpeed(2.5)       (DoAction.as:80)
  var SPEED_MIN       = 0;        // Slider init_min        (PlaceObject Slider)
  var SPEED_MAX       = 30;       // Slider init_max        (PlaceObject Slider)
  var SEASON_SPACING  = ECLIPSE_YEAR / 2;   // TimeStrip.as:18  (173.31)
  var CALENDAR_YEAR   = 365;      // TimeStrip.as:52 (mod(arg,365))

  var DEG = 0.017453292519943295; // pi/180  (AS uses this literal)
  var RAD = 57.29577951308232;    // 180/pi

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];  // texts/52..63

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ mod()
     Positive modulo, exactly as in every AS source (DoAction.as:33). */
  function mod(n, m) {
    if (n < 0) { return n % m + m; }
    return n % m;
  }

  /* ============================================================ STATE */
  var state = {
    dateNow: 0,               // days elapsed (main controller "dateNow")
    speed: SPEED_DEFAULT / 1000,   // days per ms  (changeSpeed: arg/1000)
    speedDisplay: SPEED_DEFAULT,   // days/sec value shown to the user
    animate: !prefersReduced, // "animate" checkbox (reduced-motion -> start paused)
    showPath: true,           // "show orbital path"
    showEcliptic: true,       // "show ecliptic plane"
    bodyScaleFactor: 1,        // "exaggerate body sizes" -> 3
    timeLast: 0,              // getTimer() of previous frame
    // orbit projection working object (SimpOrbSys "_o"), filled by precomp()
    o: {},
    theta: 0, phi: 0, incl: INIT_INCL * DEG,
    // last computed moon projection (screen offsets from Earth, stage px)
    moon: { sx: 0, sy: 0, sz: 0 },
    // orbit path polylines, rebuilt each frame by drawPathData()
    path: null
  };

  /* ============================================================ SimpOrbSys
     3-D projection maths, ported line-for-line from SimpOrbSys.as. phi is
     fixed at 0 (never changed by the original), so the system is viewed
     edge-on to the ecliptic; theta (line-of-nodes orientation) and the moon's
     orbital angle both advance from the calendar date. */

  // precomp(): SimpOrbSys.as:80-114  (rotation matrix r1..r9)
  function precomp(S) {
    var st = Math.sin(S.theta), ct = Math.cos(S.theta);
    var sp = Math.sin(S.phi),   cp = Math.cos(S.phi);
    var si = Math.sin(S.incl),  ci = Math.cos(S.incl);
    var s = SCALE, o = S.o;
    o.r1 = -s * st;
    o.r2 =  s * ct * ci;
    o.r3 = -s * ct * si;
    o.r4 =  s * sp * ct;
    o.r5 =  s * (sp * st * ci - cp * si);
    o.r6 = -s * (sp * st * si + cp * ci);
    o.r7 =  s * cp * ct;
    o.r8 =  s * (cp * st * ci + sp * si);
    o.r9 =  s * (cp * st * si + sp * ci);
  }

  // update(): SimpOrbSys.as:22-41 -> moon screen offset sx,sy and depth sz.
  function projectMoon(S, sa) {
    var x = Math.cos(sa), y = Math.sin(sa), o = S.o;
    S.moon.sx = x * o.r1 + y * o.r2;
    S.moon.sy = x * o.r4 + y * o.r5;
    S.moon.sz = x * o.r7 + y * o.r8;
  }

  // drawPath(): SimpOrbSys.as:115-196 -> front/back quadratic polylines.
  // Returns {front:{a:[],c:[]}, back:{a:[],c:[]}} of anchor/control points
  // (screen offsets from Earth).  Reproduces the curveTo tessellation exactly.
  function drawPathData(S) {
    var o = S.o;
    var st = Math.sin(S.theta), ct = Math.cos(S.theta);
    var sp = Math.sin(S.phi),   cp = Math.cos(S.phi);
    var si = Math.sin(S.incl),  ci = Math.cos(S.incl);
    var x = cp * ct, y = cp * st, z = sp;
    var x2 = x, y2 = y * ci + z * si;
    var g = Math.atan2(y2, x2);
    var backStart  = mod(g + 1.5707963267948966, 6.283185307179586);
    var frontStart = mod(g - 1.5707963267948966, 6.283185307179586);
    var n = 6;                              // _hnP = ceil(12/2)
    var step = 3.141592653589793 / (n - 1); // pi/(n-1)
    var halfStep = step / 2;
    var cRad = 1 / Math.cos(halfStep);
    var faA = [], faC = [], baA = [], baC = [];
    var i, tx, ty, ang;
    for (i = 0; i < n; i++) {
      ang = frontStart + i * step;                 // front anchor
      tx = Math.cos(ang); ty = Math.sin(ang);
      faA[i] = { x: tx * o.r1 + ty * o.r2, y: tx * o.r4 + ty * o.r5 };
      ang = frontStart + i * step - halfStep;      // front control
      tx = cRad * Math.cos(ang); ty = cRad * Math.sin(ang);
      faC[i] = { x: tx * o.r1 + ty * o.r2, y: tx * o.r4 + ty * o.r5 };
      ang = backStart + i * step;                  // back anchor
      tx = Math.cos(ang); ty = Math.sin(ang);
      baA[i] = { x: tx * o.r1 + ty * o.r2, y: tx * o.r4 + ty * o.r5 };
      ang = backStart + i * step - halfStep;       // back control
      tx = cRad * Math.cos(ang); ty = cRad * Math.sin(ang);
      baC[i] = { x: tx * o.r1 + ty * o.r2, y: tx * o.r4 + ty * o.r5 };
    }
    return { front: { a: faA, c: faC }, back: { a: baA, c: baC } };
  }

  /* ============================================================ update()
     Main controller update(), DoAction.as:1-12. */
  function update(timeNow) {
    if (state.animate) {
      state.dateNow += state.speed * (timeNow - state.timeLast);
    }
    state.theta = (360 * mod(state.dateNow, ECLIPSE_YEAR) / ECLIPSE_YEAR) * DEG;
    var sa      = (360 * mod(state.dateNow, SIDEREAL_PERIOD) / SIDEREAL_PERIOD) * DEG;
    precomp(state);
    if (state.showPath) { state.path = drawPathData(state); }
    projectMoon(state, sa);
    state.saNow = sa;
    state.timeLast = timeNow;
  }

  // setDate(arg): DoAction.as:27-32 -- used by drag / keyboard scrubbing.
  function setDate(arg, timeNow) {
    state.dateNow = arg;
    state.timeLast = timeNow;
    // recompute geometry immediately (update() without advancing time)
    state.theta = (360 * mod(state.dateNow, ECLIPSE_YEAR) / ECLIPSE_YEAR) * DEG;
    var sa = (360 * mod(state.dateNow, SIDEREAL_PERIOD) / SIDEREAL_PERIOD) * DEG;
    precomp(state);
    if (state.showPath) { state.path = drawPathData(state); }
    projectMoon(state, sa);
    state.saNow = sa;
  }

  /* ============================================================ DOM refs */
  var enlargeCanvas = document.getElementById('enlargeCanvas');
  var orbitCanvas   = document.getElementById('orbitCanvas');
  var timeCanvas    = document.getElementById('timeCanvas');
  var eCtx = enlargeCanvas.getContext('2d');
  var oCtx = orbitCanvas.getContext('2d');
  var tCtx = timeCanvas.getContext('2d');

  var speedSlider = document.getElementById('speedSlider');
  var speedValue  = document.getElementById('speedValue');
  var speedMin    = document.getElementById('speedMin');
  var speedMax    = document.getElementById('speedMax');
  var cbPath      = document.getElementById('showPath');
  var cbExag      = document.getElementById('exaggerate');
  var cbEcliptic  = document.getElementById('showEcliptic');
  var cbAnimate   = document.getElementById('animate');
  var caveatLabel = document.getElementById('caveatLabel');
  var eclipticLbl = document.getElementById('eclipticLabel');
  var liveRegion  = document.getElementById('live');
  var orbitDesc   = document.getElementById('orbit-desc');
  var enlargeDesc = document.getElementById('enlarge-desc');

  /* Backing-store scaling for crisp canvases on HiDPI displays.  The drawing
     code always works in ORIGINAL stage pixels (750-wide etc.); we only scale
     the backing store + context so parity maths is untouched (see README). */
  var dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  function sizeCanvas(cv, ctx, w, h) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  var OW = 750, OH = 200;     // orbit stage
  var EW = 276, EH = 147;     // enlargement stage
  var TW = 750, TH = 120;     // timeline stage
  sizeCanvas(orbitCanvas, oCtx, OW, OH);
  sizeCanvas(enlargeCanvas, eCtx, EW, EH);
  sizeCanvas(timeCanvas, tCtx, TW, TH);

  var ORIGIN_X = OW / 2, ORIGIN_Y = OH / 2;   // Earth at orbit-canvas centre
  var ENL_CX = EW / 2, ENL_CY = EH / 2;       // Earth at enlargement centre
  var MARKER_X = TW / 2;                        // "now" fixed at timeline centre
  var MONTH_W = CALENDAR_YEAR / 12;             // even month spacing (~30.4 px)

  /* Reused exported vector art (blue Earth sphere, grey Moon sphere). */
  var earthImg = new Image(); earthImg.src = 'assets/earth.svg';
  var moonImg  = new Image(); moonImg.src  = 'assets/moon.svg';

  function drawSphere(ctx, img, cx, cy, diam, fallback) {
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, cx - diam / 2, cy - diam / 2, diam, diam);
    } else {
      ctx.fillStyle = fallback;
      ctx.beginPath();
      ctx.arc(cx, cy, diam / 2, 0, 6.283185307179586);
      ctx.fill();
    }
  }

  /* ============================================================ RENDER: orbit */
  function renderOrbit() {
    oCtx.clearRect(0, 0, OW, OH);

    // green ecliptic-plane line (shape 75: full-width 1px green line)
    if (state.showEcliptic) {
      oCtx.strokeStyle = '#009900';
      oCtx.lineWidth = 1;
      oCtx.beginPath();
      oCtx.moveTo(0, ORIGIN_Y + 0.5);
      oCtx.lineTo(OW, ORIGIN_Y + 0.5);
      oCtx.stroke();
    }
    eclipticLbl.style.visibility = state.showEcliptic ? 'visible' : 'hidden';

    // orbit path -- back half (black, alpha 0.10) then front half (alpha 0.30)
    if (state.showPath && state.path) {
      drawPathHalf(state.path.back, 0.10);
      // Earth + moon are drawn between back and front halves for depth.
    }

    var bsf = state.bodyScaleFactor;
    var moonBehind = state.moon.sz <= 0;   // update(): sz>0 => in front

    // z-order: back-path, moon(if behind), Earth, front-path, moon(if front)
    if (moonBehind) {
      drawSphere(oCtx, moonImg, ORIGIN_X + state.moon.sx, ORIGIN_Y + state.moon.sy,
                 3 * bsf, '#656565');
    }
    drawSphere(oCtx, earthImg, ORIGIN_X, ORIGIN_Y, 9 * bsf, '#4da4d7');
    if (state.showPath && state.path) {
      drawPathHalf(state.path.front, 0.30);
    }
    if (!moonBehind) {
      drawSphere(oCtx, moonImg, ORIGIN_X + state.moon.sx, ORIGIN_Y + state.moon.sy,
                 3 * bsf, '#656565');
    }
  }

  function drawPathHalf(half, alpha) {
    oCtx.strokeStyle = 'rgba(0,0,0,' + alpha + ')';
    oCtx.lineWidth = 1;
    oCtx.beginPath();
    oCtx.moveTo(ORIGIN_X + half.a[0].x, ORIGIN_Y + half.a[0].y);
    for (var i = 1; i < half.a.length; i++) {
      oCtx.quadraticCurveTo(ORIGIN_X + half.c[i].x, ORIGIN_Y + half.c[i].y,
                            ORIGIN_X + half.a[i].x, ORIGIN_Y + half.a[i].y);
    }
    oCtx.stroke();
  }

  /* ============================================================ RENDER: enlargement
     updateZoomWindow(): DoAction.as:13-26.  BigEarth centred; BigMoon offset by
     ZOOM_FACTOR * (moon screen offset); the canvas edge acts as the ZoomMask. */
  function renderEnlarge() {
    eCtx.clearRect(0, 0, EW, EH);
    var mx = ENL_CX + ZOOM_FACTOR * state.moon.sx;
    var my = ENL_CY + ZOOM_FACTOR * state.moon.sy;
    var moonBehind = state.moon.sz < 0;   // updateZoomWindow: z<0 => behind Earth
    if (moonBehind) { drawSphere(eCtx, moonImg, mx, my, 14, '#656565'); }
    drawSphere(eCtx, earthImg, ENL_CX, ENL_CY, 48, '#4da4d7');
    if (!moonBehind) { drawSphere(eCtx, moonImg, mx, my, 14, '#656565'); }
  }

  /* ============================================================ RENDER: timeline
     TimeStrip.as: calendar scrolls at 1px/day under a fixed "now" marker;
     eclipse-season blocks repeat every SEASON_SPACING days. */
  function renderTime() {
    tCtx.clearRect(0, 0, TW, TH);
    var leftDay = state.dateNow - MARKER_X;      // absolute day at screen x = 0

    var Y_BLOCK_TOP = 30, Y_BLOCK_BOT = 74;      // season block extent
    var Y_MONTH = 60;                            // month-label baseline
    var Y_TICK_TOP = 48, Y_TICK_BOT = 72;
    var Y_SEASON1 = 90, Y_SEASON2 = 104;         // "eclipse" / "season"

    // --- eclipse-season yellow blocks (centred on multiples of SEASON_SPACING)
    var SEASON_HALF = 21;                        // block half-width (~42px)
    tCtx.fillStyle = 'rgba(251,233,140,0.85)';   // pale yellow
    var jStart = Math.floor(leftDay / SEASON_SPACING) - 1;
    var jEnd   = Math.ceil((leftDay + TW) / SEASON_SPACING) + 1;
    tCtx.textAlign = 'center';
    tCtx.textBaseline = 'alphabetic';
    for (var j = jStart; j <= jEnd; j++) {
      var scx = j * SEASON_SPACING - leftDay;
      if (scx < -60 || scx > TW + 60) { continue; }
      tCtx.fillRect(scx - SEASON_HALF, Y_BLOCK_TOP, SEASON_HALF * 2, Y_BLOCK_BOT - Y_BLOCK_TOP);
      tCtx.fillStyle = '#1a1a1a';
      tCtx.font = '12px Sans-Serif, Arial, sans-serif';
      tCtx.fillText('eclipse', scx, Y_SEASON1);   // texts/48
      tCtx.fillText('season', scx, Y_SEASON2);
      tCtx.fillStyle = 'rgba(251,233,140,0.85)';
    }

    // --- calendar month ticks + names (evenly spaced, 12 per 365 days)
    tCtx.strokeStyle = '#767676';
    tCtx.lineWidth = 1;
    tCtx.fillStyle = '#1a1a1a';
    tCtx.font = '13px Sans-Serif, Arial, sans-serif';
    var kStart = Math.floor(leftDay / MONTH_W) - 1;
    var kEnd   = Math.ceil((leftDay + TW) / MONTH_W) + 1;
    for (var k = kStart; k <= kEnd; k++) {
      var bx = k * MONTH_W - leftDay;             // month boundary tick
      if (bx >= -20 && bx <= TW + 20) {
        tCtx.beginPath();
        tCtx.moveTo(bx + 0.5, Y_TICK_TOP);
        tCtx.lineTo(bx + 0.5, Y_TICK_BOT);
        tCtx.stroke();
      }
      var lx = bx + MONTH_W / 2;                  // month name centred in cell
      if (lx >= -20 && lx <= TW + 20) {
        tCtx.textAlign = 'center';
        tCtx.fillText(MONTHS[mod(k, 12)], lx, Y_MONTH);
      }
    }

    // --- fixed "now" marker (red text, triangle, vertical line): texts/66
    tCtx.fillStyle = '#d40000';
    tCtx.strokeStyle = '#d40000';
    tCtx.font = 'bold 13px Sans-Serif, Arial, sans-serif';
    tCtx.textAlign = 'center';
    tCtx.fillText('now', MARKER_X, 14);
    tCtx.beginPath();                             // downward triangle
    tCtx.moveTo(MARKER_X - 5, 20);
    tCtx.lineTo(MARKER_X + 5, 20);
    tCtx.lineTo(MARKER_X, 28);
    tCtx.closePath();
    tCtx.fill();
    tCtx.lineWidth = 1.5;
    tCtx.beginPath();
    tCtx.moveTo(MARKER_X, 20);
    tCtx.lineTo(MARKER_X, Y_TICK_TOP);
    tCtx.stroke();
  }

  /* ============================================================ MathJax readout
     Numbers + units go through MathJax so right-click exposes the "Show Math As"
     menu and screen readers get a units-complete description. */
  var mjPending = null, mjBusy = false;
  function setSpeedReadout() {
    var v = fmt(state.speedDisplay);
    var latex = '\\(' + v + '\\ \\mathrm{days/sec}\\)';
    if (speedValue.getAttribute('data-tex') === latex) { return; }
    speedValue.setAttribute('data-tex', latex);
    speedValue.innerHTML = latex;
    mjPending = speedValue;
    flushMath();
  }
  function flushMath() {
    if (mjBusy || !mjPending) { return; }
    if (!(window.MathJax && MathJax.typesetPromise)) { return; }
    var el = mjPending; mjPending = null; mjBusy = true;
    MathJax.typesetPromise([el]).catch(function () {}).then(function () {
      mjBusy = false; flushMath();
    });
  }
  function fmt(x) {
    // trim trailing zeros: 2.5 -> "2.5", 30 -> "30", 0 -> "0"
    return (Math.round(x * 100) / 100).toString();
  }

  /* The slider end labels (0 and 30) are also math -> typeset once at startup. */
  function setEndLabels() {
    speedMin.innerHTML = '\\(' + SPEED_MIN + '\\)';
    speedMax.innerHTML = '\\(' + SPEED_MAX + '\\)';
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([speedMin, speedMax]).catch(function () {});
    }
  }

  /* ============================================================ announcements */
  // Ecliptic latitude of the moon: beta = asin(sin(incl) * sin(sa)) ; sy<0 = up.
  function moonLatitude() {
    var beta = Math.asin(Math.sin(state.incl) * Math.sin(state.saNow)) * RAD;
    return beta;                                  // + = above the ecliptic
  }
  function dayOfYear() { return mod(state.dateNow, CALENDAR_YEAR); }
  function monthLabel() {
    var doy = dayOfYear();
    var idx = Math.floor(doy / MONTH_W) % 12;
    return MONTHS[(idx + 12) % 12];
  }
  function inEclipseSeason() {
    // a season block is ~21 days half-width around each SEASON_SPACING multiple
    return Math.abs(mod(state.dateNow + SEASON_SPACING / 2, SEASON_SPACING) - SEASON_SPACING / 2) <= 21;
  }
  function dateSpoken() {
    var doy = dayOfYear();
    var lat = moonLatitude();
    var dir = lat > 0.05 ? 'above' : (lat < -0.05 ? 'below' : 'on');
    var seasonTxt = inEclipseSeason() ? 'eclipse season' : 'not an eclipse season';
    return 'Calendar day ' + Math.round(doy) + ' of 365, ' + monthLabel() + '; ' +
           seasonTxt + '. Moon ' + Math.abs(lat).toFixed(1) +
           ' degrees ' + dir + ' the ecliptic plane.';
  }
  function updateTimelineAria() {
    timeCanvas.setAttribute('aria-valuenow', Math.round(dayOfYear()));
    timeCanvas.setAttribute('aria-valuetext', dateSpoken());
  }
  function updateDescriptions() {
    var lat = moonLatitude();
    var dir = lat > 0.05 ? 'above' : (lat < -0.05 ? 'below' : 'on');
    orbitDesc.textContent =
      'Edge-on view of the moon’s orbit (tilted ' + INIT_INCL +
      ' degrees) about the earth, relative to the green ecliptic plane. Moon ' +
      Math.abs(lat).toFixed(1) + ' degrees ' + dir + ' the ecliptic plane; ' +
      monthLabel() + ', calendar day ' + Math.round(dayOfYear()) + ' of 365.';
    enlargeDesc.textContent =
      'Magnified view of the earth (blue) with the moon (grey) shown when it ' +
      'passes near the earth’s line of sight; the moon is currently ' +
      Math.abs(lat).toFixed(1) + ' degrees ' + dir + ' the ecliptic plane.';
  }
  var lastAnnounce = '';
  function announce(msg) {
    if (msg === lastAnnounce) { return; }
    lastAnnounce = msg;
    liveRegion.textContent = msg;
  }

  /* ============================================================ full render */
  function render() {
    renderOrbit();
    renderEnlarge();
    renderTime();
    caveatLabel.classList.toggle('is-visible', state.bodyScaleFactor !== 1);
    updateTimelineAria();
    updateDescriptions();
  }

  /* ============================================================ animation loop
     RAF runs only while animating; when paused, the sim renders on demand
     (control change / drag / keyboard) so an idle page does no needless work. */
  var rafId = null;
  function loop(now) {
    update(now);
    render();
    rafId = state.animate ? requestAnimationFrame(loop) : null;
  }
  function startLoop() {
    if (rafId === null && state.animate) {
      state.timeLast = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  /* ============================================================ controls */
  // changeSpeed(): DoAction.as:74-77  (speed = arg/1000)
  function applySpeed(v) {
    state.speedDisplay = v;
    state.speed = v / 1000;
    setSpeedReadout();
    speedSlider.setAttribute('aria-valuetext',
      'speed ' + fmt(v) + ' days per second');
  }
  speedSlider.addEventListener('input', function () {
    applySpeed(parseFloat(this.value));
  });

  // changeShowPath / changeShowEcliptic / changeBodySizes / updateAnimation
  cbPath.addEventListener('change', function () {
    state.showPath = this.checked;
    if (!state.showPath) { state.path = null; } else { setDate(state.dateNow, performance.now()); }
    render();
  });
  cbEcliptic.addEventListener('change', function () {
    state.showEcliptic = this.checked;
    render();
  });
  cbExag.addEventListener('change', function () {
    state.bodyScaleFactor = this.checked ? 3 : 1;   // changeBodySizes()
    render();
  });
  cbAnimate.addEventListener('change', function () {
    state.animate = this.checked;                    // updateAnimation()
    announce(this.checked ? 'Animation running.' : 'Animation paused.');
    if (state.animate) { startLoop(); } else { render(); }
  });

  /* ------------------------------------------------------------ timeline drag
     TimeStrip.as onPress/onMouseMove/onRelease: dragging pauses the animation
     and sets the date; releasing resumes if "animate" is checked. 1px = 1 day. */
  function canvasDay(evt) {
    var rect = timeCanvas.getBoundingClientRect();
    var scaleX = TW / rect.width;                   // map display px -> stage px
    return (evt.clientX - rect.left) * scaleX;       // in stage px (= days offset)
  }
  var dragStartX = 0, dragStartDate = 0, dragging = false, resumeAfterDrag = false;
  timeCanvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    try { timeCanvas.setPointerCapture(e.pointerId); } catch (err) {}
    try { timeCanvas.focus({ preventScroll: true }); } catch (err) { timeCanvas.focus(); }
    dragging = true;
    resumeAfterDrag = state.animate;                // resume() uses the checkbox
    state.animate = false;                          // pause() (DoAction.as:41)
    dragStartX = canvasDay(e);
    dragStartDate = state.dateNow;
  });
  timeCanvas.addEventListener('pointermove', function (e) {
    if (!dragging) { return; }
    // onMouseMove: setDate(dragDate - xmouse) => date decreases as x increases
    setDate(dragStartDate - (canvasDay(e) - dragStartX), performance.now());
    render();
  });
  function endDrag() {
    if (!dragging) { return; }
    dragging = false;
    state.animate = resumeAfterDrag && cbAnimate.checked;  // resume()
    announce(dateSpoken());
    if (state.animate) { startLoop(); }
  }
  timeCanvas.addEventListener('pointerup', endDrag);
  timeCanvas.addEventListener('pointercancel', endDrag);

  /* ------------------------------------------------------------ timeline keyboard
     Full keyboard operability for the draggable calendar (WCAG 2.1.1). */
  timeCanvas.addEventListener('keydown', function (e) {
    var step = 0;
    switch (e.key) {
      case 'ArrowLeft': case 'ArrowDown':  step = -1; break;
      case 'ArrowRight': case 'ArrowUp':   step =  1; break;
      case 'PageDown': step = -MONTH_W; break;   // one month earlier
      case 'PageUp':   step =  MONTH_W; break;   // one month later
      case 'Home': setDate(0, performance.now()); e.preventDefault(); announce(dateSpoken()); render(); return;
      case 'End':  setDate(ECLIPSE_YEAR, performance.now()); e.preventDefault(); announce(dateSpoken()); render(); return;
      default: return;
    }
    e.preventDefault();
    state.animate = false;                    // scrubbing pauses; re-check "animate" to resume
    cbAnimate.checked = false;
    setDate(state.dateNow + step, performance.now());
    render();
    announce(dateSpoken());
  });

  /* ============================================================ reset */
  // Restore the exact initial state on the masthead "sim-reset" event.
  function resetSim() {
    state.dateNow = 0;
    state.speedDisplay = SPEED_DEFAULT;
    state.speed = SPEED_DEFAULT / 1000;
    state.showPath = true;
    state.showEcliptic = true;
    state.bodyScaleFactor = 1;
    state.animate = !prefersReduced;          // reduced-motion aware default
    state.timeLast = performance.now();
    speedSlider.value = SPEED_DEFAULT;
    cbPath.checked = true;
    cbEcliptic.checked = true;
    cbExag.checked = false;
    cbAnimate.checked = state.animate;
    applySpeed(SPEED_DEFAULT);
    setDate(0, performance.now());
    render();
    announce('Simulation reset.');
    startLoop();
  }
  document.addEventListener('sim-reset', resetSim);

  /* ============================================================ init */
  // klunlInitEqn() is called by kl-unl.js on load; redefine it to set up our
  // MathJax-driven readouts (foundation contract).
  window.klunlInitEqn = function () {
    setEndLabels();
    setSpeedReadout();
  };

  function init() {
    applySpeed(SPEED_DEFAULT);
    cbAnimate.checked = state.animate;
    state.timeLast = performance.now();
    setDate(0, state.timeLast);
    // Ensure readouts typeset even if MathJax finishes starting up after load.
    if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
      MathJax.startup.promise.then(function () { setEndLabels(); setSpeedReadout(); });
    } else {
      setEndLabels(); setSpeedReadout();
    }
    render();
    startLoop();
  }

  // draw as soon as the sphere art is ready (first frames may predate load)
  earthImg.addEventListener('load', render);
  moonImg.addEventListener('load', render);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
