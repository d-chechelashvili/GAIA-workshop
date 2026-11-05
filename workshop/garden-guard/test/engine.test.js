const test = require('node:test');
const assert = require('node:assert');
const G = require('../game/engine.js');

const DEFENSE = [['thorn', 4, 6], ['thorn', 2, 6], ['thorn', 2, 5]];
function playAll(seed = 1) {
  const g = G.newGame({ seed });
  for (const [k, c, r] of DEFENSE) assert.ok(g.build(k, c, r).ok);
  for (let w = 0; w < G.WAVES.length && g.state.phase !== 'lost'; w++) {
    g.startWave();
    for (let i = 0; i < 20000 && g.state.phase === 'wave'; i++) g.step(1);
  }
  return g;
}

test('the same seed plays the same game', () => {
  assert.strictEqual(JSON.stringify(playAll(7).state), JSON.stringify(playAll(7).state));
});

test('towers cost gold and only go on free grass', () => {
  const g = G.newGame();
  assert.deepStrictEqual(g.build('thorn', 0, 1), { ok: false, error: 'that tile is road' });
  assert.deepStrictEqual(g.build('thorn', 5, 3), { ok: false, error: 'a tree is there' });
  assert.ok(g.build('thorn', 2, 2).ok);
  assert.strictEqual(g.state.gold, 100);
  assert.deepStrictEqual(g.build('sprinkler', 2, 2), { ok: false, error: 'already built there' });
});

test('wave counts the waves started so far', () => {
  const g = G.newGame();
  assert.strictEqual(g.state.wave, 0);
  g.startWave();
  assert.strictEqual(g.state.wave, 1);
  assert.strictEqual(g.state.phase, 'wave');
});

test('three waves, with the stag beetle in the last', () => {
  const g = playAll();
  assert.strictEqual(g.state.phase, 'won');
  const boss = g.events.find((e) => e.type === 'boss_spawned');
  const third = g.events.find((e) => e.type === 'wave_started' && e.wave === 3);
  assert.ok(boss && boss.tick >= third.tick);
});

test('a sprinkler slows a beetle to half speed', () => {
  const g = G.newGame();
  g.build('sprinkler', 1, 2);
  g.startWave();
  let slowed = null;
  for (let i = 0; i < 300 && !slowed; i++) { g.step(1); slowed = g.state.enemies.find((e) => e.slowUntil > g.state.tick); }
  assert.ok(slowed, 'a beetle got slowed');
  const before = slowed.dist;
  g.step(1);
  assert.strictEqual(slowed.dist - before, G.BEETLES.beetle.speed / 2);
});

test('a beetle that reaches the greenhouse costs a life', () => {
  const g = G.newGame();
  g.startWave();
  for (let i = 0; i < 2000 && !g.events.some((e) => e.type === 'enemy_leaked'); i++) g.step(1);
  assert.strictEqual(g.state.lives, 9);
});
