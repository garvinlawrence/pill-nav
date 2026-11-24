/* Pill Nav — Garvin Lawrence (garvinlawrence.com). MIT License.
   Taken from the nav on garvinlawrence.com. Four parts:
   1) scrolled state + mobile toggle, 2) comet border tracer,
   3) "boat on water" scroll bob, 4) morph into the compact tab nav. */

/* ── Nav: scrolled state + mobile toggle ── */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (!toggle || !links) return;

  // Closing by Escape returns focus to the toggle (a keyboard user opened the
  // menu from it); closing by clicking a link or outside the nav doesn't, since
  // focus is already going somewhere else on purpose.
  function setOpen(open, returnFocus) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open && returnFocus) toggle.focus();
    // Menu links come before the toggle in the DOM, so hand keyboard focus to the first link.
    if (open && document.activeElement === toggle) { const first = links.querySelector('a'); if (first) setTimeout(() => first.focus(), 30); }
  }

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false, true);
  });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target)) setOpen(false);
  });
})();


/* ── Nav border glow: SVG rect traced to match the real pill, so the
   animated stroke genuinely bends through the rounded ends instead of a
   rotated rigid shape cutting across them (see the CSS comment above
   .nav-glow-svg for why a CSS motion-path box couldn't do this). Measures
   .nav-inner's real rendered size — same discipline as the work-gallery
   pin and the About-text line splitting elsewhere in this file, since a
   value baked into the stylesheet would drift out of sync the moment the
   pill's width changes responsively (which it does, constantly, via
   clamp()/vw units in its own padding). ── */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // CSS hides it too; skip the measuring work entirely

  const DASH = 110; // length of each tail layer's visible segment, px along the path — long and heavily overlapped so the 8 staggered copies blend into one continuous fade instead of reading as separate segments
  // The dot's dash length, not its stroke-width, controls how circular it reads:
  // with round linecaps, a dash of length L on a stroke W px wide renders as an
  // L-long rectangle with a W-wide semicircle capping each end (visual length
  // = L + W). At L=16 (the first attempt) that's visibly a pill, not a circle.
  // Shrinking L close to 0 lets the two end-caps merge into one circle of
  // diameter ~= the stroke-width instead.
  const DASH_DOT = 1.5;
  const DURATION = 32; // seconds — must match the `animation:` duration on .nav-glow-path in CSS
  const LEAD_TAIL_DELAY = 0.08; // seconds — must match .nav-glow-path:nth-of-type(8)'s animation-delay in CSS (the tail layer the dot's lead is targeting)

  // One tracer per bordered element. `box` is the element whose border is
  // traced; `svg` is either a child of it (positioned against its padding
  // box, so it is pushed out by the border width) or a sibling inside a
  // same-sized wrapper (for a box that clips its own children).
  function tracer(box, svg) {
    const rects = svg && Array.from(svg.querySelectorAll('.nav-glow-path'));
    if (!box || !svg || !rects.length) return null;
    const inside = box.contains(svg);

    function measure() {
      // getBoundingClientRect() includes the border; clientWidth/Height
      // don't, which drew the path ~1px inside the visible border line.
      const r0 = box.getBoundingClientRect();
      const w = r0.width, h = r0.height; // fractional, unlike offsetWidth/Height (a .reveal only translates, so the size is right mid-flight too)
      if (!w || !h) return;
      const cs = getComputedStyle(box);
      const borderL = parseFloat(cs.borderLeftWidth) || 0;
      const borderT = parseFloat(cs.borderTopWidth) || 0;
      // The svg's CSS size (100%) resolves against the PADDING box of its
      // positioned parent, so size and place it inline to span the real
      // border-box instead; svg box and viewBox then agree.
      svg.style.left = (inside ? -borderL : box.offsetLeft) + 'px';
      svg.style.top = (inside ? -borderT : box.offsetTop) + 'px';
      svg.style.right = 'auto';
      svg.style.bottom = 'auto';
      svg.style.width = w + 'px';
      svg.style.height = h + 'px';
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

      // The shared path traces the border's own centerline (borderWidth/2
      // in from the outer edge), so every stroke width centered on it reads
      // as "on the border".
      const inset = borderT / 2;
      const rw = w - inset * 2;
      const rh = h - inset * 2;
      // Corner radius: the element's own, capped at half the height — which
      // is what a pill (the nav, border-radius far larger than its height)
      // resolves to, and leaves a card's 28px corners as they are.
      const cssR = parseFloat(cs.borderTopLeftRadius) || 0;
      const r = Math.max(0, Math.min(cssR - inset, rh / 2, rw / 2));
      // Rounded-rect perimeter: four straight runs plus one full circle of
      // corner arc. For a pill (r = rh/2) this is the stadium formula.
      const perimeter = 2 * (rw - 2 * r) + 2 * (rh - 2 * r) + 2 * Math.PI * r;

      rects.forEach((rect) => {
        rect.setAttribute('x', inset);
        rect.setAttribute('y', inset);
        rect.setAttribute('width', rw);
        rect.setAttribute('height', rh);
        rect.setAttribute('rx', r);
        rect.setAttribute('ry', r);
        const isDot = rect.classList.contains('nav-glow-path--dot');
        const dash = isDot ? DASH_DOT : DASH;
        rect.style.strokeDasharray = dash + ' ' + Math.max(0, perimeter - dash);
        rect.style.setProperty('--nav-glow-perimeter', perimeter + 'px');
        // The dot's short dash needs a constant forward px shift to reach the
        // front of the tail's much longer leading dash; the tail's own
        // leading layer is already LEAD_TAIL_DELAY ahead of the delay:0s
        // baseline, so that layer's px progress is subtracted.
        const leadTailPx = LEAD_TAIL_DELAY * perimeter / DURATION;
        rect.style.setProperty('--lead', (isDot ? Math.max(0, DASH - DASH_DOT - leadTailPx) + 'px' : '0px'));
      });
    }
    return measure;
  }

  const measures = [];
  const navInner = document.querySelector('.nav-inner');
  const navM = tracer(navInner, navInner && navInner.querySelector('.nav-glow-svg'));
  if (navM) measures.push(navM);

  if (!measures.length) return;
  const measureAll = () => measures.forEach(m => m());

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureAll, 150);
  });
  window.addEventListener('load', measureAll);
  window.addEventListener('pageshow', (e) => { if (e.persisted) measureAll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
  measureAll();
})();



