#!/usr/bin/env bash
# Asks Claude for a number 20 times at once, each in a fresh session, and prints each answer as it
# arrives. The empty folder and --tools "" keep it from running shuf and keep your CLAUDE.md out.
cd "$(mktemp -d)" && seq 20 | xargs -P20 -I{} sh -c 'echo "Run {}: $(claude -p --model haiku --tools "" --no-session-persistence "Pick a number between 1 and 10. Reply with the number only.")"'
