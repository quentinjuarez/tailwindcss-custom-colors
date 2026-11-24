import { converter, parse } from 'culori';

import {
  clampToGamut,
  hexToOklch,
  type Gamut,
} from '../../src/color/convert.js';
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

const toOklch = converter('oklch');

const oracle = (input: string, gamut: Gamut) => {
  const parsed = parse(input.toLowerCase());
  if (!parsed) throw new Error(`culori cannot parse ${input}`);
  const { l, c, h } = toOklch(parsed);
  return clampToGamut({ l, c: c ?? 0, h: h ?? 0 }, gamut);
};

const expectOracle = (
  actual: { l: number; c: number; h: number },
  expected: { l: number; c: number; h: number },
) => {
  expect(Math.abs(actual.l - expected.l)).toBeLessThan(3e-3);
  expect(Math.abs(actual.c - expected.c)).toBeLessThan(3e-3);
  if (expected.c > 0.02 && actual.c > 0.02) {
    const delta = Math.abs(actual.h - expected.h);
    expect(Math.min(delta, 360 - delta)).toBeLessThan(1);
  }
};

const validInputs = [
  'rgb(10 200 30)',
  'rgb(10, 200, 30)',
  'rgba(10 200 30 / 0.5)',
  'hsl(120 100% 50%)',
  'hsl(0.25turn 100% 50%)',
  'hsl(240deg 100% 50%)',
  'hsla(0, 100%, 50%, 0.3)',
  'hwb(120 20% 30%)',
  'hwb(0 0% 0%)',
  'hwb(240deg 10% 10%)',
  'hwb(0.5turn 20% 20%)',
  'hwb(200 0% 0% / 0.5)',
  'hwb(90 40% 20% / 50%)',
  'lab(50 40 59)',
  'lab(50% 40 59)',
  'lab(29.2 39 20)',
  'lab(80 -20 30)',
  'lab(50% 50% -50%)',
  'lab(20 0 0)',
  'lab(90 -60 80 / 0.4)',
  'lab(50 40 59 / 25%)',
  'LAB(50 40 59)',
  'lch(50 50 120)',
  'lch(50% 100% 0.25turn)',
  'lch(70 30 200deg)',
  'lch(40 80 3rad)',
  'lch(60 40 100grad)',
  'lch(80 100 -90)',
  'lch(60 40 450)',
  'lch(50 0 0)',
  'oklab(0.6 0.1 -0.1)',
  'oklab(60% 25% -25%)',
  'oklab(0.8 -0.05 0.1)',
  'oklab(0.5 0 0)',
  'oklab(0.9 0.1 0.1 / 0.5)',
  'oklch(0.7 0.15 150)',
  'oklch(70% 0.15 0.25turn)',
  'oklch(0.7 40% 200grad)',
  'oklch(0.6 0.1 1rad)',
  'oklch(0.6 0.3 270deg)',
  'color(srgb 0.2 0.4 0.6)',
  'color(srgb-linear 0.2 0.4 0.6)',
  'color(display-p3 1 0 0)',
  'color(display-p3 0 1 0)',
  'color(a98-rgb 0.3 0.6 0.9)',
  'color(prophoto-rgb 0.5 0.4 0.3)',
  'color(rec2020 0.2 0.8 0.3)',
  'color(xyz 0.3 0.4 0.5)',
  'color(xyz-d50 0.3 0.4 0.5)',
  'color(xyz-d65 0.2 0.3 0.4)',
  'color(display-p3 50% 20% 80%)',
  'color(srgb 1 0 0 / 0.5)',
];

describe('parseColor against culori', () => {
  expect(validInputs.length).toBeGreaterThanOrEqual(40);
  for (const gamut of ['srgb', 'p3'] as const) {
    it.each(validInputs)(`%s in ${gamut}`, (input) => {
      expectOracle(parseColor(input, gamut), oracle(input, gamut));
    });
  }
});

