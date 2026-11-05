# Skills workshop: verify by playing

The game comes with a `/verify` skill: it answers questions about the game by playing it in a real
browser, then opens a report of what it saw. You'll ask Claude the same question without the skill
and with it, then have Claude fix the bug, prove the fix with the skill, and commit it.

## Before you start

1. Node 18 or newer, and Chrome, Edge or Chromium.
2. In this folder: `node doctor.mjs`, until it prints `ready`.
3. Run `claude` once here and choose **Yes, I trust this folder**. The default answer is No, because
   this repo pre-approves the game's commands. Then `/exit`.

## Play it first

Open `index.html` in Chrome. Plant a few thorn bushes and sprinklers, start a wave or two, and watch
the screen. You'll judge what Claude says it saw, so know the game first.

## Without /verify, then with it

1. **Ask Claude without skills.** In this folder:

       node plain.mjs

   This is Claude with skills switched off: it can't use, read or run them, as in a repo without
   your skill. Ask:

       During wave 2, does the HUD show the right wave number?

   Read its answer. Did it play the game or read the code? Did it show you anything? Did it offer to
   change the code? Then `/exit`.

2. **Read the skill: `.claude/skills/verify/SKILL.md`.** It comes with the game. Look at two things:
   - The `description`: the only part that's always in Claude's context, so it decides when the
     skill is used at all.
   - The steps: play it with `node play.mjs`, take a screenshot at the moment that matters, say what
     a player would see before reading how it's drawn, put the picture next to the game's state
     (when they disagree, the picture wins), show it all on one page, and don't fix anything.

3. **Ask with /verify.** Start `claude`, type `/` and check that `/verify` shows as (project). Then:

       /verify During wave 2, does the HUD show the right wave number?

   A game window opens and you watch it play. At the end, its report opens in the browser: the
   verdict, each screenshot with what's on screen next to the game's state, and a strip of the
   game's moments, from before wave 1 to after the last. The striped ones are moments it never
   looked at.

## Fix it, prove it, commit it

4. **Ask Claude to fix it.** In the same `claude` session:

       Fix the HUD so it shows the right wave number.

   Let it edit `game/main.js`.

5. **Check it with fresh eyes.** `/clear`, so the Claude that checks hasn't seen why the fix was
   made, only the change and the game. Then:

       /verify Did your change work?

   It plays the game as it was at your last commit and again with the change, and the report puts
   them side by side, for every moment of the game. Is every moment green? If one isn't, the fix
   missed a case, and you saw it without reading the code.

6. **Ask Claude to commit it:**

       Commit the fix.

   Part 2 starts from there.

Stretch:
- `/verify Can you play this on a phone held sideways?`
- The striped moments in the report are the ones it never looked at. Add a line to the skill that
  makes it look at them, `/clear`, and ask again.
- Ask a question about the screen without typing `/verify`. Does Claude reach for the skill on its
  own? That's the `description` at work.

## Part 2: grill, then build it with several agents

Same folder as part 1, nothing new to install. One command runs the whole workflow, and it tells you
what it's doing at each step:

1. **Start it.** In this folder, start `claude` and type:

       /feature a new tower

   Or your own idea: `/feature a beetle that splits in two`.

2. **Answer its questions.** It asks one at a time, each with a default; "yes" is a fine answer. No
   idea of your own? Take the bee hive: 120 gold, and it stings every beetle in range at once. Then
   read the spec it writes and say OK.

3. **Watch it work.** It splits the spec into tickets that touch different files, and starts one
   agent per ticket at the same time, each in its own git worktree (a separate checkout of this
   repo, so they can't step on each other). Then it merges their work, runs the tests and plays the
   game with `/verify` from part 1.

4. **Check it yourself.** Open `index.html`: is the new tower in the build bar, and does it do what
   you asked?

5. **Read the skill:** `.claude/skills/feature/SKILL.md`. That's the whole workflow, written down. Change
   a step and run it again.

Stretch: run `/context` before and after. The agents read dozens of files, but your session grows only
by their summaries.
