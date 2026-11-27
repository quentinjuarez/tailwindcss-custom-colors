import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tcc-config-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const write = (content: string) => {
  const path = join(dir, 'config.json');
  writeFileSync(path, content);
  return path;
};

const failing = (content: unknown) => () =>
  loadConfig(
    write(typeof content === 'string' ? content : JSON.stringify(content)),
  );

describe('loadConfig', () => {
  it('returns a valid full file as is', () => {
    const config = {
      colors: { primary: '#0B6FDF', accent: 'teal' },
      dark: 'class',
      gamut: 'p3',
      contrast: { method: 'apca', target: 'AAA', on: true },
      neutral: 'auto',
      status: true,
      roles: true,
      soft: true,
      harmony: true,
      seed: 3,
      format: 'json',
      out: 'src/theme.json',
    };
    expect(loadConfig(write(JSON.stringify(config)))).toEqual(config);
  });

  it('accepts true, auto and false for neutral', () => {
    for (const neutral of [true, 'auto', false]) {
      expect(loadConfig(write(JSON.stringify({ neutral }))).neutral).toBe(
        neutral,
      );
    }
  });

  it('accepts an empty object', () => {
    expect(loadConfig(write('{}'))).toEqual({});
  });

  it('reports a missing file and a directory', () => {
    const missing = join(dir, 'nope.json');
    expect(() => loadConfig(missing)).toThrow(
      `Cannot read config file ${missing}: ENOENT`,
    );
    const folder = join(dir, 'folder');
    mkdirSync(folder);
    expect(() => loadConfig(folder)).toThrow(
      `Cannot read config file ${folder}: EISDIR`,
    );
  });

  it('reports invalid json on one line', () => {
    for (const content of ['', '{ nope', '{"a":']) {
      let message = '';
      try {
        failing(content)();
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toMatch(/^Invalid config file .*config\.json: .+/);
      expect(message.split('\n')).toHaveLength(1);
    }
  });

  it('reports a value that is not an object', () => {
    for (const content of ['[]', 'null', '"text"', '3']) {
      expect(failing(content)).toThrow(
        /^Invalid config file .*config\.json: expected an object$/,
      );
    }
  });

  it('reports unknown keys, cutting long ones', () => {
    expect(failing({ nope: 1 })).toThrow(/: unknown key "nope"$/);
    expect(failing({ ['k'.repeat(60)]: 1 })).toThrow(
      new RegExp(`: unknown key "${'k'.repeat(40)}"$`),
    );
    expect(failing('{"__proto__": {"colors": {}}}')).toThrow(
      /: unknown key "__proto__"$/,
    );
  });

  it('reports bad colors', () => {
    for (const colors of [[], {}, { a: 1 }, { a: { b: 'c' } }, 'red', null]) {
      expect(failing({ colors })).toThrow(
        /: colors must be an object of name: color strings$/,
      );
    }
  });

  it('reports bad contrast, format and out', () => {
    for (const contrast of ['apca', [], null, 3]) {
      expect(failing({ contrast })).toThrow(/: contrast must be an object$/);
    }
    for (const format of ['xml', 3, null]) {
      expect(failing({ format })).toThrow(
        /: format must be css, json, scss, tokens or html$/,
      );
    }
    for (const out of ['', '  ', 3, null, {}]) {
      expect(failing({ out })).toThrow(/: out must be a non empty string$/);
    }
  });

  it('keeps out inside the config directory', () => {
    for (const out of [
      '/tmp/theme.css',
      '../theme.css',
      'a/../../theme.css',
      '..',
    ]) {
      expect(failing({ out })).toThrow(
        /: out must stay inside the config directory$/,
      );
    }
    for (const out of [
      'theme.css',
      './theme.css',
      'dist/theme.css',
      'a/../theme.css',
      '..hidden/theme.css',
    ]) {
      expect(() => failing({ out })()).not.toThrow();
    }
  });

  it('checks the option types itself, so a flag cannot hide them', () => {
    const cases: [object, RegExp][] = [
      [
        { dark: 'nope' },
        /: dark must be "media", "class", "light-dark" or false$/,
      ],
      [
        { dark: null },
        /: dark must be "media", "class", "light-dark" or false$/,
      ],
      [{ gamut: 'x' }, /: gamut must be "srgb" or "p3"$/],
      [{ gamut: null }, /: gamut must be "srgb" or "p3"$/],
      [{ neutral: 'yes' }, /: neutral must be true or false$/],
      [{ status: 'yes' }, /: status must be true or false$/],
      [{ roles: 1 }, /: roles must be true or false$/],
      [{ soft: 'yes' }, /: soft must be true or false$/],
      [{ harmony: null }, /: harmony must be true or false$/],
      [{ seed: '' }, /: seed must be a number or a non empty string$/],
      [{ seed: null }, /: seed must be a number or a non empty string$/],
      [{ seed: {} }, /: seed must be a number or a non empty string$/],
    ];
    for (const [content, message] of cases) {
      expect(failing(content)).toThrow(message);
    }
    expect(failing('{"seed": 1e999}')).toThrow(
      /: seed must be a number or a non empty string$/,
    );
  });

  it('leaves the contrast values to createTheme', () => {
    expect(loadConfig(write('{"contrast":{"method":"x"}}'))).toEqual({
      contrast: { method: 'x' },
    });
  });

  it('accepts a byte order mark at the start of the file', () => {
    const config = loadConfig(write('\uFEFF{"colors":{"a":"red"}}'));
    expect(config.colors).toEqual({ a: 'red' });
  });

  it('refuses an out that is a folder or the config file itself', () => {
    expect(failing({ out: 'dist/' })).toThrow(/: out must be a file path$/);
    expect(failing({ out: 'config.json' })).toThrow(
      /: out cannot be the config file itself$/,
    );
    expect(failing({ out: './config.json' })).toThrow(
      /: out cannot be the config file itself$/,
    );
  });

  it('follows symbolic links when keeping out inside the folder', () => {
    const outside = mkdtempSync(join(tmpdir(), 'tcc-config-outside-'));
    try {
      symlinkSync(outside, join(dir, 'cfg'));
      expect(failing({ out: 'cfg/theme.css' })).toThrow(
        /: out must stay inside the config directory$/,
      );
      expect(failing({ out: 'cfg/deep/theme.css' })).toThrow(
        /: out must stay inside the config directory$/,
      );
      expect(() => failing({ out: 'a/b/theme.css' })()).not.toThrow();
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('refuses a dangling symbolic link as out', () => {
    const outside = mkdtempSync(join(tmpdir(), 'tcc-config-outside-'));
    try {
      symlinkSync(join(outside, 'missing.css'), join(dir, 'theme.css'));
      expect(failing({ out: 'theme.css' })).toThrow(
        /: out must stay inside the config directory$/,
      );
      symlinkSync(join(dir, 'not-there.css'), join(dir, 'inner.css'));
      expect(failing({ out: 'inner.css' })).toThrow(
        /: out must stay inside the config directory$/,
      );
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
