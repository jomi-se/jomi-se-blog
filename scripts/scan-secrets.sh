#!/bin/sh
set -eu

# Runs pinned Gitleaks over either the staged change (pre-commit) or full history.
# Mirrored from the agent-connect hardening setup.

mode=${1:-history}
repo_root=$(git rev-parse --show-toplevel)
git_dir=$(git -C "$repo_root" rev-parse --absolute-git-dir)

if test -n "${GITLEAKS_BIN:-}"; then
  gitleaks_bin=$GITLEAKS_BIN
elif command -v gitleaks >/dev/null 2>&1; then
  gitleaks_bin=$(command -v gitleaks)
elif test -x "$git_dir/gitleaks-tools/gitleaks"; then
  gitleaks_bin=$git_dir/gitleaks-tools/gitleaks
else
  echo "Gitleaks is not installed. Run npm run security:hooks:install." >&2
  exit 1
fi

if ! test -x "$gitleaks_bin"; then
  echo "Configured Gitleaks executable is not executable: $gitleaks_bin" >&2
  exit 1
fi

cd "$repo_root"

case "$mode" in
  staged)
    exec "$gitleaks_bin" git --pre-commit --staged --redact --no-banner --no-color
    ;;
  history)
    exec "$gitleaks_bin" git --log-opts="--all HEAD" --redact --no-banner --no-color
    ;;
  *)
    echo "Usage: $0 [staged|history]" >&2
    exit 2
    ;;
esac
