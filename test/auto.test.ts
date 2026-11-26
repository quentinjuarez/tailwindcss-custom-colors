import { createTheme } from '../src/theme.js';

const colors = { primary: '#0B6FDF' };

const recorder = () => {
  const calls: [string, string][] = [];
  return {
    calls,
    target: {
      style: {
        setProperty: (name: string, value: string) => calls.push([name, value]),
      },
    },
  };
};

const lightDark = (value: string, other: string) =>
  value === other ? value : `light-dark(${value}, ${other})`;

describe('the auto mode', () => {
  it('merges light and dark in the order of the light variables', () => {
    const theme = createTheme(colors);
    const light = theme.variables('light');
    const dark = theme.variables('dark');
    const auto = theme.variables('auto');
    expect(Object.keys(auto)).toEqual(Object.keys(light));
    for (const [name, value] of Object.entries(light)) {
      expect(auto[name]).toBe(lightDark(value, dark[name]!));
    }
    expect(auto['--primary-50']).toMatch(
      /^light-dark\(oklch\(.+\), oklch\(.+\)\)$/,
    );
    expect(auto['--primary-500']).toBe(light['--primary-500']);
    expect(auto['--primary-contrast']).toBe('#ffffff');
  });

  it('writes the same declarations as the light-dark css strategy', () => {
    const options = {
      harmony: true,
      status: true,
      roles: true,
      contrast: { on: true },
    };
    const theme = createTheme(colors, { ...options, dark: 'light-dark' });
    const root = theme.css.split('\n\n')[0]!;
    const fromCss = Object.fromEntries(
      [...root.matchAll(/^ {2}(--[\w-]+): (.+);$/gm)].map((m) => [m[1], m[2]]),
    );
    expect(theme.variables('auto')).toEqual(fromCss);
  });

  it('makes vars and variables agree', () => {
    const theme = createTheme(colors, { roles: true });
    const lines = theme
      .vars('auto')
      .split('\n')
      .map((line) => {
        const index = line.indexOf(': ');
        return [line.slice(0, index), line.slice(index + 2, -1)];
      });
    expect(Object.fromEntries(lines)).toEqual(theme.variables('auto'));
  });

  it('applies every variable once, whatever the dark strategy', () => {
    for (const dark of ['media', 'class', 'light-dark', false] as const) {
      const { calls, target } = recorder();
      const theme = createTheme(colors, { dark });
      theme.apply(target, 'auto');
      expect(calls).toHaveLength(Object.keys(theme.variables('light')).length);
      expect(Object.fromEntries(calls)).toEqual(theme.variables('auto'));
    }
  });

  it('works with the derived scales and p3', () => {
    const theme = createTheme(
      { vivid: 'color(display-p3 0 1 0)' },
      { gamut: 'p3', harmony: true, neutral: true, status: true },
    );
    const auto = theme.variables('auto');
    expect(Object.values(auto).join('')).not.toContain('NaN');
    expect(auto['--tertiary-50']).toContain('light-dark(');
  });

  it('keeps the default of apply and vars on the light values', () => {
    const theme = createTheme(colors);
    const { calls, target } = recorder();
    theme.apply(target);
    expect(Object.fromEntries(calls)).toEqual(theme.variables('light'));
    expect(theme.vars()).toBe(theme.vars('light'));
  });

  it('rejects other modes with the new message', () => {
    const theme = createTheme(colors);
    const message = (mode: unknown) =>
      `Invalid mode: ${String(mode)}. Expected 'light', 'dark' or 'auto'`;
    for (const mode of ['x', 'Auto', 1, null]) {
      expect(() => theme.variables(mode as never)).toThrow(message(mode));
      expect(() => theme.vars(mode as never)).toThrow(message(mode));
      expect(() => theme.apply(recorder().target, mode as never)).toThrow(
        message(mode),
      );
    }
    expect(() => theme.variables(Object.create(null))).toThrow(
      'Invalid mode: object',
    );
  });
});

describe('neutral as a boolean', () => {
  it('treats true like auto and false like nothing', () => {
    const on = createTheme(colors, { neutral: true });
    const alias = createTheme(colors, { neutral: 'auto' });
    expect(on.css).toBe(alias.css);
    expect(Object.keys(on.scales)).toEqual(['primary', 'neutral']);
    const off = createTheme(colors, { neutral: false });
    expect(Object.keys(off.scales)).toEqual(['primary']);
  });

  it('rejects other values', () => {
    for (const neutral of ['yes', 1, null]) {
      expect(() => createTheme(colors, { neutral: neutral as never })).toThrow(
        /^Invalid neutral option: .*\. Expected true or false$/,
      );
    }
  });
});
