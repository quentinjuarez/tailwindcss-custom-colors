import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { run } from '../src/cli.js';
import { createTheme } from '../src/theme.js';

const NAME = 'tailwindcss-custom-colors.config.json';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tcc-cli-config-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const writeConfig = (config: unknown, name = NAME) => {
  const path = join(dir, name);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(config));
  return path;
};

const go = (args: string[]) => run(args, dir);

describe('discovery', () => {
  it('uses the default config file when no argument is given', () => {
    writeConfig({ colors: { primary: '#0B6FDF' }, dark: 'class' });
    const result = go([]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      createTheme({ primary: '#0B6FDF' }, { dark: 'class' }).css,
    );
  });

  it('ignores the default config when colors are passed', () => {
    writeConfig({ colors: { primary: '#0B6FDF' }, dark: 'class' });
    expect(go(['accent=teal']).stdout).toBe(
      createTheme({ accent: 'teal' }).css,
    );
  });

  it('prints the usual hint without a config and without colors', () => {
    const result = go([]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/name=color/);
    expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
  });

  it('reads a named config next to explicit colors', () => {
    writeConfig({ colors: { a: 'red' }, dark: 'class' }, 'custom.json');
    expect(go(['--config', 'custom.json', 'b=blue']).stdout).toBe(
      createTheme({ b: 'blue' }, { dark: 'class' }).css,
    );
  });

  it('asks for colors when the config has none', () => {
    writeConfig({ dark: 'class' });
    expect(go([]).stderr).toBe(
      'No colors: add them to the config file or pass name=color arguments\n',
    );
  });

  it('reports a missing named config and an empty path', () => {
    const missing = join(dir, 'nope.json');
    expect(go(['--config', 'nope.json', 'a=red']).stderr).toBe(
      `Cannot read config file ${missing}: ENOENT\n`,
    );
    expect(go(['--config', '', 'a=red']).stderr).toBe(
      '--config needs a path\n',
    );
  });

  it('reports config errors on one line', () => {
    writeConfig({ nope: 1 });
    const result = go([]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(
      /^Invalid config file .*: unknown key "nope"\n$/,
    );
  });
});

describe('precedence', () => {
  it('lets a flag win over the config', () => {
    writeConfig({ colors: { a: 'red' }, dark: 'class', gamut: 'p3' });
    expect(go(['--dark', 'none']).stdout).toBe(
      createTheme({ a: 'red' }, { dark: false, gamut: 'p3' }).css,
    );
  });

  it('keeps a config option the flags do not turn off', () => {
    writeConfig({ colors: { a: 'red' }, roles: true, harmony: true, seed: 3 });
    const result = go([]);
    expect(result.stdout).toBe(
      createTheme({ a: 'red' }, { roles: true, harmony: true, seed: 3 }).css,
    );
    expect(result.stdout).toContain('--surface:');
  });

  it('merges contrast flags into the config contrast', () => {
    writeConfig({ colors: { a: 'red' }, contrast: { method: 'apca' } });
    expect(go(['--on']).stdout).toBe(
      createTheme({ a: 'red' }, { contrast: { method: 'apca', on: true } }).css,
    );
    expect(go(['--contrast', 'wcag', '--on']).stdout).toBe(
      createTheme({ a: 'red' }, { contrast: { method: 'wcag', on: true } }).css,
    );
  });

  it('turns on a setting from a flag', () => {
    writeConfig({ colors: { a: 'red' } });
    expect(go(['--status', '--neutral']).stdout).toBe(
      createTheme({ a: 'red' }, { status: true, neutral: 'auto' }).css,
    );
  });

  it('lets the seed flag win and allows it with a config harmony', () => {
    writeConfig({ colors: { a: 'red' }, harmony: true, seed: 1 });
    expect(go(['--seed', '4']).stdout).toBe(
      createTheme({ a: 'red' }, { harmony: true, seed: '4' }).css,
    );
  });

  it('lets the format flag win over the config format', () => {
    writeConfig({ colors: { a: 'red' }, format: 'json' });
    expect(JSON.parse(go([]).stdout)).toHaveProperty('light');
    expect(go(['--format', 'scss']).stdout).toContain('$theme-light');
  });

  it('accepts the html format in a config file', () => {
    writeConfig({ colors: { a: 'red' }, format: 'html', out: 'preview.html' });
    expect(go([]).code).toBe(0);
    expect(readFileSync(join(dir, 'preview.html'), 'utf8')).toContain(
      '<!doctype html>',
    );
  });

  it('keeps the createTheme error for a bad contrast value', () => {
    writeConfig({ colors: { a: 'red' }, contrast: { method: 'nope' } });
    expect(go([]).stderr).toBe(
      "Invalid contrast option: method must be 'wcag' or 'apca'\n",
    );
  });

  it('names the config file for a bad option value', () => {
    writeConfig({ colors: { a: 'red' }, dark: 'nope' });
    expect(go([]).stderr).toMatch(
      /^Invalid config file .*: dark must be "media", "class", "light-dark" or false\n$/,
    );
  });

  it('does not let a flag hide a bad config value', () => {
    writeConfig({ colors: { a: 'red' }, roles: 'yes' });
    expect(go(['--roles']).stderr).toMatch(/: roles must be true or false\n$/);
  });
});

describe('report', () => {
  it('prints the report and leaves the config out file alone', () => {
    writeConfig({ colors: { a: 'red' }, out: 'theme.css' });
    const result = go(['--report']);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^color\s+mode\s+step/);
    expect(existsSync(join(dir, 'theme.css'))).toBe(false);
    expect(go(['--report', '--check']).stderr).toBe('--check needs --out\n');
  });

  it('still writes a report to an out flag', () => {
    writeConfig({ colors: { a: 'red' }, out: 'theme.css' });
    const target = join(dir, 'report.txt');
    expect(go(['--report', '--out', target]).code).toBe(0);
    expect(readFileSync(target, 'utf8')).toMatch(/^color\s+mode\s+step/);
    expect(existsSync(join(dir, 'theme.css'))).toBe(false);
  });
});

