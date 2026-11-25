import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTheme } from '../src/theme.js';
import {
  customColors,
  type CustomColorsOptions,
  type VitePlugin,
} from '../src/vite.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tcc-vite-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const colors = { primary: '#940BDF' };
const theme = createTheme(colors).css;
const MARKER = "@import 'virtual:theme.css';";

const generated = () => join(dir, 'cache', 'tailwindcss-custom-colors');
const themeFile = () => {
  const files = existsSync(generated()) ? readdirSync(generated()) : [];
  return join(generated(), files[0] ?? 'missing.css');
};
const importLine = () => `@import ${JSON.stringify(themeFile())};`;

const make = (options: CustomColorsOptions): VitePlugin => {
  const plugin = customColors(options);
  plugin.configResolved({ root: dir, cacheDir: join(dir, 'cache') });
  return plugin;
};

const transform = (plugin: VitePlugin, code: string, id = '/a/app.css') =>
  plugin.transform.call({}, code, id);

const write = (name: string, content: string) => {
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
};

describe('options', () => {
  it('rejects bad options with one line errors', () => {
    for (const bad of [undefined, null, 'x', 1, []]) {
      expect(() => customColors(bad as never)).toThrow(
        'customColors expects an options object',
      );
    }
    const needs =
      'customColors needs a colors option (an object or a path to a JSON file)';
    for (const bad of [undefined, null, '', 1, [], true]) {
      expect(() => customColors({ colors: bad } as never)).toThrow(needs);
    }
  });

  it('has the expected shape', () => {
    const plugin = customColors({ colors });
    expect(plugin.name).toBe('tailwindcss-custom-colors');
    expect(plugin.enforce).toBe('pre');
  });
});

describe('virtual module', () => {
  it('resolves and loads the theme', () => {
    const plugin = make({ colors });
    expect(plugin.resolveId('virtual:theme.css')).toBe('\0virtual:theme.css');
    expect(plugin.resolveId('virtual:other.css')).toBeNull();
    expect(plugin.resolveId('./theme.css')).toBeNull();
    expect(plugin.load('\0virtual:theme.css')).toBe(theme);
    expect(plugin.load('/a/app.css')).toBeNull();
  });

  it('passes the theme options through', () => {
    const plugin = make({ colors, dark: 'class' });
    expect(plugin.load('\0virtual:theme.css')).toBe(
      createTheme(colors, { dark: 'class' }).css,
    );
    expect(plugin.load('\0virtual:theme.css')).toContain('.dark {');
  });

  it('lets createTheme errors through', () => {
    const plugin = make({ colors: { a: 'nope' } });
    expect(() => plugin.load('\0virtual:theme.css')).toThrow(
      'Invalid color: nope',
    );
  });
});

describe('css transform', () => {
  it.each([
    ["@import 'virtual:theme.css';"],
    ['@import "virtual:theme.css";'],
    ["@import 'virtual:theme.css'"],
    ["@import url('virtual:theme.css');"],
    ['@import url( "virtual:theme.css" );'],
  ])('replaces %s with an import of the generated file', (line) => {
    const plugin = make({ colors });
    expect(transform(plugin, `@import 'tailwindcss';\n${line}\n.x{}`)).toBe(
      `@import 'tailwindcss';\n${importLine()}\n.x{}`,
    );
    expect(readFileSync(themeFile(), 'utf8')).toBe(theme);
  });

  it('replaces every occurrence', () => {
    const out = transform(make({ colors }), `${MARKER}\n${MARKER}`)!;
    expect(out).toBe(`${importLine()}\n${importLine()}`);
  });

  it('ignores other imports, queries, other ids and other files', () => {
    const p = make({ colors });
    expect(transform(p, "@import './theme.css';")).toBeNull();
    expect(transform(p, "@import 'virtual:other.css';")).toBeNull();
    expect(transform(p, "@import 'virtual:theme.css?inline';")).toBeNull();
    expect(transform(p, MARKER, '/a/app.ts')).toBeNull();
    expect(transform(p, 'body{}')).toBeNull();
  });

  it('keeps the conditions after the import', () => {
    const plugin = make({ colors });
    const cases: [string, string][] = [
      ["@import 'virtual:theme.css' layer(theme);", ' layer(theme)'],
      [
        "@import url('virtual:theme.css') screen and (min-width: 1px);",
        ' screen and (min-width: 1px)',
      ],
      ["@import 'virtual:theme.css' ;", ''],
    ];
    for (const [input, tail] of cases) {
      expect(transform(plugin, input)).toBe(
        `@import ${JSON.stringify(themeFile())}${tail};`,
      );
    }
  });

  it('matches a minified import and the next line stays untouched', () => {
    const plugin = make({ colors });
    expect(transform(plugin, "@import'virtual:theme.css';.x{}")).toBe(
      `${importLine()}.x{}`,
    );
    expect(transform(plugin, "@import 'virtual:theme.css'\n.x{}")).toBe(
      `${importLine()}\n.x{}`,
    );
  });

  it('handles single file component style ids', () => {
    const plugin = make({ colors });
    for (const id of [
      '/a/App.vue?vue&type=style&index=0&lang.css',
      '/a/App.svelte?svelte&type=style&lang.css',
    ]) {
      expect(transform(plugin, MARKER, id)).toBe(importLine());
    }
    expect(transform(plugin, MARKER, '/a/App.vue?vue&type=script')).toBeNull();
  });

  it('skips css modules wrapped as javascript', () => {
    const plugin = make({ colors });
    expect(transform(plugin, MARKER, '/a/app.css?raw')).toBeNull();
    expect(transform(plugin, MARKER, '/a/app.css?url')).toBeNull();
  });

  it('recreates the file when it is deleted or overwritten', () => {
    const plugin = make({ colors });
    transform(plugin, MARKER);
    rmSync(themeFile());
    transform(plugin, MARKER);
    expect(readFileSync(themeFile(), 'utf8')).toBe(theme);
    writeFileSync(themeFile(), 'other');
    transform(plugin, MARKER);
    expect(readFileSync(themeFile(), 'utf8')).toBe(theme);
  });

  it('uses one file per configuration', () => {
    transform(make({ colors }), MARKER);
    transform(make({ colors, dark: 'class' }), MARKER);
    transform(make({ colors: { other: '#0B6FDF' } }), MARKER);
    expect(readdirSync(generated())).toHaveLength(3);
  });

  it('accepts a query on the css file id', () => {
    expect(transform(make({ colors }), MARKER, '/a/app.css?direct')).toBe(
      importLine(),
    );
  });

  it('writes nothing until a theme is needed', () => {
    const p = make({ colors });
    transform(p, 'body{}');
    expect(() => readFileSync(themeFile())).toThrow();
  });
});

