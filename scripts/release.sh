#!/usr/bin/env bash
# Bumps the version, commits it and tags it. Pushing the tag is what publishes:
# .github/workflows/release.yml re-runs yarn verify on a clean checkout and only
# then publishes to npm.
#
# Usage: yarn release [patch|minor|major]   (defaults to patch)
set -euo pipefail

strategy="${1:-patch}"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "On '$branch', not main. Releases are cut from main." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first." >&2
  exit 1
fi

yarn verify

version="$(node scripts/bump-version.mjs "$strategy")"
tag="v$version"

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  git checkout -- package.json
  echo "Tag $tag already exists." >&2
  exit 1
fi

git commit -q -am "release: $tag"
git tag -a "$tag" -m "$tag"

echo
echo "Bumped to $version and tagged $tag."
echo "Push it to publish:  git push --follow-tags"
