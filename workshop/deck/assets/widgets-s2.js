/* Session 2 widgets. Same rule as session 1: schematic visuals say so on the slide. */
(function () {
  const W = window.Widgets, U = window.U, S = U.svg;

  // A rAF loop that a widget can start and stop with the slide.
  function ticker(fn) {
    let raf = null, t0 = null;
    const tick = (t) => { t0 ??= t; fn(t - t0); raf = requestAnimationFrame(tick); };
    return { start() { if (!raf && !U.reduced) raf = requestAnimationFrame(tick); else if (U.reduced) fn(1e9); }, stop() { cancelAnimationFrame(raf); raf = null; t0 = null; } };
  }

  // ======================================================================
  // Instructions vs enforcement: a sign can be walked past; a wall cannot.
  // ======================================================================
  W.enforce = (node) => {
    const Wd = 1400, H = 400, wallX = 820;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H });
    node.append(svg, U.el('div', { class: 'illus' }, 'schematic · how often an instruction slips varies'));
    const lanes = [
      { y: 120, label: 'Instruction', sub: 'CLAUDE.md, skills, prompts', kind: 'sign', on: false, passed: 0, stopped: 0 },
      { y: 300, label: 'Enforcement', sub: 'hooks, deny rules, sandbox, CI', kind: 'wall', on: false, passed: 0, stopped: 0 },
    ];
    lanes.forEach((l) => {
      l.g = S('g', { opacity: 0.25 });
      l.g.append(S('text', { x: 0, y: l.y - 8, 'font-size': 30, 'font-weight': 650, fill: 'var(--ink)', text: l.label }),
        S('text', { x: 0, y: l.y + 24, 'font-size': 21, fill: 'var(--ink-2)', text: l.sub }),
        S('line', { x1: 330, x2: 1180, y1: l.y, y2: l.y, stroke: 'var(--hair)', 'stroke-width': 2 }));
      if (l.kind === 'sign') {
        l.g.append(S('rect', { x: wallX - 4, y: l.y - 52, width: 8, height: 104, rx: 4, fill: 'none', stroke: 'var(--ink-2)', 'stroke-width': 2, 'stroke-dasharray': '6 6' }),
          S('text', { x: wallX, y: l.y - 64, 'text-anchor': 'middle', 'font-size': 21, fill: 'var(--ink-2)', text: '“never read .env”' }));
      } else {
        l.g.append(S('rect', { x: wallX - 7, y: l.y - 56, width: 14, height: 112, rx: 4, fill: 'var(--ink)' }),
          S('text', { x: wallX, y: l.y - 68, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 650, fill: 'var(--ink)', text: 'exit code 2: blocked' }));
      }
      l.count = S('text', { x: 1400, y: l.y + 8, 'text-anchor': 'end', 'font-size': 24, 'font-weight': 650, fill: 'var(--ink)', text: '' });
      l.g.append(l.count);
      l.dots = S('g'); l.g.append(l.dots);
      svg.append(l.g);
    });
    let dots = [], spawnT = 0, n = 0;
    const tk = ticker((t) => {
      if (t - spawnT > 700) {
        spawnT = t;
        lanes.forEach((l, i) => {
          if (!l.on) return;
          n++;
          const c = S('circle', { r: 9, cx: 330, cy: l.y, fill: 'var(--cc)' });
          l.dots.append(c);
          // One in five walks past the sign; none get past the wall.
          dots.push({ c, l, x: 330, slip: l.kind === 'sign' && n % 5 === 0, done: false, vy: 0, y: l.y });
        });
      }
      dots.forEach((d) => {
        if (d.done) return;
        d.x += 4;
        if (d.x >= wallX - 18 && !d.slip && !d.stopped) { d.stopped = true; d.l.stopped++; d.c.setAttribute('fill', d.l.kind === 'wall' ? 'var(--critical)' : 'var(--cc-200)'); }
        if (d.stopped) { d.x = wallX - 18; d.y += d.l.kind === 'wall' ? 0 : -0.6; d.c.setAttribute('opacity', Math.max(0, +(d.c.getAttribute('opacity') || 1) - 0.02)); if (+d.c.getAttribute('opacity') <= 0) { d.done = true; d.c.remove(); } }
        if (d.x > 1180) { d.done = true; d.l.passed++; d.c.remove(); }
        d.c.setAttribute('cx', d.x); d.c.setAttribute('cy', d.y);
        if (d.slip && d.x > wallX) d.c.setAttribute('fill', 'var(--human)');
      });
      dots = dots.filter((d) => !d.done);
      lanes.forEach((l) => { if (l.on) l.count.textContent = `${l.passed} read .env`; });
    });
    const set = (s) => { lanes[0].on = s >= 1; lanes[1].on = s >= 2; lanes.forEach((l) => l.g.setAttribute('opacity', l.on ? 1 : 0.25)); };
    return {
      beats: ['instructions: most dots stop at the sign, some walk past', 'enforcement: every dot stops at the wall'], steps: 2,
      enter() { tk.start(); },
      leave() { tk.stop(); },
      step(s) { set(s); if (U.reduced) { lanes[0].count.textContent = s >= 1 ? 'some read .env' : ''; lanes[1].count.textContent = s >= 2 ? '0 read .env' : ''; } },
    };
  };

  // ======================================================================
  // Four ways to run many agents, one small moving diagram each.
  // ======================================================================
  W.modes = (node) => {
    const defs = [
      { t: 'Subagents', s: 'Own context, returns a summary. Your main context stays small.', draw: subagent },
      { t: 'Subsessions', s: 'Separate conversations, in separate panes.', draw: subsession },
      { t: 'Worktrees', s: 'Same repo, separate files. No stepping on each other.', draw: worktree },
      { t: 'Agent teams', s: 'Agents message each other. Feb 2026.', draw: team },
    ];
    const grid = U.el('div', { class: 'cols-4' });
    const anims = [];
    defs.forEach((d, i) => {
      const svg = S('svg', { viewBox: '0 0 300 190', width: '100%', height: 190 });
      const card = U.el('div', { class: 'card', style: { padding: '22px 22px 26px', opacity: 0.15, transition: 'opacity 500ms' } }, svg, U.el('h3', { style: { marginTop: '10px' } }, d.t), U.el('p', { class: 'body', style: { fontSize: '22px', marginTop: '6px' } }, d.s));
      grid.append(card);
      anims.push({ card, f: d.draw(svg) });
    });
    node.append(grid);
    function agent(svg, x, y, r, c) { svg.append(S('circle', { cx: x, cy: y, r, fill: c || 'var(--cc)' })); }
    function ctx(svg, x, y, w, fillW) { svg.append(S('rect', { x, y, width: w, height: 10, rx: 5, fill: 'var(--cc-100)' }), S('rect', { x, y, width: fillW, height: 10, rx: 5, fill: 'var(--cc)' })); }
    function mover(svg, path, color) {
      const p = S('path', { d: path, fill: 'none', stroke: 'var(--axis)', 'stroke-width': 2, 'stroke-dasharray': '4 5' });
      const dot = S('circle', { r: 6, fill: color || 'var(--human)' });
      svg.append(p, dot);
      return (t, period = 2200, off = 0) => { const L = p.getTotalLength(); const k = (((t + off) % period) / period); const pt = p.getPointAtLength(k * L); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); };
    }
    function subagent(svg) {
      agent(svg, 80, 95, 34); ctx(svg, 40, 150, 80, 22);
      agent(svg, 230, 70, 20, 'var(--cc-550)'); ctx(svg, 195, 108, 70, 58);
      svg.append(S('text', { x: 230, y: 140, 'text-anchor': 'middle', 'font-size': 17, fill: 'var(--ink-2)', text: 'reads 40 files' }));
      const m = mover(svg, 'M205,78 C170,90 140,92 116,94', 'var(--scaf)');
      svg.append(S('text', { x: 158, y: 76, 'text-anchor': 'middle', 'font-size': 17, fill: 'var(--ink-2)', text: 'summary' }));
      return (t) => m(t, 1800);
    }
    function subsession(svg) {
      svg.append(S('rect', { x: 14, y: 20, width: 128, height: 150, rx: 12, fill: 'none', stroke: 'var(--axis)' }), S('rect', { x: 158, y: 20, width: 128, height: 150, rx: 12, fill: 'none', stroke: 'var(--axis)' }));
      agent(svg, 78, 80, 28); ctx(svg, 38, 130, 80, 50);
      agent(svg, 222, 80, 28); ctx(svg, 182, 130, 80, 30);
      const blink = [S('circle', { cx: 120, cy: 38, r: 6, fill: 'var(--human)' }), S('circle', { cx: 264, cy: 38, r: 6, fill: 'var(--human)' })];
      blink.forEach((b) => svg.append(b));
      return (t) => blink.forEach((b, i) => b.setAttribute('opacity', Math.floor((t + i * 900) / 900) % 2 ? 1 : 0.15));
    }
    function worktree(svg) {
      agent(svg, 70, 50, 22); agent(svg, 230, 50, 22);
      const folder = (x) => { svg.append(S('path', { d: `M${x - 44},110 h30 l10,-12 h48 v70 h-88 z`, fill: 'var(--scaf-100)', stroke: 'var(--scaf)', 'stroke-width': 1.5 })); };
      folder(70); folder(230);
      svg.append(S('text', { x: 70, y: 186, 'text-anchor': 'middle', 'font-size': 17, fill: 'var(--ink-2)', text: 'checkout A' }), S('text', { x: 230, y: 186, 'text-anchor': 'middle', 'font-size': 17, fill: 'var(--ink-2)', text: 'checkout B' }));
      const a = mover(svg, 'M70,74 L70,104', 'var(--cc)'), b = mover(svg, 'M230,74 L230,104', 'var(--cc)');
      return (t) => { a(t, 1200); b(t, 1200, 600); };
    }
    function team(svg) {
      const pts = [[150, 36], [60, 150], [240, 150]];
      pts.forEach(([x, y]) => agent(svg, x, y, 24));
      const m1 = mover(svg, 'M140,58 L72,128'), m2 = mover(svg, 'M84,150 L216,150'), m3 = mover(svg, 'M228,128 L160,58');
      return (t) => { m1(t, 1500); m2(t, 1500, 500); m3(t, 1500, 1000); };
    }
    const tk = ticker((t) => anims.forEach((a) => a.f(t)));
    return {
      beats: ['subagents', 'subsessions', 'worktrees', 'agent teams'], steps: 4,
      enter() { tk.start(); },
      leave() { tk.stop(); },
      step(s) { anims.forEach((a, i) => (a.card.style.opacity = i < s ? 1 : 0.15)); },
    };
  };

  // ======================================================================
  // Merge conflicts are the new friction; ownership areas remove them.
  // ======================================================================
  W.ownership = (node) => {
    const cols = 8, rows = 4, cell = 120, gap = 8;
    const agents = [['Agent A', '#2a78d6'], ['Agent B', '#eb6834'], ['Agent C', '#1baf7a']];
    const grid = U.el('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: gap + 'px', position: 'relative' } });
    const cells = [];
    for (let i = 0; i < cols * rows; i++) {
      const c = U.el('div', { style: { height: '76px', borderRadius: '10px', background: '#efeee9', display: 'grid', placeItems: 'center', fontSize: '28px', fontWeight: 800, color: '#fff', transition: 'background 400ms, box-shadow 400ms' } });
      cells.push(c); grid.append(c);
    }
    const legend = U.el('div', { class: 'legend', style: { marginTop: '22px' } }, ...agents.map(([n, c]) => U.el('span', { class: 'k' }, U.el('i', { style: { background: c } }), n)),
      U.el('span', { class: 'k' }, U.el('i', { style: { background: 'var(--critical)' } }), 'conflict'));
    const status = U.el('div', { style: { fontSize: '30px', fontWeight: 650, marginTop: '18px', minHeight: '40px' } });
    node.append(grid, legend, status);
    let tm = U.timers();
    function shared() {
      // Three agents touch modules anywhere; overlaps become conflicts.
      tm.clear();
      const touched = new Map();
      let k = 0;
      const plan = [[0, 3], [1, 3], [2, 11], [0, 12], [1, 12], [2, 20], [0, 21], [1, 5], [2, 5], [0, 27], [1, 28], [2, 28], [0, 9], [1, 17], [2, 17]];
      cells.forEach((c) => { c.style.background = '#efeee9'; c.textContent = ''; c.style.boxShadow = 'none'; });
      plan.forEach(([a, i]) => tm.after(200 + k++ * 160, () => {
        const prev = touched.get(i);
        if (prev !== undefined && prev !== a) { cells[i].style.background = 'var(--critical)'; cells[i].textContent = '✕'; }
        else { cells[i].style.background = agents[a][1]; touched.set(i, a); }
      }));
      tm.after(200 + plan.length * 160, () => (status.textContent = 'Five conflicts. Worktrees isolate the files, not the merge.'));
    }
    function owned() {
      tm.clear();
      cells.forEach((c, i) => {
        const col = i % cols, a = col < 3 ? 0 : col < 6 ? 1 : 2;
        c.textContent = '';
        c.style.background = agents[a][1];
        c.style.opacity = 0.35;
        c.style.boxShadow = 'none';
      });
      // Each agent works only inside its own area.
      [[0, 1], [0, 10], [0, 17], [1, 4], [1, 13], [1, 29], [2, 7], [2, 14], [2, 23]].forEach(([a, i], k) => tm.after(200 + k * 140, () => { cells[i].style.opacity = 1; cells[i].style.boxShadow = '0 0 0 3px var(--surface), 0 0 0 5px ' + agents[a][1]; }));
      status.textContent = 'Ownership areas: zero conflicts, by design.';
    }
    return { beats: ['three agents edit anywhere: five conflicts', 'ownership areas: zero conflicts'], steps: 2, step(s) { if (s === 1) shared(); else if (s === 2) owned(); else { tm.clear(); cells.forEach((c) => { c.style.background = '#efeee9'; c.textContent = ''; c.style.opacity = 1; c.style.boxShadow = 'none'; }); status.textContent = ''; } }, leave() { tm.clear(); } };
  };

  // ======================================================================
  // Auto mode vs human approval on the same dangerous commands.
  // ======================================================================
  W.automode = (node) => {
    const rows = [['Human testers caught it', 13.6, '143 of 1,053', 'var(--human)'], ['Auto mode blocked it', 89, '937 of 1,053', 'var(--cc)']];
    const els = rows.map(([l, v, sub, c]) => {
      const num = U.el('span', { 'data-suffix': '%' }, '0%');
      const bar = U.el('div', { style: { height: '24px', borderRadius: '0 4px 4px 0', background: c, width: '0%', transition: 'width 1400ms var(--ease)' } });
      const r = U.el('div', { style: { display: 'grid', gridTemplateColumns: '360px 1fr 170px', gap: '24px', alignItems: 'center' } },
        U.el('div', { style: { fontSize: '30px', fontWeight: 600 } }, l, U.el('div', { style: { fontSize: '20px', color: 'var(--muted)', fontWeight: 400 } }, sub)),
        U.el('div', { style: { background: '#efeee9', borderRadius: '0 4px 4px 0' } }, bar),
        U.el('div', { style: { fontSize: '56px', fontWeight: 650, letterSpacing: '-0.03em' } }, num));
      return { r, bar, num, v };
    });
    node.append(U.el('div', { style: { display: 'grid', gap: '44px' } }, ...els.map((e) => e.r)));
    let cancels = [];
    return {
      beats: ['the bars grow: humans 13.6%, auto mode 89%'], steps: 1,
      step(s) { cancels.forEach((c) => c()); cancels = []; els.forEach((e) => { e.bar.style.width = s ? e.v + '%' : '0%'; if (s) cancels.push(U.countUp(e.num, e.v, 1400, e.v % 1 ? 1 : 0)); else e.num.textContent = '0%'; }); },
      table() { return '<table><tr><th></th><th>Share</th><th>Count</th></tr>' + rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}%</td><td>${r[2]}</td></tr>`).join('') + '</table>'; },
    };
  };

  // ======================================================================
  // The lethal trifecta, with two real cases mapped onto it.
  // ======================================================================
  W.trifecta = (node) => {
    const svg = S('svg', { viewBox: '0 0 700 610', width: 566, height: 494 });
    const C = [[260, 220, 'Private data', 'or secrets'], [440, 220, 'Untrusted content', 'it reads'], [350, 375, 'A way out', 'to send or act']];
    const circles = C.map(([x, y, t, s], i) => {
      const g = S('g', { opacity: 0 });
      g.append(S('circle', { cx: x, cy: y, r: 165, fill: ['rgba(42,120,214,.10)', 'rgba(235,104,52,.10)', 'rgba(27,175,122,.12)'][i], stroke: ['#2a78d6', '#eb6834', '#1baf7a'][i], 'stroke-width': 2 }));
      const lx = i === 0 ? x - 70 : i === 1 ? x + 70 : x, ly = i === 2 ? y + 196 : y - 200;
      g.append(S('text', { x: lx, y: ly, 'text-anchor': 'middle', 'font-size': 27, 'font-weight': 650, fill: 'var(--ink)', stroke: 'var(--surface)', 'stroke-width': 6, 'paint-order': 'stroke', text: t }), S('text', { x: lx, y: ly + 27, 'text-anchor': 'middle', 'font-size': 21, fill: 'var(--ink-2)', stroke: 'var(--surface)', 'stroke-width': 5, 'paint-order': 'stroke', text: s }));
      svg.append(g); return g;
    });
    const core = S('g', { opacity: 0 });
    core.append(S('circle', { cx: 350, cy: 272, r: 46, fill: 'var(--critical)' }), S('text', { x: 350, y: 280, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 750, fill: '#fff', text: 'danger' }));
    svg.append(core);
    const cases = [
      { t: 'Cline · Feb 2026', rows: [['Untrusted', 'Instructions in a GitHub issue title'], ['Private', 'Release tokens, reached by poisoning the shared Actions cache'], ['Way out', 'Bash on the runner; later a rogue npm publish of cline@2.3.0']] },
      { t: 'Cowork · May 2026', rows: [['Untrusted', 'A planted file with hidden instructions and the attacker’s API key'], ['Private', 'The other files in the workspace'], ['Way out', 'Uploads to api.anthropic.com, an allowlisted domain']], quote: '“The sandbox worked perfectly, and yet the data was exfiltrated.”' },
    ];
    const panel = U.el('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '20px' } });
    node.append(U.el('div', { class: 'row top', style: { gap: '48px' } }, svg, panel));
    const dotFor = { Untrusted: '#eb6834', Private: '#2a78d6', 'Way out': '#1baf7a' };
    function show(s) {
      circles.forEach((g, i) => g.setAttribute('opacity', s > i ? 1 : 0));
      core.setAttribute('opacity', s >= 4 ? 1 : 0);
      panel.innerHTML = '';
      if (s < 4) panel.append(U.el('p', { class: 'lead' }, s ? 'Any two are fine. All three together is how data leaks.' : ''));
      if (s === 4) panel.append(U.el('p', { class: 'lead', style: { animation: 'slide-in 500ms both' } }, 'Any two are fine. ', U.el('b', {}, 'All three together is how data leaks.')));
      if (s >= 5) {
        const c = cases[s - 5];
        panel.append(U.el('h2', { style: { animation: 'slide-in 400ms both' } }, c.t));
        c.rows.forEach(([k, v], i) => panel.append(U.el('div', { style: { display: 'grid', gridTemplateColumns: '24px 1fr', gap: '14px', alignItems: 'baseline', fontSize: '27px', lineHeight: 1.3, animation: `slide-in 450ms ${150 + i * 180}ms both` } },
          U.el('i', { style: { width: '16px', height: '16px', borderRadius: '50%', background: dotFor[k], display: 'block', transform: 'translateY(2px)' } }), v)));
        if (c.quote) panel.append(U.el('p', { style: { fontSize: '28px', fontWeight: 650, marginTop: '10px', animation: 'slide-in 450ms 700ms both' } }, c.quote));
      }
    }
    return { beats: ['circle: private data', 'circle: untrusted content', 'circle: a way out', 'the danger zone: all three', 'case: Cline, Feb 2026', 'case: Cowork, May 2026'], steps: 6, step(s) { show(s); } };
  };

  // ======================================================================
  // Loops become graphs: one loop, then an orchestrator fanning out to workers and a verifier.
  // ======================================================================
  W.fanout = (node) => {
    const Wd = 1400, H = 470;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H });
    node.append(svg);
    const g1 = S('g'), g2 = S('g', { opacity: 0 }), g3 = S('g', { opacity: 0 }), g4 = S('g', { opacity: 0 });
    svg.append(g2, g3, g1, g4);
    // single loop
    const loopC = [190, 235];
    g1.append(S('circle', { cx: loopC[0], cy: loopC[1], r: 92, fill: 'none', stroke: 'var(--hair)', 'stroke-width': 3 }));
    const arc = S('circle', { cx: loopC[0], cy: loopC[1], r: 92, fill: 'none', stroke: 'var(--cc)', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': '90 500' });
    g1.append(arc, S('text', { x: loopC[0], y: loopC[1] - 4, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 650, fill: 'var(--ink)', text: 'one loop' }),
      S('text', { x: loopC[0], y: loopC[1] + 26, 'text-anchor': 'middle', 'font-size': 20, fill: 'var(--ink-2)', text: '/goal: tests pass' }));
    // orchestrator + workers
    const orch = [500, 235], ver = [1240, 235];
    const workers = Array.from({ length: 8 }, (_, i) => [880, 45 + i * 54]);
    const lines = [], back = [];
    workers.forEach(([x, y]) => {
      const p = S('path', { d: `M${orch[0] + 50},${orch[1]} C${orch[0] + 200},${orch[1]} ${x - 200},${y} ${x - 26},${y}`, fill: 'none', stroke: 'var(--axis)', 'stroke-width': 1.5 });
      g2.append(p); lines.push(p);
      const q = S('path', { d: `M${x + 26},${y} C${x + 160},${y} ${ver[0] - 180},${ver[1]} ${ver[0] - 56},${ver[1]}`, fill: 'none', stroke: 'var(--axis)', 'stroke-width': 1.5 });
      g3.append(q); back.push(q);
    });
    workers.forEach(([x, y]) => {
      g2.append(S('circle', { cx: x, cy: y, r: 22, fill: 'var(--card)', stroke: 'var(--cc)', 'stroke-width': 2 }));
      g2.append(S('circle', { cx: x, cy: y, r: 22, fill: 'none', stroke: 'var(--cc)', 'stroke-width': 4, 'stroke-dasharray': '20 200', class: 'spin', 'data-cx': x, 'data-cy': y }));
    });
    g2.append(S('rect', { x: orch[0] - 70, y: orch[1] - 46, width: 140, height: 92, rx: 18, fill: 'var(--ink)' }), S('text', { x: orch[0], y: orch[1] + 8, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 650, fill: '#fff', text: 'orchestrator' }));
    g3.append(S('rect', { x: ver[0] - 56, y: ver[1] - 46, width: 130, height: 92, rx: 18, fill: 'var(--scaf-100)', stroke: 'var(--scaf)', 'stroke-width': 2 }), S('text', { x: ver[0] + 9, y: ver[1] + 8, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 650, fill: 'var(--ink)', text: 'verify' }));
    // tiering labels
    g4.append(S('text', { x: orch[0], y: orch[1] - 66, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 650, fill: 'var(--cc-550)', text: 'frontier model plans' }),
      S('text', { x: 880, y: 20, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 650, fill: 'var(--cc-550)', text: 'cheap models execute' }),
      S('text', { x: ver[0] + 9, y: ver[1] - 66, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 650, fill: 'var(--cc-550)', text: 'gates decide' }));
    const pulses = [];
    const pulse = (path, color, period, off) => { const c = S('circle', { r: 6, fill: color }); svg.append(c); pulses.push({ c, path, period, off }); };
    lines.forEach((p, i) => pulse(p, 'var(--cc)', 2400, i * 300));
    back.forEach((p, i) => pulse(p, 'var(--scaf)', 2400, 1200 + i * 300));
    let stage = 0;
    const spins = () => [...g2.querySelectorAll('.spin')];
    const tk = ticker((t) => {
      arc.setAttribute('transform', `rotate(${(t / 10) % 360} ${loopC[0]} ${loopC[1]})`);
      spins().forEach((s, i) => s.setAttribute('transform', `rotate(${(t / 4 + i * 45) % 360} ${s.dataset.cx} ${s.dataset.cy})`));
      pulses.forEach((p, i) => {
        const vis = (i < lines.length ? stage >= 2 : stage >= 3);
        p.c.setAttribute('opacity', vis ? 1 : 0);
        if (!vis) return;
        const L = p.path.getTotalLength(), k = ((t + p.off) % p.period) / p.period;
        const pt = p.path.getPointAtLength(k * L); p.c.setAttribute('cx', pt.x); p.c.setAttribute('cy', pt.y);
      });
    });
    function set(s) {
      stage = s + 1;
      const fade = (g, on) => g.animate([{ opacity: +g.getAttribute('opacity') }, { opacity: on ? 1 : 0 }], { duration: 600, fill: 'forwards' }) && g.setAttribute('opacity', on ? 1 : 0);
      fade(g2, stage >= 2); fade(g3, stage >= 3); fade(g4, stage >= 4);
      g1.setAttribute('transform', stage >= 2 ? 'translate(0,0)' : 'translate(0,0)');
      if (U.reduced) pulses.forEach((p) => p.c.setAttribute('opacity', 0));
    }
    return { beats: ['one loop becomes an orchestrator fanning out to workers', 'a verifier gates the results', 'labels: frontier plans, cheap models execute, gates decide'], steps: 3, enter() { tk.start(); }, leave() { tk.stop(); }, step(s) { set(s); } };
  };

  // ======================================================================
  // Graph engineering, by example: the second workshop drawn as the graph that would run it.
  // Agents are blue, gates (checks that route work on or back) green, the human's end grey.
  // ======================================================================
  W.graphex = (node) => {
    const Wd = 1400, H = 440;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H });
    node.append(svg);
    const layer = () => { const g = S('g', { opacity: 0 }); svg.append(g); return g; };
    const gEdges = [layer(), layer(), layer(), layer()], gNodes = [layer(), layer(), layer(), layer(), layer()];
    const box = (g, x, y, w, h, kind, title, lines, tag) => {
      const st = { agent: ['var(--card)', 'var(--cc)'], gate: ['var(--scaf-100)', 'var(--scaf)'], end: ['#f0efec', 'var(--axis)'] }[kind];
      g.append(S('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 16, fill: st[0], stroke: st[1], 'stroke-width': 2.5 }));
      const top = y - h / 2 + 34;
      g.append(S('text', { x, y: top, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 650, fill: 'var(--ink)', text: title }));
      lines.forEach((l, i) => g.append(S('text', { x, y: top + 28 + i * 23, 'text-anchor': 'middle', 'font-size': 18, fill: 'var(--ink-2)', text: l })));
      if (tag) g.append(S('text', { x, y: y + h / 2 + 24, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 650, fill: 'var(--cc-550)', text: tag }));
    };
    const edge = (g, d, label, lx, ly, back, anchor = 'middle') => {
      g.append(S('path', { d, fill: 'none', stroke: back ? 'var(--critical)' : 'var(--axis)', 'stroke-width': back ? 2.5 : 2, 'stroke-dasharray': back ? '8 7' : 'none', 'marker-end': back ? 'url(#gx-back)' : 'url(#gx-on)' }));
      if (label) g.append(S('text', { x: lx, y: ly, 'text-anchor': anchor, 'font-size': 17, fill: back ? 'var(--critical)' : 'var(--muted)', 'font-weight': back ? 650 : 500, text: label }));
    };
    const defs = S('defs');
    [['gx-on', 'var(--axis)'], ['gx-back', 'var(--critical)']].forEach(([id, c]) => {
      const m = S('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
      m.append(S('path', { d: 'M0,0 L10,5 L0,10 z', fill: c })); defs.append(m);
    });
    svg.prepend(defs);
    const B = [[470, 92], [470, 220], [470, 348]];
    box(gNodes[0], 125, 220, 210, 150, 'agent', 'Plan', ['grills you, writes', 'the spec, splits it', 'into tickets'], 'frontier model');
    [['engine + test', 'game/engine.js'], ['how it looks', 'game/render.js'], ['its button', 'index.html']].forEach(([t, f], i) =>
      box(gNodes[1], B[i][0], B[i][1], 240, 96, 'agent', t, [f, 'own worktree · mid model'], null));
    box(gNodes[2], 805, 220, 190, 120, 'gate', 'Merge + tests', ['plain code,', 'no model'], null);
    box(gNodes[3], 1060, 220, 200, 120, 'gate', '/verify', ['plays wave 1,', 'takes screenshots'], 'an agent with the game');
    box(gNodes[4], 1295, 220, 170, 120, 'end', 'Explainer', ['for you', 'to review'], null);
    B.forEach(([x, y], i) => edge(gEdges[0], `M230,220 C330,220 ${x - 220},${y} ${x - 124},${y}`, i === 0 ? 'a ticket each' : null, 268, 110));
    B.forEach(([x, y], i) => edge(gEdges[1], `M${x + 120},${y} C${x + 210},${y} 620,220 708,220`, i === 0 ? 'a branch each' : null, 668, 76));
    edge(gEdges[1], 'M805,282 C805,430 470,440 470,398', '✕ a failing test goes back to its ticket', 826, 372, true, 'start');
    edge(gEdges[2], 'M900,220 L958,220', null);
    edge(gEdges[2], 'M1060,158 C1060,10 470,0 470,46', '✕ wrong on screen: back, with the screenshot', 765, 18, true);
    edge(gEdges[3], 'M1160,220 L1208,220', null);
    function set(s) {
      const show = (g, on) => { g.style.transition = 'opacity 500ms'; g.setAttribute('opacity', on ? 1 : 0); };
      show(gNodes[0], true);
      [1, 2, 3, 4].forEach((k) => { show(gNodes[k], s >= k); show(gEdges[k - 1], s >= k); });
    }
    set(0);
    return { beats: ['fan out: one agent per ticket, each in its own worktree', 'gate 1: merge and run the tests; a failure goes back to its ticket', 'gate 2: /verify plays it; what looks wrong goes back', 'out: an explainer for you to review'], steps: 4, step: set };
  };

  // ======================================================================
  // Why not always the biggest model? A schematic cost/capability frontier.
  // ======================================================================
  W.pareto = (node) => {
    // Schematic. Each tier mixes labs on purpose: the point is the shape of the frontier, not a ranking of labs.
    const Wd = 960, H = 440, pl = 70, pb = 60, pt = 30, pr = 30;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H, style: 'overflow:visible' });
    const side = U.el('div', { style: { minHeight: '190px' } });
    const tools = U.el('div', { style: { display: 'grid', gap: '12px', marginTop: '26px' } },
      U.el('span', { class: 'chip' }, U.el('span', { class: 'sw' }), '/effort: depth vs speed, same model'),
      U.el('span', { class: 'chip' }, U.el('span', { class: 'sw' }), '/usage: what you spent'),
      U.el('div', { class: 'illus' }, 'schematic · tiers, not benchmark scores'));
    node.append(U.el('div', { class: 'row top', style: { gap: '48px' } }, svg, U.el('div', { style: { flex: 1, paddingTop: '50px' } }, side, tools)));
    const x = (c) => pl + (Math.log10(c) / Math.log10(40)) * (Wd - pl - pr);
    const y = (v) => H - pb - ((v - 40) / 60) * (H - pb - pt);
    svg.append(S('line', { x1: pl, x2: Wd - pr, y1: H - pb, y2: H - pb, stroke: 'var(--axis)' }), S('line', { x1: pl, x2: pl, y1: pt, y2: H - pb, stroke: 'var(--axis)' }),
      S('text', { x: Wd - pr, y: H - 16, 'text-anchor': 'end', 'font-size': 21, fill: 'var(--ink-2)', text: 'cost per task →' }),
      S('text', { x: pl - 18, y: pt + 10, 'text-anchor': 'end', 'font-size': 21, fill: 'var(--ink-2)', transform: `rotate(-90 ${pl - 18} ${pt + 10})`, text: 'capability →' }));
    const tiers = [
      { c: 1.2, v: 57, name: 'Small', who: 'Haiku · Gemini Flash · GPT mini · open-weight', pts: [[1, 55], [1.3, 58], [1.15, 54], [0.9, 52]] },
      { c: 3.6, v: 75, name: 'Mid', who: 'Sonnet · GPT · Gemini Pro', pts: [[3.2, 74], [3.8, 76], [4.2, 73]] },
      { c: 16, v: 90, name: 'Frontier', who: 'Opus · Fable · GPT Pro', pts: [[12, 88], [18, 91], [22, 90]] },
    ];
    const off = [[2.4, 44], [7.5, 58], [14, 76], [30, 82]];
    const gOff = S('g'), gF = S('g'), gT = S('g', { opacity: 0 }), gShift = S('g', { opacity: 0 });
    svg.append(gShift, gOff, gF, gT);
    off.forEach(([c, v]) => gOff.append(S('circle', { cx: x(c), cy: y(v), r: 7, fill: 'var(--axis)', stroke: 'var(--surface)', 'stroke-width': 2 })));
    gF.append(S('path', { d: 'M' + tiers.map((t) => `${x(t.c)},${y(t.v)}`).join(' L'), fill: 'none', stroke: 'var(--cc)', 'stroke-width': 2 }));
    tiers.forEach((t) => {
      t.pts.forEach(([c, v]) => gF.append(S('circle', { cx: x(c), cy: y(v), r: 7, fill: 'var(--cc)', stroke: 'var(--surface)', 'stroke-width': 2 })));
      const top = t.name === 'Frontier', lx = top ? x(t.c) - 10 : x(t.c) + 18, anchor = 'start', dy = top ? 50 : 34;
      gF.append(S('text', { x: lx, y: y(t.v) + dy, 'text-anchor': anchor, 'font-size': 21, 'font-weight': 650, fill: 'var(--ink)', text: t.name }),
        S('text', { x: lx, y: y(t.v) + dy + 24, 'text-anchor': anchor, 'font-size': 17, fill: 'var(--ink-2)', text: t.who }));
    });
    gT.append(S('path', { d: `M${x(3.6)},${y(75)} L${x(5)},${y(84)} L${x(16)},${y(90)}`, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '4 5' }),
      S('circle', { cx: x(5), cy: y(84), r: 11, fill: 'var(--surface)', stroke: 'var(--ink)', 'stroke-width': 3 }),
      S('text', { x: x(5) - 18, y: y(84) - 18, 'text-anchor': 'end', 'font-size': 21, 'font-weight': 650, fill: 'var(--ink)', text: 'frontier plans, small executes' }));
    const moved = [[1, 63], [2.4, 80], [10, 95]];
    gShift.append(S('path', { d: 'M' + moved.map(([c, v]) => `${x(c)},${y(v)}`).join(' L'), fill: 'none', stroke: 'var(--cc-200)', 'stroke-width': 6, 'stroke-linecap': 'round' }),
      S('text', { x: x(10) + 12, y: y(95) + 6, 'font-size': 20, 'font-weight': 650, fill: 'var(--cc-550)', text: 'a few months later' }));
    const notes = [
      ['The frontier', 'No model on the line is beaten on both cost and capability. Anything below it costs more for less.'],
      ['Tier it', 'A frontier model plans; small models do the many small steps.'],
      ['The line keeps moving', 'Build for the next model, not today’s.'],
    ];
    function show(s) {
      gT.setAttribute('opacity', s === 2 ? 1 : 0); gShift.setAttribute('opacity', s >= 3 ? 1 : 0);
      gF.setAttribute('opacity', s >= 1 ? 1 : 0.15); gOff.setAttribute('opacity', s >= 1 ? 1 : 0.15);
      side.innerHTML = '';
      if (s) { const [h, b] = notes[s - 1]; side.append(U.el('div', { style: { animation: 'slide-in 450ms both' } }, U.el('h2', {}, h), U.el('p', { class: 'lead', style: { marginTop: '12px' } }, b))); }
    }
    return { beats: ['the frontier: small, mid and frontier tiers from every lab', 'tiering: a frontier model plans, small ones execute', 'the line moves a few months later'], steps: 3, step(s) { show(s); } };
  };

  // ======================================================================
  // Canary and rollback: the most rehearsed path.
  // ======================================================================
  W.canary = (node) => {
    // Share of traffic on the new version over 12 minutes: 1% canary, widen to 10%, alarm, automatic rollback.
    const Wd = 1300, H = 400, pl = 80, pb = 56, pt = 44, pr = 40, maxY = 12;
    const svg = S('svg', { viewBox: `0 0 ${Wd} ${H}`, width: Wd, height: H, style: 'overflow:visible' });
    const status = U.el('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', fontSize: '30px', fontWeight: 650, marginTop: '18px', minHeight: '44px' } });
    node.append(svg, status, U.el('div', { class: 'illus' }, 'schematic scenario'));
    const x = (m) => pl + (m / 12) * (Wd - pl - pr), y = (v) => H - pb - (v / maxY) * (H - pb - pt);
    [0, 5, 10].forEach((v) => svg.append(S('line', { x1: pl, x2: Wd - pr, y1: y(v), y2: y(v), stroke: v ? 'var(--hair)' : 'var(--axis)' }),
      S('text', { x: pl - 14, y: y(v) + 7, 'text-anchor': 'end', 'font-size': 20, fill: 'var(--muted)', text: v + '%' })));
    [0, 2, 4, 6, 8, 10, 12].forEach((m) => svg.append(S('text', { x: x(m), y: H - 18, 'text-anchor': 'middle', 'font-size': 20, fill: 'var(--muted)', text: m + ' min' })));
    svg.append(S('text', { x: pl, y: pt - 26, 'font-size': 20, fill: 'var(--ink-2)', text: 'traffic on the new version' }));
    const pts = [[0, 0], [0.3, 1], [6, 1], [6.3, 10], [8.2, 10], [8.9, 0], [12, 0]];
    const line = S('path', { fill: 'none', stroke: 'var(--cc)', 'stroke-width': 3, 'stroke-linejoin': 'round' });
    const area = S('path', { fill: 'var(--cc)', opacity: 0.1 });
    const alarm = S('g', { opacity: 0 });
    alarm.append(S('line', { x1: x(8.2), x2: x(8.2), y1: pt + 16, y2: H - pb, stroke: 'var(--critical)', 'stroke-width': 2 }),
      S('text', { x: x(8.2) - 10, y: pt + 8, 'text-anchor': 'end', 'font-size': 21, 'font-weight': 650, fill: 'var(--critical)', text: 'alarm: error rate 4× in the canary' }));
    const rb = S('g', { opacity: 0 });
    rb.append(S('text', { x: x(8.9) + 14, y: y(0) - 16, 'font-size': 21, 'font-weight': 650, fill: 'var(--ink)', text: 'automatic rollback, 40 s after the alarm' }));
    svg.append(area, line, alarm, rb);
    let cancel = () => {};
    const pathTo = (k) => {
      const ps = pts.slice(0, k);
      return 'M' + ps.map(([m, v]) => `${x(m)},${y(v)}`).join(' L');
    };
    function set(s) {
      const k = [1, 3, 5, 7][s];
      line.setAttribute('d', pathTo(k));
      const last = pts[k - 1];
      area.setAttribute('d', pathTo(k) + ` L${x(last[0])},${y(0)} L${x(0)},${y(0)} Z`);
      cancel();
      const len = line.getTotalLength ? line.getTotalLength() : 0;
      line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
      cancel = U.tween(1200, (t) => (line.style.strokeDashoffset = len * (1 - t)));
      alarm.setAttribute('opacity', s >= 2 ? 1 : 0); rb.setAttribute('opacity', s >= 3 ? 1 : 0);
      status.innerHTML = '';
      if (s === 1) status.append(U.el('span', { class: 'ico good' }, '✓'), '1% for six minutes. Error rate normal. Widen.');
      if (s === 2) status.append(U.el('span', { class: 'ico', style: { background: 'var(--warning)', color: 'var(--ink)' } }, '!'), 'At 10%, the alarm fires.');
      if (s === 3) status.append(U.el('span', { class: 'ico bad' }, '↺'), 'Back to 0% in under a minute. Nobody was paged.');
    }
    set(0);
    return { beats: ['1% canary, error rate normal', 'widen to 10%: the alarm fires', 'automatic rollback to 0%'], steps: 3, step(s) { set(s); } };
  };

  // ======================================================================
  // "We removed over 80% of Claude Code's system prompt."
  // ======================================================================
  W.shrink = (node) => {
    const doc = U.el('div', { style: { width: '520px', height: (+node.dataset.h || 560) + 'px' /* data-h leaves room for a row under it */, background: 'var(--card)', border: '1px solid var(--hair)', borderRadius: '16px', padding: '28px 30px', display: 'flex', flexDirection: 'column', gap: '0px', overflow: 'hidden', flex: 'none' } });
    const lines = [];
    const keep = new Set([0, 7, 15, 22, 30, 37, 44]);
    for (let i = 0; i < 46; i++) {
      const w = 40 + ((i * 37) % 55);
      const l = U.el('div', { style: { height: '8px', width: w + '%', borderRadius: '4px', background: keep.has(i) ? 'var(--cc)' : '#d9d8d1', margin: '0 0 3.5px', transition: `height 500ms ${i * 18}ms var(--ease), margin 500ms ${i * 18}ms, opacity 400ms ${i * 18}ms` } });
      lines.push([l, keep.has(i)]); doc.append(l);
    }
    const pct = U.el('div', { style: { fontSize: '170px', fontWeight: 650, letterSpacing: '-0.05em', lineHeight: 1 } }, '100%');
    const side = U.el('div', { style: { flex: 1 } }, U.el('div', { class: 'small' }, 'Claude Code’s system prompt, for Claude 5 models'), pct,
      U.el('p', { class: 'lead', style: { marginTop: '20px' } }, '“…with no measurable loss on our coding evaluations.”'),
      U.el('p', { class: 'small', style: { marginTop: '14px' } }, 'Anthropic, “The new rules of context engineering for Claude 5 generation models”, Jul 2026; vendor-reported. The dashed outline is what was deleted.'));
    node.append(U.el('div', { class: 'row top', style: { gap: '70px' } }, doc, side));
    let cancel = () => {};
    function set(s) {
      doc.style.transition = 'background 600ms 600ms, border-color 600ms 600ms';
      doc.style.background = s >= 1 ? 'transparent' : 'var(--card)';
      doc.style.border = s >= 1 ? '2px dashed var(--axis)' : '1px solid var(--hair)';
      lines.forEach(([l, k]) => { const gone = s >= 1 && !k; l.style.height = gone ? '0px' : '8px'; l.style.margin = gone ? '0' : '0 0 3.5px'; l.style.opacity = gone ? 0 : 1; if (s >= 1 && k) l.style.margin = '0 0 12px'; });
      cancel();
      if (s >= 1) { const from = 100; cancel = U.tween(1400, (k) => (pct.textContent = Math.round(U.lerp(from, 20, k)) + '%' + (k === 1 ? '' : ''))); setTimeout(() => (pct.textContent = '< 20%'), U.reduced ? 0 : 1450); }
      else pct.textContent = '100%';
    }
    return { beats: ['80% of the prompt disappears: under 20% left'], steps: 1, step(s) { set(s); } };
  };
})();
