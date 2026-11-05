# Is this machine ready for the GAIA workshops? Run it before anything else; it needs nothing installed.
# In PowerShell:
#   irm https://raw.githubusercontent.com/d-chechelashvili/GAIA-workshop/main/check.ps1 | iex
# It installs nothing. For each missing tool it prints the command that installs it. macOS and Linux: check.sh.

$missing = 0
function Test-Cmd($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Write-Ok($what) { Write-Host "  ok   $what" }
# Returns 1, so each call adds itself to $missing.
function Write-Fix($what, $how) { Write-Host "  FIX  $what" -ForegroundColor Yellow; Write-Host "       install: $how"; return 1 }
function Write-Opt($what, $how) { Write-Host "  --   $what"; Write-Host "       $how" }

$winget = Test-Cmd 'winget'
if ($winget) { $nodeHow = 'winget install OpenJS.NodeJS.LTS'; $gitHow = 'winget install Git.Git' }
else { $nodeHow = 'the Windows installer from https://nodejs.org'; $gitHow = 'the installer from https://git-scm.com' }

# Node 18 or newer
if (Test-Cmd 'node') {
  $major = 0
  [int]::TryParse((node -p "process.versions.node.split('.')[0]"), [ref]$major) | Out-Null
  if ($major -ge 18) { Write-Ok "Node $(node -v)" }
  else { $missing += Write-Fix "Node $(node -v) is too old: the workshop needs 18 or newer" $nodeHow }
} else { $missing += Write-Fix 'Node 18 or newer' $nodeHow }

# git (Claude Code on Windows also needs it)
if (Test-Cmd 'git') { Write-Ok (git --version) }
else { $missing += Write-Fix 'git' $gitHow }

# Claude Code
if (Test-Cmd 'claude') { Write-Ok 'Claude Code (claude)' }
else { $missing += Write-Fix 'Claude Code (claude)' 'irm https://claude.ai/install.ps1 | iex   (then open a new terminal)' }

# A Chromium browser: the workshop's game is played in Chrome or Edge
$pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
$browsers = @(
  @('Chrome', "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"),
  @('Chrome', "$pf86\Google\Chrome\Application\chrome.exe"),
  @('Chrome', "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"),
  @('Edge', "$pf86\Microsoft\Edge\Application\msedge.exe"),
  @('Edge', "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe")
)
$found = $browsers | Where-Object { $_[1] -and (Test-Path $_[1]) } | Select-Object -First 1
if ($found) { Write-Ok "a browser for the game: $($found[0])" }
else { $missing += Write-Fix 'Chrome or Edge' 'Chrome from https://www.google.com/chrome' }

Write-Host ''
if ($missing -eq 0) {
  Write-Host 'ready. Set up the game:' -ForegroundColor Green
  Write-Host '  git clone --depth 1 https://github.com/d-chechelashvili/GAIA-workshop'
  Write-Host '  node GAIA-workshop/workshop/setup.mjs'
} else {
  Write-Host "not ready: install the $missing marked FIX, open a new terminal, and run this again." -ForegroundColor Yellow
}
