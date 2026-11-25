import { wcagRatio } from '../src/color/contrast.js';
import { createTheme } from '../src/theme.js';

const parts = (oklch: string) => {
  const [l, c, h] = oklch
    .match(/oklch\(([^)]+)\)/)![1]!
    .split(' ')
    .map(Number);
  return { l: l!, c: c!, h: h! };
};

const STATUS = ['success', 'warning', 'danger', 'info'];

describe('derived scales', () => {
  it('adds nothing by default', () => {
    const theme = createTheme({ primary: '#940BDF' });
    expect(Object.keys(theme.scales)).toEqual(['primary']);
    expect(theme.css).not.toContain('--surface');
    expect(theme.css).not.toContain('neutral');
  });

  it('derives a tinted neutral from the first color', () => {
    const { scales } = createTheme(
      { primary: '#940BDF', accent: '#0B6FDF' },
      { neutral: 'auto' },
    );
    expect(Object.keys(scales)).toEqual(['primary', 'accent', 'neutral']);
    const primary = parts(scales.primary!.light.steps['500'].oklch);
    const neutral = parts(scales.neutral!.light.steps['500'].oklch);
    expect(neutral.c).toBeLessThanOrEqual(0.02);
    expect(neutral.c).toBeGreaterThan(0);
    expect(neutral.h).toBeCloseTo(primary.h, 1);
  });

  it('gives a pure gray neutral for gray, black and white inputs', () => {
    for (const color of ['#808080', '#000000', '#ffffff']) {
      const { css, scales } = createTheme({ a: color }, { neutral: 'auto' });
      expect(css).not.toContain('NaN');
      for (const step of Object.values(scales.neutral!.light.steps)) {
        expect(parts(step.oklch).c).toBe(0);
      }
    }
  });

  it('adds the four status scales after neutral with pinned bases', () => {
    const { scales } = createTheme(
      { primary: '#940BDF' },
      { neutral: 'auto', status: true },
    );
    expect(Object.keys(scales)).toEqual(['primary', 'neutral', ...STATUS]);
    const hues: Record<string, number> = {
      success: 145,
      warning: 85,
      danger: 27,
      info: 250,
    };
    for (const name of STATUS) {
      expect(parts(scales[name]!.light.steps['500'].oklch).h).toBeCloseTo(
        hues[name]!,
        0,
      );
      expect(typeof scales[name]!.light.apca).toBe('number');
      expect(Object.keys(scales[name]!.light.on)).toHaveLength(11);
      expect(scales[name]!.dark.steps['50'].hex).toBe(
        scales[name]!.light.steps['950'].hex,
      );
    }
  });

  it('keeps a color you define yourself', () => {
    const own = createTheme(
      { primary: '#940BDF', neutral: '#334155', success: '#00ff88' },
      { neutral: 'auto', status: true, roles: true },
    );
    const base = createTheme({
      primary: '#940BDF',
      neutral: '#334155',
      success: '#00ff88',
    });
    expect(own.scales.neutral).toEqual(base.scales.neutral);
    expect(own.scales.success).toEqual(base.scales.success);
    expect(Object.keys(own.scales)).toEqual([
      'primary',
      'neutral',
      'success',
      'warning',
      'danger',
      'info',
    ]);
    expect(own.css.match(/--neutral-50:/g)).toHaveLength(2);
  });

  it('applies the contrast options and report to derived scales', () => {
    const theme = createTheme(
      { primary: '#940BDF' },
      { neutral: 'auto', status: true, contrast: { on: true } },
    );
    expect(theme.css).toContain('--danger-500-on:');
    expect(theme.report()).toHaveLength(6 * 2 * 11);
  });

  it('derives in-gamut scales with p3', () => {
    const { css, scales } = createTheme(
      { vivid: 'color(display-p3 0 1 0)' },
      { gamut: 'p3', neutral: 'auto', status: true },
    );
    expect(css).not.toContain('NaN');
    expect(Object.keys(scales)).toHaveLength(6);
  });

  it('rejects invalid values with a reasoned error', () => {
    const run = (options: object) => () =>
      createTheme({ a: 'red' }, options as never);
    expect(run({ neutral: 'x' })).toThrow(
      "Invalid neutral option: x. Expected 'auto' or false",
    );
    expect(run({ neutral: true })).toThrow('Invalid neutral option: true');
    expect(run({ status: 'yes' })).toThrow(
      'Invalid status option: yes. Expected true or false',
    );
    expect(run({ roles: 1 })).toThrow(
      'Invalid roles option: 1. Expected true or false',
    );
    const bare = Object.create(null);
    for (const key of ['neutral', 'status', 'roles', 'dark', 'gamut']) {
      expect(run({ [key]: bare })).toThrow(`Invalid ${key} option: object`);
    }
  });
});

describe('roles', () => {
  const lines = [
    '--surface: var(--neutral-50);',
    '--on-surface: var(--neutral-950);',
    '--border: var(--neutral-200);',
    '--muted: var(--neutral-600);',
  ];
  const tokens = [
    '--color-surface: var(--surface);',
    '--color-on-surface: var(--on-surface);',
    '--color-border: var(--border);',
    '--color-muted: var(--muted);',
  ];

  it('implies a neutral scale and emits roles in every block', () => {
    for (const dark of ['media', 'class'] as const) {
      const theme = createTheme({ primary: '#940BDF' }, { roles: true, dark });
      expect(theme.scales.neutral).toBeDefined();
      for (const line of lines) {
        expect(theme.css.split(line).length - 1).toBe(2);
      }
      for (const token of tokens) expect(theme.css).toContain(token);
      expect(theme.css.indexOf('--color-primary-950')).toBeLessThan(
        theme.css.indexOf('--color-surface'),
      );
    }
  });

  it('emits roles once with dark false', () => {
    const { css } = createTheme(
      { primary: '#940BDF' },
      { roles: true, dark: false },
    );
    for (const line of lines) expect(css.split(line).length - 1).toBe(1);
  });

  it('keeps vars and apply self sufficient', () => {
    const theme = createTheme({ primary: '#940BDF' }, { roles: true });
    for (const mode of ['light', 'dark'] as const) {
      for (const line of lines) expect(theme.vars(mode)).toContain(line);
    }
    const set: string[] = [];
    theme.apply({ style: { setProperty: (name) => set.push(name) } }, 'dark');
    expect(set).toContain('--surface');
    expect(set).toContain('--muted');
  });

  it('reaches AA for muted on surface for every hue, in both modes', () => {
    for (let hue = 0; hue < 360; hue += 30) {
      const { scales } = createTheme(
        { a: `oklch(0.6 0.2 ${hue})` },
        { roles: true },
      );
      const { light, dark } = scales.neutral!;
      expect(
        wcagRatio(light.steps['600'].hex, light.steps['50'].hex),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        wcagRatio(dark.steps['600'].hex, dark.steps['50'].hex),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
