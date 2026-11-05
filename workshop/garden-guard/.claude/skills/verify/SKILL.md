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

Write a scenario to `.verify/<slug>.json` with your file-writing tool (not a shell heredoc), never
under `scenarios/`. The format is the header of `play.mjs`: build towers, start waves, advance with
`ticks` or `until`, `expect`, `screenshot`. `"viewport": "phone"` is a phone held sideways.

    node play.mjs .verify/<slug>.json

Run it exactly so: no `cd`, pipes or loops around it, which would each need the person's approval.

`FAIL step N` is an expectation that didn't hold. If the expectation was your own guess, fix the
scenario and say so; never weaken one the question implies.

## 3. Look

Take a screenshot at the moment the question is about. Open it with Read and write one sentence on
what a player would see, before you read `game/render.js`, `game/main.js` or `style.css`. Then put it
next to the game's state at that moment, the `view` on its `screenshot` line: `hud` is the text on
screen, `wave`, `lives` and `boss` are the game's state. When they disagree, show both.

## 4. Before and after, for a change

The same scenario on both sides: `node play.mjs` for after, and for before, the game as it was at the
last commit (the working tree is never stashed or switched):

    node .claude/skills/verify/before.mjs .verify/<slug>.json

Its screenshots land in `.verify/before/` under the same names. Open both.

## 5. Show it

Put the answer on one page, which opens in the browser. Write `.verify/<slug>.report.json`:

    {"question": "the question, as asked", "verdict": "yes" | "no" | "partly" | "unclear",
     "headline": "the verdict in one sentence a player would understand",
     "command": "node play.mjs .verify/<slug>.json",
     "shots": [{"file": ".verify/shots/you/<name>.png", "ok": true,
                "saw": "your sentence on what a player sees",
                "before": ".verify/before/you/<name>.png"}]}

One entry per screenshot you opened, in the order of the game. `ok` is whether that screenshot shows
what it should at that moment. `before` only for a change. Write it with your file-writing tool, then:

    node .claude/skills/verify/report.mjs .verify/<slug>.report.json

The page finds the game's state and moment for each screenshot itself, and shows which moments of the
game you didn't look at.

## 6. Answer

Short, in this order, without narrating the steps:
1. The verdict in one sentence, with the tick (60 a second).
2. The command, and the event and `view` lines that prove it, quoted.
3. Every screenshot path, and your sentence about each.
4. For a change: before and after at the same tick.
5. The report's path.
6. Last, `npm test`: it guards the rest, it is not the evidence.

## Rules

- Observe only: write only under `.verify/`; don't edit the game, `scenarios/` or this skill. Report
  what you saw, even when it wasn't the question.
- Never answer a question about the screen from code alone. Without a screenshot there is no answer yet.
