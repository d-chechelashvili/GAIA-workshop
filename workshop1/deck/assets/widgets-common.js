/* Widgets used by both sessions: count-up numbers, countdown timers, how skills load, the three lanes. */
(function () {
  const W = window.Widgets, U = window.U;

  // Counts every [data-to] inside up from 0 at local step 1 (or on enter with data-onenter).
  W.count = (node) => {
    const nums = [...node.querySelectorAll('[data-to]')];
    const onEnter = node.hasAttribute('data-onenter');
    let done = false, cancels = [];
    const run = () => {
      if (done) return; done = true;
      nums.forEach((n, i) => setTimeout(() => cancels.push(U.countUp(n, +n.dataset.to, +(n.dataset.ms || 1400), +(n.dataset.dec || 0))), i * 180));
    };
    const reset = () => { done = false; cancels.forEach((c) => c()); nums.forEach((n) => (n.textContent = (n.dataset.prefix || '') + '0' + (n.dataset.suffix || ''))); };
    reset();
    return {
      beats: ['the numbers count up'], steps: onEnter ? 0 : 1,
      enter() { if (onEnter) { reset(); setTimeout(run, 300); } },
      step(s) { if (!onEnter) (s >= 1 ? run() : reset()); },
      leave() { reset(); },
    };
  };

  // Countdown for breaks and workshops. Click to pause; it starts when the slide opens.
  W.timer = (node) => {
    const total = +(node.dataset.min || 10) * 60;
    let left = total, t = null, paused = false;
    const big = U.el('div', { style: { fontSize: node.dataset.size === 'm' ? '120px' : '200px', fontWeight: 650, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 } });
    const bar = U.el('div', { style: { height: '8px', borderRadius: '4px', background: 'var(--cc)', width: '100%', transition: 'width 1s linear' } });
    const track = U.el('div', { style: { height: '8px', borderRadius: '4px', background: 'var(--cc-100)', marginTop: '28px', overflow: 'hidden' } }, bar);
    const hint = U.el('div', { class: 'small presenter-only', style: { marginTop: '14px' } }, 'click the clock to pause');
    node.append(big, track, hint);
    const draw = () => {
      big.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      bar.style.width = (left / total) * 100 + '%';
      big.style.color = left === 0 ? 'var(--critical)' : 'var(--ink)';
    };
    big.style.cursor = 'pointer';
    big.addEventListener('click', () => { paused = !paused; hint.textContent = paused ? 'paused · click to resume' : 'click the clock to pause'; });
    draw();
    return {
      enter() { left = total; draw(); t = setInterval(() => { if (!paused && left > 0) { left--; draw(); } }, 1000); },
      leave() { clearInterval(t); },
    };
  };

  // Skills: only a one-line description sits in the context; the full instructions load when a task needs them.
  const box = (style, ...kids) => U.el('div', { style }, ...kids);
  W.skillload = (node) => {
    const bar = box({ display: 'flex', gap: '3px', height: '64px', borderRadius: '12px', overflow: 'hidden', background: '#efeee9' });
    const seg = (w, c, l) => U.el('div', { style: { width: w + '%', background: c, color: '#fff', fontSize: '18px', fontWeight: 650, display: 'grid', placeItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', transition: 'width 800ms var(--ease)' } }, l);
    const sys = seg(14, '#2a78d6', 'system + tools'), conv = seg(22, '#008300', 'conversation'), desc = seg(0, '#eda100', ''), body = seg(0, '#6250d6', '');
    bar.append(sys, conv, desc, body);
    const list = box({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '28px' });
    const skills = ['release-notes: write release notes from merged PRs', 'db-migration: plan a safe schema migration', 'review: review a diff for bugs', 'incident: draft an incident summary', 'perf: profile a slow endpoint', 'onboarding: explain a module to a newcomer'];
    const chips = skills.map((t) => { const [n, d] = t.split(': '); const c = box({ padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--hair)', background: 'var(--card)', fontSize: '20px', opacity: 0, transition: 'opacity 400ms, border-color 400ms' }, U.el('b', { class: 'mono', style: { fontSize: '19px' } }, n), U.el('div', { style: { color: 'var(--ink-2)', marginTop: '2px' } }, d)); list.append(c); return c; });
    const msg = U.el('div', { style: { fontSize: '26px', fontWeight: 600, marginTop: '24px', minHeight: '40px' } });
    node.append(U.el('div', { class: 'small', style: { marginBottom: '10px' } }, 'the context window'), bar, list, msg);
    function set(s) {
      desc.style.width = s >= 1 ? '6%' : '0%'; desc.textContent = s >= 1 ? 'skill lines' : '';
      chips.forEach((c, i) => { c.style.opacity = s >= 1 ? 1 : 0; c.style.transitionDelay = s >= 1 ? i * 80 + 'ms' : '0ms'; c.style.borderColor = s >= 3 && i === 0 ? '#6250d6' : 'var(--hair)'; });
      body.style.width = s >= 3 ? '18%' : '0%'; body.textContent = s >= 3 ? 'release-notes, in full' : '';
      msg.textContent = s === 1 ? 'Only each skill’s name and one-line description is always in the context.' : s === 2 ? 'You ask: “write the release notes for 2.3”.' : s >= 3 ? 'The matching skill loads in full, only now, only that one.' : '';
    }
    set(0);
    return { beats: ['the descriptions: always loaded, tiny', 'a task arrives', 'the one matching skill loads in full'], steps: 3, step: set };
  };

  // The Claude Code lane strip for one era, on its title card.
  W.lanechips = (node, { data }) => {
    const era = +node.dataset.era;
    const row = U.el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' } });
    node.append(U.el('div', { style: { fontSize: '18px', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--muted)', marginBottom: '12px' } }, 'Shipped in Claude Code'));
    data.cc.filter((f) => f[0] === era).forEach((f) => row.append(U.el('span', { class: 'chip' + (f[2] === era ? ' removed' : ''), style: { fontSize: '18px', padding: '6px 13px' } }, U.el('span', { class: 'sw', style: f[2] === era ? { background: 'var(--critical)' } : {} }), U.el('span', { class: 'label' }, f[1]))));
    node.append(row);
    return {};
  };
})();

// Schematic distributions for "why 7": rendered once at load, revealed by data-step.
document.addEventListener('DOMContentLoaded', () => {
  const shapes = {
    flat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    human: [0.35, 0.5, 0.9, 0.7, 0.75, 0.6, 1.9, 0.75, 0.55, 0.3],
    llm: [0.02, 0.03, 0.1, 0.04, 0.05, 0.03, 3.3, 0.06, 0.03, 0.01],
  };
  document.querySelectorAll('.mini-dist').forEach((d) => {
    const v = shapes[d.dataset.shape] || shapes.flat, mx = 3.3;
    v.forEach((x, i) => { const b = document.createElement('i'); b.style.height = (x / mx) * 100 + '%'; if (i !== 6 || d.dataset.shape === 'flat') b.className = 'dim'; d.append(b); });
  });
});
