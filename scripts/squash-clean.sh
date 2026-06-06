#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export GIT_AUTHOR_NAME="Yuvraj Prasad"
export GIT_AUTHOR_EMAIL="119959877+YuvisTechPoint@users.noreply.github.com"
export GIT_COMMITTER_NAME="Yuvraj Prasad"
export GIT_COMMITTER_EMAIL="119959877+YuvisTechPoint@users.noreply.github.com"

TREE="$(git rev-parse 'HEAD^{tree}')"
NEW="$(git commit-tree "$TREE" -F .git/COMMIT_MSG_CLEAN.txt)"

git update-ref refs/heads/main "$NEW"
git reset --hard main

echo "Squashed to: $NEW"
git log -1 --format=full
