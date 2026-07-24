#!/bin/sh
set -eu

# One-shot setup: point git at the repo's tracked hooks and install pinned Gitleaks.
# Run once after cloning:  npm run security:hooks:install

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

git config core.hooksPath .githooks
echo "Configured core.hooksPath -> .githooks"

"$repo_root/scripts/install-gitleaks.sh"

echo "Git hooks ready. Commits will be scanned for secrets by .githooks/pre-commit."
