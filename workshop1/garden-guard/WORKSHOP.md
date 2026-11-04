# Skills workshop: race Claude with and without your skill

Two Claudes get the same question about the game, side by side: one with no skills, one with the
`/verify` skill you write. The Herdr app lays it out: both Claudes, a pane that asks both at once, and
a feed of everything each one plays. Whenever either one plays the game, its browser window opens on
its side of the screen (plain on the left, yours on the right) with a caption saying which step it is
playing, and `.verify/gallery.html` collects every screenshot each of them took.

## Before you start

1. Node 18 or newer, and Chrome, Edge or Chromium.
2. The Herdr app: `curl -fsSL https://releases.herdr.dev/app/install.sh | sh` on macOS or Linux
   (it puts `herdr-app` and `hc` in `~/.local/bin`, which must be on your PATH), or
   `powershell -c "irm https://releases.herdr.dev/app/install.ps1 | iex"` on Windows.
3. In this folder: `node doctor.mjs`, until it prints `ready`.
4. Run `claude` once here and choose **Yes, I trust this folder**. The default answer is No, because
   this repo pre-approves the game's commands. Then `/exit`.

## Play it first

Open `index.html` in Chrome. Plant a few thorn bushes and sprinklers, start a wave or two, and watch
the screen. You'll judge what each Claude says it saw, so know the game first.

## Write /verify, then race it

1. **Open the race.** Open the Herdr app and make its window large. Then, in this folder:

       node race.mjs

   Herdr opens a space called "garden race", and the gallery opens in Chrome (or Edge, Chromium):

       ┌─ plain ─────────────────────┬─ yours ─────────────────────┐
       │ Claude with no skills       │ Claude with your skills     │
       ├─ ask both ──────────────────┼─ plays ─────────────────────┤
       │ ask both › your question    │ yours  step 4/9 {"until"…   │
       │                             │ played so far: plain 0 …    │
       └─────────────────────────────┴─────────────────────────────┘

   "plain" can't use, read or run skills, so it works as it would in a repo
   without your skill. A question typed in "ask both" goes to "plain" as typed and to "yours" as
   `/verify <question>`; `/clear` clears both.

2. **Write `.claude/skills/verify/SKILL.md`.** Use your editor, or ask the "yours" Claude to draft it
   from your bullet points (then `/clear` it). Start from this:

       ---
       name: verify
       description: <when to use it, in the words someone would type>
       argument-hint: "[question or change]"
       ---

       # Verify by playing

       $ARGUMENTS

       <what counts as evidence here, and what doesn't>

       ## 1. Pin the question
       ## 2. Play it
       ## 3. Look
       ## 4. Before and after, for a change
       ## 5. Answer
       ## Rules

   At the least, it should say:
   - Play it with `node play.mjs <scenario>`, with a screenshot at the moment that matters, and never
     answer a question about the screen from the code alone.
   - Look at each screenshot and say what a player would see before reading how it's drawn.
   - Put the picture next to the state `play.mjs` printed: when they disagree, the picture wins.
   - Quote the lines and screenshots that prove each point. Observe only: don't fix anything.

   Type `/` in the "yours" pane and check that `/verify` shows as (project). If not, `/reload-skills`.

   Stuck? A reference skill is on GitHub, in the workshop repo, at `workshop1/solutions/verify/SKILL.md`:
   https://github.com/d-chechelashvili/GAIA-workshop/blob/main/workshop1/solutions/verify/SKILL.md
   Write your own first: you'll learn more from what yours misses.

3. **Race 1.** In "ask both":

       During wave 2, does the HUD show the right wave number?

   Watch the game windows and the plays feed: which Claude plays the game, and what does it look at?
   The gallery shows their screenshots side by side. Then compare the answers: which one shows you a
   screenshot? Which one reads code, or offers to change it?

   "plain" may well play the game too: it can read `play.mjs` like anyone. Look past who played:
   how many moments did each one check, does it compare the picture with the state, and does it
   leave the code alone?

4. **Race 2.** Tighten your skill where "yours" fell short, type `/clear` in "ask both", and race again:

       Can you play this on a phone held sideways?

5. **Race 3: did my change work?** Fix the HUD yourself, in your editor: in `game/main.js`, the
   wave text should show `s.wave` while a wave runs and `s.wave + 1` between waves. Don't commit it.
   `/clear` both, then:

       I changed the HUD's wave number. Did my change work?

   Compare what each one checked. In rehearsal, "plain" reasoned from the diff and "yours" showed
   before-and-after screenshots of the same moment, but each one checked different states of the
   game. If one of them finds a case the other missed, that's the next line for your skill.

6. **Commit the skill:** `git add .claude/skills && git commit -m "verify skill"`.

## No Herdr?

Two terminals in this folder, side by side, and type each question into both (start it with
`/verify ` in "yours"):

    node lane.mjs plain        # Claude with no skills
    node lane.mjs yours        # Claude with your skills