describe('parseColor pinned messages', () => {
  it.each([
    ['nope', 'Invalid color: nope (unknown color name)'],
    ['rgb(1 2)', 'Invalid color: rgb(1 2) (wrong number of components)'],
    [
      'color(foo 1 1 1)',
      'Invalid color: color(foo 1 1 1) (unknown color space: foo)',
    ],
  ])('%s', (input, message) => {
    expect(() => parseColor(input)).toThrow(new Error(message));
  });

  it('names the length cap', () => {
    expect(() => parseColor('x'.repeat(101))).toThrow(
      / \(longer than 100 characters\)$/,
    );
  });

  it('names a non string input', () => {
    expect(() => parseColor(42 as never)).toThrow(
      new Error('Invalid color: 42 (expected a string)'),
    );
  });
});

describe('parseColor reasoned errors', () => {
  it.each([
    'rgb(1 2 3 4 5)',
    'lab()',
    'hwb(10 20)',
    'color(srgb 1 1)',
    '#12',
    'oklch(0.5 -1 10)',
    'rgb(a b c)',
    'hsl(10deg 20% )',
    'lch(50 -10 20)',
    'lab(50 10)',
    'oklab(0.5 0.1)',
    'color()',
    'color(srgb 1 1 1 1 1)',
    'rgb(1 2 3',
    'hwb(10 20% 30% / )',
    'lch(50 10 20%)',
    'hwb(10 20% 30% / 1 / 2)',
    'rgb(1e999 0 0)',
    'hsl(10 20% 30%))',
    'foo(1 2 3)',
    'lab(-5 0 0)',
    'hwb(120 abc 10%)',
    'color(srgb 1 2 x)',
    'hsl(10foo 20% 30%)',
  ])('%s', (input) => {
    let message = '';
    try {
      parseColor(input);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/^Invalid color: .+ \(.+\)$/);
    expect(message).not.toContain('. ');
    expect(message).toMatch(/^[\x20-\x7e]+$/);
  });

  it('never returns a non finite color', () => {
    for (const input of [
      'lab(50 1e300 0)',
      'lch(50 1e300 90)',
      'hwb(1e300turn 0% 0%)',
    ]) {
      try {
        const color = parseColor(input);
        expect(Number.isFinite(color.l + color.c + color.h)).toBe(true);
      } catch (error) {
        expect((error as Error).message).toMatch(/^Invalid color: .+ \(.+\)$/);
      }
    }
  });
});

describe('parseColor none and angles', () => {
  it.each([
    ['rgb(none 0 0)', 'rgb(0 0 0)'],
    ['rgb(10 20 30 / none)', 'rgb(10 20 30)'],
    ['oklch(0.5 none none)', 'oklch(0.5 0 0)'],
    ['oklch(0.5 0.1 120 / none)', 'oklch(0.5 0.1 120)'],
    ['oklab(none 0 0)', 'oklab(0 0 0)'],
    ['lab(none none none)', 'lab(0 0 0)'],
    ['lch(50 none none)', 'lch(50 0 0)'],
    ['hwb(none 0% 0%)', 'hwb(0 0% 0%)'],
    ['hsl(none none none)', 'hsl(0 0% 0%)'],
    ['color(srgb none 0.5 none)', 'color(srgb 0 0.5 0)'],
  ])('%s equals %s', (input, other) => {
    const color = parseColor(input);
    expect(Number.isFinite(color.l + color.c + color.h)).toBe(true);
    expectClose(color, parseColor(other));
  });

  it.each([
    ['oklch(0.6 0.1 0.5turn)', 180],
    ['oklch(0.6 0.1 200grad)', 180],
    ['oklch(0.6 0.1 3.141592653589793rad)', 180],
    ['oklch(0.6 0.1 540)', 180],
    ['oklch(0.6 0.1 -180)', 180],
    ['oklch(0.6 0.1 -0.5turn)', 180],
    ['oklch(0.6 0.1 -90deg)', 270],
    ['oklch(0.6 0.1 720deg)', 0],
    ['oklch(0.6 0.1 1turn)', 0],
  ])('%s has hue %d', (input, hue) => {
    const color = parseColor(input);
    expect(color.h).toBeGreaterThanOrEqual(0);
    expect(color.h).toBeLessThan(360);
    expect(Math.abs(color.h - hue)).toBeLessThan(1e-6);
  });

  it.each([
    'oklch(0.6 0.1 10px)',
    'oklch(0.6 0.1 10%)',
    'lch(50 10 10turns)',
    'oklch(0.6 0.1deg 10)',
  ])('rejects the angle in %s', (input) => {
    expect(() => parseColor(input)).toThrow(/^Invalid color: .+ \(.+\)$/);
  });
});