describe('out and check', () => {
  it('resolves a config out against the config directory', () => {
    writeConfig({ colors: { a: 'red' }, out: 'dist/theme.css' }, 'conf/c.json');
    const result = go(['--config', 'conf/c.json']);
    expect(result).toEqual({ stdout: '', stderr: '', code: 0 });
    expect(readFileSync(join(dir, 'conf', 'dist', 'theme.css'), 'utf8')).toBe(
      createTheme({ a: 'red' }).css,
    );
  });

  it('refuses a config out that leaves the config directory', () => {
    writeConfig({ colors: { a: 'red' }, out: '../escape.css' });
    const result = go([]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(
      /: out must stay inside the config directory\n$/,
    );
    expect(existsSync(join(dir, '..', 'escape.css'))).toBe(false);
    const flagTarget = join(dir, '..', `tcc-flag-escape-${process.pid}.css`);
    expect(go(['a=red', '--out', flagTarget]).code).toBe(0);
    expect(existsSync(flagTarget)).toBe(true);
    rmSync(flagTarget, { force: true });
  });

  it('checks the config out file', () => {
    writeConfig({ colors: { a: 'red' }, out: 'theme.css' });
    expect(go([]).code).toBe(0);
    expect(go(['--check']).code).toBe(0);
    writeConfig({ colors: { a: 'blue' }, out: 'theme.css' });
    const stale = go(['--check']);
    expect(stale.code).toBe(1);
    expect(stale.stderr).toBe(
      `${join(dir, 'theme.css')} is out of date. Run the command without --check to update it\n`,
    );
  });

  it('keeps a command line out relative to the process directory', () => {
    writeConfig({ colors: { a: 'red' }, out: 'theme.css' });
    const target = join(dir, 'flag-out.css');
    expect(go(['--out', target]).code).toBe(0);
    expect(existsSync(target)).toBe(true);
    expect(existsSync(join(dir, 'theme.css'))).toBe(false);
  });
});

describe('watch flag', () => {
  it('needs a config file', () => {
    expect(go(['a=red', '--out', join(dir, 'x.css'), '--watch']).stderr).toBe(
      '--watch needs a config file\n',
    );
  });

  it('rejects incompatible flags and a missing output', () => {
    writeConfig({ colors: { a: 'red' }, out: 'theme.css' });
    expect(go(['--watch', '--check']).stderr).toBe(
      '--watch cannot be combined with --check\n',
    );
    expect(go(['--watch', '--report']).stderr).toBe(
      '--watch cannot be combined with --report\n',
    );
    writeConfig({ colors: { a: 'red' } });
    expect(go(['--watch']).stderr).toBe('--watch needs --out\n');
  });

  it('writes once and returns the config path to watch', () => {
    const path = writeConfig({ colors: { a: 'red' }, out: 'theme.css' });
    const result = go(['--watch']);
    expect(result.code).toBe(0);
    expect(result.watch).toBe(path);
    expect(readFileSync(join(dir, 'theme.css'), 'utf8')).toBe(
      createTheme({ a: 'red' }).css,
    );
  });

  it('does not ask for a watch when the first generation fails', () => {
    writeConfig({ colors: { a: 'nope' }, out: 'theme.css' });
    const result = go(['--watch']);
    expect(result.code).toBe(1);
    expect(result.watch).toBeUndefined();
  });
});