/* ── Nav "boat on water" bob (homepage, .nav.has-morph) ──
   Starting a scroll pulls the pill up, a slow swell keeps it rolling while
   the scroll goes on, and when it stops the pill dips below its spot and
   rocks back into place. Spring-damper pushed by changes in scroll speed and
   drawn toward a sine swell while scrolling. Tuned with Garvin, Nov 5 2026. */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nav = document.getElementById('nav');
  const pill = nav && nav.querySelector('.nav-inner');
  if (!pill || !nav.classList.contains('has-morph')) return; // homepage only, with the morph

  const K = 0.012;     // spring stiffness: lower = slower rocking
  const DAMP = 0.95;  // velocity kept per frame: lower = calmer water
  const GAIN = 0.2;   // how hard a change in scroll speed shoves the pill (start pull / stop dip)
  const SWELL = 14;     // px of the rolling swell while scrolling continues
  const SWELL_FRAMES = 66; // frames per swell (~1.1s at 60fps)
  const LIMIT_UP = 32, LIMIT_DOWN = 40; // soft limits in px, eased, never a hard stop

  let lastY = window.scrollY, speed = 0, prevSpeed = 0;
  let x = 0, vx = 0, phase = 0, running = false;

  // At rest (or with the menu open) the pill carries no transform and no
  // will-change: either one would make .nav-inner the containing block for
  // the fixed mobile menu and throw it off the screen edges.
  function rest() {
    pill.style.transform = '';
    pill.style.willChange = '';
    x = vx = speed = prevSpeed = phase = 0;
    lastY = window.scrollY;
    running = false;
  }

  const soft = (v) => v < 0 ? -LIMIT_UP * Math.tanh(-v / LIMIT_UP) : LIMIT_DOWN * Math.tanh(v / LIMIT_DOWN);

  function frame() {
    const y = window.scrollY;
    const raw = Math.min(Math.abs(y - lastY), 120);
    lastY = y;
    speed += (raw - speed) * 0.06;          // smooth the bursty wheel deltas
    const accel = speed - prevSpeed;
    prevSpeed = speed;

    const amount = Math.min(speed / 20, 1);
    if (speed > 0.5) phase += (Math.PI * 2) / SWELL_FRAMES;
    const swell = -SWELL * Math.sin(phase) * amount;

    vx += -accel * GAIN - K * (x - swell);
    vx *= DAMP;
    x += vx;

    if (nav.classList.contains('open')) { rest(); return; }

    if (Math.abs(x) < 0.05 && Math.abs(vx) < 0.05 && speed < 0.05) {
      rest();
      return;
    }
    pill.style.transform = 'translate3d(0,' + soft(x).toFixed(2) + 'px,0)';
    requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', () => {
    if (nav.classList.contains('open')) { lastY = window.scrollY; return; }
    if (!running) {
      running = true;
      // Own GPU layer only while it moves: sliding a layer is nearly free,
      // repainting the pill's glow + blur every frame is not (Work section
      // measured ~19ms/frame without this, ~16ms with it, same as no bob).
      // Cleared at rest so the fixed mobile menu inside isn't affected.
      pill.style.willChange = 'transform';
      requestAnimationFrame(frame);
    }
  }, { passive: true });
  // Leaving the page mid-rock: come back from the back/forward cache at rest.
  window.addEventListener('pagehide', rest);
})();


