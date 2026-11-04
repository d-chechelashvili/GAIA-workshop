# AI in the SDLC: workshop materials

Materials for a training on AI-assisted software development with Claude Code, by GAIA
(Georgian AI Association). No API keys are used anywhere: everything runs on a Claude Code login.

## Workshop 1: from the artificial neuron to the terminal agent

| Folder | What it is |
|---|---|
| `workshop1/deck/` | The slides. Open `workshop1/deck/s1.html` in a browser; it runs offline. `?lang=ka` shows them in Georgian. |
| `workshop1/garden-guard/` | The skills workshop: a small tower-defense game, and a race between Claude with and without the skill you write. Steps in `WORKSHOP.md` (Georgian: `WORKSHOP.ka.md`). |
| `workshop1/solutions/verify/` | A reference `/verify` skill for the workshop. Try writing your own first. |
| `workshop1/pick-a-number.sh` | Asks Claude for a number from 1 to 10, 20 times at once, and prints each answer as it arrives. |
| `workshop1/trace-recorder/` | Records exactly what Claude Code sends to the model and what comes back, for the "what does my agent actually send" demo. |

### The skills workshop

You need Node 18+, Chrome (or Edge or Chromium), Claude Code and git 2.25+. Get only the game, as a
git repo of its own, then check your machine:

    git clone --depth 1 --sparse https://github.com/d-chechelashvili/GAIA-workshop
    cd GAIA-workshop && git sparse-checkout set workshop1/garden-guard && cd ..
    cp -R GAIA-workshop/workshop1/garden-guard garden-guard
    cd garden-guard
    git init -q && git add -A && git commit -qm start
    node doctor.mjs        # it says what to fix; run it again until it prints "ready"

On Windows, copy with `Copy-Item -Recurse GAIA-workshop/workshop1/garden-guard garden-guard`.

The workshop's Claudes can't read the solution, the guide or anything outside the game's folder,
and can't browse the web (see `garden-guard/.claude/settings.json`). The sparse clone also keeps the
solution off your disk: if you want it, read it here on GitHub.

### The trace recorder

    cd workshop1/trace-recorder
    node proxy.mjs                                          # terminal 1: records into trace-*.jsonl
    cd demo-repo && ANTHROPIC_BASE_URL=http://127.0.0.1:8787 claude   # terminal 2
    node explain.mjs trace-*.jsonl                          # afterwards: readable pages in explained/

The trace holds whatever Claude Code sends, including your CLAUDE.md files, skills and account email.
Auth headers are never written to disk. Don't publish a trace you haven't read.

### Pick a number

Ask Claude for a number 20 times at once, each in a fresh session; each answer prints as it arrives:

    workshop1/pick-a-number.sh

It's one command: an empty folder and `--tools ""` keep Claude from running `shuf` and keep your
CLAUDE.md out.
