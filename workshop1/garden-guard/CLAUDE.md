# Garden Guard

- Plain JS, no build, no npm dependencies. `index.html` opens straight from disk. Node 18+ runs the tools and the tests.
- `game/engine.js` must stay deterministic and loadable by Node: no `Math.random`, `Date` or DOM in it.
