#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export GIT_AUTHOR_NAME="Yuvraj Prasad"
export GIT_AUTHOR_EMAIL="119959877+YuvisTechPoint@users.noreply.github.com"
export GIT_COMMITTER_NAME="Yuvraj Prasad"
export GIT_COMMITTER_EMAIL="119959877+YuvisTechPoint@users.noreply.github.com"

git add -A

if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi

TREE="$(git write-tree)"
NEW="$(git commit-tree "$TREE" -p HEAD -F .git/COMMIT_MSG_CLEAN.txt)"

git update-ref refs/heads/main "$NEW"
git reset --hard main

echo "New commit: $NEW"
git log -1 --format=full
