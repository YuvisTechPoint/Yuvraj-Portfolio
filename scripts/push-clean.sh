#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

export GIT_AUTHOR_NAME="Yuvraj Prasad"
export GIT_AUTHOR_EMAIL="119959877+YuvisTechPoint@users.noreply.github.com"
export GIT_COMMITTER_NAME="Yuvraj Prasad"
export GIT_COMMITTER_EMAIL="119959877+YuvisTechPoint@users.noreply.github.com"

git add index.html

TREE="$(git write-tree)"
PARENT="$(git rev-parse HEAD)"
NEW="$(git commit-tree "$TREE" -p "$PARENT" -F .git/COMMIT_MSG_CLEAN.txt)"

git update-ref refs/heads/main "$NEW" "$PARENT"
git reset --hard main

git log -1 --format=full
