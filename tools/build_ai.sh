#!/usr/bin/env bash
# Build the AI-enhanced version (ai/): fetch the experimental features from the experimental branch, build, and check.
# If the check fails, the previously published AI-enhanced version is kept. Never fails the run, and never affects
# the standard version (index.html).
set -u
EXP=/tmp/sg-experimental; rm -rf "$EXP"; mkdir -p "$EXP"
if git fetch --quiet --depth=1 origin experimental 2>/dev/null && git archive FETCH_HEAD experimental 2>/dev/null | tar -x -C "$EXP" 2>/dev/null; then
  echo "Experimental features fetched from the experimental branch."
else
  echo "No experimental features yet: the AI-enhanced version matches the standard one."
fi
python tools/build_ai.py --exp "$EXP/experimental" || exit 0
if ! python tools/smoke_ai.py --exp "$EXP/experimental"; then
  echo "::warning::The AI-enhanced version failed its check; keeping the previously published one."
  if git ls-files --error-unmatch ai/index.html >/dev/null 2>&1; then git checkout -- ai/; else rm -rf ai/; fi
fi
exit 0
