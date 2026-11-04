/* Garden Guard: the page. The HUD and build bar are DOM; the garden is a canvas.
   ?seed=N picks the seed; ?clock=manual stops the clock so only window.__game.step(n) moves time. */
(function () {
  const G = window.GardenGuard, R = window.GardenRender;
  const q = new URLSearchParams(location.search);
  const game = G.newGame({ seed: +(q.get('seed') || 1) });
  const manual = q.get('clock') === 'manual';
  const canvas = document.getElementById('garden'), ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = G.COLS * G.TILE * dpr; canvas.height = G.ROWS * G.TILE * dpr;
  ctx.scale(dpr, dpr);
  const hud = { wave: document.getElementById('wave'), lives: document.getElementById('lives'), gold: document.getElementById('gold'), banner: document.getElementById('banner') };
  let picked = null;

  function paint() {
    const s = game.state;
    R.draw(ctx, game);
    hud.wave.textContent = 'Wave ' + (s.wave + 1) + '/' + G.WAVES.length;
    hud.lives.textContent = '♥ ' + s.lives;
    hud.gold.textContent = '◎ ' + s.gold;
    hud.banner.textContent = s.phase === 'won' ? 'The garden is safe!' : s.phase === 'lost' ? 'The beetles got in.' : '';
    document.querySelectorAll('[data-tower]').forEach((b) => {
      b.classList.toggle('picked', b.dataset.tower === picked);
      b.disabled = s.gold < G.TOWERS[b.dataset.tower].cost;
    });
    document.getElementById('start').disabled = s.phase !== 'build';
  }

  document.querySelectorAll('[data-tower]').forEach((b) => b.addEventListener('click', () => { picked = picked === b.dataset.tower ? null : b.dataset.tower; paint(); }));
  document.getElementById('start').addEventListener('click', () => { game.startWave(); paint(); });
  canvas.addEventListener('click', (ev) => {
    if (!picked) return;
    const r = canvas.getBoundingClientRect();
    const col = Math.floor(((ev.clientX - r.left) / r.width) * G.COLS), row = Math.floor(((ev.clientY - r.top) / r.height) * G.ROWS);
    if (game.build(picked, col, row).ok) picked = null;
    paint();
  });

  let last = performance.now(), carry = 0;
  function frame(now) {
    if (!manual) {
      carry += Math.min(250, now - last) * 0.06; // 60 ticks a second
      const n = Math.floor(carry); carry -= n; game.step(n);
    }
    last = now; paint(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // The test hook play.mjs drives. Reads return copies; only step, build and startWave change the game.
  window.__game = {
    step(n) { game.step(n); paint(); return game.state.tick; },
    // Steps one tick at a time until an event of this type appears after event `since`; at most `max` ticks.
    until(type, max, since = 0) {
      for (let i = 0; i < max; i++) { game.step(1); if (game.events.some((e) => e.id > since && e.type === type)) break; }
      paint(); return game.state.tick;
    },
    build(kind, col, row) { const r = game.build(kind, col, row); paint(); return r; },
    startWave() { const r = game.startWave(); paint(); return r; },
    events: (since = 0) => game.events.filter((e) => e.id > since),
    view() {
      const s = game.state, boss = s.enemies.find((e) => e.kind === 'stag');
      const at = (e) => { const p = game.where(e); return { x: Math.round(p.x), y: Math.round(p.y) }; };
      return {
        tick: s.tick, phase: s.phase, wave: s.wave, lives: s.lives, gold: s.gold,
        beetles: s.enemies.length, towers: s.towers.length,
        boss: boss ? Object.assign({ hp: boss.hp }, at(boss)) : null,
        hud: [hud.wave, hud.lives, hud.gold].map((x) => x.textContent).join(' · '),
      };
    },
    caption(text, lane) {
      const c = document.getElementById('caption');
      c.textContent = text; c.dataset.lane = lane || ''; c.hidden = !text;
    },
  };
})();
