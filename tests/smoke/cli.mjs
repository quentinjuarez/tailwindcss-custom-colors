import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const bin = new URL('../../dist/esm/bin.js', import.meta.url).pathname;

const ok = spawnSync(process.execPath, [bin, 'primary=#940BDF'], {
  encoding: 'utf8',
});
assert.equal(ok.status, 0);
assert.match(ok.stdout, /@theme inline/);
assert.equal(ok.stderr, '');

const bad = spawnSync(process.execPath, [bin, 'primary=nope'], {
  encoding: 'utf8',
});
assert.equal(bad.status, 1);
assert.equal(bad.stdout, '');
assert.match(bad.stderr, /Invalid color: nope/);

const p3 = spawnSync(
  process.execPath,
  [bin, 'vivid=color(display-p3 0 1 0)', '--gamut', 'p3'],
  { encoding: 'utf8' },
);
assert.equal(p3.status, 0);
assert.match(p3.stdout, /--vivid-500: oklch\(/);

const badGamut = spawnSync(process.execPath, [bin, 'a=red', '--gamut', 'x'], {
  encoding: 'utf8',
});
assert.equal(badGamut.status, 1);
assert.equal(
  badGamut.stderr,
  'Invalid --gamut value: x. Expected srgb or p3\n',
);

const report = spawnSync(process.execPath, [bin, 'a=#940BDF', '--report'], {
  encoding: 'utf8',
});
assert.equal(report.status, 0);
assert.match(
  report.stdout,
  /^color\s+mode\s+step\s+on\s+ratio\s+apca\s+pass\n/,
);
assert.equal(report.stdout.trimEnd().split('\n').length, 23);

const roles = spawnSync(process.execPath, [bin, 'a=#940BDF', '--roles'], {
  encoding: 'utf8',
});
assert.equal(roles.status, 0);
assert.match(roles.stdout, /--surface: var\(--neutral-50\);/);
assert.match(roles.stdout, /--color-muted: var\(--muted\);/);
