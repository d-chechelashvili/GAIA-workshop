/* Garden Guard: the rules. Deterministic: 60 ticks a second, integers only, one seeded RNG,
   nothing reads a clock. Runs in the page (window.GardenGuard) and in Node (require) for the tests. */
(function (root, make) {
  if (typeof module === 'object' && module.exports) module.exports = make();
  else root.GardenGuard = make();
})(this, function () {
  const COLS = 12, ROWS = 8, TILE = 48, SUB = 16; // positions are in 1/16 of a pixel
  // The beetles' road, as turning points from the gate (left edge) to the greenhouse (bottom right).
  const ROAD_TURNS = [[0, 1], [8, 1], [8, 4], [3, 4], [3, 7], [11, 7]];
  const TREES = [[2, 0], [5, 3], [6, 3], [10, 3], [6, 6]];
  const TOWERS = {
    thorn: { cost: 50, range: 2.5 * TILE, damage: 4, cooldown: 30 },
    sprinkler: { cost: 80, range: 2 * TILE, damage: 1, cooldown: 40, slow: 90 },
  };
  const BEETLES = {
    beetle: { hp: 10, speed: 16, bounty: 5, bite: 1 },
    stag: { hp: 120, speed: 10, bounty: 50, bite: 5 }, // the boss of the last wave
  };
  const WAVES = [
    [['beetle', 6]],
    [['beetle', 10]],
    [['beetle', 8], ['stag', 1]],
  ];
  const SPAWN_GAP = 45;

  const road = [];
  for (let i = 0; i + 1 < ROAD_TURNS.length; i++) {
    const [c0, r0] = ROAD_TURNS[i], [c1, r1] = ROAD_TURNS[i + 1];
    const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
    for (let c = c0, r = r0; c !== c1 || r !== r1; c += dc, r += dr) road.push([c, r]);
  }
  road.push(ROAD_TURNS[ROAD_TURNS.length - 1]);
  const onRoad = new Set(road.map(([c, r]) => c + ',' + r));
  const hasTree = new Set(TREES.map(([c, r]) => c + ',' + r));
  const STEP = TILE * SUB; // road length of one tile, in subpixels
  const ROAD_LENGTH = (road.length - 1) * STEP;

  // Where a beetle is, in pixels, after travelling `dist` subpixels along the road.
  function along(dist) {
    const i = Math.min(road.length - 2, Math.floor(dist / STEP)), f = (dist - i * STEP) / STEP;
    const [c0, r0] = road[i], [c1, r1] = road[i + 1];
    return { x: (c0 + (c1 - c0) * f) * TILE + TILE / 2, y: (r0 + (r1 - r0) * f) * TILE + TILE / 2 };
  }

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function newGame({ seed = 1 } = {}) {
    const random = rng(seed);
    const s = { tick: 0, phase: 'build', wave: 0, lives: 10, gold: 150, enemies: [], towers: [], shots: [], queue: [], nextSpawn: 0, nextId: 1 };
    const events = [];
    let eventId = 0;
    const emit = (type, data = {}) => events.push(Object.assign({ id: ++eventId, tick: s.tick, type }, data));

    function build(kind, col, row) {
      const t = TOWERS[kind];
      if (!t) return { ok: false, error: 'no tower called ' + kind };
      if (s.phase === 'won' || s.phase === 'lost') return { ok: false, error: 'the game is over' };
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return { ok: false, error: 'outside the garden' };
      const key = col + ',' + row;
      if (onRoad.has(key)) return { ok: false, error: 'that tile is road' };
      if (hasTree.has(key)) return { ok: false, error: 'a tree is there' };
      if (s.towers.some((x) => x.col === col && x.row === row)) return { ok: false, error: 'already built there' };
      if (s.gold < t.cost) return { ok: false, error: 'not enough gold' };
      s.gold -= t.cost;
      s.towers.push({ id: s.nextId++, kind, col, row, ready: s.tick });
      emit('tower_built', { kind, col, row });
      return { ok: true };
    }

    function startWave() {
      if (s.phase !== 'build') return { ok: false, error: 'a wave is already running' };
      if (s.wave >= WAVES.length) return { ok: false, error: 'no waves left' };
      s.wave += 1; // waves started so far: 1 during the first wave
      s.queue = [];
      for (const [kind, n] of WAVES[s.wave - 1]) for (let i = 0; i < n; i++) s.queue.push(kind);
      s.phase = 'wave';
      s.nextSpawn = s.tick;
      emit('wave_started', { wave: s.wave });
      return { ok: true };
    }

    function tick() {
      if (s.phase === 'wave') {
        if (s.queue.length && s.tick >= s.nextSpawn) {
          const kind = s.queue.shift(), b = BEETLES[kind];
          s.enemies.push({ id: s.nextId++, kind, hp: b.hp, maxHp: b.hp, dist: 0, slowUntil: -1 });
          s.nextSpawn = s.tick + SPAWN_GAP + Math.floor(random() * 10);
          emit(kind === 'stag' ? 'boss_spawned' : 'enemy_spawned', { kind });
        }
        for (const e of s.enemies) {
          const speed = BEETLES[e.kind].speed;
          e.dist += e.slowUntil > s.tick ? speed >> 1 : speed;
        }
        for (const e of s.enemies.filter((x) => x.dist >= ROAD_LENGTH)) {
          s.lives = Math.max(0, s.lives - BEETLES[e.kind].bite);
          emit('enemy_leaked', { kind: e.kind, lives: s.lives });
        }
        s.enemies = s.enemies.filter((x) => x.dist < ROAD_LENGTH);
        for (const t of s.towers) {
          if (t.ready > s.tick) continue;
          const spec = TOWERS[t.kind], tx = t.col * TILE + TILE / 2, ty = t.row * TILE + TILE / 2;
          let target = null;
          for (const e of s.enemies) {
            const p = along(e.dist);
            if (Math.hypot(p.x - tx, p.y - ty) <= spec.range && (!target || e.dist > target.dist)) target = e;
          }
          if (!target) continue;
          target.hp -= spec.damage;
          if (spec.slow) {
            if (target.slowUntil <= s.tick) emit('enemy_slowed', { kind: target.kind });
            target.slowUntil = s.tick + spec.slow;
          }
          const p = along(target.dist);
          s.shots.push({ kind: t.kind, x0: tx, y0: ty, x1: Math.round(p.x), y1: Math.round(p.y), ttl: 8 });
          t.ready = s.tick + spec.cooldown;
          if (target.hp <= 0) {
            s.gold += BEETLES[target.kind].bounty;
            emit('enemy_defeated', { kind: target.kind, gold: s.gold });
          }
        }
        s.enemies = s.enemies.filter((x) => x.hp > 0);
        if (s.lives === 0) { s.phase = 'lost'; emit('lost'); }
        else if (!s.queue.length && !s.enemies.length) {
          emit('wave_cleared', { wave: s.wave });
          s.phase = s.wave === WAVES.length ? 'won' : 'build';
          if (s.phase === 'won') emit('won');
        }
      }
      for (const sh of s.shots) sh.ttl--;
      s.shots = s.shots.filter((x) => x.ttl > 0);
      s.tick++;
    }

    return {
      state: s,
      events,
      build,
      startWave,
      step(n = 1) { for (let i = 0; i < n; i++) tick(); },
      where: (e) => along(e.dist),
    };
  }

  return { newGame, COLS, ROWS, TILE, SUB, ROAD: road, TREES, TOWERS, BEETLES, WAVES };
});
