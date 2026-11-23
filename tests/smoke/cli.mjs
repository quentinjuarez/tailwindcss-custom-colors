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
