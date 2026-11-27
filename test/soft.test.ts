import { wcagRatio } from '../src/color/contrast.js';
import { createTheme } from '../src/theme.js';

const lightness = (value: string) => Number(value.match(/oklch\(([\d.]+)/)![1]);
const chroma = (value: string) =>
  Number(value.match(/oklch\([\d.]+ ([\d.]+)/)![1]);

describe('soft backgrounds', () => {
  it('adds nothing by default', () => {
    const theme = createTheme({ primary: '#940BDF' }, { status: true });
    expect(theme.css).not.toContain('-soft');
    expect(Object.keys(theme.variables())).not.toContain('--primary-soft');
  });

  it('adds one soft variable per color in both modes', () => {
    const theme = createTheme(
      { primary: '#940BDF', accent: '#0B6FDF' },
      { soft: true, status: true },
    );
    const names = Object.keys(theme.scales);
    for (const name of names) {
      expect(theme.variables('light')[`--${name}-soft`]).toBeDefined();
      expect(theme.variables('dark')[`--${name}-soft`]).toBeDefined();
      expect(theme.css).toContain(`--color-${name}-soft: var(--${name}-soft);`);
    }
  });

  it('keeps the light soft color equal to step 100', () => {
    const theme = createTheme({ primary: '#940BDF' }, { soft: true });
    expect(theme.variables('light')['--primary-soft']).toBe(
      theme.scales.primary!.light.steps['100'].oklch,
    );
  });

  it('is quieter than step 100 in dark mode', () => {
    const theme = createTheme({ danger: '#de3c37' }, { soft: true });
    const dark = theme.variables('dark');
    expect(chroma(dark['--danger-soft']!)).toBeLessThan(
      chroma(dark['--danger-100']!),
    );
    expect(lightness(dark['--danger-soft']!)).toBeLessThan(0.3);
  });

  it('follows light-dark and auto', () => {
    const theme = createTheme(
      { primary: '#940BDF' },
      { soft: true, dark: 'light-dark' },
    );
    expect(theme.variables('auto')['--primary-soft']).toMatch(
      /^light-dark\(oklch\(.+\), oklch\(.+\)\)$/,
    );
    expect(theme.css).toContain('--primary-soft: light-dark(');
  });

  it('rejects a non boolean', () => {
    expect(() =>
      createTheme({ primary: '#940BDF' }, { soft: 'yes' as never }),
    ).toThrow('Invalid soft option: yes. Expected true or false');
  });

  it('works for a gray without a hue', () => {
    const theme = createTheme({ gray: '#808080' }, { soft: true });
    expect(theme.variables('dark')['--gray-soft']).toMatch(/^oklch\(/);
  });

  it('keeps step 800 text readable on the light soft color of status colors', () => {
    const { scales } = createTheme(
      { primary: '#0B6FDF' },
      { status: true, soft: true },
    );
    for (const name of ['success', 'warning', 'danger', 'info']) {
      const { steps } = scales[name]!.light;
      expect(
        wcagRatio(steps['800'].hex, steps['100'].hex),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
