import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { run } from '../src/cli.js';
import { loadConfig } from '../src/config.js';
import { createTheme } from '../src/theme.js';

const css = (options: object = {}, colors = { primary: '#940BDF' }) =>
  createTheme(colors, { dark: 'light-dark', ...options }).css;

const declarationNames = (text: string) =>
  [...text.matchAll(/^ {2}(--[\w-]+):/gm)].map((m) => m[1]);

describe('light-dark strategy', () => {
  it('emits one light-dark declaration per variable', () => {
    const out = css();
    expect(out.startsWith(':root {\n  color-scheme: light dark;\n')).toBe(true);
    expect(out).toContain(
      '  --primary-50: light-dark(oklch(0.9750 0.0150 306.79), oklch(0.2500 0.1201 306.79));',
    );
    expect(out).toContain(
      '  --primary-950: light-dark(oklch(0.2500 0.1201 306.79), oklch(0.9750 0.0150 306.79));',
    );
  });

  it('collapses values that do not change between modes', () => {
    const out = css();
    expect(out).toContain('  --primary-500: oklch(0.5277 0.2669 306.79);');
    expect(out).toContain('  --primary-contrast: #ffffff;');
    const roles = css({ roles: true });
    expect(roles).toContain('  --surface: var(--neutral-50);');
    expect(roles).not.toContain('light-dark(var(--neutral-50)');
  });

  it('has the exact shape of the other blocks', () => {
    const out = createTheme({ a: '#940BDF' }, { dark: 'light-dark' }).css;
    const blocks = out.trimEnd().split('\n\n');
    expect(blocks).toHaveLength(4);
    expect(blocks[1]).toBe('.light {\n  color-scheme: light;\n}');
    expect(blocks[2]).toBe('.dark {\n  color-scheme: dark;\n}');
    expect(blocks[3]!.startsWith('@theme inline {')).toBe(true);
    expect(out).not.toContain('@media');
  });

  it('keeps the same variables in the same order as the media strategy', () => {
    const colors = { primary: '#0B6FDF', accent: '#E5484D' };
    const options = {
      harmony: true,
      status: true,
      roles: true,
      contrast: { on: true },
    };
    const lightDark = createTheme(colors, { ...options, dark: 'light-dark' });
    const media = createTheme(colors, { ...options, dark: 'media' });
    const rootOf = (text: string) => text.split('\n\n')[0]!;
    expect(declarationNames(rootOf(lightDark.css))).toEqual(
      declarationNames(rootOf(media.css)),
    );
    expect(lightDark.css.match(/color-scheme: light dark/g)).toHaveLength(1);
  });

  it('puts the light value first for every uncollapsed variable', () => {
    const theme = createTheme(
      { primary: '#0B6FDF' },
      { dark: 'light-dark', harmony: true, contrast: { on: true } },
    );
    const light = theme.variables('light');
    const dark = theme.variables('dark');
    for (const [name, value] of Object.entries(light)) {
      const expected =
        value === dark[name] ? value : `light-dark(${value}, ${dark[name]})`;
      expect(theme.css).toContain(`  ${name}: ${expected};`);
    }
  });

  it('works with p3', () => {
    const out = createTheme(
      { vivid: 'color(display-p3 0 1 0)' },
      { dark: 'light-dark', gamut: 'p3' },
    ).css;
    expect(out).not.toContain('NaN');
    expect(out).toContain('light-dark(');
  });

  it('leaves vars, variables, apply and the other formats untouched', () => {
    const colors = { primary: '#940BDF' };
    const a = createTheme(colors, { dark: 'light-dark' });
    const b = createTheme(colors, { dark: 'media' });
    expect(a.vars('dark')).toBe(b.vars('dark'));
    expect(a.variables('light')).toEqual(b.variables('light'));
    expect(a.scales).toEqual(b.scales);
    expect(a.report()).toEqual(b.report());
    const set: string[] = [];
    a.apply({ style: { setProperty: (name) => set.push(name) } }, 'dark');
    expect(set).toHaveLength(Object.keys(b.variables('dark')).length);
  });

  it('rejects an unknown value with the new list', () => {
    expect(() => createTheme({ a: 'red' }, { dark: 'x' as never })).toThrow(
      "Invalid dark option: x. Expected 'media', 'class', 'light-dark' or false",
    );
  });
});

describe('light-dark in the CLI and the config', () => {
  it('maps --dark light-dark to the option', () => {
    const result = run(['primary=#940BDF', '--dark', 'light-dark']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(css());
  });

  it('keeps the dark side in the json format', () => {
    const { stdout } = run([
      'a=red',
      '--dark',
      'light-dark',
      '--format',
      'json',
    ]);
    expect(Object.keys(JSON.parse(stdout))).toEqual(['light', 'dark']);
  });

  it('lists the new choice in the messages and the usage', () => {
    expect(run(['a=red', '--dark', 'x']).stderr).toBe(
      'Invalid --dark value: x. Expected media, class, light-dark or none\n',
    );
    expect(run(['--help']).stdout).toContain('media|class|light-dark|none');
    expect(run([]).stderr).toContain('media|class|light-dark|none');
  });

  it('accepts light-dark in a config file and lists it in the error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tcc-light-dark-'));
    try {
      const path = join(dir, 'c.json');
      writeFileSync(path, '{"dark":"light-dark"}');
      expect(loadConfig(path)).toEqual({ dark: 'light-dark' });
      writeFileSync(path, '{"dark":"nope"}');
      expect(() => loadConfig(path)).toThrow(
        /: dark must be "media", "class", "light-dark" or false$/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