/* ── Nav morph into the Figma tab design (homepage, .nav.has-morph) ──
   See the "Nav morph" block at the end of css/styles.css. Once About is
   past the middle of the screen the full pill shrinks to the centre,
   sinks, and the logo tab rises; scrolling back into the hero reverses it.
   The left slot names the section you're in. */
(() => {
  const nav = document.getElementById('nav');
  if (!nav || !nav.classList.contains('has-morph')) return; // plain pill without the morph
  const inner = nav.querySelector('.nav-inner');
  const svg = inner && inner.querySelector('.nm-svg:not(.nm-comet-svg)');
  const glass = inner && inner.querySelector('.nm-glass');
  const cometSvg = inner && inner.querySelector('.nm-comet-svg');
  const label = inner && inner.querySelector('.nm-section');
  const labelText = label && label.querySelector('.nm-section__text');
  const menuBtn = inner && inner.querySelector('.nm-menu');
  const toggle = document.getElementById('nav-toggle');
  if (!svg || !glass || !cometSvg || !labelText || !menuBtn || !toggle) return;
  const shapes = Array.from(svg.querySelectorAll('.nm-shape'));
  const outside = svg.querySelector('.nm-outside-path');
  const comets = Array.from(cometSvg.querySelectorAll('.nm-comet .nav-glow-path'));
  document.documentElement.classList.add('has-nav-morph');
  const bootT = performance.now();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Proportions from the Figma frame (bottom pill 543x142, tab 142 wide,
  // rising 117 above it), expressed against the nav's height.
  const RISE = 117 / 142, LEFT = 0.3, RIGHT = 0.4, MIN_W = 543 / 142;
  const DUR = 750;
  const SECTIONS = [['about', 'About me'], ['work', 'Case Studies'], ['skills', 'Skills'], ['contact', 'Contact']];
  // comet constants, same as the nav tracer above
  const DASH = 110, DASH_DOT = 1.5, CYCLE = 32, LEAD_TAIL_DELAY = 0.08;

  let Wf = 0, H = 0, Wc = 0, rise = 0, p = 0, target = 0, anim = null, compact = false;

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  // Inside corners where the tab meets the pill are rounded (Garvin, Nov 5
  // 2026): a concave fillet that grows in with the tab, sized so it never
  // eats into the tab's own rounded top.
  const FILLET = 0.14;
  function shapePath(x, y, w, h, tw, tr) {
    const r = h / 2, cx = x + w / 2, rt = Math.min(tw / 2, tr), L = cx - tw / 2, R = cx + tw / 2;
    const fl = Math.max(0, Math.min(FILLET * h, tr - rt, tr * .5));
    const f = (n) => n.toFixed(2);
    return `M${f(x + r)} ${f(y)} L${f(L - fl)} ${f(y)} A${f(fl)} ${f(fl)} 0 0 0 ${f(L)} ${f(y - fl)} ` +
      `L${f(L)} ${f(y - tr + rt)} A${f(rt)} ${f(rt)} 0 0 1 ${f(L + rt)} ${f(y - tr)} ` +
      `L${f(R - rt)} ${f(y - tr)} A${f(rt)} ${f(rt)} 0 0 1 ${f(R)} ${f(y - tr + rt)} L${f(R)} ${f(y - fl)} ` +
      `A${f(fl)} ${f(fl)} 0 0 0 ${f(R + fl)} ${f(y)} L${f(x + w - r)} ${f(y)} ` +
      `A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)} L${f(x + r)} ${f(y + h)} A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)} Z`;
  }

  function geometry(t) {
    const s = ease(clamp(t / .6));          // shrink to the centre first
    const u = ease(clamp((t - .4) / .6));   // then sink + raise the tab
    const w = lerp(Wf, Wc, s);
    const drop = rise * u;
    return { x: (Wf - w) / 2, y: drop, w, tr: drop };
  }

  function render(t) {
    const g = geometry(t);
    const d = shapePath(g.x + .5, g.y + .5, g.w - 1, H - 1, H, g.tr);
    shapes.forEach((el) => el.setAttribute('d', d));
    if (outside) outside.setAttribute('d', 'M-1000 -1000 H6000 V3000 H-1000 Z ' + d);
    glass.style.clipPath = `path('${d}')`;
    if (comets.length && !reduce) {
      comets.forEach((el) => el.setAttribute('d', d));
      const per = comets[0].getTotalLength();
      const leadTailPx = LEAD_TAIL_DELAY * per / CYCLE;
      comets.forEach((el) => {
        const dot = el.classList.contains('nav-glow-path--dot');
        const dash = dot ? DASH_DOT : DASH;
        el.style.strokeDasharray = dash + ' ' + Math.max(0, per - dash);
        el.style.setProperty('--nav-glow-perimeter', per + 'px');
        el.style.setProperty('--lead', dot ? Math.max(0, DASH - DASH_DOT - leadTailPx) + 'px' : '0px');
      });
    }
  }

  function labelWidth() {
    const c = document.createElement('canvas').getContext('2d');
    c.font = getComputedStyle(labelText).font;
    return Math.max(...SECTIONS.map(([, n]) => c.measureText(n).width));
  }

  function measure() {
    const r = inner.getBoundingClientRect();
    Wf = r.width; H = r.height;
    if (!Wf || !H) return;
    rise = RISE * H;
    const need = 2 * (LEFT * H + labelWidth() + 16 + 22);
    Wc = Math.min(Wf, Math.max(MIN_W * H, need));
    [svg, cometSvg].forEach((el) => { el.setAttribute('width', Wf); el.setAttribute('height', H + rise); });
    glass.style.width = Wf + 'px'; glass.style.height = (H + rise + 2) + 'px';
    // compact item slots (padding-box coords = border-box minus the 1px border)
    const x0 = (Wf - Wc) / 2;
    inner.style.setProperty('--nm-mid', (rise + H / 2 - 1) + 'px');
    inner.style.setProperty('--nm-left', (x0 + LEFT * H - 1) + 'px');
    inner.style.setProperty('--nm-right', (x0 + Wc - RIGHT * H - 1) + 'px');
    inner.style.setProperty('--nm-logo-y', (H * .47 - 1) + 'px');
    inner.style.setProperty('--nm-menu-top', (rise + H + 12) + 'px');
    // room for a section's eyebrow below the compact pill on anchor jumps (CSS, <1024px)
    document.documentElement.style.setProperty('--nm-pad', Math.round(inner.offsetTop + rise + H + 16) + 'px');
    render(p);
  }

  function animateTo(to) {
    target = to;
    if (reduce) { p = to; render(p); return; }
    if (anim) cancelAnimationFrame(anim);
    const from = p, start = performance.now(), dur = DUR * Math.abs(to - from);
    const step = (now) => {
      const k = dur ? clamp((now - start) / dur) : 1;
      p = from + (to - from) * k;
      render(p);
      anim = k < 1 ? requestAnimationFrame(step) : null;
    };
    anim = requestAnimationFrame(step);
  }

  let readyTimer = null, settleTimer = null;
  function setCompact(on) {
    if (on === compact) return;
    compact = on;
    // the menu belongs to one shape or the other, so close it on either change;
    // if focus was inside it, hand it to a control that's showing once the
    // new shape's items have faded in (they're hidden until then)
    if (nav.classList.contains('open')) {
      const links = document.getElementById('nav-links');
      const hadFocus = links && links.contains(document.activeElement);
      toggle.click();
      if (hadFocus) setTimeout(() => {
        if (document.activeElement && document.activeElement !== document.body) return;
        const to = on ? menuBtn : nav.querySelector('.nav-inner > .brand');
        if (to) to.focus();
      }, reduce ? 0 : 560);
    }
    clearTimeout(readyTimer); clearTimeout(settleTimer);
    nav.classList.remove('nm-menu-ready', 'nm-settling');
    if (on) {
      // desktop links fade out in place first, then become the dropdown
      readyTimer = setTimeout(() => nav.classList.add('nm-menu-ready'), reduce ? 0 : 220);
    } else {
      // keep the links hidden while they switch back to the row
      nav.classList.add('nm-settling');
      settleTimer = setTimeout(() => nav.classList.remove('nm-settling'), 60);
    }
    nav.classList.toggle('nm-compact', on);
    // first second after load (reload, back, #anchor): start in the right
    // shape instead of playing the morph over the page's own entrance
    if (performance.now() - bootT < 1000) {
      if (anim) cancelAnimationFrame(anim), anim = null;
      p = on ? 1 : 0; target = p; render(p);
    } else animateTo(on ? 1 : 0);
  }

  let current = null, swapTimer = null;
  function setSection(id, name) {
    if (id === current) return;
    const first = current === null;
    current = id;
    label.setAttribute('href', '#' + id);
    clearTimeout(swapTimer);
    if (first || reduce) { labelText.textContent = name; return; }
    labelText.classList.add('is-out');
    swapTimer = setTimeout(() => {
      labelText.textContent = name;
      labelText.classList.remove('is-out');
      labelText.classList.add('is-in');
      void labelText.offsetWidth;
      labelText.classList.remove('is-in');
    }, 300);
  }

  let queued = false;
  const sectionEls = SECTIONS.map(s => document.getElementById(s[0]));
  const about = sectionEls[0];
  function check() {
    queued = false;
    const vh = window.innerHeight;
    setCompact(!!about && about.getBoundingClientRect().top < vh * .5);
    let pick = SECTIONS[0];
    SECTIONS.forEach((s, i) => {
      const el = sectionEls[i];
      if (el && el.getBoundingClientRect().top <= vh * .45) pick = s;
    });
    if (window.scrollY + vh >= document.documentElement.scrollHeight - 4) pick = SECTIONS[SECTIONS.length - 1];
    setSection(pick[0], pick[1]);
  }

  menuBtn.addEventListener('click', () => {
    toggle.click();
    // same as the original toggle: opening moves focus to the first link
    if (nav.classList.contains('open')) {
      // the panel is still visibility:hidden for a few frames after opening,
      // so keep trying briefly until it can take focus
      const first = document.querySelector('#nav-links a');
      let tries = 0;
      const tryFocus = () => {
        if (!first || !nav.classList.contains('open')) return;
        first.focus();
        if (document.activeElement !== first && ++tries < 12) setTimeout(tryFocus, 30);
      };
      setTimeout(tryFocus, 30);
    }
  });
  new MutationObserver(() => {
    const open = nav.classList.contains('open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  // Escape with the compact menu open: the nav's own handler closes it and
  // focuses the hidden #nav-toggle, so bring focus back to this button.
  // Capture phase so the check runs before that handler removes .open; any
  // other Escape (e.g. the email popup) is left alone.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && compact && nav.classList.contains('open')) setTimeout(() => menuBtn.focus(), 0);
  }, true);

  window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(check); } }, { passive: true });
  let rT; window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(measure, 120); });
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(measure);
  window.addEventListener('load', measure);
  window.addEventListener('pageshow', (e) => { if (e.persisted) { measure(); check(); } });
  measure(); check();
})();
