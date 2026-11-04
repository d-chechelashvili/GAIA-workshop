# Garden Guard

A small tower-defense game. Beetles march down the garden road toward the greenhouse; you plant
thorn bushes (they hit) and sprinklers (they slow), then start each of the three waves. The last
wave brings a stag beetle. Plain JavaScript and a canvas: no build, no npm dependencies. It is the
practice repo for the skills workshop in `WORKSHOP.md` (in Georgian: `WORKSHOP.ka.md`).

## Play it

Open `index.html` in a browser. Pick a tower in the bar at the bottom, click a grass tile to plant
it, then **Start wave**. `?seed=N` picks the seed; `?clock=manual` stops the clock, so only
`window.__game.step(n)` moves time.

## Check it

    node doctor.mjs                              # is this machine ready (Node 18+, a browser, git)
    npm test                                     # the engine's unit tests
    node play.mjs scenarios/first-wave.json      # play a scenario in a real browser, headless
    node play.mjs scenarios/first-wave.json --watch   # the same, in a window you can watch

`play.mjs` drives the Chrome, Edge or Chromium already on the machine, over Chrome's own control
pipe: nothing to install, no network port. Its header documents the scenario format: build towers,
start waves, advance ticks, expect state or events, take screenshots. Screenshots go to
`.verify/shots/`, and `.verify/gallery.html` shows the newest ones side by side.

## How it is built

- `game/engine.js`: the rules. Deterministic (60 ticks a second, integers, one seeded RNG, no
  clocks), and loadable by Node, which is how `test/` checks it.
- `game/render.js`: draws the garden on the canvas from the state.
- `game/main.js`: the page: the HUD and the build bar (DOM), input, the game loop, and
  `window.__game`, the hook `play.mjs` drives.
- `race.mjs`: lays out the workshop's race in the Herdr app: both Claudes, a pane that asks both,
  and a feed of what each one plays. `lane.mjs` starts one of the two Claudes, `plain` (no skills)
  or `yours`; `gallery.mjs` keeps the feed and the screenshot gallery. `browser.mjs` finds the
  Chrome, Edge or Chromium that `play.mjs` drives and the gallery opens in.

`.claude/settings.json` lets Claude Code run the game, the tests and read-only git without asking,
and keeps `WORKSHOP.md`, `WORKSHOP.ka.md`, any `solutions/` folder, everything outside this folder and the
web out of its reach, so Claude works here as it would on any repo, without the answers.
