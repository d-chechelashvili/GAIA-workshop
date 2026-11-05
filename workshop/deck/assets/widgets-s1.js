/* Session 1 widgets. Each one teaches a single idea by animating it; numbers marked
   "illustrative" are shapes, not measurements, and say so on the slide. */
(function () {
  const W = window.Widgets, U = window.U, S = U.svg;

  // ======================================================================
  // Opening: from the artificial neuron to now. Three zooms of one linear axis.
  // ======================================================================
  W.timeline = (node, { data }) => {
    const Wd = 1408, H = 560, base = 330, padL = 30, padR = 30;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H, style: 'overflow:visible' });
    const gBands = S('g'), gAxis = S('g'), gModels = S('g'), gPts = S('g'), gNote = S('g'), gLbl = S('g');
    svg.append(gBands, gAxis, gModels, gPts, gLbl, gNote);
    node.append(svg);
    const domains = [[1940, 2027.5], [2010, 2027.2], [2022.6, 2026.95]];
    let dom = domains[0].slice(), cancel = () => {}, tm = U.timers();
    const x = (v, d = dom) => padL + ((v - d[0]) / (d[1] - d[0])) * (Wd - padL - padR);

    svg.append(S('line', { x1: 0, x2: Wd, y1: base, y2: base, stroke: 'var(--axis)', 'stroke-width': 1 }));
    const today = S('g');
    today.append(S('line', { y1: 26, y2: base + 10, stroke: 'var(--cc)', 'stroke-width': 2 }), S('text', { y: 18, 'text-anchor': 'end', 'font-size': 20, 'font-weight': 700, fill: 'var(--cc-550)', text: 'today' }));
    svg.append(today);
    const placeToday = (d) => { const tx = x(2026.84, d); today.querySelector('line').setAttribute('x1', tx); today.querySelector('line').setAttribute('x2', tx); today.querySelector('text').setAttribute('x', tx - 6); };
    const pts = data.milestones.map(([t, name, sub, key]) => {
      const g = S('g', { opacity: 0 });
      const lead = S('line', { stroke: 'var(--axis)', 'stroke-width': 1 });
      const dot = S('circle', { r: key ? 7 : 5, fill: key ? 'var(--ink)' : 'var(--ink-2)', stroke: 'var(--surface)', 'stroke-width': 2 });
      const lbl = S('text', { 'font-size': key ? 22 : 18, 'font-weight': key ? 650 : 500, fill: key ? 'var(--ink)' : 'var(--ink-2)', 'text-anchor': 'start', stroke: 'var(--surface)', 'stroke-width': 6, 'paint-order': 'stroke', 'stroke-linejoin': 'round', text: name });
      g.append(lead, dot);
      gPts.append(g);
      const gl = S('g', { opacity: 0 }); gl.append(lbl); gLbl.append(gl);
      return { t, name, sub, key, g, gl, lead, dot, lbl, cx: x(t), level: -1, shown: false };
    });

    // Label rows: the most important labels are placed first (the newest key one, then the rest of the key
    // ones, newest first), each in the lowest row where it overlaps nothing; near the right edge a label
    // hangs to the left of its dot, so the newest milestone is never the one that gets dropped.
    function layout(d, which) {
      const rows = [[], [], [], [], [], []];
      const want = pts.filter((p) => p.t >= d[0] && p.t <= d[1] && which(p));
      want.sort((a, b) => (b.key - a.key) || (b.t - a.t));
      const res = new Map();
      for (const p of want) {
        const px = x(p.t, d), w = p.name.length * (p.key ? 11.6 : 9.6) + 14;
        const flip = px + w > Wd - 4;
        const iv = flip ? [px - w, px + 6] : [px - 6, px + w];
        const r = rows.findIndex((row) => row.every(([a, b]) => iv[1] < a || iv[0] > b));
        if (r >= 0) { rows[r].push(iv); res.set(p, r); p.flip = flip; }
      }
      return res;
    }
    const levelY = (r) => base - 46 - r * 42;

    function ticks(d) {
      gAxis.innerHTML = '';
      const span = d[1] - d[0];
      const stepY = span > 50 ? 10 : 1;
      for (let y = Math.ceil(d[0] / stepY) * stepY; y <= d[1]; y += stepY) {
        const xx = x(y, d);
        gAxis.append(S('line', { x1: xx, x2: xx, y1: base, y2: base + 8, stroke: 'var(--axis)' }),
          S('text', { x: xx, y: base + 32, 'font-size': 17, fill: 'var(--muted)', 'text-anchor': 'middle', text: String(y) }));
      }
    }

    function place(d, which, ms = 1300) {
      const lay = layout(d, which);
      ticks(d); placeToday(d);
      const from = pts.map((p) => p.cx);
      const to = pts.map((p) => x(p.t, d));
      pts.forEach((p) => { p.level = lay.has(p) ? lay.get(p) : -1; });
      cancel();
      cancel = U.tween(ms, (k) => {
        pts.forEach((p, i) => {
          p.cx = U.lerp(from[i], to[i], k);
          const vis = p.t >= d[0] - 0.01 && p.t <= d[1] + 0.01;
          p.dot.setAttribute('cx', p.cx); p.dot.setAttribute('cy', base);
          p.dot.style.opacity = vis ? 1 : 0;
          const ly = levelY(Math.max(0, p.level));
          p.lead.setAttribute('x1', p.cx); p.lead.setAttribute('x2', p.cx);
          p.lead.setAttribute('y1', base - 8); p.lead.setAttribute('y2', ly + 6);
          p.lbl.setAttribute('x', p.flip ? p.cx + 2 : p.cx - 2); p.lbl.setAttribute('y', ly); p.lbl.setAttribute('text-anchor', p.flip ? 'end' : 'start');
          const on = vis && p.level >= 0;
          p.lbl.style.opacity = on ? 1 : 0; p.lead.style.opacity = on ? 1 : 0;
        });
      }, U.easeInOut);
      dom = d;
    }

    function bands(on) {
      gBands.innerHTML = ''; gModels.innerHTML = ''; gNote.innerHTML = '';
      if (!on) return;
      const d = domains[2];
      data.eras.forEach((e, i) => {
        const x0 = x(e.from, d), x1 = x(e.to, d);
        const r = S('rect', { x: x0, y: 40, width: Math.max(2, x1 - x0 - 2), height: base - 40, fill: i % 2 ? '#f3f2ee' : '#f7f6f2', opacity: 0 });
        const t = S('text', { x: x0 + 8, y: 64, 'font-size': 16, 'font-weight': 700, fill: 'var(--muted)', text: String(e.n), opacity: 0 });
        gBands.append(r, t);
        r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: i * 70, fill: 'forwards' });
        t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: i * 70, fill: 'forwards' });
      });
      // New Claude models (date Claude Code shipped support): denser each year.
      const my = base + 88;
      gModels.append(S('text', { x: x(2025.1, d), y: my - 18, 'font-size': 19, 'font-weight': 650, fill: 'var(--ink-2)', text: 'Each tick: a new Claude model in Claude Code' }));
      const seen = {};
      data.models.forEach(([iso, name], i) => {
        const [yy, mm, dd] = iso.split('-').map(Number);
        const t = yy + (mm - 1) / 12 + dd / 365;
        const xx = x(t, d) + (seen[iso] = (seen[iso] ?? -1) + 1) * 7; // same-day releases sit side by side
        const m = S('rect', { x: xx - 2, y: my, width: 4, height: 26, rx: 2, fill: 'var(--cc)', opacity: 0 });
        m.append(S('title', { text: `${name} · ${iso}` }));
        gModels.append(m);
        m.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: 600 + i * 90, fill: 'forwards' });
      });
      const y25 = x(2025.5, d), y26 = x(2026.4, d);
      gModels.append(S('text', { x: y25, y: my + 60, 'font-size': 22, 'font-weight': 650, fill: 'var(--ink)', 'text-anchor': 'middle', text: '2025: 7' }),
        S('text', { x: y26, y: my + 60, 'font-size': 22, 'font-weight': 650, fill: 'var(--ink)', 'text-anchor': 'middle', text: '2026 to Oct: 11' }));
    }

    function intro() {
      tm.clear();
      pts.forEach((p) => { p.g.setAttribute('opacity', 0); p.gl.setAttribute('opacity', 0); });
      place(domains[0], (p) => p.key, 0);
      // Milestones arrive in date order at a steady beat, so the crowding at the right is felt.
      pts.forEach((p, i) => tm.after(250 + i * 85, () => [p.g, p.gl].forEach((n) => n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'forwards' }))));
    }
    return {
      beats: ['zoom to 2010 onwards', 'zoom to 2022–2026: the 8 eras and a tick per new Claude model'], steps: 2,
      enter() { intro(); },
      leave() { tm.clear(); cancel(); },
      step(s, dir) {
        if (s === 0) { bands(false); if (dir < 0) { pts.forEach((p) => { p.g.setAttribute('opacity', 1); p.gl.setAttribute('opacity', 1); }); place(domains[0], (p) => p.key); } }
        if (s === 1) { bands(false); pts.forEach((p) => [p.g, p.gl].forEach((n) => { n.getAnimations().forEach((a) => a.finish()); n.setAttribute('opacity', 1); })); place(domains[1], (p) => p.t >= 2012); }
        if (s === 2) { place(domains[2], () => true); bands(true); }
      },
      table() {
        return '<table><tr><th>Date</th><th>Milestone</th></tr>' + data.milestones.map((m) => `<tr><td>${Math.floor(m[0])}</td><td>${m[1]}</td></tr>`).join('') + '</table>';
      },
    };
  };

  // ======================================================================
  // Let's build autocomplete: next-token probabilities with a temperature slider.
  // ======================================================================
  W.nexttoken = (node) => {
    const prompt = 'The test fails because the';
    const plan = [
      [[' mock', .38], [' database', .22], [' API', .17], [' config', .13], [' timeout', .10]],
      [[' returns', .46], [' is', .24], [' was', .14], [' never', .09], [" doesn't", .07]],
      [[' null', .52], [' undefined', .20], [' an', .12], [' the', .09], [' stale', .07]],
    ];
    let T = 1, pos = 0, out = [];
    const text = U.el('div', { class: 'mono', style: { fontSize: '44px', lineHeight: 1.3, minHeight: '64px' } });
    const bars = U.el('div', { style: { display: 'grid', gap: '14px', marginTop: '34px' } });
    const ctrl = U.el('div', { class: 'row', style: { marginTop: '30px', gap: '22px', fontSize: '22px', color: 'var(--ink-2)' } });
    const slider = U.el('input', { type: 'range', min: '0.05', max: '2', step: '0.05', value: '1', style: { width: '320px', accentColor: 'var(--cc)' } });
    const tval = U.el('b', {}, '1.00');
    const sample = U.el('button', { class: 'pill-btn' }, 'Sample 10×');
    const samples = U.el('div', { class: 'mono', style: { fontSize: '22px', color: 'var(--ink-2)' } });
    ctrl.append(U.el('span', {}, 'Temperature'), slider, tval, sample, samples);
    node.append(text, bars, ctrl, U.el('div', { class: 'illus' }, 'illustrative probabilities'));

    const dist = () => {
      const ps = plan[Math.min(pos, plan.length - 1)].map(([t, p]) => [t, Math.pow(p, 1 / T)]);
      const z = ps.reduce((a, [, p]) => a + p, 0);
      return ps.map(([t, p]) => [t, p / z]);
    };
    const drawText = () => {
      text.innerHTML = '';
      text.append(prompt);
      out.forEach((t, i) => text.append(i === out.length - 1
        ? U.el('span', { style: { color: 'var(--cc-550)', background: 'var(--cc-100)', borderRadius: '8px', padding: '0 .08em', animation: 'slide-in 500ms var(--ease) both' } }, t)
        : t));
      if (pos < plan.length) text.append(U.el('span', { style: { color: 'var(--muted)' } }, ' ▍'));
      else text.append('.');
    };
    const rows = plan[0].map(() => {
      const lab = U.el('div', { class: 'mono', style: { width: '200px', fontSize: '28px', textAlign: 'right' } });
      const bar = U.el('div', { style: { height: '24px', borderRadius: '0 4px 4px 0', background: 'var(--cc)', width: '0px', transition: 'width 450ms var(--ease)' } });
      const val = U.el('div', { style: { fontSize: '22px', color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums', width: '70px' } });
      const r = U.el('div', { style: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: '18px', alignItems: 'center' } }, lab,
        U.el('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } }, bar, val));
      bars.append(r);
      return { r, lab, bar, val };
    });
    const drawBars = () => {
      const done = pos >= plan.length;
      bars.style.opacity = done ? 0.25 : 1;
      dist().forEach(([t, p], i) => {
        rows[i].lab.textContent = JSON.stringify(t).slice(1, -1).replace(/^ /, '␣');
        rows[i].bar.style.width = p * 900 + 'px';
        rows[i].bar.style.background = i === 0 ? 'var(--cc)' : 'var(--cc-200)';
        rows[i].val.textContent = Math.round(p * 100) + '%';
      });
    };
    slider.addEventListener('input', () => { T = +slider.value; tval.textContent = T.toFixed(2); drawBars(); });
    sample.addEventListener('click', () => {
      const d = dist(), picks = [];
      for (let k = 0; k < 10; k++) { let r = Math.random(), i = 0; while (i < d.length - 1 && (r -= d[i][1]) > 0) i++; picks.push(d[i][0].trim()); }
      samples.textContent = picks.join(' · ');
    });
    const set = (s) => { pos = s; out = plan.slice(0, s).map((p) => p[0][0]); drawText(); drawBars(); samples.textContent = ''; };
    set(0);
    return { beats: ['it picks “mock”', 'it picks “returns”', 'it picks “null” (drag temperature, try Sample 10×)'], steps: 3, step(s) { set(s); } };
  };

  // ======================================================================
  // Tokenizer: the same sentence costs very different amounts in different languages.
  // Uses the open GPT tokenizers (Claude's is not public), entirely in the browser.
  // ======================================================================
  W.tokenizer = (node) => {
    const enc = { cl100k: window.GPTTokenizer_cl100k_base, o200k: window.GPTTokenizer_o200k_base };
    const presets = {
      English: "Hello, how are you? Let's fix the bug in the payment service.",
      Georgian: 'გამარჯობა, როგორ ხარ? მოდი, გადახდის სერვისში შეცდომა გავასწოროთ.',
      Japanese: 'こんにちは、お元気ですか？決済サービスのバグを直しましょう。',
      Python: 'def fix_bug(service):\n    return service.retry()',
    };
    let which = 'cl100k', cur = 'English';
    const input = U.el('textarea', { spellcheck: 'false', style: { width: '100%', height: '96px', font: '34px var(--sans)', border: '1px solid var(--hair)', borderRadius: '14px', padding: '14px 18px', resize: 'none', background: 'var(--card)', color: 'var(--ink)' } });
    const chips = U.el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px 4px', marginTop: '22px', minHeight: '150px', alignContent: 'flex-start', fontSize: '30px' } });
    const count = U.el('div', { style: { fontSize: '120px', fontWeight: 650, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' } }, '0');
    const sub = U.el('div', { style: { fontSize: '24px', color: 'var(--ink-2)', marginTop: '8px' } });
    const ratio = U.el('div', { style: { fontSize: '28px', fontWeight: 650, marginTop: '18px', minHeight: '36px' } });
    const presetRow = U.el('div', { class: 'row', style: { gap: '10px', marginTop: '18px' } });
    const encRow = U.el('div', { class: 'row', style: { gap: '10px', marginTop: '26px' } });
    const btns = {}, ebtn = {};
    Object.keys(presets).forEach((k) => { btns[k] = U.el('button', { class: 'pill-btn', onclick: () => usePreset(k) }, k); presetRow.append(btns[k]); });
    [['cl100k', 'GPT-4 tokenizer · 2023'], ['o200k', 'GPT-4o tokenizer · 2024']].forEach(([k, l]) => { ebtn[k] = U.el('button', { class: 'pill-btn', onclick: () => { which = k; draw(true); } }, l); encRow.append(ebtn[k]); });
    const left = U.el('div', { style: { flex: 1 } }, input, presetRow, chips);
    const right = U.el('div', { style: { width: '380px', flex: 'none', paddingLeft: '20px', borderLeft: '1px solid var(--hair)' } }, U.el('div', { class: 'small' }, 'tokens'), count, sub, ratio, encRow);
    node.append(U.el('div', { class: 'row top', style: { gap: '40px' } }, left, right));
    if (!enc.cl100k) { node.prepend(U.el('div', { class: 'small' }, 'Tokenizer files missing (vendor/).')); return {}; }

    // Group tokens into readable chips; one letter split over several byte-tokens shows a count.
    function segments(text) {
      const e = enc[which], toks = e.encode(text), segs = [];
      let buf = [], prevLen = 0;
      for (const t of toks) {
        buf.push(t);
        const s = e.decode(buf);
        if (!s.endsWith('�')) { segs.push({ text: s, n: buf.length }); buf = []; }
      }
      if (buf.length) segs.push({ text: '…', n: buf.length });
      return { segs, total: toks.length };
    }
    let shown = 0, cancel = () => {};
    const pal = ['#cde2fb', '#fbe0d4', '#d3f1e6', '#fdecc4'];
    function draw(animate) {
      const text = input.value;
      const { segs, total } = segments(text);
      chips.innerHTML = '';
      segs.forEach((g, i) => {
        const vis = g.text.replace(/ /g, '·').replace(/\n/g, '⏎');
        const c = U.el('span', { style: { background: pal[i % pal.length], borderRadius: '6px', padding: '2px 4px', whiteSpace: 'pre', position: 'relative', animation: animate ? `slide-in 300ms ${Math.min(i * 12, 600)}ms both` : 'none' } }, vis);
        if (g.n > 1) c.append(U.el('sup', { style: { fontSize: '15px', color: 'var(--ink-2)', marginLeft: '2px', fontWeight: 700 } }, '×' + g.n));
        chips.append(c);
      });
      const from = shown; shown = total;
      cancel(); cancel = U.tween(animate ? 700 : 0, (k) => (count.textContent = Math.round(U.lerp(from, total, k))));
      sub.textContent = `${[...text].length} characters`;
      const en = enc[which].encode(presets.English).length;
      ratio.textContent = (cur === 'Georgian' || cur === 'Japanese') && presets[cur] === text ? `${(total / en).toFixed(1)}× the English sentence` : '';
      Object.entries(btns).forEach(([k, b]) => b.classList.toggle('on', k === cur));
      Object.entries(ebtn).forEach(([k, b]) => b.classList.toggle('on', k === which));
    }
    function usePreset(k) { cur = k; input.value = presets[k]; draw(true); }
    input.addEventListener('input', () => { cur = null; draw(false); });
    const plan = [['English', 'cl100k'], ['Georgian', 'cl100k'], ['Georgian', 'o200k'], ['Python', 'o200k']];
    return {
      beats: ['Georgian, 2023 tokenizer: about 7× the tokens', 'Georgian, 2024 tokenizer: about 1.6×', 'a Python snippet'], steps: 3,
      enter() { usePreset('English'); },
      step(s) { const [p, e] = plan[s]; which = e; usePreset(p); },
      key(e) { return document.activeElement === input; },
    };
  };

  // ======================================================================
  // Everything is context: a 200k window as a waffle of 1k-token cells, filling up.
  // ======================================================================
  W.context = (node) => {
    // Illustrative sizes in thousands of tokens; the audience measures theirs with /context.
    const parts = [
      ['System prompt', 4, '#2a78d6'], ['Built-in tools', 12, '#eb6834'], ['MCP tools', 18, '#1baf7a'],
      ['CLAUDE.md', 3, '#eda100'], ['Files read', 46, '#e87ba4'], ['Conversation', 38, '#008300'], ['“fix the bug”', 1, '#6250d6'],
    ];
    const cols = 25, rows = 8, cell = 34, gap = 4;
    const grid = U.el('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: gap + 'px' } });
    const cells = [];
    for (let i = 0; i < cols * rows; i++) { const c = U.el('div', { style: { width: cell + 'px', height: cell + 'px', borderRadius: '6px', background: '#efeee9', transition: 'background 300ms' } }); cells.push(c); grid.append(c); }
    const legend = U.el('div', { style: { display: 'grid', gap: '12px', alignContent: 'start' } });
    const items = parts.map(([l, n, c]) => {
      const it = U.el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', opacity: 0.25, transition: 'opacity 400ms' } },
        U.el('i', { style: { width: '18px', height: '18px', borderRadius: '5px', background: c, display: 'block' } }), U.el('span', { style: { flex: 1 } }, l),
        U.el('span', { style: { color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' } }, n + 'k'));
      legend.append(it); return it;
    });
    const free = U.el('div', { style: { fontSize: '22px', color: 'var(--muted)', marginTop: '10px' } });
    legend.append(free);
    node.append(U.el('div', { class: 'row top', style: { gap: '48px' } }, grid, legend), U.el('div', { class: 'illus' }, 'illustrative sizes'));
    function draw(s) {
      let k = 0;
      parts.forEach(([, n, c], i) => {
        for (let j = 0; j < n; j++, k++) {
          const on = i < s;
          cells[k].style.background = on ? c : '#efeee9';
          cells[k].style.transitionDelay = on ? Math.min(j * 12, 400) + 'ms' : '0ms';
          if (i === 6 && on) cells[k].style.boxShadow = '0 0 0 3px var(--surface), 0 0 0 6px #6250d6';
          else cells[k].style.boxShadow = 'none';
        }
        items[i].style.opacity = i < s ? 1 : 0.25;
      });
      const used = parts.slice(0, s).reduce((a, p) => a + p[1], 0);
      free.textContent = `${used}k used · ${200 - used}k free of a 200k window`;
    }
    draw(0);
    return { beats: ['system prompt', 'built-in tools', 'MCP tools', 'CLAUDE.md', 'files read', 'conversation', '“fix the bug”: one cell'], steps: parts.length, step(s) { draw(s); } };
  };

  // ======================================================================
  // Attention: each token looks at every earlier token. n tokens -> n(n+1)/2 pairs.
  // ======================================================================
  W.attention = (node) => {
    const toks = ['The', 'test', 'fails', 'because', 'the', 'mock', 'returns', 'null'];
    const wts = [0.05, 0.5, 0.25, 0.08, 0.05, 1, 0.8, 0.3]; // illustrative weights from "null"
    const n = toks.length, Wd = 1400, H = 300, gapX = Wd / n;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H, style: 'overflow:visible' });
    const gArc = S('g'), gTok = S('g');
    svg.append(gArc, gTok);
    const boxes = toks.map((t, i) => {
      const cx = gapX * (i + 0.5);
      const g = S('g');
      const r = S('rect', { x: cx - 78, y: 200, width: 156, height: 60, rx: 10, fill: 'var(--card)', stroke: 'var(--hair)' });
      const tx = S('text', { x: cx, y: 239, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 600, fill: 'var(--ink)', text: t });
      g.append(r, tx); gTok.append(g);
      return { cx, r };
    });
    const math = U.el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px', marginTop: '26px' } });
    const rowsM = [[8, 'this sentence'], [1000, 'a source file'], [1000000, 'a 1M window']];
    rowsM.forEach(([k, l]) => math.append(U.el('div', { class: 'stat', 'data-step': '' },
      U.el('div', { class: 'v', style: { fontSize: '64px' } }, k >= 1e6 ? '≈ 500 billion' : U.fmt((k * (k + 1)) / 2)), U.el('div', { class: 'l' }, `pairs in ${l}`))));
    const statEls = [...math.children];
    statEls.forEach((e) => e.removeAttribute('data-step'));
    node.append(svg, math);
    const arc = (i, j, w, delay) => {
      const x1 = boxes[i].cx, x2 = boxes[j].cx, h = Math.min(170, 26 + Math.abs(x1 - x2) * 0.14);
      const p = S('path', { d: `M${x1},196 C${x1},${196 - h} ${x2},${196 - h} ${x2},196`, fill: 'none', stroke: 'var(--cc)', 'stroke-width': 1.5 + w * 5, 'stroke-linecap': 'round', opacity: 0.25 + w * 0.75 });
      const len = 2000;
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      gArc.append(p);
      p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 700, delay, fill: 'forwards', easing: 'cubic-bezier(.2,.7,.2,1)' });
    };
    function draw(s) {
      gArc.innerHTML = '';
      boxes.forEach((b) => { b.r.setAttribute('stroke', 'var(--hair)'); b.r.setAttribute('stroke-width', 1); });
      if (s >= 1) {
        const q = n - 1;
        boxes[q].r.setAttribute('stroke', 'var(--cc)'); boxes[q].r.setAttribute('stroke-width', 3);
        for (let j = 0; j < q; j++) arc(q, j, wts[j], j * 60);
      }
      if (s >= 2) for (let i = 1; i < n - 1; i++) for (let j = 0; j < i; j++) arc(i, j, 0.12, 500 + i * 120);
      statEls.forEach((e, i) => { e.style.transition = 'opacity 500ms, transform 500ms'; e.style.opacity = s >= 3 + i ? 1 : 0; e.style.transform = s >= 3 + i ? 'none' : 'translateY(14px)'; });
    }
    draw(0);
    return { beats: ['“null” attends to every earlier token', 'every token does the same', '36 pairs for this sentence', '500,500 pairs for a source file', '≈ 500 billion pairs for a 1M window'], steps: 5, step(s) { draw(s); } };
  };

  // ======================================================================
  // The context race, on one linear scale, so 4k looks as small as it felt.
  // ======================================================================
  W.race = (node) => {
    const rows = [
      [4096, 'GPT-3.5 (ChatGPT)', 'Nov 2022', '≈ 400 lines of code'],
      [32768, 'GPT-4-32k', 'Mar 2023', ''],
      [100000, 'Claude', 'May 2023', ''],
      [200000, 'Claude 2.1', 'Nov 2023', ''],
      [1000000, 'Gemini 1.5 Pro', 'Feb 2024', '≈ 100,000 lines of code'],
    ];
    const maxW = 800;
    const grid = U.el('div', { style: { display: 'grid', gap: '22px' } });
    const els = rows.map(([v, m, d, note]) => {
      const bar = U.el('div', { style: { height: '24px', borderRadius: '0 4px 4px 0', background: 'var(--cc)', width: '0px', transition: 'width 1100ms var(--ease)', minWidth: '0' } });
      const val = U.el('div', { style: { fontSize: '26px', fontWeight: 650, whiteSpace: 'nowrap' } }, v >= 1e6 ? '1M' : v === 32768 ? '32k' : v === 4096 ? '4k' : Math.round(v / 1000) + 'k',
        note ? U.el('span', { style: { fontWeight: 400, color: 'var(--muted)', fontSize: '20px', marginLeft: '12px' } }, note) : '');
      const r = U.el('div', { style: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'center', opacity: 0, transition: 'opacity 400ms' } },
        U.el('div', { style: { textAlign: 'right' } }, U.el('div', { style: { fontSize: '24px', fontWeight: 600 } }, m), U.el('div', { style: { fontSize: '18px', color: 'var(--muted)' } }, d)),
        U.el('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } }, bar, val));
      grid.append(r); return { r, bar, v };
    });
    node.append(grid);
    return { beats: ['4k · GPT-3.5', '32k · GPT-4-32k', '100k · Claude', '200k · Claude 2.1', '1M · Gemini 1.5 Pro'], steps: rows.length, step(s) { els.forEach((e, i) => { e.r.style.opacity = i < s ? 1 : 0; e.bar.style.width = i < s ? Math.max(2, (e.v / 1e6) * maxW) + 'px' : '0px'; }); } };
  };

  // ======================================================================
  // Invent the harness. 11 beats over 7 steps; 💬 steps reveal the question first.
  // data-from / data-to let the build-up pause for a breather and resume on a later slide.
  // ======================================================================
  const HARNESS = [
    { k: 1, q: true, problem: 'Its functions run on a server. They can’t reach our repo.', inv: 'Run the calls on our machine instead: read files, edit them, run commands. That runner is the harness.', when: 'Local agents: AutoGPT, Aider · 2023', note: 'Same function calling as the weather. Only who runs the call has moved.' },
    { k: 2, q: true, problem: 'One answer can’t fix a bug. It has to look, change, and check.', inv: 'A loop: call the model, run what it asks for, add the result, call again until it says done.', when: 'ReAct 2022 → IDE agents, late 2024', note: 'This loop is what “agent” means.' },
    { k: 3, problem: 'Every call starts from zero. It forgets our conventions.', inv: 'A file that is added to every request: how we build, test and name things.', when: 'CLAUDE.md Feb 2025 · AGENTS.md Aug 2025' },
    { k: 4, problem: 'The input grows every loop. It gets slow, costly and full.', inv: 'Cache the unchanged beginning. Summarize old turns. Send big searches to a helper with its own context.', when: 'Prompt caching Aug 2024 · subagents Jul 2025' },
    { k: 5, q: true, problem: 'It could run rm -rf.', inv: 'A gate: risky actions need a yes, some are always blocked.', when: 'Permissions → sandbox Oct 2025 → classifiers 2026' },
    { k: 6, q: true, problem: 'We can’t build every system’s API into the agent.', inv: 'Each system exposes its own tools through one standard plug, MCP. The agent just connects.', when: 'MCP · Nov 2024', note: 'Next slide: how it works.' },
    { k: 7, problem: 'We can’t put every instruction for every task in CLAUDE.md.', inv: 'Skills: a one-line description is always loaded; the full instructions only when a task needs them. More in era 4.', when: 'Skills · Oct 2025', note: 'Loading only what the task needs is called progressive disclosure.' },
  ];
  const BEATS = []; // [stepIndex, revealInvention]
  HARNESS.forEach((h, i) => { if (h.q) BEATS.push([i, false]); BEATS.push([i, true]); });

  W.harness = (node) => {
    const from = +(node.dataset.from || 0), to = +(node.dataset.to || BEATS.length);
    const card = U.el('div', { style: { width: '500px', flex: 'none', display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '10px' } });
    const Wd = 820, H = 560;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H, style: 'overflow:visible' });
    node.append(U.el('div', { class: 'row top', style: { gap: '40px' } }, card, svg));
    const defs = S('defs');
    defs.append(S('marker', { id: 'ah', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, S('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--ink-2)' })));
    svg.append(defs);
    const parts = {};
    const box = (x, y, w, h, title, sub, opt = {}) => {
      const g = S('g', { opacity: 0 });
      g.append(S('rect', { x, y, width: w, height: h, rx: 14, fill: opt.fill || 'var(--card)', stroke: opt.stroke || 'var(--axis)', 'stroke-width': opt.sw || 1.5, 'stroke-dasharray': opt.dash || 'none' }));
      g.append(S('text', { x: x + w / 2, y: y + (sub ? h / 2 - 2 : h / 2 + 8), 'text-anchor': 'middle', 'font-size': opt.fs || 22, 'font-weight': 650, fill: opt.ink || 'var(--ink)', text: title }));
      if (sub) g.append(S('text', { x: x + w / 2, y: y + h / 2 + 24, 'text-anchor': 'middle', 'font-size': 17, fill: 'var(--muted)', text: sub }));
      return g;
    };
    const line = (d, label, lx, ly, dash) => {
      const g = S('g', { opacity: 0 });
      g.append(S('path', { d, fill: 'none', stroke: 'var(--ink-2)', 'stroke-width': 2, 'marker-end': 'url(#ah)', 'stroke-dasharray': dash || 'none' }));
      if (label) g.append(S('text', { x: lx, y: ly, 'text-anchor': 'middle', 'font-size': 18, fill: 'var(--ink-2)', text: label }));
      return g;
    };
    // frame
    parts.frame = S('g', { opacity: 0 });
    parts.frame.append(S('rect', { x: 10, y: 10, width: Wd - 20, height: H - 20, rx: 26, fill: 'none', stroke: 'var(--cc)', 'stroke-width': 2, 'stroke-dasharray': '2 0' }),
      S('text', { x: 34, y: 42, 'font-size': 17, 'font-weight': 700, fill: 'var(--cc-550)', 'letter-spacing': '0.08em', text: 'THE HARNESS' }));
    parts.model = box(250, 220, 200, 96, 'Model', 'stateless');
    parts.model.setAttribute('opacity', 1);
    parts.exec = box(560, 220, 200, 96, 'Run tools', 'on our machine');
    parts.call = line('M450,250 L556,250', 'tool call', 488, 240);
    parts.ret = line('M560,290 L454,290', 'result', 507, 312);
    // loop
    parts.loop = S('g', { opacity: 0 });
    parts.loop.append(S('path', { d: 'M350,214 C350,118 660,118 660,214', fill: 'none', stroke: 'var(--cc)', 'stroke-width': 2.5, 'marker-end': 'url(#ah)' }),
      S('path', { d: 'M660,322 C660,420 350,420 350,326', fill: 'none', stroke: 'var(--cc)', 'stroke-width': 2.5, 'marker-end': 'url(#ah)' }),
      S('text', { x: 505, y: 128, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 650, fill: 'var(--cc-550)', text: 'repeat until done' }));
    const pulse = S('circle', { r: 7, fill: 'var(--cc)', cx: 350, cy: 214, opacity: U.reduced ? 0 : 1 });
    parts.loop.append(pulse);
    // memory file
    parts.mem = box(40, 70, 170, 70, 'CLAUDE.md', 'always injected', { fill: '#fdf6e3', stroke: '#eda100' });
    parts.memArrow = line('M210,120 C260,140 290,170 300,214', '', 0, 0);
    // context management
    parts.ctx = S('g', { opacity: 0 });
    [['cache', 0], ['compact', 1], ['subagent', 2]].forEach(([t, i]) => {
      parts.ctx.append(S('rect', { x: 40 + i * 118, y: 452, width: 108, height: 52, rx: 10, fill: 'var(--cc-100)', stroke: 'var(--cc)', 'stroke-width': 1 }),
        S('text', { x: 94 + i * 118, y: 485, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 600, fill: 'var(--ink)', text: t }));
    });
    parts.ctx.append(S('path', { d: 'M220,452 C240,400 270,350 290,320', fill: 'none', stroke: 'var(--ink-2)', 'stroke-width': 2, 'marker-end': 'url(#ah)' }));
    // gate
    parts.gate = S('g', { opacity: 0 });
    parts.gate.append(S('rect', { x: 526, y: 228, width: 22, height: 44, rx: 6, fill: 'var(--critical)' }),
      S('text', { x: 537, y: 330, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: 'var(--critical)', text: 'gate' }));
    const bad = S('g', { opacity: 0 });
    bad.append(S('rect', { x: 0, y: -16, width: 92, height: 30, rx: 8, fill: 'var(--ink)' }), S('text', { x: 46, y: 5, 'text-anchor': 'middle', 'font-size': 16, 'font-family': 'var(--mono)', fill: '#fff', text: 'rm -rf /' }));
    parts.gate.append(bad);
    // skills: loaded on demand, next to the always-loaded file
    parts.skills = box(250, 34, 170, 64, 'skills', 'loaded when needed', { fs: 20, fill: '#fdf6e3', stroke: '#eda100', dash: '6 5' });
    // MCP
    parts.mcp = S('g', { opacity: 0 });
    ['Jira', 'DB', 'Browser'].forEach((t, i) => {
      const yy = 32 + i * 46;
      parts.mcp.append(S('rect', { x: 640, y: yy, width: 130, height: 38, rx: 19, fill: 'var(--card)', stroke: 'var(--axis)' }),
        S('text', { x: 705, y: yy + 26, 'text-anchor': 'middle', 'font-size': 18, fill: 'var(--ink)', text: t }));
    });
    parts.mcp.append(S('path', { d: 'M705,216 L705,174', stroke: 'var(--ink-2)', 'stroke-width': 2, 'marker-end': 'url(#ah)', fill: 'none' }),
      S('text', { x: 716, y: 202, 'font-size': 15, 'font-weight': 700, fill: 'var(--muted)', text: 'MCP' }));

    const order = [['frame', 'exec', 'call', 'ret'], ['loop'], ['mem', 'memArrow'], ['ctx'], ['gate'], ['mcp'], ['skills']];
    Object.entries(parts).forEach(([k, g]) => k !== 'model' && svg.append(g));
    svg.append(parts.model);

    let tm = U.timers(), loopAnim = null;
    function setVisible(stage) {
      order.forEach((names, i) => names.forEach((nm) => {
        const g = parts[nm], on = i < stage;
        if (+g.getAttribute('opacity') !== (on ? 1 : 0)) {
          g.animate([{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], { duration: 500, fill: 'forwards' });
          g.setAttribute('opacity', on ? 1 : 0);
        }
      }));
      // the loop pulse runs once the loop exists
      if (stage >= 2 && !loopAnim && !U.reduced) {
        const path = S('path', { d: 'M350,214 C350,118 660,118 660,214 L660,322 C660,420 350,420 350,326 Z', fill: 'none', stroke: 'none' });
        const t0 = performance.now();
        svg.append(path);
        const total = path.getTotalLength();
        const tick2 = (t) => { const p = ((t - t0) / 3600) % 1; const pt = path.getPointAtLength(p * total); pulse.setAttribute('cx', pt.x); pulse.setAttribute('cy', pt.y); loopAnim = requestAnimationFrame(tick2); };
        loopAnim = requestAnimationFrame(tick2);
      }
      if (stage === 5) { // the bad command walks to the gate and stops
        bad.setAttribute('opacity', 1);
        bad.animate([{ transform: 'translate(300px,196px)' }, { transform: 'translate(432px,196px)', offset: 0.7 }, { transform: 'translate(426px,196px)' }], { duration: 1600, fill: 'forwards', easing: 'ease-out' });
      } else bad.setAttribute('opacity', 0);
    }
    function drawCard(beat) {
      card.innerHTML = '';
      if (beat < 0) { card.append(U.el('div', { class: 'lead' }, 'A model that only writes text. Make it fix a bug in our repo.')); return; }
      const [i, inv] = BEATS[beat], h = HARNESS[i];
      card.append(U.el('div', { class: 'row', style: { gap: '14px' } },
        U.el('span', { class: 'tag' }, `Step ${h.k} of ${HARNESS.length}`), h.q ? U.el('span', { class: 'tag', style: { color: 'var(--cc-550)', borderColor: 'var(--cc-200)' } }, '💬 chat') : ''));
      card.append(U.el('div', { style: { fontSize: '17px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--muted)' } }, 'Problem'),
        U.el('div', { style: { fontSize: '40px', fontWeight: 650, lineHeight: 1.15, letterSpacing: '-0.015em' } }, h.problem));
      if (!inv) { card.append(U.el('div', { style: { fontSize: '34px', color: 'var(--cc-550)', fontWeight: 650, marginTop: '10px' } }, 'What would you build?')); return; }
      card.append(U.el('div', { style: { fontSize: '17px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--muted)', marginTop: '8px' } }, 'Invention'),
        U.el('div', { style: { fontSize: '30px', lineHeight: 1.3, animation: 'slide-in 500ms var(--ease) both' } }, h.inv),
        U.el('div', { style: { marginTop: '6px', animation: 'slide-in 500ms 350ms var(--ease) both' } }, U.el('span', { class: 'chip', style: { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)', whiteSpace: 'normal', lineHeight: 1.3, borderRadius: '16px', maxWidth: '480px' } }, 'Shipped: ' + h.when)));
      if (h.note) card.append(U.el('div', { class: 'small', style: { animation: 'slide-in 500ms 500ms both' } }, h.note));
    }
    function stageFor(beat) { if (beat < 0) return 0; const [i, inv] = BEATS[beat]; return inv ? i + 1 : i; }
    function show(local) {
      const beat = from + local - 1; // local 0 = the state before this slide's first beat
      drawCard(beat);
      setVisible(stageFor(beat));
    }
    return {
      beats: BEATS.slice(from, to).map(([i, inv]) => `step ${HARNESS[i].k}: ` + (inv ? `${HARNESS[i].q ? '' : HARNESS[i].problem + ' → '}${HARNESS[i].inv} (${HARNESS[i].when})` : `${HARNESS[i].problem} Ask the chat what they would build.`)), steps: to - from,
      step(s) { show(s); },
      leave() { tm.clear(); if (loopAnim) cancelAnimationFrame(loopAnim); loopAnim = null; },
    };
  };

  // ======================================================================
  // The real trace: request structure, and measured cache reads vs writes.
  // ======================================================================
  W.trace = (node) => {
    const lines = [
      ['{', 0], ['  "model": "claude-…",', 0],
      ['  "system": [ … about 3k tokens … ],', 1, 'stable'], ['  "tools": [ Read, Edit, Bash, Grep, … ],', 1, 'stable'],
      ['  "messages": [', 1],
      ['    { user: "fix the failing test" },', 1, 'you'],
      ['    { assistant: tool_use Bash "npm test" },', 2, 'loop 1'], ['    { user: tool_result "1 failed: mock returns null" },', 2],
      ['    { assistant: tool_use Edit "src/payment.ts" },', 3, 'loop 2'], ['    { user: tool_result "ok" },', 3],
      ['    { assistant: tool_use Bash "npm test" },', 4, 'loop 3'], ['    { user: tool_result "48 passed" },', 4],
      ['    { assistant: "Fixed: the mock returned null." }', 5, 'done'], ['  ]', 1], ['}', 0],
    ];
    const pre = U.el('div', { class: 'term', style: { fontSize: '19px', lineHeight: 1.5, width: '820px', flex: 'none' } });
    const ls = lines.map(([t, st, tag]) => {
      const l = U.el('div', { style: { transition: 'opacity 400ms, background 400ms', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' } },
        U.el('span', {}, t), tag ? U.el('span', { style: { color: tag === 'stable' ? '#9ec5f4' : '#a3a29b', fontSize: '16px' } }, tag) : '');
      pre.append(l); return [l, st];
    });
    // Measured on 2 Nov 2026 with Claude Code 2.1.316: three turns of one session.
    const usage = [[1, 137843, 0], [2, 7841, 154364], [3, 146, 162142]];
    const panel = U.el('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', opacity: 0, transition: 'opacity 600ms' } });
    panel.append(U.el('h3', {}, 'Input tokens per request, measured'),
      U.el('div', { class: 'legend' }, U.el('span', { class: 'k' }, U.el('i', { style: { background: 'var(--cc)' } }), 'read from cache (0.1×)'),
        U.el('span', { class: 'k' }, U.el('i', { style: { background: 'var(--human)' } }), 'written to cache (1.25×)')));
    const mx = 170000;
    const bars = usage.map(([n, w, r]) => {
      const rb = U.el('div', { style: { height: '28px', background: 'var(--cc)', borderRadius: '4px 0 0 4px', width: '0%', transition: 'width 1000ms var(--ease)' } });
      const wb = U.el('div', { style: { height: '28px', background: 'var(--human)', borderRadius: '0 4px 4px 0', width: '0%', transition: 'width 1000ms var(--ease)', marginLeft: r ? '2px' : '0' } });
      const pct = r ? ((r / (r + w)) * 100).toFixed(1) + '% cached' : 'first request: all written';
      panel.append(U.el('div', {}, U.el('div', { style: { fontSize: '20px', color: 'var(--ink-2)', marginBottom: '6px' } }, `Turn ${n} · `, U.el('b', {}, pct)),
        U.el('div', { style: { display: 'flex', width: '100%' } }, rb, wb)));
      return { rb, wb, r, w };
    });
    panel.append(U.el('div', { class: 'small' }, 'Claude Code 2.1.316, 2 Nov 2026. This machine loads many tools and rules, so its prefix is large; yours will be smaller. The ratio is the point.'));
    node.append(U.el('div', { class: 'row top', style: { gap: '44px' } }, pre, panel));
    function draw(s) {
      ls.forEach(([l, st]) => { l.style.opacity = st <= Math.min(s + 1, 5) ? 1 : 0.08; });
      ls.forEach(([l, st]) => { l.style.background = s >= 5 && st === 1 ? 'rgba(42,120,214,.22)' : 'transparent'; });
      panel.style.opacity = s >= 5 ? 1 : 0;
      bars.forEach((b) => { b.rb.style.width = s >= 5 ? (b.r / mx) * 100 + '%' : '0%'; b.wb.style.width = s >= 5 ? Math.max(0.6, (b.w / mx) * 100) + '%' : '0%'; });
    }
    draw(0);
    return {
      beats: ['the user message', 'loop 1: run the tests', 'loop 2: edit the file', 'loop 3: tests pass', 'measured cache reads per turn'], steps: 5, step(s) { draw(s); },
      table() { return '<table><tr><th>Turn</th><th>Cache read</th><th>Cache write</th></tr>' + usage.map(([n, w, r]) => `<tr><td>${n}</td><td>${U.fmt(r)}</td><td>${U.fmt(w)}</td></tr>`).join('') + '</table>'; },
    };
  };

  // ======================================================================
  // Prompt caching: the prefix rule, turn by turn, with the bill for each request.
  // ======================================================================
  W.cache = (node) => {
    const base = [['System', 10], ['Tools', 14], ['CLAUDE.md', 6]];
    const msg = (i) => [[`turn ${i}`, 6]];
    const t3 = [...base, ...msg(1), ...msg(2), ...msg(3)];
    const scen = [
      { label: 'Turn 1', blocks: [...base, ...msg(1)], cached: 0 },
      { label: 'Turn 2', blocks: [...base, ...msg(1), ...msg(2)], cached: 36 },
      { label: 'Turn 3', blocks: t3, cached: 42 },
      { label: 'Turn 4 after /model', blocks: [...t3, ...msg(4)], cached: 0, note: '/model: each model has its own cache, so everything is written again.' },
      { label: 'Turn 4 after editing CLAUDE.md', blocks: [...t3, ['edit note', 6], ...msg(4)], cached: 48, note: 'Edit CLAUDE.md: the start never changes; the edit is appended, so the cache holds.' },
    ];
    const unit = 16.5;
    const wrap = U.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '22px' } });
    const legend = U.el('div', { class: 'legend' },
      U.el('span', { class: 'k' }, U.el('i', { style: { background: 'var(--cc)' } }), 'read from cache · 0.1× the price'),
      U.el('span', { class: 'k' }, U.el('i', { style: { background: 'var(--human)' } }), 'written to cache · 1.25×'),
      U.el('span', { class: 'k', style: { marginLeft: 'auto' } }, 'cost vs. no caching'));
    const note = U.el('div', { style: { fontSize: '26px', fontWeight: 600, minHeight: '76px', marginTop: '22px', display: 'grid', gap: '6px' } });
    node.append(legend, wrap, note);
    function row(sc, animate) {
      let used = 0;
      const blocks = sc.blocks.map(([l, w], j) => {
        const isRead = used + w <= sc.cached; used += w;
        return U.el('div', { title: l, style: {
          width: w * unit + 'px', height: '52px', borderRadius: '5px', display: 'grid', placeItems: 'center', fontSize: '16px', fontWeight: 650, overflow: 'hidden', whiteSpace: 'nowrap',
          background: isRead ? 'var(--cc)' : 'var(--human)', color: '#fff',
          animation: animate ? `slide-in 360ms ${j * 50}ms var(--ease) both` : 'none' } }, w * unit >= 76 ? l : '');
      });
      const total = sc.blocks.reduce((a, b) => a + b[1], 0);
      const cost = sc.cached * 0.1 + (total - sc.cached) * 1.25;
      return U.el('div', { style: { display: 'grid', gridTemplateColumns: '230px 1fr 90px', alignItems: 'center', gap: '16px' } },
        U.el('div', { style: { fontSize: '20px', fontWeight: 600, lineHeight: 1.2 } }, sc.label),
        U.el('div', { style: { display: 'flex', gap: '2px' } }, blocks),
        U.el('div', { style: { fontSize: '24px', fontWeight: 650, fontVariantNumeric: 'tabular-nums', textAlign: 'right' } }, Math.round((cost / total) * 100) + '%'));
    }
    function draw(s) {
      wrap.innerHTML = '';
      const list = scen.slice(0, Math.max(1, s));
      list.forEach((sc, i) => wrap.append(row(sc, i === list.length - 1)));
      note.innerHTML = '';
      if (s >= 2 && s < 4) note.append(U.el('div', {}, 'Same beginning, byte for byte → read from cache.'));
      list.filter((sc) => sc.note).forEach((sc) => note.append(U.el('div', {}, sc.note)));
    }
    draw(1);
    return { beats: ['turn 1: everything is written', 'turn 2: the prefix is read from cache', 'turn 3', 'turn 4 after /model: all written again (125%)', 'turn 4 after editing CLAUDE.md: the cache holds (33%)'], steps: 5, step(s) { draw(Math.max(1, s)); } };
  };

  // ======================================================================
  // Explore → plan → implement → verify, with a pulse going round.
  // ======================================================================
  W.loop4 = (node) => {
    const names = ['Explore', 'Plan', 'Implement', 'Verify'];
    const R = 190, cx = 320, cy = 240;
    const svg = S('svg', { viewBox: '0 0 640 480', width: 640, height: 480 });
    svg.append(S('circle', { cx, cy, r: R, fill: 'none', stroke: 'var(--hair)', 'stroke-width': 3 }));
    const arc = S('circle', { cx, cy, r: R, fill: 'none', stroke: 'var(--cc)', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': `${R * 0.5} ${R * 7}`, transform: `rotate(-90 ${cx} ${cy})` });
    svg.append(arc);
    const nodes = names.map((n, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 2, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      const g = S('g');
      const c = S('rect', { x: x - 92, y: y - 30, width: 184, height: 60, rx: 30, fill: 'var(--card)', stroke: 'var(--axis)', 'stroke-width': 2 });
      g.append(c, S('text', { x, y: y + 9, 'text-anchor': 'middle', 'font-size': 25, 'font-weight': 650, fill: 'var(--ink)', text: n }));
      svg.append(g); return c;
    });
    node.append(svg);
    let raf, t0;
    const tick = (t) => {
      t0 ??= t;
      const p = ((t - t0) / 6000) % 1;
      arc.setAttribute('transform', `rotate(${-90 - 22 + p * 360} ${cx} ${cy})`);
      nodes.forEach((c, i) => c.setAttribute('stroke', Math.floor(((p + 0.03) % 1) * 4) === i ? 'var(--cc)' : 'var(--axis)'));
      raf = requestAnimationFrame(tick);
    };
    return { enter() { if (!U.reduced) raf = requestAnimationFrame(tick); }, leave() { cancelAnimationFrame(raf); t0 = null; } };
  };
})();

(function () {
  const W = window.Widgets, U = window.U;

  // ======================================================================
  // One bug, three eras: the same failing test, fixed the 2022 way, the 2023 way and the 2025 way.
  // ======================================================================
  W.threeeras = (node) => {
    const cols = [
      { era: 'Era 1', how: 'Chat, no context', prompt: 'My test fails: TypeError: cannot read “amount” of null. How do I fix it?',
        answer: 'Add a null check before you read amount.', verdict: ['bad', 'Plausible. Wrong place: it hides the bug.'] },
      { era: 'Era 2', how: 'Chat, with the files', prompt: '@payment.ts @payment.test.ts Same error. Why?',
        answer: 'The mock on line 42 of the test returns null. Return a Payment instead.', verdict: ['mid', 'Right cause. Nobody ran it.'] },
      { era: 'Era 4', how: 'Agent, with a test', prompt: 'Make the payment tests pass.',
        term: ['⏺ Bash(npm test)', '  ⎿ 1 failed: cannot read “amount” of null', '⏺ Edit(payment.test.ts:42)', '⏺ Bash(npm test)', '  ⎿ 48 passed'],
        verdict: ['good', 'Fixed, and proven by the test.'] },
    ];
    const grid = U.el('div', { class: 'cols-3', style: { gap: '26px', marginTop: '6px' } });
    const parts = cols.map((c) => {
      const card = U.el('div', { class: 'card', style: { display: 'flex', flexDirection: 'column', gap: '14px', opacity: 0.25, transition: 'opacity 500ms', minHeight: '470px' } });
      card.append(U.el('div', { class: 'row', style: { gap: '12px' } }, U.el('span', { class: 'tag' }, c.era), U.el('b', { style: { fontSize: '24px' } }, c.how)));
      const you = U.el('div', { style: { alignSelf: 'flex-end', background: 'var(--ink)', color: '#fff', borderRadius: '18px 18px 6px 18px', padding: '12px 16px', fontSize: '21px', lineHeight: 1.3 } }, c.prompt);
      card.append(you);
      let reply;
      if (c.term) {
        reply = U.el('div', { class: 'term', style: { fontSize: '18px', padding: '16px 18px' } });
        c.term.forEach((t) => reply.append(U.el('div', { class: 'tl', style: { opacity: 0, transition: 'opacity 300ms', color: t.includes('passed') ? '#6fd3a6' : t.includes('failed') ? '#f08f8e' : 'inherit' } }, t)));
      } else reply = U.el('div', { style: { background: '#f0efec', borderRadius: '18px 18px 18px 6px', padding: '12px 16px', fontSize: '21px', lineHeight: 1.3, opacity: 0, transition: 'opacity 400ms' } }, c.answer);
      card.append(reply);
      const [kind, text] = c.verdict;
      const icon = { bad: ['ico bad', '✕'], mid: ['ico', '?'], good: ['ico good', '✓'] }[kind];
      const v = U.el('div', { style: { marginTop: 'auto', display: 'flex', gap: '12px', alignItems: 'center', fontSize: '23px', fontWeight: 650, opacity: 0, transition: 'opacity 400ms' } },
        U.el('span', { class: icon[0], style: kind === 'mid' ? { background: 'var(--warning)', color: 'var(--ink)' } : {} }, icon[1]), text);
      card.append(v);
      grid.append(card);
      return { card, reply, v, term: !!c.term };
    });
    const lesson = U.el('p', { class: 'lead', style: { marginTop: '22px', color: 'var(--ink)', opacity: 0, transition: 'opacity 500ms' } }, 'Same kind of model. The jump came from context, then from a check it could run.');
    node.append(grid, lesson);
    let tm = U.timers();
    function show(s) {
      tm.clear();
      parts.forEach((p, i) => {
        const on = s > i;
        p.card.style.opacity = on ? 1 : 0.25;
        if (p.term) {
          const ls = [...p.reply.querySelectorAll('.tl')];
          ls.forEach((l, k) => { l.style.opacity = 0; if (on) tm.after(300 + k * 450, () => (l.style.opacity = 1)); });
          p.v.style.opacity = 0; if (on) tm.after(300 + ls.length * 450, () => (p.v.style.opacity = 1));
        } else {
          p.reply.style.opacity = on ? 1 : 0; p.v.style.opacity = 0; if (on) tm.after(700, () => (p.v.style.opacity = 1));
        }
      });
      lesson.style.opacity = s >= 4 ? 1 : 0;
    }
    return { beats: ['era 1: chat, no context: a plausible null check in the wrong place', 'era 2: chat with the files: the right cause, unverified', 'era 4: the agent runs the test, edits, re-runs: 48 passed', 'the lesson line'], steps: 4, step(s) { show(s); }, leave() { tm.clear(); } };
  };
})();

// ======================================================================
// Session 1 theory widgets, added in the restructure.
// ======================================================================
(function () {
  const W = window.Widgets, U = window.U, S = U.svg;
  const box = (style, ...kids) => U.el('div', { style }, ...kids);

  // An LLM is a function: text in, a distribution over the next token out. Then it runs in a loop.
  W.llmfn = (node) => {
    const input = U.el('div', { class: 'mono', style: { fontSize: '34px', lineHeight: 1.35, padding: '22px 26px', border: '2px solid var(--ink)', borderRadius: '16px', background: 'var(--card)', minHeight: '128px' } });
    const fbox = U.el('div', { style: { width: '220px', height: '150px', borderRadius: '22px', background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center', fontSize: '30px', fontWeight: 700, lineHeight: 1.2, transition: 'transform 500ms var(--ease)' } }, U.el('div', {}, 'LLM', U.el('div', { class: 'mono', style: { fontSize: '22px', fontWeight: 400, color: '#c3c2b7', marginTop: '6px' } }, 'f(text)')));
    const arrowIn = U.el('div', { style: { fontSize: '50px', color: 'var(--axis)' } }, '→'), arrowOut = U.el('div', { style: { fontSize: '50px', color: 'var(--axis)' } }, '→');
    const dist = U.el('div', { style: { display: 'grid', gap: '10px', width: '400px' } });
    const opts = [[' Tbilisi', 0.93], [' a', 0.03], [' the', 0.02], [' located', 0.01]];
    const rows = opts.map(([t, p]) => {
      const bar = U.el('div', { style: { height: '24px', width: '0px', background: 'var(--cc)', borderRadius: '0 4px 4px 0', transition: 'width 700ms var(--ease)' } });
      const r = box({ display: 'grid', gridTemplateColumns: '150px 1fr 60px', alignItems: 'center', gap: '12px', fontSize: '26px' }, U.el('span', { class: 'mono' }, t.replace(' ', '␣')), bar, U.el('span', { style: { color: 'var(--ink-2)', fontSize: '22px' } }, Math.round(p * 100) + '%'));
      dist.append(r); return { bar, p };
    });
    const loop = U.el('div', { style: { fontSize: '28px', color: 'var(--cc-550)', fontWeight: 650, minHeight: '40px', marginTop: '26px', textAlign: 'center' } });
    node.append(box({ display: 'flex', alignItems: 'center', gap: '28px' }, box({ flex: 1 }, U.el('div', { class: 'small' }, 'input: all the text so far'), input), arrowIn, fbox, arrowOut,
      box({}, U.el('div', { class: 'small', style: { marginBottom: '8px' } }, 'output: how likely each next token is'), dist)), loop, U.el('div', { class: 'illus' }, 'illustrative probabilities'));
    const base = 'The capital of Georgia is';
    function set(s) {
      input.innerHTML = '';
      input.append(s >= 1 ? base : '');
      if (s >= 4) input.append(U.el('span', { style: { color: 'var(--cc-550)', background: 'var(--cc-100)', borderRadius: '6px', animation: 'slide-in 500ms both' } }, ' Tbilisi'));
      [arrowIn, fbox].forEach((e) => (e.style.opacity = s >= 2 ? 1 : 0.15));
      fbox.style.transform = s === 2 ? 'scale(1.06)' : 'none';
      [arrowOut, dist].forEach((e) => (e.style.opacity = s >= 3 ? 1 : 0.15));
      rows.forEach((r) => (r.bar.style.width = s >= 3 ? r.p * 230 + 'px' : '0px'));
      loop.textContent = s >= 4 ? '↺ append the token, call it again. That loop is all “writing” is.' : '';
    }
    set(0);
    return { beats: ['the input text', 'the function', 'its output: a probability for every possible next token', 'pick one, append it, call it again'], steps: 4, step: set };
  };

  // How a tokenizer is built: start from characters, merge the most frequent neighbouring pair, repeat.
  // Each merge is the one that shortens the training text the most, which is the whole point.
  W.bpe = (node) => {
    const words = ['the', 'cat', 'sat', 'on', 'the', 'mat'];
    const merges = [['a', 't'], ['t', 'h'], ['th', 'e']];
    const goal = U.el('div', { style: { fontSize: '28px', lineHeight: 1.35, color: 'var(--ink-2)', maxWidth: '1300px' } },
      U.el('b', {}, 'The goal: '), 'a fixed vocabulary that makes common text as few tokens as possible. Fewer tokens means more fits in the context, and every call is cheaper and faster.');
    const row = box({ display: 'flex', flexWrap: 'wrap', gap: '22px', minHeight: '64px', alignItems: 'center', marginTop: '30px' });
    const status = U.el('div', { style: { fontSize: '28px', marginTop: '20px', minHeight: '76px', lineHeight: 1.35 } });
    const ka = box({ marginTop: '18px', opacity: 0, transition: 'opacity 500ms' });
    node.append(goal, row, status, ka);
    const kaWord = 'გამარჯობა';
    const chipCss = (on) => ({ fontFamily: 'var(--mono)', fontSize: '30px', padding: '6px 10px', borderRadius: '8px', background: on ? 'var(--cc)' : 'var(--cc-100)', color: on ? '#fff' : 'var(--ink)', transition: 'background 400ms' });
    const merge = (segs, [a, b]) => segs.map((w) => { const o = []; for (let i = 0; i < w.length; i++) { if (w[i] === a && w[i + 1] === b) { o.push(a + b); i++; } else o.push(w[i]); } return o; });
    const pairCount = (segs, [a, b]) => segs.reduce((n, w) => n + w.filter((x, i) => x === a && w[i + 1] === b).length, 0);
    const total = (segs) => segs.reduce((a, w) => a + w.length, 0);
    function draw(s) {
      let segs = words.map((w) => [...w]), last = null, msg;
      const n = Math.min(s, merges.length);
      for (let k = 0; k < n; k++) {
        const before = total(segs), times = pairCount(segs, merges[k]);
        segs = merge(segs, merges[k]);
        last = merges[k].join('');
        msg = [U.el('b', {}, `${before} → ${total(segs)} tokens. `), `“${merges[k][0]}” + “${merges[k][1]}” is the most frequent pair (${times}×), so merging it saves the most.`];
      }
      if (s >= 4) { segs = words.map((w) => [w]); last = null; msg = [U.el('b', {}, `${total(segs)} tokens. `), 'Repeat until the vocabulary is full, about 100,000–200,000 pieces. Common words become one token; rare text stays in small pieces.']; }
      if (!msg) msg = [U.el('b', {}, `${total(segs)} tokens. `), 'Start with one token per character.'];
      row.innerHTML = '';
      segs.forEach((w) => row.append(box({ display: 'flex', gap: '4px' }, ...w.map((x) => U.el('span', { style: chipCss(x === last) }, x)))));
      status.innerHTML = ''; status.append(...msg);
      ka.style.opacity = s >= 5 ? 1 : 0;
      ka.innerHTML = '';
      if (s >= 5) {
        ka.append(U.el('div', { style: { fontSize: '26px', marginBottom: '12px' } }, U.el('b', {}, 'Georgian “hello”: '), 'rare in the text the 2023 tokenizer learned from, so few Georgian pairs ever won a merge. Each letter is 3 bytes.'),
          box({ display: 'flex', gap: '6px', flexWrap: 'wrap' }, ...[...kaWord].map((ch) => U.el('span', { style: chipCss(false) }, ch, U.el('sup', { style: { fontSize: '16px', fontWeight: 700, color: 'var(--ink-2)', marginLeft: '3px' } }, '×2')))),
          U.el('div', { class: 'small', style: { marginTop: '10px' } }, 'About 2 tokens per letter in the 2023 tokenizer (schematic).'));
      }
    }
    draw(0);
    return { beats: ['merge a + t: 17 → 14 tokens', 'merge t + h: 14 → 12', 'merge th + e: 12 → 10', 'after the full vocabulary: one token per common word', 'Georgian: few merges, so many tokens'], steps: 5, step: draw };
  };

  // Training reshapes the answer distribution: none → imitate humans → sharpen.
  W.training = (node) => {
    const stages = [
      ['1 · Pretraining', 'Predict the next token on trillions of tokens of human text. It learns to imitate us, biases included: humans over-pick 7.'],
      ['2 · Post-training', 'Train on examples of good answers, good code, and on which answers people prefer. It becomes an assistant, and its answers sharpen toward the single most typical one.'],
      ['3 · RL on checkable tasks', 'Reward it when the tests pass or the maths checks out. This is why code got so good, so fast.'],
    ];
    const shapes = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [0.35, 0.5, 0.9, 0.7, 0.75, 0.6, 1.9, 0.75, 0.55, 0.3], [0.03, 0.04, 0.12, 0.05, 0.07, 0.04, 3.2, 0.08, 0.04, 0.02], [0.03, 0.04, 0.12, 0.05, 0.07, 0.04, 3.2, 0.08, 0.04, 0.02]];
    const chartCaps = ['Before training: random, every answer equally likely', 'After pretraining: like humans, a peak at 7', 'After post-training: almost always 7', 'RL doesn’t change this one; it sharpens checkable skills like code'];
    const list = box({ display: 'grid', gap: '16px', width: '640px', flex: 'none' });
    const items = stages.map(([h, b]) => { const it = box({ padding: '14px 22px', borderRadius: '16px', border: '1px solid var(--hair)', background: 'var(--card)', opacity: 0.3, transition: 'opacity 400ms, border-color 400ms' }, U.el('h3', {}, h), U.el('p', { class: 'body', style: { fontSize: '23px', marginTop: '6px' } }, b)); list.append(it); return it; });
    const chart = box({ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' });
    const bars = box({ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '300px', borderBottom: '1px solid var(--axis)', padding: '0 6px' });
    const cols = Array.from({ length: 10 }, (_, i) => { const c = U.el('i', { style: { flex: 1, maxWidth: '24px', display: 'block', borderRadius: '4px 4px 0 0', background: i === 6 ? 'var(--cc)' : 'var(--cc-200)', height: '10%', transition: 'height 900ms var(--ease)' } }); bars.append(c); return c; });
    const cc = U.el('div', { style: { fontSize: '24px', fontWeight: 600, minHeight: '34px' } });
    chart.append(U.el('div', { class: 'small' }, '“Pick a number between 1 and 10”: what the model would answer'), cc, bars,
      box({ display: 'flex', gap: '10px', padding: '0 6px', fontSize: '20px', color: 'var(--ink-2)' }, ...Array.from({ length: 10 }, (_, i) => U.el('span', { style: { flex: 1, maxWidth: '24px', textAlign: 'center' } }, String(i + 1)))),
      U.el('div', { class: 'illus' }, 'schematic shapes'));
    node.append(box({ display: 'flex', gap: '56px', alignItems: 'flex-start' }, list, chart));
    function set(s) {
      items.forEach((it, i) => { it.style.opacity = i < s ? 1 : 0.3; it.style.borderColor = i === s - 1 ? 'var(--cc)' : 'var(--hair)'; });
      cc.textContent = chartCaps[s];
      const sh = shapes[s], mx = 3.2;
      cols.forEach((c, i) => (c.style.height = Math.max(2, (sh[i] / mx) * 100) + '%'));
    }
    set(0);
    return { beats: ['pretraining: it imitates human text, so 7 rises', 'post-training: answers sharpen to the most typical one', 'RL on checkable tasks: why code got so good'], steps: 3, step: set };
  };

  // Pick a number: random, human, LLM, drawn one at a time. The training slide that follows explains the spike.
  W.pickcurve = (node) => {
    const Wd = 1100, H = 500, pl = 40, pr = 30, base = 445, top = 50;
    const x = (n) => pl + ((n - 1) / 9) * (Wd - pl - pr);
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H, style: 'overflow:visible; display:block; margin:0 auto' });
    for (let n = 1; n <= 10; n++) svg.append(S('text', { x: x(n), y: base + 34, 'text-anchor': 'middle', 'font-size': 24, fill: 'var(--ink-2)', text: String(n) }));
    svg.append(S('line', { x1: pl, x2: Wd - pr, y1: base, y2: base, stroke: 'var(--axis)' }));
    const line = (pts) => pts.map(([px, py], i) => (i ? `L${px},${py}` : `M${px},${py}`)).join(' ');
    const sample = (f) => Array.from({ length: 181 }, (_, i) => { const n = 1 + (i / 180) * 9; return [x(n), base - f(n)]; });
    const g = (m, s, a) => (n) => a * Math.exp(-((n - m) ** 2) / (2 * s * s));
    const human = (n) => g(7.1, 0.85, 175)(n) + g(5.1, 0.6, 78)(n) + g(3.2, 0.7, 52)(n) + g(8.5, 0.6, 25)(n) + 6;
    const llm = g(7.2, 0.28, 330);
    const curves = [
      { d: line([[x(1), base - 75], [x(10), base - 75]]), c: '#1b8a8a', label: 'random', lx: x(1.2), ly: base - 92 },
      { d: line(sample(human)), c: '#eb6834', label: 'humans', lx: x(4.2), ly: base - 110 },
      { d: line(sample(llm)), c: '#d6265f', label: 'the model', lx: x(7.75), ly: top + 30 },
    ].map((cv) => {
      const area = S('path', { d: cv.d + ` L${x(10)},${base} L${x(1)},${base} Z`, fill: cv.c, opacity: 0 });
      const p = S('path', { d: cv.d, fill: 'none', stroke: cv.c, 'stroke-width': 4, 'stroke-linejoin': 'round' });
      const t = S('text', { x: cv.lx, y: cv.ly, 'font-size': 30, 'font-weight': 700, fill: cv.c, text: cv.label, opacity: 0 });
      svg.append(area, p, t);
      const L = 3000; p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      return { area, p, t, L };
    });
    const cap = U.el('div', { style: { fontSize: '26px', minHeight: '38px', marginTop: '6px' } });
    node.append(svg, cap, U.el('div', { class: 'illus' }, 'schematic shapes'));
    const caps = ['Truly random: every number equally likely.', 'Humans: we over-pick 7, and avoid 1 and 10.', 'The model: almost always 7. Why? Training.'];
    function set(s) {
      curves.forEach((cv, i) => {
        const on = s > i;
        cv.p.style.transition = 'stroke-dashoffset 1200ms var(--ease)';
        cv.p.style.strokeDashoffset = on ? 0 : cv.L;
        cv.area.style.transition = 'opacity 800ms 600ms'; cv.area.setAttribute('opacity', on ? 0.12 : 0);
        cv.t.setAttribute('opacity', on ? 1 : 0);
      });
      cap.textContent = s ? caps[s - 1] : '';
    }
    set(0);
    return { beats: ['random: flat', 'humans: a peak at 7', 'the model: a spike at 7'], steps: 3, step: set };
  };

  // A chat as the model gets it. Each request re-sends everything above it: the blue band is one
  // request, the green band its reply. Rows are placed explicitly so the bands can span them.
  W.chatsend = (node) => {
    const convo = [
      ['Write a function that adds two numbers.', 'def add(a, b):\n    return a + b'],
      ['Now in JavaScript.', 'const add = (a, b) => a + b;'],
      ['Add types.', 'const add = (a: number, b: number) => a + b;'],
    ];
    const win = U.el('div', { class: 'cs-win' });
    const sys = U.el('div', { class: 'cs-sys', style: { gridRow: '1' } }, U.el('b', {}, 'System prompt'), ', hidden from you: “You are a helpful assistant.”');
    const msgs = convo.flatMap(([u, a]) => [U.el('div', { class: 'cs-b u' }, u), U.el('div', { class: 'cs-b m' }, a)]);
    msgs.forEach((m, i) => (m.style.gridRow = String(i + 2)));
    const req = U.el('div', { class: 'cs-ring' }, U.el('span', { class: 't' })), rep = U.el('div', { class: 'cs-ring rep' }, U.el('span', { class: 't' }));
    win.append(sys, ...msgs, req, rep);
    const llm = U.el('div', { class: 'cs-llm' }, 'LLM', U.el('small', {}, 'f(text)'));
    const flow = U.el('div', { class: 'cs-flow' }), bars = U.el('div', { class: 'cs-bars' }), end = U.el('div', { class: 'cs-end' });
    node.append(U.el('div', { class: 'cs' }, win, U.el('div', { class: 'cs-side' }, llm, flow, U.el('div', { class: 'small' }, 'What each request sends'), bars, end)));
    const COL = { s: '#d9d8d2', u: 'var(--ink)', m: 'var(--cc-200)' };
    const DELAY = 900; // the reply lands after the request
    function set(s) {
      const k = Math.min(s, convo.length), fresh = s <= convo.length;
      sys.style.opacity = k ? 1 : 0;
      msgs.forEach((m, i) => {
        const turn = Math.floor(i / 2), on = turn < k;
        m.style.opacity = on ? 1 : 0;
        m.style.animation = on && fresh && turn === k - 1 ? `slide-in 450ms ${i % 2 ? DELAY : 0}ms var(--ease) both` : 'none';
      });
      [req, rep].forEach((r) => (r.style.display = k ? 'block' : 'none'));
      if (k) {
        req.style.gridRow = `1 / ${2 * k + 1}`; rep.style.gridRow = `${2 * k + 1} / ${2 * k + 2}`;
        req.firstChild.textContent = k === 1 ? 'request 1' : `request ${k}: everything so far`;
        rep.firstChild.textContent = `reply ${k}`;
        req.style.animation = fresh ? 'cs-in 500ms var(--ease) both' : 'none';
        rep.style.animation = fresh ? `cs-in 500ms ${DELAY}ms var(--ease) both` : 'none';
        if (fresh && !U.reduced) llm.animate([{ transform: 'none' }, { transform: 'scale(1.07)', offset: 0.5 }, { transform: 'none' }], { duration: DELAY, easing: 'ease-in-out' });
      }
      flow.innerHTML = '';
      if (k) flow.append(U.el('span', { style: { color: 'var(--cc-550)' } }, `→ request ${k}: ${2 * k} messages`),
        U.el('span', { style: { color: '#13845b', animation: fresh ? `slide-in 400ms ${DELAY}ms both` : 'none' } }, `← reply ${k}`));
      bars.innerHTML = '';
      for (let j = 1; j <= k; j++) {
        const kinds = ['s', ...Array.from({ length: j - 1 }, () => ['u', 'm']).flat(), 'u'];
        bars.append(U.el('div', { class: 'cs-bar', style: { animation: fresh && j === k ? 'slide-in 400ms both' : 'none' } }, U.el('span', {}, `Request ${j}`), ...kinds.map((x) => U.el('i', { style: { background: COL[x] } })), U.el('em', {}, `${2 * j}`)));
      }
      end.innerHTML = '';
      if (s > convo.length) end.append(U.el('div', {}, 'The model keeps nothing between calls. The app sends the whole conversation again, every turn.'),
        U.el('div', { class: 'small', style: { marginTop: '10px', fontWeight: 400 } }, 'So long chats get slower and pricier, and a new chat starts from zero.'));
    }
    set(0);
    return { beats: ['request 1: the hidden system prompt and your message; then the reply', 'request 2 re-sends everything so far, plus “Now in JavaScript.”', 'request 3: all of it again, plus “Add types.”', 'nothing is kept between calls'], steps: 4, step: set };
  };

  // Function calling, side by side: one turn in the chat is two requests to the model,
  // and the server runs the function in between. Rings link a chat bubble to the line it came from.
  W.fnseq = (node) => {
    const ub = U.el('div', { class: 'cs-b u' }, 'What’s the weather in Tbilisi?');
    const typing = U.el('div', { class: 'cs-b a fs-typing' }, '…');
    const mb = U.el('div', { class: 'cs-b a' }, 'It’s 18 °C and sunny in Tbilisi.');
    const sum = U.el('div', { class: 'fs-sum' }, U.el('b', {}, 'One turn for you. Two requests to the model.'), ' The server ran get_weather; the model only wrote text.');
    const chat = U.el('div', { class: 'cs-win fs-chat' }, ub, typing, mb);
    const L = (k, v, cls) => U.el('div', { class: 'fs-l' + (cls ? ' ' + cls : '') }, k ? U.el('b', {}, k + ': ') : '', v);
    const ROWS = [
      ['r', 'Request 1 · server → model', [L('system', '"You are a helpful assistant."'), L('tools', '[get_weather(city)]'), L('user', '"What’s the weather in Tbilisi?"', 'lu')]],
      ['l', 'Response 1 · model → server', [L('tool_use', 'get_weather({"city": "Tbilisi"})')]],
      ['self', 'The server runs it', [L('', 'get_weather("Tbilisi") → weather API → "18 °C, sunny"')]],
      ['r', 'Request 2 · server → model', [L('…', 'system, tools, user: as in request 1'), L('assistant', 'tool_use get_weather({"city": "Tbilisi"})'), L('tool_result', '"18 °C, sunny"')]],
      ['l', 'Response 2 · model → server', [L('text', '"It’s 18 °C and sunny in Tbilisi."', 'la')]],
    ];
    const rows = ROWS.map(([dir, h, lines]) => U.el('div', { class: 'fs-row ' + dir }, U.el('div', { class: 'fs-card' }, U.el('div', { class: 'fs-h' }, h), ...lines)));
    const seq = U.el('div', { class: 'fs' }, U.el('div', { class: 'fs-heads' }, U.el('span', {}, 'Server ', U.el('small', {}, '(the chat app)')), U.el('span', {}, 'Model')), ...rows);
    node.append(U.el('div', { class: 'fs-wrap' },
      U.el('div', { style: { width: '440px', flex: 'none' } }, U.el('div', { class: 'small', style: { marginBottom: '10px' } }, 'What you see'), chat, sum),
      U.el('div', { style: { flex: 1 } }, U.el('div', { class: 'small', style: { marginBottom: '10px' } }, 'What actually happens'), seq)));
    const lu = rows[0].querySelector('.lu'), la = rows[4].querySelector('.la');
    function set(s) {
      ub.style.opacity = s >= 1 ? 1 : 0; typing.style.opacity = s >= 1 && s < 5 ? 1 : 0; mb.style.opacity = s >= 5 ? 1 : 0;
      rows.forEach((r, i) => { r.style.opacity = s > i ? (s === i + 1 || s > ROWS.length ? 1 : 0.5) : 0; r.style.animation = s === i + 1 ? 'slide-in 450ms var(--ease) both' : 'none'; });
      ub.classList.toggle('ring-u', s === 1); lu.classList.toggle('ring-u', s === 1);
      mb.classList.toggle('ring-a', s === 5); la.classList.toggle('ring-a', s === 5);
      sum.style.opacity = s > ROWS.length ? 1 : 0;
    }
    set(0);
    return { beats: ['request 1: the server sends your question and its list of functions', 'response 1: the model asks for get_weather, not an answer', 'the server runs the function', 'request 2: everything again, plus the result', 'response 2: the answer you see', 'one turn for you, two requests to the model'], steps: 6, step: set };
  };

  // Lost in the middle: recall drops when the needed fact sits in the middle of a long context.
  W.lostmiddle = (node) => {
    const Wd = 1000, H = 420, pl = 80, pb = 60, pt = 30, pr = 30;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H, style: 'overflow:visible' });
    const x = (f) => pl + f * (Wd - pl - pr), y = (v) => H - pb - (v / 100) * (H - pb - pt);
    [25, 50, 75, 100].forEach((v) => svg.append(S('line', { x1: pl, x2: Wd - pr, y1: y(v), y2: y(v), stroke: 'var(--hair)' }), S('text', { x: pl - 12, y: y(v) + 7, 'text-anchor': 'end', 'font-size': 20, fill: 'var(--muted)', text: v + '%' })));
    svg.append(S('line', { x1: pl, x2: Wd - pr, y1: y(0), y2: y(0), stroke: 'var(--axis)' }),
      S('text', { x: pl, y: H - 18, 'font-size': 21, fill: 'var(--ink-2)', text: 'fact at the start' }), S('text', { x: Wd - pr, y: H - 18, 'text-anchor': 'end', 'font-size': 21, fill: 'var(--ink-2)', text: 'fact at the end' }),
      S('text', { x: (Wd + pl) / 2, y: H - 18, 'text-anchor': 'middle', 'font-size': 21, fill: 'var(--ink-2)', text: 'position of the fact in a long prompt →' }));
    const pts = Array.from({ length: 41 }, (_, i) => { const f = i / 40; return [x(f), y(76 - 26 * Math.sin(Math.PI * f) ** 1.3 + (f > 0.9 ? 6 * (f - 0.9) * 10 : 0))]; });
    const path = S('path', { d: 'M' + pts.map((p) => p.join(',')).join(' L'), fill: 'none', stroke: 'var(--critical)', 'stroke-width': 4 });
    const L = 2000; path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
    const lab = S('text', { x: x(0.5), y: y(42), 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: 'var(--critical)', text: 'lost in the middle', opacity: 0 });
    svg.append(path, lab);
    node.append(svg, U.el('div', { class: 'illus' }, 'schematic, after Liu et al., “Lost in the Middle”, 2023'));
    return { beats: ['accuracy by where the fact sits', 'the dip in the middle'], steps: 2, step(s) { path.style.transition = 'stroke-dashoffset 1400ms var(--ease)'; path.style.strokeDashoffset = s >= 1 ? 0 : L; lab.setAttribute('opacity', s >= 2 ? 1 : 0); } };
  };

  // MCP: without a standard, every agent needs its own integration with every tool (N×M); with one, N+M.
  W.mcp = (node) => {
    const agents = ['Claude Code', 'Cursor', 'Your bot'], tools = ['Jira', 'GitHub', 'Postgres', 'Browser'];
    const Wd = 1200, H = 440;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: 1040, height: 381 });
    const ax = 170, tx = 1030, hub = [600, 220];
    const ay = (i) => 80 + i * 140, ty = (j) => 50 + j * 112;
    const gWires = S('g'), gHub = S('g', { opacity: 0 }), gNodes = S('g');
    svg.append(gWires, gHub, gNodes);
    agents.forEach((a, i) => tools.forEach((t, j) => gWires.append(S('path', { d: `M${ax + 90},${ay(i)} C${ax + 330},${ay(i)} ${tx - 330},${ty(j)} ${tx - 90},${ty(j)}`, fill: 'none', stroke: 'var(--human)', 'stroke-width': 2, opacity: 0.7 }))));
    [...agents.map((a, i) => [ax, ay(i), a, 'var(--cc)']), ...tools.map((t, j) => [tx, ty(j), t, '#1baf7a'])].forEach(([cx, cy, t, c]) => {
      gNodes.append(S('rect', { x: cx - 90, y: cy - 30, width: 180, height: 60, rx: 14, fill: 'var(--card)', stroke: c, 'stroke-width': 2.5 }), S('text', { x: cx, y: cy + 8, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 650, fill: 'var(--ink)', text: t }));
    });
    agents.forEach((a, i) => gHub.append(S('path', { d: `M${ax + 90},${ay(i)} L${hub[0] - 80},${hub[1]}`, stroke: 'var(--cc)', 'stroke-width': 3, fill: 'none' })));
    tools.forEach((t, j) => gHub.append(S('path', { d: `M${hub[0] + 80},${hub[1]} L${tx - 90},${ty(j)}`, stroke: '#1baf7a', 'stroke-width': 3, fill: 'none' })));
    gHub.append(S('rect', { x: hub[0] - 80, y: hub[1] - 44, width: 160, height: 88, rx: 20, fill: 'var(--ink)' }), S('text', { x: hub[0], y: hub[1] + 10, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 750, fill: '#fff', text: 'MCP' }));
    const count = U.el('div', { style: { fontSize: '32px', fontWeight: 650, minHeight: '44px' } });
    node.append(svg, count);
    return { beats: ['every agent wires every tool itself: 12 integrations', 'one protocol in the middle: 7'], steps: 2, step(s) {
      gWires.style.transition = 'opacity 600ms'; gWires.style.opacity = s === 1 ? 1 : 0;
      gHub.style.transition = 'opacity 600ms'; gHub.setAttribute('opacity', s >= 2 ? 1 : 0);
      count.textContent = s === 1 ? '3 agents × 4 tools = 12 custom integrations, each built and maintained separately.' : s >= 2 ? '3 + 4 = 7. Each tool is wrapped once as an MCP server; any agent can use it.' : '';
    } };
  };
})();
