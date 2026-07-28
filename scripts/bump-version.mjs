// Bumps the version in package.json and prints the new one.
//   node scripts/bump-version.mjs <patch|minor|major> [path/to/package.json]
//
// Done here rather than with `yarn version`, which is not bundled with Yarn
// 3.8.6 and would mean committing the version plugin's binary.
import { readFileSync, writeFileSync } from 'node:fs';

const STRATEGIES = {
  major: ([major]) => [major + 1, 0, 0],
  minor: ([major, minor]) => [major, minor + 1, 0],
  patch: ([major, minor, patch]) => [major, minor, patch + 1],
};

export function bumpVersion(current, strategy) {
  const bump = STRATEGIES[strategy];
  if (!bump) {
    throw new Error(
      `Unknown strategy '${strategy}'. Use patch, minor or major.`,
    );
  }
  const parts = current.split('.');
  const numbers = parts.map(Number);
  if (
    parts.length !== 3 ||
    numbers.some((n) => !Number.isInteger(n) || n < 0)
  ) {
    throw new Error(`Cannot bump a non-semver version: ${current}`);
  }
  return bump(numbers).join('.');
}

/**
 * Patches only the version value in the raw text, so key order and formatting
 * cannot drift away from what oxfmt produces.
 */
export function patchPackageJson(raw, strategy) {
  const current = JSON.parse(raw).version;
  const next = bumpVersion(current, strategy);
  const pattern = new RegExp(
    `("version":\\s*)"${current.replace(/\./g, '\\.')}"`,
  );
  if (!pattern.test(raw)) {
    throw new Error('Could not find the version field to replace.');
  }
  return { next, raw: raw.replace(pattern, `$1"${next}"`) };
}

const [strategy, file = './package.json'] = process.argv.slice(2);

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { next, raw } = patchPackageJson(
      readFileSync(file, 'utf8'),
      strategy,
    );
    writeFileSync(file, raw);
    console.log(next);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
