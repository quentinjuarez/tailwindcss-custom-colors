import { converter } from 'culori';

import {
  hexToOklch,
  oklchToCss,
  oklchToHex,
  type Oklch,
} from '../src/color/convert.js';
import { darkScale, lightScale, STEPS, type Step } from '../src/scale.js';

const BASES = [
  '#940bdf',
  '#000000',
  '#ffffff',
  '#808080',
  '#ff0000',
  '#00ff00',
  '#fefefe',
  '#010101',
  '#ffd534',
  '#0b0b6f',
];

const lightnesses = (scale: Record<Step, Oklch>): number[] =>
  STEPS.map((step) => scale[step].l);

const isStrictlyDecreasing = (values: number[]): boolean =>
  values.every((value, i) => i === 0 || value < values[i - 1]);

describe('STEPS', () => {
  it('lists the 11 Tailwind steps in order', () => {
    expect(STEPS).toEqual([
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '950',
    ]);
  });
});

describe.each(BASES)('lightScale(%s)', (hex) => {
  const base = hexToOklch(hex);
  const scale = lightScale(base);

  it('keeps the input exactly at 500', () => {
    expect(scale['500']).toEqual(base);
  });

  it('has no NaN and stays inside [0, 1] lightness', () => {
    for (const step of STEPS) {
      const { l, c, h } = scale[step];
      expect([l, c, h].every(Number.isFinite)).toBe(true);
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThanOrEqual(1);
      expect(c).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives a valid hex for every step', () => {
    for (const step of STEPS) {
      expect(oklchToHex(scale[step])).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('never prints -0 or a 360 hue', () => {
    const dark = darkScale(scale);
    for (const step of STEPS) {
      for (const color of [scale[step], dark[step]]) {
        const css = oklchToCss(color);
        expect(css).not.toContain('-0');
        expect(css).not.toContain('360.00');
      }
    }
  });

  it('tapers chroma toward both ends', () => {
    expect(scale['50'].c).toBeLessThanOrEqual(scale['400'].c);
    expect(scale['950'].c).toBeLessThanOrEqual(scale['600'].c + 1e-9);
  });
});

describe.each(BASES.filter((hex) => hex !== '#000000'))(
  'lightScale(%s) lightness',
  (hex) => {
    it('is strictly decreasing from 50 to 950', () => {
      expect(
        isStrictlyDecreasing(lightnesses(lightScale(hexToOklch(hex)))),
      ).toBe(true);
    });
  },
);

describe('lightScale(#000000) lightness', () => {
  const scale = lightScale(hexToOklch('#000000'));

  it('is strictly decreasing from 50 to 500', () => {
    expect(isStrictlyDecreasing(lightnesses(scale).slice(0, 6))).toBe(true);
  });

  it('pins steps 600 to 950 at 0', () => {
    for (const step of ['600', '700', '800', '900', '950'] as const) {
      expect(scale[step].l).toBe(0);
      expect(oklchToHex(scale[step])).toBe('#000000');
    }
  });
});

describe('lightScale at exactly l 1', () => {
  const base = { l: 1, c: 0, h: 0 };
  const scale = lightScale(base);

  it('pins steps 50 to 500 at 1', () => {
    for (const step of ['50', '100', '200', '300', '400', '500'] as const) {
      expect(scale[step].l).toBe(1);
      expect(oklchToHex(scale[step])).toBe('#ffffff');
    }
  });

  it('is strictly decreasing from 500 to 950', () => {
    expect(isStrictlyDecreasing(lightnesses(scale).slice(5))).toBe(true);
  });

  it('stays finite, inside [0, 1] and prints clean oklch strings', () => {
    const dark = darkScale(scale);
    for (const step of STEPS) {
      for (const color of [scale[step], dark[step]]) {
        expect([color.l, color.c, color.h].every(Number.isFinite)).toBe(true);
        expect(color.l).toBeLessThanOrEqual(1);
        expect(color.l).toBeGreaterThanOrEqual(0);
        const css = oklchToCss(color);
        expect(css).not.toContain('-0');
        expect(css).not.toContain('360.00');
      }
    }
  });
});

describe.each([
  ['#ffffff', hexToOklch('#ffffff')],
  ['#fefefe', hexToOklch('#fefefe')],
  ['l 0.99999', { l: 0.99999, c: 0, h: 0 }],
])('lightScale near white (%s)', (_, base) => {
  const scale = lightScale(base);

  it('sits strictly below 1 at 500', () => {
    expect(base.l).toBeLessThan(1);
  });

  it('strictly decreases in lightness value across all 11 steps', () => {
    expect(isStrictlyDecreasing(lightnesses(scale))).toBe(true);
  });

  it('never goes above 1', () => {
    for (const step of STEPS) expect(scale[step].l).toBeLessThanOrEqual(1);
  });
});

describe('achromatic input', () => {
  it.each(['#000000', '#ffffff', '#808080'])(
    'stays achromatic for %s',
    (hex) => {
      const scale = lightScale(hexToOklch(hex));
      for (const step of STEPS) {
        expect(scale[step].c).toBeLessThan(1e-4);
        expect(scale[step].h).toBe(0);
        const out = oklchToHex(scale[step]);
        expect(out.slice(1, 3)).toBe(out.slice(3, 5));
        expect(out.slice(3, 5)).toBe(out.slice(5, 7));
      }
    },
  );
});

describe('chromatic input', () => {
  it('keeps the hue on every step', () => {
    const base = hexToOklch('#940bdf');
    const scale = lightScale(base);
    for (const step of STEPS) {
      expect(scale[step].h).toBe(base.h);
    }
  });
});

describe('darkScale', () => {
  it.each(BASES)('mirrors the light scale for %s', (hex) => {
    const light = lightScale(hexToOklch(hex));
    const dark = darkScale(light);
    expect(dark['500']).toEqual(light['500']);
    expect(dark['50']).toEqual(light['950']);
    expect(dark['950']).toEqual(light['50']);
    for (const step of STEPS) {
      expect(dark[step]).toEqual(light[String(1000 - Number(step)) as Step]);
    }
  });
});

describe('lightScale gamut', () => {
  const base: Oklch = { l: 0.7, c: 0.25, h: 150 };

  it('defaults to srgb', () => {
    expect(lightScale(base)).toEqual(lightScale(base, 'srgb'));
  });

  it('keeps the base at 500 and every step inside p3', () => {
    const toP3 = converter('p3');
    const toSrgb = converter('rgb');
    const inRange = (channels: number[]): boolean =>
      channels.every((v) => v >= -2e-3 && v <= 1 + 2e-3);
    const baseSrgb = toSrgb({ mode: 'oklch', ...base });
    const baseP3 = toP3({ mode: 'oklch', ...base });
    expect(inRange([baseSrgb.r, baseSrgb.g, baseSrgb.b])).toBe(false);
    expect(inRange([baseP3.r, baseP3.g, baseP3.b])).toBe(true);

    const scale = lightScale(base, 'p3');
    const srgbScale = lightScale(base, 'srgb');
    expect(scale['500']).toEqual(base);
    expect(STEPS.some((step) => scale[step].c > srgbScale[step].c)).toBe(true);
    for (const step of STEPS) {
      const { r, g, b } = toP3({ mode: 'oklch', ...scale[step] });
      for (const v of [r, g, b]) {
        expect(v).toBeGreaterThanOrEqual(-2e-3);
        expect(v).toBeLessThanOrEqual(1 + 2e-3);
      }
    }
  });
});
