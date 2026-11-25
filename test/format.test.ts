import { formatTheme } from '../src/format.js';
import { createTheme } from '../src/theme.js';

const theme = createTheme({ primary: '#940BDF' });
const lightOnly = createTheme({ primary: '#940BDF' }, { dark: false });

describe('Theme.variables', () => {
  it('matches the vars lines, in order', () => {
    const themes = [
      theme,
      createTheme({ a: 'red' }, { roles: true, status: true }),
      createTheme({ a: 'red' }, { contrast: { on: true } }),
    ];
    for (const t of themes) {
      for (const mode of ['light', 'dark'] as const) {
        const parsed = t
          .vars(mode)
          .split('\n')
          .map((line) => {
            const index = line.indexOf(': ');
            return [line.slice(0, index), line.slice(index + 2, -1)];
          });
        expect(Object.entries(t.variables(mode))).toEqual(parsed);
      }
    }
  });

  it('defaults to light and rejects an invalid mode', () => {
    expect(theme.variables()).toEqual(theme.variables('light'));
    expect(() => theme.variables('x' as never)).toThrow('Invalid mode: x');
  });
});

describe('formatTheme', () => {
  const formats = ['css', 'json', 'scss', 'tokens'] as const;

  it('ends every output with exactly one newline', () => {
    for (const format of formats) {
      for (const dark of [true, false]) {
        const out = formatTheme(theme, format, dark);
        expect(out.endsWith('\n')).toBe(true);
        expect(out.endsWith('\n\n')).toBe(false);
      }
    }
  });

  it('keeps css unchanged', () => {
    expect(formatTheme(theme, 'css', true)).toBe(theme.css);
  });

  it('prints json with both modes, or light only', () => {
    const both = JSON.parse(formatTheme(theme, 'json', true));
    expect(both).toEqual({
      light: theme.variables('light'),
      dark: theme.variables('dark'),
    });
    const light = JSON.parse(formatTheme(lightOnly, 'json', false));
    expect(Object.keys(light)).toEqual(['light']);
  });

  it('prints scss maps with quoted keys and no trailing comma', () => {
    const out = formatTheme(theme, 'scss', true);
    expect(out).toContain('$theme-light: (\n  "primary-50": oklch(');
    expect(out).toContain('\n\n$theme-dark: (\n');
    expect(out).toContain('  "primary-contrast": #ffffff\n);');
    expect(out).not.toMatch(/,\n\)/);
    expect(out.split('(\n').length - 1).toBe(2);
    expect(out.split('\n);').length - 1).toBe(2);
    const single = formatTheme(lightOnly, 'scss', false);
    expect(single).not.toContain('$theme-dark');
    expect(single.split('\n').filter((l) => l.startsWith('  "'))).toHaveLength(
      12,
    );
  });

  it('prints design tokens with the dark hex in extensions', () => {
    const tokens = JSON.parse(formatTheme(theme, 'tokens', true));
    const { scales } = theme;
    const hex500 = scales.primary!.light.steps['500'].hex;
    expect(tokens.primary['500']).toEqual({
      $type: 'color',
      $value: {
        colorSpace: 'srgb',
        components: [0x94 / 255, 0x0b / 255, 0xdf / 255].map((n) =>
          Number(n.toFixed(4)),
        ),
        hex: hex500,
      },
      $extensions: {
        'tailwindcss-custom-colors': {
          dark: scales.primary!.dark.steps['500'].hex,
        },
      },
    });
    expect(
      tokens.primary['50'].$extensions['tailwindcss-custom-colors'].dark,
    ).toBe(scales.primary!.dark.steps['50'].hex);
    expect(tokens.primary.contrast.$value).toEqual({
      colorSpace: 'srgb',
      components: [1, 1, 1],
      hex: '#ffffff',
    });
    expect(Object.keys(tokens.primary)).toHaveLength(12);
    const plain = JSON.parse(formatTheme(lightOnly, 'tokens', false));
    expect(plain.primary['500']).toEqual({
      $type: 'color',
      $value: expect.objectContaining({ hex: hex500 }),
    });
    expect(plain.primary.contrast).not.toHaveProperty('$extensions');
    expect(plain.primary['50']).not.toHaveProperty('$extensions');
  });

  it('puts the dark values under the class strategy too', () => {
    const cls = createTheme({ a: 'red' }, { dark: 'class' });
    expect(formatTheme(cls, 'json', true)).toContain('"dark"');
    expect(formatTheme(cls, 'scss', true)).toContain('$theme-dark');
    expect(formatTheme(cls, 'tokens', true)).toContain('"dark": "#');
  });

  it('handles gray and wide gamut inputs without NaN', () => {
    const gray = createTheme({ a: 'gray' }, { gamut: 'p3' });
    for (const format of ['json', 'scss', 'tokens'] as const) {
      expect(formatTheme(gray, format, true)).not.toContain('NaN');
    }
  });

  it('keeps unusual names in every format', () => {
    const odd = createTheme({ 'brand-é_2': '#0B6FDF', '3d': 'teal' });
    expect(formatTheme(odd, 'scss', true)).toContain('"brand-é_2-50"');
    expect(formatTheme(odd, 'scss', true)).toContain('"3d-50"');
    expect(JSON.parse(formatTheme(odd, 'json', true)).light).toHaveProperty(
      '--3d-50',
    );
    expect(Object.keys(JSON.parse(formatTheme(odd, 'tokens', true)))).toEqual([
      'brand-é_2',
      '3d',
    ]);
  });

  it('carries roles, status and on-colors through the variable formats', () => {
    const full = createTheme(
      { a: 'red' },
      { roles: true, status: true, contrast: { on: true } },
    );
    const json = JSON.parse(formatTheme(full, 'json', true));
    expect(json.dark['--surface']).toBe('var(--neutral-50)');
    expect(json.light).toHaveProperty('--danger-500-on');
    expect(formatTheme(full, 'scss', true)).toContain(
      '"muted": var(--neutral-600)',
    );
  });
});