describe('colors file', () => {
  it('reads a json file relative to the root', () => {
    write('colors.json', JSON.stringify(colors));
    const plugin = make({ colors: 'colors.json' });
    expect(plugin.load('\0virtual:theme.css')).toBe(theme);
  });

  it('accepts an absolute path', () => {
    const path = write('colors.json', JSON.stringify(colors));
    const plugin = make({ colors: path });
    expect(plugin.load('\0virtual:theme.css')).toBe(theme);
  });

  const failing = (content: string | null) => {
    if (content !== null) write('colors.json', content);
    const plugin = make({ colors: 'colors.json' });
    return () => plugin.load('\0virtual:theme.css');
  };

  it('reports a missing file', () => {
    expect(failing(null)).toThrow(/^Cannot read colors file .*: ENOENT$/);
  });

  it('reports invalid json, arrays, empty content and bad values', () => {
    expect(failing('{ nope')).toThrow(/^Invalid colors file .*colors\.json: /);
    expect(failing('')).toThrow(/^Invalid colors file /);
    expect(failing('[]')).toThrow(
      /^Invalid colors file .*: expected an object of name: color strings$/,
    );
    expect(failing('{"a": 1}')).toThrow(
      /expected an object of name: color strings$/,
    );
    expect(failing('null')).toThrow(/^Invalid colors file /);
  });

  it('reports an invalid color from the file with the createTheme message', () => {
    expect(failing('{"a": "nope"}')).toThrow('Invalid color: nope');
  });

  it('never watches anything for an object colors option', () => {
    const plugin = make({ colors });
    const addWatchFile = vi.fn();
    plugin.load.call({ addWatchFile }, '\0virtual:theme.css');
    expect(addWatchFile).not.toHaveBeenCalled();
  });
});

describe('watching', () => {
  it('registers the colors file from transform and load', () => {
    const path = write('colors.json', JSON.stringify(colors));
    const plugin = make({ colors: 'colors.json' });
    const addWatchFile = vi.fn();
    plugin.transform.call({ addWatchFile }, MARKER, '/a/app.css');
    plugin.load.call({ addWatchFile }, '\0virtual:theme.css');
    expect(addWatchFile).toHaveBeenCalledTimes(2);
    expect(addWatchFile).toHaveBeenCalledWith(path);
  });

  it('caches the theme and refreshes the file after a change', () => {
    const path = write('colors.json', JSON.stringify(colors));
    const plugin = make({ colors: 'colors.json' });

    expect(transform(plugin, MARKER)).toBe(importLine());
    expect(readFileSync(themeFile(), 'utf8')).toBe(theme);
    write('colors.json', JSON.stringify({ primary: '#0B6FDF' }));
    transform(plugin, MARKER);
    expect(readFileSync(themeFile(), 'utf8')).toBe(theme);

    plugin.watchChange(path);
    expect(transform(plugin, MARKER)).toBe(importLine());
    expect(readFileSync(themeFile(), 'utf8')).toBe(
      createTheme({ primary: '#0B6FDF' }).css,
    );

    write('colors.json', JSON.stringify(colors));
    plugin.watchChange(path);
    transform(plugin, MARKER);
    expect(readFileSync(themeFile(), 'utf8')).toBe(theme);
  });

  it('ignores changes to other files', () => {
    write('colors.json', JSON.stringify(colors));
    const plugin = make({ colors: 'colors.json' });
    transform(plugin, MARKER);
    write('colors.json', JSON.stringify({ primary: '#0B6FDF' }));
    plugin.watchChange(join(dir, 'other.json'));
    transform(plugin, MARKER);
    expect(readFileSync(themeFile(), 'utf8')).toBe(theme);
  });

  it('does not cache a failure', () => {
    const path = write('colors.json', '{ nope');
    const plugin = make({ colors: 'colors.json' });
    expect(() => transform(plugin, MARKER)).toThrow(/Invalid colors file/);
    write('colors.json', JSON.stringify(colors));
    plugin.watchChange(path);
    transform(plugin, MARKER);
    expect(readFileSync(themeFile(), 'utf8')).toBe(theme);
  });
});
