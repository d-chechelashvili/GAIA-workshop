/* Garden Guard: drawing. Reads the state, never changes it. */
(function (root) {
  const G = root.GardenGuard;
  const { TILE, COLS, ROWS } = G;
  const C = { grassA: '#8fca6a', grassB: '#86c262', road: '#e2c48d', roadEdge: '#c9a66b', trunk: '#7a5230', leaf: '#2f7d3a', leafHi: '#3f9449', glass: '#bfe3f2', frame: '#4e6b7a', thorn: '#3d6b2a', spike: '#2a2a22', water: '#3b8fd9', shell: '#7b2d26', shellHi: '#a8463c', stag: '#3a2a1e', stagHi: '#5b4330', leg: '#2a1a14', bar: '#d33', barBg: '#3a1010', barOk: '#3c3' };

  function draw(ctx, game) {
    const s = game.state, t = s.tick;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? C.grassA : C.grassB;
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
    for (const [c, r] of G.ROAD) {
      ctx.fillStyle = C.roadEdge; ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      ctx.fillStyle = C.road; ctx.fillRect(c * TILE + 3, r * TILE + 3, TILE - 6, TILE - 6);
    }
    const [gc, gr] = G.ROAD[G.ROAD.length - 1];
    greenhouse(ctx, gc * TILE, gr * TILE);
    for (const tw of s.towers) tower(ctx, tw, t);
    for (const e of s.enemies) {
      const p = game.where(e);
      beetle(ctx, e, p, t);
      if (e.hp < e.maxHp || e.kind === 'stag') healthBar(ctx, e, p);
    }
    for (const [c, r] of G.TREES) tree(ctx, c * TILE + TILE / 2, r * TILE + TILE / 2);
    for (const sh of s.shots) shot(ctx, sh);
  }

  function greenhouse(ctx, x, y) {
    ctx.fillStyle = C.frame; ctx.fillRect(x + 4, y + 10, TILE - 8, TILE - 14);
    ctx.fillStyle = C.glass; ctx.fillRect(x + 7, y + 13, TILE - 14, TILE - 20);
    ctx.strokeStyle = C.frame; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 4, y + 10); ctx.lineTo(x + TILE / 2, y + 2); ctx.lineTo(x + TILE - 4, y + 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + TILE / 2, y + 13); ctx.lineTo(x + TILE / 2, y + TILE - 7); ctx.stroke();
  }

  function tower(ctx, tw, t) {
    const x = tw.col * TILE + TILE / 2, y = tw.row * TILE + TILE / 2;
    if (tw.kind === 'thorn') {
      ctx.fillStyle = C.thorn; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.spike;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13); ctx.lineTo(x + Math.cos(a + 0.2) * 20, y + Math.sin(a + 0.2) * 20); ctx.lineTo(x + Math.cos(a + 0.4) * 13, y + Math.sin(a + 0.4) * 13); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#d8dde0'; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.water; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.water; ctx.lineWidth = 2;
      const k = (t % 40) / 40;
      ctx.beginPath(); ctx.arc(x, y, 14 + k * 10, 0, Math.PI * 2); ctx.globalAlpha = 1 - k; ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  function beetle(ctx, e, p, t) {
    const big = e.kind === 'stag', s = big ? 1.7 : 1, slowed = e.slowUntil > t;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.strokeStyle = C.leg; ctx.lineWidth = 2;
    const step = Math.sin(t / (slowed ? 6 : 3)) * 3;
    for (const side of [-1, 1]) for (const k of [-6, 0, 6]) {
      ctx.beginPath(); ctx.moveTo(k * s, 0); ctx.lineTo((k + (k === 0 ? step : -step)) * s, side * 12 * s); ctx.stroke();
    }
    ctx.fillStyle = big ? C.stag : C.shell; ctx.beginPath(); ctx.ellipse(0, 0, 11 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = big ? C.stagHi : C.shellHi; ctx.beginPath(); ctx.ellipse(-2 * s, -2 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    if (big) {
      ctx.strokeStyle = C.stag; ctx.lineWidth = 3;
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(10 * s, side * 3); ctx.quadraticCurveTo(18 * s, side * 10, 22 * s, side * 2); ctx.stroke(); }
    }
    if (slowed) { ctx.fillStyle = 'rgba(80,160,255,.45)'; ctx.beginPath(); ctx.ellipse(0, 0, 12 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function healthBar(ctx, e, p) {
    const w = e.kind === 'stag' ? 40 : 22, y = p.y - (e.kind === 'stag' ? 26 : 18);
    ctx.fillStyle = C.barBg; ctx.fillRect(p.x - w / 2, y, w, 5);
    ctx.fillStyle = e.hp / e.maxHp > 0.4 ? C.barOk : C.bar;
    ctx.fillRect(p.x - w / 2, y, Math.max(0, (w * e.hp) / e.maxHp), 5);
  }

  function tree(ctx, x, y) {
    ctx.fillStyle = C.trunk; ctx.fillRect(x - 4, y + 6, 8, 14);
    ctx.fillStyle = C.leaf; ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.leafHi; ctx.beginPath(); ctx.arc(x - 8, y - 8, 14, 0, Math.PI * 2); ctx.fill();
  }

  function shot(ctx, sh) {
    ctx.globalAlpha = sh.ttl / 8;
    if (sh.kind === 'thorn') { ctx.strokeStyle = C.spike; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sh.x0, sh.y0); ctx.lineTo(sh.x1, sh.y1); ctx.stroke(); }
    else { ctx.fillStyle = C.water; for (let i = 1; i <= 4; i++) { const f = i / 5; ctx.beginPath(); ctx.arc(sh.x0 + (sh.x1 - sh.x0) * f, sh.y0 + (sh.y1 - sh.y0) * f - Math.sin(f * Math.PI) * 10, 3, 0, Math.PI * 2); ctx.fill(); } }
    ctx.globalAlpha = 1;
  }

  root.GardenRender = { draw };
})(this);
