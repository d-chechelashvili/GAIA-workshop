#!/bin/sh
# Is this machine ready for the GAIA workshops? Run it before anything else; it needs nothing installed:
#   curl -fsSL https://raw.githubusercontent.com/d-chechelashvili/GAIA-workshop/main/check.sh | sh
# It installs nothing. For each missing tool it prints the command that installs it. Windows: check.ps1.

os=$(uname -s)
missing=0
has() { command -v "$1" >/dev/null 2>&1; }
ok() { printf '  ok   %s\n' "$1"; }
fix() { printf '  FIX  %s\n       install: %s\n' "$1" "$2"; missing=$((missing + 1)); }
opt() { printf '  --   %s\n       %s\n' "$1" "$2"; }

if [ "$os" = Darwin ]; then
  if has brew; then node_how='brew install node'; git_how='brew install git'
  else node_how='the macOS installer from https://nodejs.org'; git_how='xcode-select --install'; fi
else
  node_how='your package manager (e.g. sudo apt install nodejs, then check it is 18 or newer), or https://nodejs.org'
  git_how='your package manager (e.g. sudo apt install git)'
fi

# Node 18 or newer
if has node; then
  major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null)
  if [ "${major:-0}" -ge 18 ] 2>/dev/null; then ok "Node $(node -v)"
  else fix "Node $(node -v) is too old: the workshop needs 18 or newer" "$node_how"; fi
else fix 'Node 18 or newer' "$node_how"; fi

# git (on macOS, /usr/bin/git exists even without the developer tools, so run it)
if git --version >/dev/null 2>&1; then ok "$(git --version)"
else fix 'git' "$git_how"; fi

# Claude Code
if has claude; then ok 'Claude Code (claude)'
else fix 'Claude Code (claude)' 'curl -fsSL https://claude.ai/install.sh | bash   (then open a new terminal)'; fi

# A Chromium browser: the workshop's game is played in Chrome, Edge or Chromium
browser=''
if [ "$os" = Darwin ]; then
  for app in 'Google Chrome' 'Microsoft Edge' 'Chromium'; do
    if [ -d "/Applications/$app.app" ] || [ -d "$HOME/Applications/$app.app" ]; then browser=$app; break; fi
  done
else
  for b in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge microsoft-edge-stable; do
    if has "$b"; then browser=$b; break; fi
  done
fi
if [ -n "$browser" ]; then ok "a browser for the game: $browser"
else fix 'Chrome, Edge or Chromium' 'Chrome from https://www.google.com/chrome'; fi

echo
if [ "$missing" -eq 0 ]; then
  echo 'ready. Set up the game:'
  echo '  git clone --depth 1 https://github.com/d-chechelashvili/GAIA-workshop'
  echo '  node GAIA-workshop/workshop1/setup.mjs'
else
  echo "not ready: install the $missing marked FIX, open a new terminal, and run this again."
  exit 1
fi
