import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

const dir = mkdtempSync(join(tmpdir(), 'tcc-smoke-'));
try {
  const out = join(dir, 'nested', 'theme.json');
  const written = spawnSync(
    process.execPath,
    [bin, 'a=#940BDF', '--format', 'json', '--out', out],
    { encoding: 'utf8' },
  );
  assert.equal(written.status, 0);
  assert.equal(written.stdout, '');
  assert.ok('light' in JSON.parse(readFileSync(out, 'utf8')));

  const fresh = spawnSync(
    process.execPath,
    [bin, 'a=#940BDF', '--format', 'json', '--out', out, '--check'],
    { encoding: 'utf8' },
  );
  assert.equal(fresh.status, 0);

  const stale = spawnSync(
    process.execPath,
    [bin, 'a=#0B6FDF', '--format', 'json', '--out', out, '--check'],
    { encoding: 'utf8' },
  );
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /is out of date/);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const harmony = spawnSync(
  process.execPath,
  [bin, 'a=#0B6FDF', '--harmony', '--seed', '2'],
  { encoding: 'utf8' },
);
assert.equal(harmony.status, 0);
assert.match(harmony.stdout, /--secondary-500: oklch\(/);
assert.match(harmony.stdout, /--tertiary-500: oklch\(/);

const orphanSeed = spawnSync(process.execPath, [bin, 'a=red', '--seed', '2'], {
  encoding: 'utf8',
});
assert.equal(orphanSeed.status, 1);
assert.equal(orphanSeed.stderr, '--seed needs --harmony\n');

const watchDir = mkdtempSync(join(tmpdir(), 'tcc-smoke-watch-'));
try {
  const config = join(watchDir, 'tailwindcss-custom-colors.config.json');
  const outFile = join(watchDir, 'theme.css');
  writeFileSync(
    config,
    JSON.stringify({ colors: { a: '#940BDF' }, out: 'theme.css' }),
  );
  const child = spawn(process.execPath, [bin, '--watch'], {
    cwd: watchDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = new Promise((resolve) => {
    child.on('exit', (code) => resolve(code));
  });
  const waitFor = async (check) => {
    for (let i = 0; i < 100; i += 1) {
      let ready = false;
      try {
        ready = check();
      } catch {
        ready = false;
      }
      if (ready) return true;
      await new Promise((done) => setTimeout(done, 50));
    }
    return false;
  };
  const content = () => readFileSync(outFile, 'utf8');

  assert.ok(await waitFor(() => content().includes('--a-500')));
  writeFileSync(
    config,
    JSON.stringify({ colors: { b: '#0B6FDF' }, out: 'theme.css' }),
  );
  assert.ok(await waitFor(() => content().includes('--b-500')));

  child.kill('SIGTERM');
  const code = await Promise.race([
    exited,
    new Promise((done) =>
      setTimeout(() => {
        child.kill('SIGKILL');
        done('timeout');
      }, 5000),
    ),
  ]);
  assert.equal(code, 0);
} finally {
  rmSync(watchDir, { recursive: true, force: true });
}

const lightDark = spawnSync(
  process.execPath,
  [bin, 'a=#0B6FDF', '--dark', 'light-dark'],
  { encoding: 'utf8' },
);
assert.equal(lightDark.status, 0);
assert.match(lightDark.stdout, /color-scheme: light dark;/);
assert.match(lightDark.stdout, /--a-50: light-dark\(oklch\(/);

const previewDir = mkdtempSync(join(tmpdir(), 'tcc-smoke-preview-'));
try {
  const page = join(previewDir, 'preview.html');
  const preview = spawnSync(
    process.execPath,
    [bin, 'a=#0B6FDF', '--format', 'html', '--out', page],
    { encoding: 'utf8' },
  );
  assert.equal(preview.status, 0);
  const html = readFileSync(page, 'utf8');
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<title>tailwindcss-custom-colors preview<\/title>/);
} finally {
  rmSync(previewDir, { recursive: true, force: true });
}
