---
name: verify
description: Answers how the game plays or looks, or proves a change works, by playing it in a real browser and looking at the screenshots. Use for "does X happen", "is X shown", "does it work on a phone", "did my change work".
argument-hint: "[question or change]"
---

# Verify by playing

$ARGUMENTS

Verifying means playing the game in a browser and looking, not reading code or running the tests.
Every claim in the answer points at a line `play.mjs` printed or a screenshot you opened. When the
picture and the code disagree, the picture wins; say so.

## 1. Pin the question

Restate it as something you can see or count: viewport, seed, which wave and which moment, what
counts as yes.
- Behavior ("does", "when", "how many"): the event or the state `play.mjs` prints is the evidence.
- Look ("shown", "visible", "readable", "on a phone"): the screenshot is the evidence.
- A change, or no question: the change is `git status` and `git diff HEAD`. No change: reply
  "nothing to verify" and stop. List every state the changed lines depend on (for the HUD: before the
  first wave, during a wave, between waves, won, lost) and observe each one, not only the one asked
  about.
Never ask a question back: pick what to observe, say what you picked, run.

## 2. Play it

Write a scenario under `.verify/<slug>.json`, never under `scenarios/`. The format is the header of
`play.mjs`: build towers, start waves, advance with `ticks` or `until`, `expect`, `screenshot`.
`"viewport": "phone"` is a phone held sideways.

    node play.mjs .verify/<slug>.json

`FAIL step N` is an expectation that didn't hold. If the expectation was your own guess, fix the
scenario and say so; never weaken one the question implies.

## 3. Look

Take a screenshot at the moment the question is about. Open it with Read and write one sentence on
what a player would see, before you read `game/render.js`, `game/main.js` or `style.css`. Then put it
next to the `view` line: `hud` is the text on screen, `wave`, `lives` and `boss` are the game's
state. When they disagree, show both.

## 4. Before and after, for a change

The same scenario on both sides. The before side runs from an export of `HEAD`, so the working tree
is never stashed or switched:

    rm -rf .verify/base && mkdir -p .verify/base && git archive HEAD | tar -x -C .verify/base
    node .verify/base/play.mjs .verify/<slug>.json --out .verify/before

Open both screenshots.

## 5. Answer

Short, in this order, without narrating the steps:
1. The verdict in one sentence, with the tick (60 a second).
2. The command, and the event and `view` lines that prove it, quoted.
3. Every screenshot path, and your sentence about each.
4. For a change: before and after at the same tick.
5. Last, `npm test`: it guards the rest, it is not the evidence.

## Rules

- Observe only: don't edit the game, `scenarios/` or this skill. Report what you saw, even when it
  wasn't the question.
- Never answer a question about the screen from code alone. Without a screenshot there is no answer yet.