describe('parseColor percent references', () => {
  it.each([
    ['lab(50% 0 0)', 'lab(50 0 0)'],
    ['lab(50 100% 0)', 'lab(50 125 0)'],
    ['lab(50 0 -100%)', 'lab(50 0 -125)'],
    ['lch(50 100% 0)', 'lch(50 150 0)'],
    ['oklab(0.5 100% 0)', 'oklab(0.5 0.4 0)'],
    ['oklab(50% 0 -100%)', 'oklab(0.5 0 -0.4)'],
    ['oklch(0.5 100% 0)', 'oklch(0.5 0.4 0)'],
    ['hwb(0 50 0)', 'hwb(0 50% 0%)'],
  ])('%s equals %s', (input, other) => {
    expect(parseColor(input)).toEqual(parseColor(other));
  });
});

describe('parseColor gray handling', () => {
  it('reads a neutral lab as a gray', () => {
    expect(parseColor('lab(50% 0 0)').c).toBeLessThan(1e-3);
  });

  it('reads a hwb with w + b above 100 as a gray', () => {
    const color = parseColor('hwb(120 60% 60%)');
    expect(color.c).toBeLessThan(1e-3);
    expect(color.l).toBeGreaterThan(0);
    expect(color.l).toBeLessThan(1);
  });

  it('clamps hwb whiteness and blackness before converting', () => {
    expect(parseColor('hwb(120 -20% 10%)')).toEqual(
      parseColor('hwb(120 0% 10%)'),
    );
    expect(parseColor('hwb(120 20% 150%)')).toEqual(
      parseColor('hwb(120 20% 100%)'),
    );
  });
});

describe('parseColor performance and gamut', () => {
  it.each([['x'.repeat(50000)], ['('.repeat(50000)]])(
    'rejects a long hostile input quickly',
    (input) => {
      const start = performance.now();
      expect(() => parseColor(input)).toThrow(/^Invalid color: /);
      expect(performance.now() - start).toBeLessThan(50);
    },
  );

  it('keeps more chroma for display-p3 green in the p3 gamut', () => {
    const p3 = parseColor('color(display-p3 0 1 0)', 'p3');
    const srgb = parseColor('color(display-p3 0 1 0)');
    expect(p3.c).toBeGreaterThan(srgb.c);
  });
});

describe('parseColor lightness range', () => {
  for (const gamut of ['srgb', 'p3'] as const) {
    it.each([
      'color(srgb-linear 2 -1 0)',
      'color(xyz 1e300 1e300 1e300)',
      'color(xyz -5 -5 -5)',
      'lab(150 0 0)',
      'lch(150 0 0)',
    ])(`keeps %s inside the unit range in ${gamut}`, (input) => {
      const color = parseColor(input, gamut);
      expect(color.l).toBeGreaterThanOrEqual(0);
      expect(color.l).toBeLessThanOrEqual(1);
      expect(clampToGamut(color, gamut)).toEqual(color);
    });
  }

  it('maps lightness at or above 1 to an achromatic white', () => {
    const color = parseColor('color(xyz 1e300 1e300 1e300)');
    expect(color.l).toBe(1);
    expect(color.c).toBeLessThan(1e-3);
  });
});

describe('parseColor ascii reasons', () => {
  it('does not echo a non ascii color space', () => {
    let message = '';
    try {
      parseColor('color(é 1 1 1)');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/\(unknown color space\)$/);
    expect(message.slice(message.lastIndexOf(' ('))).toMatch(/^[\x20-\x7e]+$/);
  });
});
