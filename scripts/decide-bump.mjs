// Maps the Conventional Commit messages of a push to a release strategy, and
// writes `strategy=<major|minor|patch|current|none>` for $GITHUB_OUTPUT.
//
//   COMMITS='["feat: x","chore: y"]' node scripts/decide-bump.mjs
//
// A forced strategy from workflow_dispatch wins, which is how a first release
// or a publish that failed on credentials gets retried.

const RANK = { none: 0, patch: 1, minor: 2, major: 3 };

/** Conventional Commit prefixes, most significant first. */
const RULES = [
  // `feat!:` or `fix(scope)!:`, the ! marks a breaking change.
  [/^[a-z]+(\([^)]*\))?!:/, 'major'],
  [/^feat(\([^)]*\))?:/, 'minor'],
  [/^(fix|perf)(\([^)]*\))?:/, 'patch'],
];

export function strategyForMessage(message) {
  const trimmed = message.trimStart();
  // A breaking change can also be declared in the body or a footer.
  if (/^BREAKING[ -]CHANGE:/m.test(trimmed)) return 'major';
  for (const [pattern, strategy] of RULES) {
    if (pattern.test(trimmed)) return strategy;
  }
  // Anything else releases nothing. That deliberately covers `release: vX.Y.Z`,
  // this workflow's own bump commit, so it cannot trigger a second release.
  return 'none';
}

export function decideBump(messages, forced) {
  if (forced && forced !== 'none') return forced;
  return messages
    .map(strategyForMessage)
    .reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'none');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const messages = JSON.parse(process.env.COMMITS || '[]');
  const strategy = decideBump(messages, process.env.FORCED);
  console.log(`strategy=${strategy}`);
}
