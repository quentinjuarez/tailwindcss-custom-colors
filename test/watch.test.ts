import {
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { watchFile } from '../src/watch.js';

let dir: string;
let path: string;
const closers: (() => void)[] = [];

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'tcc-watch-'));
  path = join(dir, 'config.json');
  writeFileSync(path, '{}');
  await new Promise((done) => setTimeout(done, 200));
});

afterEach(() => {
  while (closers.length > 0) closers.pop()!();
  rmSync(dir, { recursive: true, force: true });
});

const watching = async (onChange: () => void) => {
  const close = watchFile(path, onChange);
  closers.push(close);
  await new Promise((done) => setTimeout(done, 200));
  return close;
};

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

const waitFor = async (condition: () => boolean, timeout = 6000) => {
  const end = Date.now() + timeout;
  while (!condition() && Date.now() < end) await sleep(20);
  return condition();
};

describe('watchFile', () => {
  it('calls back after the file changes', async () => {
    let calls = 0;
    await watching(() => (calls += 1));
    writeFileSync(path, '{"a":1}');
    expect(await waitFor(() => calls >= 1)).toBe(true);
  });

  it('ignores other files in the same directory', async () => {
    let calls = 0;
    await watching(() => (calls += 1));
    writeFileSync(join(dir, 'other.json'), '{}');
    await sleep(300);
    expect(calls).toBe(0);
  });

  it('follows a save done by an atomic rename', async () => {
    let calls = 0;
    await watching(() => (calls += 1));
    const temporary = join(dir, 'config.json.tmp');
    writeFileSync(temporary, '{"a":2}');
    renameSync(temporary, path);
    expect(await waitFor(() => calls >= 1)).toBe(true);
  });

  it('merges quick changes into few calls', async () => {
    let calls = 0;
    await watching(() => (calls += 1));
    for (let i = 0; i < 3; i += 1) writeFileSync(path, `{"a":${i}}`);
    await waitFor(() => calls >= 1);
    await sleep(300);
    expect(calls).toBeGreaterThanOrEqual(1);
    expect(calls).toBeLessThanOrEqual(2);
  });

  it('keeps reporting later changes', async () => {
    let calls = 0;
    await watching(() => (calls += 1));
    writeFileSync(path, '{"a":1}');
    await waitFor(() => calls >= 1);
    writeFileSync(path, '{"a":2}');
    expect(await waitFor(() => calls >= 2)).toBe(true);
  });

  it('stops after close and cancels a pending call', async () => {
    let calls = 0;
    const close = await watching(() => (calls += 1));
    writeFileSync(path, '{"a":1}');
    close();
    await sleep(300);
    expect(calls).toBe(0);
    writeFileSync(path, '{"a":2}');
    await sleep(300);
    expect(calls).toBe(0);
  });

  it('follows a config that is a symbolic link to another folder', async () => {
    const other = mkdtempSync(join(tmpdir(), 'tcc-watch-target-'));
    closers.push(() => rmSync(other, { recursive: true, force: true }));
    const real = join(other, 'real.json');
    writeFileSync(real, '{}');
    const link = join(dir, 'linked.json');
    symlinkSync(real, link);
    await sleep(200);
    let calls = 0;
    closers.push(watchFile(link, () => (calls += 1)));
    await sleep(200);
    writeFileSync(real, '{"a":1}');
    expect(await waitFor(() => calls >= 1)).toBe(true);
  });

  it('throws at once when the folder cannot be watched', () => {
    expect(() =>
      watchFile(join(dir, 'missing', 'config.json'), () => {}),
    ).toThrow(/ENOENT/);
  });

  it('can be closed twice', async () => {
    const close = await watching(() => {});
    close();
    expect(() => close()).not.toThrow();
  });
});
