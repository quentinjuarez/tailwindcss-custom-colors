import { clampToGamut, hexToOklch } from '../../src/color/convert.js';
import { cssColorNames } from '../../src/color/names.js';
import { parseColor } from '../../src/color/parse.js';

const PURPLE = '#940bdf';

const expectClose = (
  actual: { l: number; c: number; h: number },
  expected: { l: number; c: number; h: number },
  tolerance = 1e-3,
) => {
  expect(Math.abs(actual.l - expected.l)).toBeLessThan(tolerance);
  expect(Math.abs(actual.c - expected.c)).toBeLessThan(tolerance);
  const hueDelta = Math.abs(actual.h - expected.h);
  expect(Math.min(hueDelta, 360 - hueDelta)).toBeLessThan(tolerance * 100);
};

describe('parseColor equivalent forms', () => {
  it.each([
    ['#940BDF', PURPLE],
    ['940bdf', PURPLE],
    ['rgb(148 11 223)', PURPLE],
    ['rgb( 148 , 11 , 223 )', PURPLE],
    ['rgb(148, 11, 223)', PURPLE],
    ['rgb(148 11 223 / 50%)', PURPLE],
    ['rgba(148, 11, 223, 0.5)', PURPLE],
    ['#940bdf80', PURPLE],
    ['#f0c', '#ff00cc'],
    ['#f0c8', '#ff00cc'],
    ['RED', '#ff0000'],
    ['rebeccapurple', '#663399'],
  ])('%s equals %s', (input, hex) => {
    expectClose(parseColor(input), hexToOklch(hex));
  });

  it.each([
    ['hsl(279 90% 46%)', '#940bdf'],
    ['hsl(279, 90%, 46%)', '#940bdf'],
    ['hsl(279 90 46)', '#940bdf'],
    ['hsl(279 90% 46% / 0.4)', '#940bdf'],
    ['hsla(279, 90%, 46%, 0.4)', '#940bdf'],
  ])('%s is close to %s', (input, hex) => {
    expectClose(parseColor(input), hexToOklch(hex), 0.01);
  });
});

describe('parseColor oklch', () => {
  it('keeps an in-gamut oklch color untouched', () => {
    expect(parseColor('oklch(0.5 0.1 300)')).toEqual({
      l: 0.5,
      c: 0.1,
      h: 300,
    });
  });

  it('accepts percent lightness and an alpha', () => {
    expect(parseColor('oklch(50% 0.1 300 / 0.5)')).toEqual({
      l: 0.5,
      c: 0.1,
      h: 300,
    });
  });

  it('clamps an out of gamut color into sRGB', () => {
    const color = parseColor('oklch(0.9 0.4 150)');
    expect(color.c).toBeLessThan(0.4);
    expect(clampToGamut(color)).toEqual(color);
  });

  it.each(['oklch(5 0.1 300)', 'oklch(150% 0.1 300)'])(
    'clamps the lightness of %s to 1 inside sRGB',
    (input) => {
      const color = parseColor(input);
      expect(color.l).toBe(1);
      expect(clampToGamut(color)).toEqual(color);
    },
  );

  it.each(['oklch(-1 0 0)', 'oklch(-10% 0 0)', 'oklch(0.5 -0.1 300)'])(
    'rejects a negative lightness or chroma in %s',
    (input) => {
      expect(() => parseColor(input)).toThrow(/Invalid color/);
    },
  );
});

describe('parseColor names', () => {
  it('has all 148 CSS named colors as lowercase hex', () => {
    const entries = Object.entries(cssColorNames);
    expect(entries).toHaveLength(148);
    for (const [, hex] of entries) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(Object.entries(cssColorNames))('%s parses to %s', (name, hex) => {
    expectClose(parseColor(name), hexToOklch(hex));
  });
});

describe('parseColor invalid input', () => {
  it.each([
    [''],
    ['#12'],
    ['#12345'],
    ['rgb(1 2)'],
    ['rgb(1 2 3 4 5)'],
    ['rgb(a b c)'],
    ['rgb(1 2 NaN)'],
    ['hsl(1 2)'],
    ['hsl(a 1% 2%)'],
    ['oklch(0.5 0.1)'],
    ['oklch(x 0.1 3)'],
    ['notacolor'],
    ['transparent'],
    ['#gggggg'],
    ['#12 456'],
  ])('rejects %j', (input) => {
    expect(() => parseColor(input)).toThrow(/Invalid color/);
  });

  it.each([[42], [null], [undefined], [{}]])(
    'rejects non-string %j',
    (input) => {
      expect(() => parseColor(input as never)).toThrow(/Invalid color/);
    },
  );

  it('names the input in the message', () => {
    expect(() => parseColor('nope')).toThrow('Invalid color: nope');
  });
});

describe('parseColor hardening', () => {
  it('rejects a pathological input quickly', () => {
    const start = performance.now();
    expect(() => parseColor('rgb(' + '1'.repeat(50000) + 'x 0 0)')).toThrow(
      /Invalid color/,
    );
    expect(performance.now() - start).toBeLessThan(100);
  });

  it('rejects an otherwise valid string longer than 100 characters', () => {
    const padded = 'rgb(148 11 223)' + ' '.repeat(86);
    expect(padded).toHaveLength(101);
    expect(() => parseColor(padded)).toThrow(/Invalid color/);
  });

  it('throws Invalid color for a Symbol input', () => {
    expect(() => parseColor(Symbol('x') as never)).toThrow(/Invalid color/);
  });

  it.each([['constructor'], ['__proto__'], ['##fff'], ['   ']])(
    'rejects %j',
    (input) => {
      expect(() => parseColor(input)).toThrow(/Invalid color/);
    },
  );
});

describe('parseColor lenient details', () => {
  it.each([
    ['rgb(50% 0 0)', 'rgb(128 0 0)'],
    ['rgb(300 0 0)', '#ff0000'],
    ['rgb(-1 0 0)', '#000000'],
    ['RGB(148 11 223)', PURPLE],
    ['oklch(0.5 0.1 -60)', 'oklch(0.5 0.1 300)'],
  ])('%s equals %s', (input, other) => {
    const expected = other.startsWith('#')
      ? hexToOklch(other)
      : parseColor(other);
    expectClose(parseColor(input), expected);
  });

  it('accepts an uppercase hsl function name', () => {
    expectClose(parseColor('HSL(279 90% 46%)'), hexToOklch(PURPLE), 0.01);
  });

  it('reads percent chroma as a fraction of 0.4', () => {
    expect(parseColor('oklch(50% 50% 300)').c).toBeCloseTo(0.2, 5);
  });
});
