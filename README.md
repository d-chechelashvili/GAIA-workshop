# AI in the SDLC: workshop materials

Materials for a training on AI-assisted software development with Claude Code, by GAIA
(Georgian AI Association). No API keys are used anywhere: everything runs on a Claude Code login.

## Both sessions

| Folder | What it is |
|---|---|
| `check.sh`, `check.ps1` | Checks your machine before anything else and says how to install what's missing. |
| `workshop/deck/` | The slides of both sessions. Open `workshop/deck/s1.html` or `s2.html` in a browser; they run offline. |
| `workshop/garden-guard/` | Both workshops, on a small tower-defense game: Claude without and with the game's `/verify` skill, which then proves Claude's own fix, then a new feature built by several agents at once and proven with that skill. Steps in `WORKSHOP.md` (Georgian: `WORKSHOP.ka.md`). |
| `workshop/setup.mjs` | Sets up the game for the workshops: `node GAIA-workshop/workshop/setup.mjs`. |
| `workshop/pick-a-number.sh` | Asks Claude for a number from 1 to 10, 20 times at once, and prints each answer as it arrives. |
| `workshop/trace-recorder/` | Records exactly what Claude Code sends to the model and what comes back, for the "what does my agent actually send" demo. |

### The workshops

You need Node 18+, git, Claude Code and Chrome (or Edge or Chromium). First check your machine. The
check needs nothing installed, installs nothing, and prints the command for anything that's missing:

    curl -fsSL https://raw.githubusercontent.com/d-chechelashvili/GAIA-workshop/main/check.sh | sh   # macOS, Linux
    irm https://raw.githubusercontent.com/d-chechelashvili/GAIA-workshop/main/check.ps1 | iex        # Windows PowerShell

When it says `ready`, two commands set up the game and check it again:

    git clone --depth 1 https://github.com/d-chechelashvili/GAIA-workshop
    node GAIA-workshop/workshop/setup.mjs

Not used to git? On this page, press **Code → Download ZIP**, unzip it, and run
`node GAIA-workshop-main/workshop/setup.mjs` from the folder you unzipped it in.

The script copies the game to `garden-guard/`, next to the repo's folder, as a git repo of its own,
then says what to fix, if anything. When it prints `ready`:

    cd garden-guard
    claude          # choose "Yes, I trust this folder", then type /exit

Run the script again any time: once the game is set up, it only checks your machine. The steps for
both workshops are in `garden-guard/WORKSHOP.md`.

The workshop's Claudes can't read the guide and can't browse the web (see
`garden-guard/.claude/settings.json`). `node plain.mjs` starts a Claude that can't read or use skills.

### The trace recorder

    cd workshop/trace-recorder
    node proxy.mjs                                          # terminal 1: records into trace-*.jsonl
    cd demo-repo && ANTHROPIC_BASE_URL=http://127.0.0.1:8787 claude   # terminal 2
    node explain.mjs trace-*.jsonl                          # afterwards: readable pages in explained/

The trace holds whatever Claude Code sends, including your CLAUDE.md files, skills and account email.
Auth headers are never written to disk. Don't publish a trace you haven't read.

### Pick a number

Ask Claude for a number 20 times at once, each in a fresh session; each answer prints as it arrives:

    workshop/pick-a-number.sh

It's one command: an empty folder and `--tools ""` keep Claude from running `shuf` and keep your
CLAUDE.md out.
