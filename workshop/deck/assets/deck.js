/* Deck engine: slides, step reveals, widgets, presenter view.
   No dependencies and no network, so the deck runs from file:// during a live talk.

   Authoring contract
   - <section class="slide" data-era="N" data-time="0:22" data-rail="off">…<aside class="notes">…</aside></section>
   - [data-step="k"] is revealed at slide step >= k. [data-dim="k"] is dimmed at step >= k.
   - [data-widget="name"] mounts Widgets[name]; data-at="k" makes the widget's local step = slide step - k.
     A widget returns {steps, step(s, dir), enter(), leave(), key(e) -> handled, table() -> html}.
   - Slide step count = max(data-step, at + widget.steps).
*/
(function () {
  'use strict';

  const W = (window.Widgets = window.Widgets || {});
  // ?still renders every state without motion: for screenshots, thumbnails and print.
  const still = new URLSearchParams(location.search).has('still') || new URLSearchParams(location.search).has('script');
  if (still) document.documentElement.classList.add('still');
  const reduced = still || matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- small helpers shared with widgets ----------
  const U = (window.U = {
    reduced,
    el(tag, attrs, ...kids) {
      const n = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) {
        if (k === 'class') n.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
        else if (k === 'html') n.innerHTML = v;
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v);
      }
      for (const c of kids.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
      return n;
    },
    svg(tag, attrs, ...kids) {
      const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [k, v] of Object.entries(attrs || {})) {
        if (k === 'text') n.textContent = v;
        else n.setAttribute(k, v);
      }
      for (const c of kids.flat()) if (c) n.append(c);
      return n;
    },
    ease: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    // Tween 0->1 over ms; returns a cancel function. Reduced motion jumps to the end.
    tween(ms, fn, ease = U.ease) {
      if (reduced || ms <= 0) { fn(1); return () => {}; }
      let raf, t0;
      const tick = (t) => {
        t0 ??= t;
        const p = Math.min(1, (t - t0) / ms);
        fn(ease(p));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    },
    lerp: (a, b, t) => a + (b - a) * t,
    fmt: (n) => Math.round(n).toLocaleString('en-US'),
    // Count a number up inside a node; keeps any suffix in data-suffix.
    countUp(node, to, ms = 1400, decimals = 0) {
      const from = 0, suf = node.dataset.suffix || '', pre = node.dataset.prefix || '';
      return U.tween(ms, (p) => {
        const v = U.lerp(from, to, p);
        node.textContent = pre + (decimals ? v.toFixed(decimals) : U.fmt(v)) + suf;
      });
    },
    // A timer set that a widget clears on leave(), so nothing keeps animating off-screen.
    timers() {
      const ids = new Set();
      return {
        after(ms, fn) { const id = setTimeout(() => { ids.delete(id); fn(); }, reduced ? 0 : ms); ids.add(id); return id; },
        every(ms, fn) { const id = setInterval(fn, ms); ids.add(id); return id; },
        clear() { ids.forEach((id) => { clearTimeout(id); clearInterval(id); }); ids.clear(); },
      };
    },
  });

  // ---------- deck ----------
  const params = new URLSearchParams(location.search);
  const isPresenter = params.has('presenter');
  let slides = [], idx = 0, step = 0, mounted = new Map(), peer = null, applyingRemote = false;
  const startedAt = Date.now();

  function stepsOf(slide) {
    let n = 0;
    slide.querySelectorAll('[data-step]').forEach((e) => (n = Math.max(n, +e.dataset.step)));
    slide.querySelectorAll('[data-dim]').forEach((e) => (n = Math.max(n, +e.dataset.dim)));
    slide.querySelectorAll('[data-cls]').forEach((e) => e.dataset.cls.split(/\s+/).forEach((p) => (n = Math.max(n, +p.split(':')[0]))));
    for (const { inst, at } of widgetsOf(slide)) n = Math.max(n, at + (inst.steps || 0));
    if (slide.dataset.steps) n = Math.max(n, +slide.dataset.steps);
    return n;
  }

  function widgetsOf(slide) {
    if (!mounted.has(slide)) {
      const list = [];
      slide.querySelectorAll('[data-widget]').forEach((node) => {
        const f = W[node.dataset.widget];
        if (!f) { node.textContent = 'missing widget: ' + node.dataset.widget; return; }
        const inst = f(node, { slide, data: window.DeckData }) || {};
        list.push({ node, inst, at: +(node.dataset.at || 0) });
      });
      mounted.set(slide, list);
    }
    return mounted.get(slide);
  }

  function applyStep(slide, s, dir) {
    slide.querySelectorAll('[data-step]').forEach((e) => e.classList.toggle('shown', s >= +e.dataset.step));
    slide.querySelectorAll('[data-dim]').forEach((e) => e.classList.toggle('dimmed', s >= +e.dataset.dim));
    slide.querySelectorAll('[data-gone]').forEach((e) => (e.style.display = s >= +e.dataset.gone ? 'none' : ''));
    // data-cls="2:flipped 4:struck" adds each class from that step on.
    slide.querySelectorAll('[data-cls]').forEach((e) => e.dataset.cls.split(/\s+/).forEach((p) => {
      const [k, c] = p.split(':'); e.classList.toggle(c, s >= +k);
    }));
    for (const { inst, at } of widgetsOf(slide)) inst.step && inst.step(Math.max(0, Math.min(s - at, inst.steps || 0)), dir);
  }

  function goto(i, s = 0, opts = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const prev = slides[idx], next = slides[i], changed = prev !== next || opts.force;
    if (changed && prev) {
      prev.classList.remove('active');
      for (const { inst } of widgetsOf(prev)) inst.leave && inst.leave();
    }
    idx = i;
    const max = stepsOf(next);
    step = s === 'end' ? max : Math.max(0, Math.min(max, s));
    if (changed) {
      next.classList.add('active');
      for (const { inst } of widgetsOf(next)) inst.enter && inst.enter();
    }
    applyStep(next, step, opts.dir || 0);
    updateChrome();
    if (!applyingRemote) {
      history.replaceState(null, '', `#/${idx + 1}/${step}`);
      send({ type: 'goto', idx, step });
    }
    if (isPresenter) renderPresenter();
  }

  function next() {
    if (step < stepsOf(slides[idx])) goto(idx, step + 1, { dir: 1 });
    else if (idx < slides.length - 1) goto(idx + 1, 0, { dir: 1 });
  }
  function prev() {
    if (step > 0) goto(idx, step - 1, { dir: -1 });
    else if (idx > 0) goto(idx - 1, 'end', { dir: -1 });
  }

  // ---------- rail: where we are on the 8-era timeline ----------
  let rail, progress;
  function buildRail(stage) {
    const eras = window.DeckData.eras;
    rail = U.el('div', { class: 'rail' });
    rail.append(U.el('div', { class: 'track' }), U.el('div', { class: 'done' }));
    const pos = (n) => ((n - 0.5) / eras.length) * 100;
    eras.forEach((e) => {
      const d = U.el('div', { class: 'era', style: { left: pos(e.n) + '%' } },
        U.el('div', { class: 'tick' }), U.el('div', { class: 'lbl' }, `${e.n} · ${e.short}`));
      d.dataset.n = e.n;
      rail.append(d);
    });
    rail.append(U.el('div', { class: 'split', style: { left: '50%' } }));
    progress = U.el('div', { class: 'progress' });
    stage.append(rail, progress);
  }

  function updateChrome() {
    const s = slides[idx];
    const era = +(s.dataset.era || 0);
    const n = window.DeckData.eras.length;
    rail.classList.toggle('off', s.dataset.rail === 'off');
    rail.classList.toggle('big', s.classList.contains('era-card'));
    rail.querySelectorAll('.era').forEach((d) => {
      const k = +d.dataset.n;
      d.classList.toggle('past', era > 0 && k < era);
      d.classList.toggle('now', k === era);
      d.classList.toggle('later', era === 0 ? false : k > era);
    });
    rail.querySelector('.done').style.width = era ? ((era - 0.5) / n) * 100 + '%' : '0%';
    progress.style.width = ((idx + 1) / slides.length) * 100 + '%';
  }

  // ---------- scaling ----------
  function fit(stage, box) {
    const r = box.getBoundingClientRect();
    const k = Math.min(r.width / 1600, r.height / 900);
    stage.style.transform = `scale(${k})`;
  }

  // ---------- presenter sync (postMessage works on file://, BroadcastChannel does not) ----------
  function send(msg) {
    const target = isPresenter ? window.opener : peer;
    try { target && !target.closed && target.postMessage({ deck: location.pathname, ...msg }, '*'); } catch (_) {}
  }
  window.addEventListener('message', (e) => {
    const m = e.data;
    if (!m || m.deck !== location.pathname) return;
    if (m.type === 'goto') { applyingRemote = true; goto(m.idx, m.step); applyingRemote = false; history.replaceState(null, '', `#/${m.idx + 1}/${m.step}`); }
    if (m.type === 'hello' && !isPresenter) { peer = e.source; send({ type: 'goto', idx, step }); }
    if (m.type === 'key') handleKey(m.key, true);
    if (m.type === 'wkey') widgetKey(m.key, true);
  });
  function openPresenter() {
    const url = location.href.split('#')[0].split('?')[0] + '?presenter' + location.hash;
    peer = window.open(url, 'presenter-' + location.pathname, 'width=1500,height=900');
  }

  // ---------- presenter view ----------
  let pv;
  function buildPresenter() {
    document.body.classList.add('presenter');
    pv = U.el('div', { class: 'pv' });
    const cur = U.el('div', { class: 'pane cur' });
    const side = U.el('div', { class: 'side' });
    const nextPane = U.el('div', { class: 'pane nxt' });
    const clock = U.el('div', { class: 'clock' });
    const notes = U.el('div', { class: 'notes' });
    side.append(clock, nextPane, notes);
    pv.append(cur, side);
    document.body.append(pv);
    // The live stage moves into the presenter pane, so widgets animate in both windows.
    const vp = document.querySelector('.viewport');
    const stage = vp.querySelector('.stage');
    cur.append(stage);
    stage.style.transformOrigin = '0 0';
    const resize = () => {
      const w = cur.clientWidth; cur.style.height = (w * 9) / 16 + 'px';
      stage.style.transform = `scale(${w / 1600})`;
      const nw = nextPane.clientWidth; nextPane.style.height = (nw * 9) / 16 + 'px';
      const inner = nextPane.querySelector('.inner'); if (inner) inner.style.transform = `scale(${nw / 1600})`;
    };
    addEventListener('resize', resize);
    pv._parts = { cur, nextPane, clock, notes, resize };
    setTimeout(resize, 0);
    if (window.opener) window.opener.postMessage({ deck: location.pathname, type: 'hello' }, '*');
    setInterval(renderClock, 1000);
  }

  function cloneSlide(slide) {
    const c = slide.cloneNode(true);
    c.classList.add('active');
    c.querySelectorAll('aside.notes').forEach((n) => n.remove());
    c.querySelectorAll('[data-widget]').forEach((n) => {
      n.innerHTML = '';
      n.append(U.el('div', { class: 'w-ph' }, 'interactive: ' + (n.dataset.label || n.dataset.widget)));
    });
    return c;
  }

  function renderPresenter() {
    if (!pv) return;
    const { nextPane, notes, resize } = pv._parts;
    const s = slides[idx];
    const nxt = slides[idx + 1];
    nextPane.innerHTML = '';
    if (nxt) {
      const inner = U.el('div', { class: 'inner clone', style: { width: '1600px', height: '900px', position: 'absolute', transformOrigin: '0 0' } });
      inner.append(cloneSlide(nxt));
      nextPane.append(inner);
    }
    const src = s.querySelector('aside.notes');
    notes.innerHTML = src ? src.innerHTML : '<p class="muted">No notes.</p>';
    resize();
    renderClock();
  }

  function parseClock(t) { const [h, m] = t.split(':').map(Number); return (h * 60 + m) * 60; }
  function renderClock() {
    if (!pv) return;
    const el = (Date.now() - startedAt) / 1000;
    const mm = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
    // Planned start of the current block: nearest data-time at or before this slide.
    let planned = null;
    for (let i = idx; i >= 0; i--) if (slides[i].dataset.time) { planned = parseClock(slides[i].dataset.time); break; }
    const drift = planned == null ? 0 : el - planned;
    const cls = drift > 120 ? 'late' : 'ok';
    pv._parts.clock.innerHTML =
      `<div><div class="lbl">Elapsed</div><div class="big">${mm(el)}</div></div>` +
      `<div><div class="lbl">Block planned</div><div class="big">${planned == null ? '–' : mm(planned)}</div></div>` +
      `<div><div class="lbl">Drift</div><div class="big ${cls}">${drift >= 0 ? '+' : '−'}${mm(Math.abs(drift))}</div></div>` +
      `<div><div class="lbl">Slide · step</div><div class="big">${idx + 1}<span class="stepinfo">·${step}/${stepsOf(slides[idx])}</span></div></div>`;
  }

  // ---------- overlays ----------
  const overlays = {};
  function buildOverlays() {
    overlays.black = U.el('div', { class: 'overlay black' });
    overlays.over = U.el('div', { class: 'overlay overview' });
    overlays.table = U.el('div', { class: 'overlay table-view' });
    overlays.help = U.el('div', { class: 'overlay help' }, U.el('div', { class: 'box', html:
      '<b>Keys</b><br><kbd>→</kbd> <kbd>Space</kbd> <kbd>PgDn</kbd> next step · <kbd>←</kbd> <kbd>PgUp</kbd> back<br>' +
      '<kbd>P</kbd> presenter view (notes, timer, next slide) · <kbd>O</kbd> overview · <kbd>G</kbd> go to slide<br>' +
      '<kbd>B</kbd> black screen · <kbd>F</kbd> full screen · <kbd>R</kbd> replay this slide<br>' +
      '<kbd>T</kbd> data table for the chart on this slide · <kbd>Home</kbd>/<kbd>End</kbd> first/last · <kbd>?</kbd> this help' }));
    Object.values(overlays).forEach((o) => document.body.append(o));
    overlays.over.addEventListener('click', (e) => {
      const t = e.target.closest('.thumb');
      if (t) { overlays.over.classList.remove('on'); goto(+t.dataset.i, 'end'); }
    });
    [overlays.black, overlays.table, overlays.help].forEach((o) => o.addEventListener('click', () => o.classList.remove('on')));
  }
  function toggleOverview() {
    const o = overlays.over;
    if (o.classList.toggle('on')) {
      const grid = U.el('div', { class: 'grid' });
      slides.forEach((s, i) => {
        const inner = U.el('div', { class: 'inner clone' }); inner.append(cloneSlide(s));
        grid.append(U.el('div', { class: 'thumb' + (i === idx ? ' cur' : ''), 'data-i': i }, inner, U.el('div', { class: 'n' }, String(i + 1))));
      });
      o.innerHTML = ''; o.append(grid);
      o.querySelector('.cur')?.scrollIntoView({ block: 'center' });
    }
  }
  function toggleTable() {
    const o = overlays.table;
    if (o.classList.contains('on')) return o.classList.remove('on');
    const ws = widgetsOf(slides[idx]).filter((w) => w.inst.table);
    if (!ws.length) return;
    o.innerHTML = ''; o.append(U.el('div', { html: ws.map((w) => w.inst.table()).join('<br>') }));
    o.classList.add('on');
  }

  // ---------- keys ----------
  function handleKey(key, remote) {
    const map = {
      ArrowRight: next, ' ': next, PageDown: next, ArrowDown: next, Enter: next,
      ArrowLeft: prev, PageUp: prev, ArrowUp: prev, Backspace: prev,
      Home: () => goto(0), End: () => goto(slides.length - 1, 'end'),
      p: () => (isPresenter ? null : openPresenter()),
      o: toggleOverview,
      b: () => overlays.black.classList.toggle('on'), '.': () => overlays.black.classList.toggle('on'),
      f: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()),
      r: () => { const s = slides[idx]; mounted.get(s)?.forEach(({ inst }) => inst.leave && inst.leave()); mounted.delete(s);
        s.querySelectorAll('[data-widget]').forEach((n) => (n.innerHTML = n._orig ?? n.innerHTML)); goto(idx, 0, { force: true }); },
      t: toggleTable,
      g: () => { const n = prompt('Go to slide (1–' + slides.length + ')'); if (n) goto(+n - 1, 0); },
      '?': () => overlays.help.classList.toggle('on'),
      Escape: () => Object.values(overlays).forEach((o) => o.classList.remove('on')),
    };
    const f = map[key] || map[key.toLowerCase?.()];
    if (f) { f(); if (!remote && isPresenter && ['b', '.'].includes(key)) send({ type: 'key', key }); return true; }
    return false;
  }
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, [contenteditable]')) { if (e.key === 'Escape') e.target.blur(); return; }
    // The active slide's widgets get first refusal (e.g. digit keys feed the live histogram).
    if (widgetKey(e.key)) { e.preventDefault(); return; }
    if (handleKey(e.key)) e.preventDefault();
  });
  // Widget keys apply in both windows, so live input typed in the presenter view reaches the audience.
  function widgetKey(key, remote) {
    for (const { inst } of widgetsOf(slides[idx])) if (inst.key && inst.key({ key })) { if (!remote) send({ type: 'wkey', key }); return true; }
    return false;
  }

  // ---------- boot ----------
  function boot() {
    const stage = document.querySelector('.stage');
    slides = [...stage.querySelectorAll('.slide')];
    stage.querySelectorAll('[data-widget]').forEach((n) => (n._orig = n.innerHTML));
    buildRail(stage);
    buildOverlays();
    const vp = document.querySelector('.viewport');
    if (isPresenter) buildPresenter();
    else { const r = () => fit(stage, vp); addEventListener('resize', r); r(); }
    const m = location.hash.match(/#\/(\d+)(?:\/(\d+|e))?/);
    goto(m ? +m[1] - 1 : 0, m && m[2] ? (m[2] === 'e' ? 'end' : +m[2]) : 0, { force: true });
    // Printing gives a handout: every slide, every widget at its final state.
    addEventListener('beforeprint', () => slides.forEach((sl) => { widgetsOf(sl).forEach(({ inst }) => inst.enter && inst.enter()); applyStep(sl, stepsOf(sl), 1); }));
    window.Deck = { widgetKey, goto, next, prev, get idx() { return idx; }, get step() { return step; }, slides, stepsOf };
    // ?script writes the speaker's script: per slide, what is on screen, what each click reveals, and the notes.
    if (params.has('script')) buildScript();
    // ?selftest walks every step forward, then back, and records any error in <body data-selftest>.
    if (params.has('selftest')) {
      const errs = [];
      addEventListener('error', (e) => errs.push(`${idx + 1}/${step}: ${e.message}`));
      let n = 0;
      try {
        goto(0, 0);
        while (!(idx === slides.length - 1 && step === stepsOf(slides[idx])) && n < 5000) { next(); n++; }
        while (!(idx === 0 && step === 0) && n < 10000) { prev(); n++; }
      } catch (e) { errs.push(`${idx + 1}/${step}: ${e.message}`); }
      setTimeout(() => { document.body.dataset.selftest = JSON.stringify({ slides: slides.length, moves: n, errors: errs }); }, 1500);
    }
  }
  function buildScript() {
    const clean = (t) => (t || '').replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
    const line = (t) => clean(t).replace(/\n+/g, ' ');
    const CLS = { on: 'a highlight ring appears', in: 'the next view fades in', flipped: 'the card flips', flag: 'a line is flagged',
      strike: 'the obvious lines are struck out', mark: 'the lines that matter are highlighted', removed: 'it is struck through' };
    const WIDGET = { count: 'the numbers count up', timer: 'the countdown starts' };
    const out = [`## ${document.title.replace(/^AI in the SDLC · /, '')}`, ''];
    slides.forEach((s, i) => {
      goto(i, 'end');
      const era = +(s.dataset.era || 0);
      const heads = s.querySelector('.swap') ? [...s.querySelectorAll('.swap h1')] : [s.querySelector('h1, .quote')].filter(Boolean);
      const title = s.dataset.title || heads.map((h) => line(h.innerText)).join(' → ');
      const meta = [era ? `Era ${era}` : 'Opening', s.dataset.time ? `starts at ${s.dataset.time}` : '', s.classList.contains('breather') ? 'breather' : ''].filter(Boolean).join(' · ');
      out.push(`### ${i + 1}. ${title || '(untitled)'}`, `*${meta}*`, '');
      // On screen before any click: everything except the title, step reveals, animations, sources and notes.
      const c = s.cloneNode(true);
      c.querySelectorAll('aside.notes, [data-step], [data-widget], .source, .swap, h1').forEach((n) => { if (n !== c) n.remove(); });
      c.querySelectorAll('.kicker, .tag, .num, .label, .badge, .h, .lesson').forEach((k) => { k.textContent = line(k.textContent); k.style.textTransform = 'none'; k.style.display = 'block'; });
      c.style.cssText = 'position:absolute; left:-99999px; display:flex; width:1600px';
      document.body.append(c);
      const base = clean(c.innerText).split('\n').map((l) => l.trim()).filter(Boolean);
      c.remove();
      if (base.length) out.push('**On screen:** ' + base.join(' · '), '');
      // Each click: what it reveals or what animation it drives.
      const clicks = new Map();
      const add = (k, t) => { if (!clicks.has(k)) clicks.set(k, []); if (!clicks.get(k).includes(t)) clicks.get(k).push(t); };
      s.querySelectorAll('[data-step]').forEach((n) => { if (!n.parentElement.closest('[data-step]')) add(+n.dataset.step, '“' + line(n.innerText).slice(0, 160) + '”'); });
      s.querySelectorAll('[data-cls]').forEach((n) => n.dataset.cls.split(/\s+/).forEach((p) => { const [k, cls] = p.split(':'); if (CLS[cls]) add(+k, n.dataset.beat || CLS[cls]); }));
      widgetsOf(s).forEach(({ node, inst, at }) => {
        const n = inst.steps || 0, label = WIDGET[node.dataset.widget] || node.dataset.label || node.dataset.widget;
        if (n) for (let k = 1; k <= n; k++) add(at + k, `▶ ${(inst.beats && inst.beats[k - 1]) || label + ', next beat'}`);
        else out.push(`**Animation:** ${label}, plays on its own`, '');
      });
      const total = stepsOf(s);
      if (total) { out.push(`**Clicks (${total}):**`); for (let k = 1; k <= total; k++) out.push(`${k}. ${(clicks.get(k) || ['next beat']).join('; ')}`); out.push(''); }
      const src = s.querySelector('.source');
      if (src) out.push('**Source on slide:** ' + line(src.innerText), '');
      const notes = s.querySelector('aside.notes');
      if (notes) out.push('**Say / do:** ' + [...notes.querySelectorAll('p')].map((p) => line(p.textContent)).join(' '), '');
    });
    goto(0, 0);
    window.DeckScript = out.join('\n');
    const pane = U.el('div', { style: { position: 'fixed', inset: 0, zIndex: 100, background: '#fff', overflow: 'auto', padding: '24px 32px' } },
      U.el('button', { class: 'pill-btn', onclick: () => navigator.clipboard.writeText(window.DeckScript) }, 'Copy as Markdown'),
      U.el('pre', { style: { whiteSpace: 'pre-wrap', font: '15px/1.5 var(--mono)', color: 'var(--ink)' } }, window.DeckScript));
    document.body.append(pane);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
