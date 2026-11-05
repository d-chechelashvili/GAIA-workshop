---
name: feature
description: Builds a new feature for Garden Guard with several agents at once. It asks you about it, writes a spec, splits it into tickets, builds them in parallel in separate worktrees, then tests and verifies the result. Use when asked to add a tower, a beetle or any other feature to the game.
argument-hint: "<what to add, for example a new tower>"
---

# Build a feature with several agents

The person running this is new to it. Before each step, say in one line what you are about to do and
why. Keep the whole thing under 15 minutes.

## 0. Check the folder

Run `git rev-parse --show-toplevel`. If it isn't this folder, stop: this is the copy of the game
inside the workshop repo. Tell the person to `/exit`, `cd` to the `garden-guard` folder that setup
made next to `GAIA-workshop`, and start again there.

## 1. Ask

Ask questions one at a time until you know exactly what to build. Offer a sensible default with each
question, so "yes" is always a fine answer. Cover what it does in play, its numbers (cost, range,
damage, speed), how it looks, and when the player meets it. Six questions at most.

## 2. Spec

Write `docs/spec-<name>.md` with four short sections: What, Rules (the numbers), Done when (one test
that checks the rules, and one thing `/verify` can see on screen in wave 1), and Tickets. Show it and
wait for an OK. Then commit it, `git add docs && git commit -m "spec: <name>"`, so every worktree
starts with it.

## 3. Tickets

Two or three tickets, each owning different files, so no two agents ever edit the same file:

- the rules and a test: `game/engine.js`, `test/engine.test.js`
- how it looks: `game/render.js`
- its button: `index.html`, and `style.css` only if it needs it

## 4. Build in parallel

Start one subagent per ticket, all in the same message so they run at once, each in its own worktree
(worktree isolation). Paste the whole spec into each one's prompt, since its worktree may not have
the spec commit, and give it only its own ticket. Tell each to touch only its files and to commit
its work on its branch. Tell the person how many agents are running and what each one does.

## 5. Merge and test

Merge each agent's branch into the current branch, then run `npm test`. If a test fails, send the
failure to the agent whose files it is about, then merge again.

## 6. Prove it

Run `/verify` on the spec's "Done when" question. If this repo has no `/verify` skill, play wave 1
with `node play.mjs` (its header has the scenario format), take a screenshot and say what it shows.

## 7. Report

Five lines: the spec, which agent built what, the test result, what `/verify` saw, and anything left
to do.
