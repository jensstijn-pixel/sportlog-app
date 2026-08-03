#!/usr/bin/env bash
# Bouwt de app en zet dist/ op de gh-pages branch.
#
# Waarom geen GitHub Actions: de gh-login op deze Mac heeft geen `workflow`
# scope, dus een workflow-bestand pushen wordt geweigerd. Wil je alsnog
# automatisch deployen bij elke push: draai `gh auth refresh -s workflow` en
# zet er een Actions-workflow voor terug.
set -euo pipefail

cd "$(dirname "$0")/.."

npm run build

WERKMAP=".deploy"
rm -rf "$WERKMAP"
git worktree prune

if git show-ref --quiet refs/heads/gh-pages; then
  git worktree add -f "$WERKMAP" gh-pages
elif git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch -q origin gh-pages:gh-pages
  git worktree add -f "$WERKMAP" gh-pages
else
  git worktree add -f --orphan -b gh-pages "$WERKMAP"
fi

# Alles behalve .git vervangen door de verse build.
find "$WERKMAP" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R dist/. "$WERKMAP"/
touch "$WERKMAP/.nojekyll"

git -C "$WERKMAP" add -A
if git -C "$WERKMAP" diff --cached --quiet; then
  echo "Niets veranderd — geen deploy nodig."
else
  git -C "$WERKMAP" commit -q -m "Deploy $(date '+%Y-%m-%d %H:%M')"
  git -C "$WERKMAP" push -q origin gh-pages
  echo "Gedeployed naar https://jensstijn-pixel.github.io/sportlog-app/"
fi

git worktree remove "$WERKMAP" --force
