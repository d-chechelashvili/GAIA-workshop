# Garden Guard

A small tower-defense game. Beetles march down the garden road toward the greenhouse; you plant
thorn bushes (they hit) and sprinklers (they slow), then start each of the three waves. The last
wave brings a stag beetle. Plain JavaScript and a canvas: no build, no npm dependencies. It is the
practice repo for the skills workshop in `WORKSHOP.md` (in Georgian: `WORKSHOP.ka.md`).

## Play it

Open `index.html` in a browser. Pick a tower in the bar at the bottom, click a grass tile to plant
it, then **Start wave**. **2× speed** runs the clock twice as fast (click again for normal speed). `?seed=N` picks the seed; `?clock=manual` stops the clock, so only
`window.__game.step(n)` moves time.

## Check it

    node doctor.mjs                              # is this machine ready (Node 18+, a browser, git)
    npm test                                     # the engine's unit tests
    node play.mjs scenarios/first-wave.json      # play a scenario in a real browser, headless
    node play.mjs scenarios/first-wave.json --watch   # the same, in a window you can watch

`play.mjs` drives the Chrome, Edge or Chromium already on the machine, over Chrome's own control
pipe: nothing to install, no network port. Its header documents the scenario format: build towers,
start waves, advance ticks, expect state or events, take screenshots. Screenshots go to
`.verify/shots/`, each with the game's state at that moment.

## How it is built

- `game/engine.js`: the rules. Deterministic (60 ticks a second, integers, one seeded RNG, no
  clocks), and loadable by Node, which is how `test/` checks it.
- `game/render.js`: draws the garden on the canvas from the state.
- `game/main.js`: the page: the HUD and the build bar (DOM), input, the game loop, and
  `window.__game`, the hook `play.mjs` drives.
- `browser.mjs` finds the Chrome, Edge or Chromium that `play.mjs` drives.
- `plain.mjs` starts Claude with skills switched off, to compare with `/verify`.
- `.claude/skills/verify/`: `/verify`, which answers questions about the game by playing it and
  looking at screenshots, then opens a one-page report (`report.mjs`; `before.mjs` plays the last
  commit for a before-and-after). The first workshop uses it.
- `.claude/skills/feature/`: the second workshop in one skill. `/feature a new tower` asks you
  about it, writes a spec, builds its tickets with one agent each in separate worktrees, then tests
  and verifies the result.

`.claude/settings.json` lets Claude Code run the game, the tests, `/verify`'s report and the git steps of
`/feature` without asking, opens a window whenever Claude plays (`PLAY_WATCH`),
and keeps `WORKSHOP.md`, `WORKSHOP.ka.md` and the web out of its reach, so Claude works here as it would on any
repo, without the answers.
