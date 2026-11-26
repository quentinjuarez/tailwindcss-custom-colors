import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { compile } from 'tailwindcss';

import { createTheme, type ThemeOptions } from '../src/theme.js';

const require = createRequire(import.meta.url);

const loadStylesheet = async (id: string, base: string) => {
  const path = require.resolve(id.endsWith('.css') ? id : `${id}.css`);
  return { path, base, content: await readFile(path, 'utf8') };
};

const build = async (
  colors: Record<string, string>,
  candidates: string[],
  options: ThemeOptions = {},
) => {
  const { css } = createTheme(colors, options);
  const compiler = await compile(`@import "tailwindcss/utilities";\n${css}`, {
    base: process.cwd(),
    loadStylesheet,
  });
  return { css, output: compiler.build(candidates) };
};

const rule = (output: string, selector: string) => {
  const start = output.indexOf(selector);
  expect(start).toBeGreaterThanOrEqual(0);
  return output.slice(start, output.indexOf('}', start) + 1);
};

describe('tailwind 4 compile', () => {
  it('builds utilities that reference the runtime variables', async () => {
    const { css, output } = await build({ primary: '#940BDF' }, [
      'bg-primary-500',
      'bg-primary-500/50',
      'text-primary-contrast',
    ]);

    expect(rule(output, '.bg-primary-500 ')).toContain(
      'background-color: var(--primary-500)',
    );

    const alpha = rule(output, '.bg-primary-500\\/50');
    expect(alpha).toContain('color-mix(');
    expect(alpha).toContain('var(--primary-500)');

    expect(rule(output, '.text-primary-contrast')).toContain(
      'color: var(--primary-contrast)',
    );

    expect(css).toContain('--primary-500: oklch(');
  });

  it('builds utilities for every color name without raw color literals', async () => {
    const { output } = await build({ primary: '#940BDF', brand: '#0B6FDF' }, [
      'bg-brand-500',
      'border-brand-200',
    ]);

    const background = rule(output, '.bg-brand-500');
    const border = rule(output, '.border-brand-200');

    expect(background).toContain('var(--brand-500)');
    expect(border).toContain('var(--brand-200)');
    expect(background).not.toContain('oklch(');
    expect(border).not.toContain('oklch(');
  });

  it('compiles a p3 theme', async () => {
    const { css, output } = await build(
      { vivid: 'color(display-p3 0 1 0)' },
      ['bg-vivid-500', 'text-vivid-contrast'],
      { gamut: 'p3' },
    );

    expect(css).toContain('--vivid-500: oklch(');
    expect(rule(output, '.bg-vivid-500')).toContain('var(--vivid-500)');
    expect(rule(output, '.text-vivid-contrast')).toContain(
      'var(--vivid-contrast)',
    );
  });

  it('compiles the semantic role and derived utilities', async () => {
    const { output } = await build(
      { primary: '#940BDF' },
      [
        'bg-surface',
        'text-on-surface',
        'border-border',
        'text-muted',
        'bg-success-500',
        'text-neutral-700',
      ],
      { roles: true, status: true },
    );
    expect(rule(output, '.bg-surface')).toContain('var(--surface)');
    expect(rule(output, '.text-on-surface')).toContain('var(--on-surface)');
    expect(rule(output, '.border-border')).toContain('var(--border)');
    expect(rule(output, '.text-muted')).toContain('var(--muted)');
    expect(rule(output, '.bg-success-500')).toContain('var(--success-500)');
    expect(rule(output, '.text-neutral-700')).toContain('var(--neutral-700)');
  });

  it('keeps light-dark inside the variables and the references', async () => {
    const { output } = await build(
      { primary: '#940BDF' },
      ['bg-primary-500', 'bg-primary-50', 'text-primary-contrast'],
      { dark: 'light-dark' },
    );
    expect(rule(output, '.bg-primary-50')).toContain('var(--primary-50)');
    expect(rule(output, '.bg-primary-500 ')).toContain('var(--primary-500)');
    expect(output).toContain('light-dark(');
    expect(output).toContain('color-scheme');
  });
});
