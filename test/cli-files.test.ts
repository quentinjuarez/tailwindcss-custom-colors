import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../src/cli.js';
import { formatTheme, type Format } from '../src/format.js';
import { createTheme } from '../src/theme.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tcc-cli-'));
});

afterEach(() => {
  chmodSync(dir, 0o755);
  rmSync(dir, { recursive: true, force: true });
});

const oneLine = (text: string) => text.trimEnd().split('\n').length === 1;

describe('--format', () => {
  it.each(['css', 'json', 'scss', 'tokens'] as const)(
    'prints %s like formatTheme',
    (format: Format) => {
      const result = run(['primary=#940BDF', '--format', format]);
      expect(result.code).toBe(0);
      expect(result.stdout).toBe(
        formatTheme(createTheme({ primary: '#940BDF' }), format, true),
      );
    },
  );

  it('keeps css identical to the default', () => {
    expect(run(['primary=#940BDF', '--format', 'css']).stdout).toBe(
      run(['primary=#940BDF']).stdout,
    );
  });

  it('drops the dark side with --dark none', () => {
    const { stdout } = run(['a=red', '--format', 'json', '--dark', 'none']);
    expect(Object.keys(JSON.parse(stdout))).toEqual(['light']);
  });

  it('carries the semantic flags', () => {
    const { stdout } = run([
      'a=red',
      '--format',
      'json',
      '--roles',
      '--status',
      '--on',
    ]);
    const light = JSON.parse(stdout).light;
    expect(light).toHaveProperty('--surface');
    expect(light).toHaveProperty('--info-500-on');
  });

  it('rejects an unknown format and a report combination', () => {
    expect(run(['a=red', '--format', 'xml']).stderr).toBe(
      'Invalid --format value: xml. Expected css, json, scss or tokens\n',
    );
    expect(run(['a=red', '--format', 'json', '--report']).stderr).toBe(
      '--report cannot be combined with --format\n',
    );
  });
});

describe('--out', () => {
  it('writes the file and prints nothing', () => {
    const path = join(dir, 'theme.css');
    const result = run(['primary=#940BDF', '--out', path]);
    expect(result).toEqual({ stdout: '', stderr: '', code: 0 });
    expect(readFileSync(path, 'utf8')).toBe(
      createTheme({ primary: '#940BDF' }).css,
    );
  });

  it('creates nested directories and overwrites', () => {
    const path = join(dir, 'a', 'b', 'theme.json');
    writeFileSync(join(dir, 'x'), '');
    expect(run(['a=red', '--format', 'json', '--out', path]).code).toBe(0);
    writeFileSync(path, 'old');
    expect(run(['a=red', '--format', 'json', '--out', path]).code).toBe(0);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toHaveProperty('light');
  });

  it('reports write failures on one line', () => {
    const onDirectory = run(['a=red', '--out', dir]);
    expect(onDirectory.code).toBe(1);
    expect(onDirectory.stdout).toBe('');
    expect(onDirectory.stderr).toMatch(/^Cannot write .*: EISDIR\n$/);

    const locked = join(dir, 'locked');
    mkdirSync(locked);
    chmodSync(locked, 0o555);
    const denied = run(['a=red', '--out', join(locked, 'sub', 'theme.css')]);
    if (process.getuid?.() !== 0) {
      expect(denied.code).toBe(1);
      expect(oneLine(denied.stderr)).toBe(true);
      expect(denied.stderr).toMatch(/^Cannot write /);
    }
  });

  it('does not rewrite a file whose content is already right', () => {
    const path = join(dir, 'theme.css');
    run(['a=red', '--out', path]);
    const past = new Date('2020-01-01T00:00:00Z');
    utimesSync(path, past, past);
    expect(run(['a=red', '--out', path]).code).toBe(0);
    expect(statSync(path).mtimeMs).toBe(past.getTime());
    run(['a=blue', '--out', path]);
    expect(statSync(path).mtimeMs).not.toBe(past.getTime());
  });

  it('needs a path, blank paths included', () => {
    for (const blank of ['', '  ']) {
      expect(run(['a=red', '--out', blank]).stderr).toBe(
        '--out needs a path\n',
      );
    }
  });

  it('writes a report to a file and checks it', () => {
    const path = join(dir, 'report.txt');
    expect(run(['a=red', '--report', '--out', path]).code).toBe(0);
    expect(readFileSync(path, 'utf8')).toBe(run(['a=red', '--report']).stdout);
    expect(run(['a=red', '--report', '--out', path, '--check']).code).toBe(0);
    expect(run(['b=red', '--report', '--out', path, '--check']).code).toBe(1);
  });

  it('does not write when the color is invalid', () => {
    const path = join(dir, 'theme.css');
    expect(run(['a=nope', '--out', path]).code).toBe(1);
    expect(() => readFileSync(path)).toThrow();
  });
});

describe('--check', () => {
  const args = (path: string, ...extra: string[]) => [
    'primary=#940BDF',
    '--out',
    path,
    '--check',
    ...extra,
  ];

  it('passes after --out', () => {
    const path = join(dir, 'theme.css');
    run(['primary=#940BDF', '--out', path]);
    expect(run(args(path))).toEqual({ stdout: '', stderr: '', code: 0 });
  });

  it('fails after a change and leaves the file untouched', () => {
    const path = join(dir, 'theme.css');
    run(['primary=#940BDF', '--out', path]);
    const before = readFileSync(path);
    const result = run(args(path, '--dark', 'class'));
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe(
      `${path} is out of date. Run the command without --check to update it\n`,
    );
    expect(readFileSync(path).equals(before)).toBe(true);
  });

  it('fails when the file is missing and does not create it', () => {
    const path = join(dir, 'missing.css');
    expect(run(args(path)).stderr).toBe(
      `${path} does not exist. Run the command without --check to create it\n`,
    );
    expect(() => readFileSync(path)).toThrow();
  });

  it('treats a CRLF copy as different', () => {
    const path = join(dir, 'theme.css');
    run(['primary=#940BDF', '--out', path]);
    writeFileSync(path, readFileSync(path, 'utf8').replace(/\n/g, '\r\n'));
    expect(run(args(path)).code).toBe(1);
  });

  it('reports an unreadable path on one line', () => {
    const result = run(args(dir));
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/^Cannot read .*: EISDIR\n$/);
  });

  it('needs --out', () => {
    expect(run(['a=red', '--check']).stderr).toBe('--check needs --out\n');
  });

  it('lists the flags in the usage', () => {
    const { stdout } = run(['--help']);
    for (const flag of ['--format', '--out', '--check']) {
      expect(stdout).toContain(flag);
    }
  });
});
