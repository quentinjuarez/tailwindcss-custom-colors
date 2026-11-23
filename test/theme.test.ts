import {
  createTheme,
  type Mode,
  type StyleTarget,
  type ThemeOptions,
} from '../src/theme.js';

const recorder = () => {
  const calls: [string, string][] = [];
  const target: StyleTarget = {
    style: { setProperty: (name, value) => calls.push([name, value]) },
  };
  return { calls, target };
};

describe('createTheme', () => {
  it('pins step 500 to the input in both modes', () => {
    const { scales } = createTheme({ primary: '#940BDF' });
    expect(scales.primary.light.steps['500'].hex).toBe('#940bdf');
    expect(scales.primary.dark.steps['500'].hex).toBe('#940bdf');
  });

  it('mirrors the light scale in dark mode', () => {
    const { light, dark } = createTheme({ primary: '#940BDF' }).scales.primary;
    expect(dark.steps['50']).toEqual(light.steps['950']);
    expect(dark.steps['900']).toEqual(light.steps['100']);
    expect(dark.contrast).toBe(light.contrast);
    expect(dark.ratio).toBe(light.ratio);
  });

  it('emits the stylesheet with media dark mode by default', () => {
    const { css } = createTheme({ primary: '#940BDF' });
    expect(css).toContain('@theme inline {');
    expect(css).toContain('--color-primary-500: var(--primary-500);');
    expect(css).toContain('--color-primary-contrast: var(--primary-contrast);');
    expect(css).toContain(':root {');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });

  it('emits a .dark block with dark: class', () => {
    const { css } = createTheme({ primary: '#940BDF' }, { dark: 'class' });
    expect(css).toContain('.dark {');
    expect(css).not.toContain('@media');
  });

  it('emits no dark block with dark: false', () => {
    const { css } = createTheme({ primary: '#940BDF' }, { dark: false });
    expect(css).not.toContain('.dark {');
    expect(css).not.toContain('@media');
  });

  it('exposes variables per mode', () => {
    const theme = createTheme({ primary: '#940BDF' });
    expect(theme.vars()).toBe(theme.vars('light'));
    expect(theme.vars()).toContain('--primary-500: oklch(');
    expect(theme.vars()).toContain('--primary-contrast: #ffffff;');
    expect(theme.vars('dark')).not.toBe(theme.vars());
  });

  it('applies one property per variable', () => {
    const theme = createTheme({ primary: '#940BDF' });
    const light = recorder();
    theme.apply(light.target);
    expect(light.calls).toHaveLength(12);
    expect(light.calls[0][0]).toBe('--primary-50');
    expect(light.calls.at(-1)).toEqual(['--primary-contrast', '#ffffff']);

    const dark = recorder();
    theme.apply(dark.target, 'dark');
    expect(dark.calls).toHaveLength(12);
    expect(dark.calls[0][1]).not.toBe(light.calls[0][1]);
    expect(dark.calls[0][1]).toBe(theme.scales.primary.dark.steps['50'].oklch);
  });

  it('throws when apply has no target and no document', () => {
    expect(() => createTheme({ primary: '#940BDF' }).apply()).toThrow(
      /document/,
    );
  });

  it('applies to document.documentElement when a document exists', () => {
    const { calls, target } = recorder();
    vi.stubGlobal('document', { documentElement: target });
    try {
      createTheme({ primary: '#940BDF' }).apply();
      expect(calls).toHaveLength(12);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps colors in the order given', () => {
    const theme = createTheme({ primary: '#940BDF', accent: '#ff8800' });
    expect(Object.keys(theme.scales)).toEqual(['primary', 'accent']);
    const vars = theme.vars();
    expect(vars).toContain('--accent-500: oklch(');
    expect(vars.indexOf('--primary-50:')).toBeLessThan(
      vars.indexOf('--accent-50:'),
    );
    expect(theme.css.indexOf('--color-primary-50')).toBeLessThan(
      theme.css.indexOf('--color-accent-50'),
    );
  });

  it.each(['#000000', '#ffffff', '#808080', '#940BDF'])(
    'never prints -0 or 360.00 for %s',
    (color) => {
      const { css } = createTheme({ c: color });
      expect(css).not.toMatch(/-0(?![.\d])/);
      expect(css).not.toMatch(/-0\.0+\b/);
      expect(css).not.toContain('360.00');
    },
  );

  it('rejects bad input', () => {
    expect(() => createTheme({})).toThrow(/at least one color/);
    expect(() => createTheme({ 'a b': '#fff' })).toThrow(/Invalid color name/);
    expect(() => createTheme(JSON.parse('{"__proto__":"#fff"}'))).toThrow(
      /Reserved color name/,
    );
    expect(() => createTheme({ a: 'nope' })).toThrow(/Invalid color: nope/);
  });

  it.each([null, undefined, ['red'], 'red', 42])(
    'rejects colors that are not an object: %j',
    (colors) => {
      expect(() =>
        createTheme(colors as unknown as Record<string, string>),
      ).toThrow(
        new Error('createTheme expects an object of name: color pairs'),
      );
    },
  );

  it('accepts an object without a prototype', () => {
    const colors = Object.create(null) as Record<string, string>;
    colors.primary = '#940BDF';
    expect(Object.keys(createTheme(colors).scales)).toEqual(['primary']);
  });

  it.each([
    ['none', 'none'],
    [true, 'true'],
    ['bogus', 'bogus'],
    [null, 'null'],
  ])('rejects the dark option %j', (dark, printed) => {
    expect(() =>
      createTheme({ primary: '#940BDF' }, {
        dark,
      } as unknown as ThemeOptions),
    ).toThrow(
      new Error(
        `Invalid dark option: ${printed}. Expected 'media', 'class' or false`,
      ),
    );
  });

  it.each(['Dark', 'LIGHT', '', null, 1])('rejects the mode %j', (mode) => {
    const theme = createTheme({ primary: '#940BDF' });
    const message = `Invalid mode: ${String(mode)}. Expected 'light' or 'dark'`;
    expect(() => theme.vars(mode as unknown as Mode)).toThrow(
      new Error(message),
    );
    const { calls, target } = recorder();
    expect(() => theme.apply(target, mode as unknown as Mode)).toThrow(
      new Error(message),
    );
    expect(calls).toHaveLength(0);
  });
});
