import { converter, oklch, parse } from 'culori';

import {
  clampToGamut,
  hexToOklch,
  oklchToCss,
  oklchToHex,
} from '../../src/color/convert.js';

const sampleHexes = (count: number): string[] => {
  let seed = 12345;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const channel = () =>
      Math.floor(next() * 256)
        .toString(16)
        .padStart(2, '0');
    return `#${channel()}${channel()}${channel()}`;
  });
};

describe('hexToOklch', () => {
  it('converts white', () => {
    const white = hexToOklch('#ffffff');
    expect(Math.abs(white.l - 1)).toBeLessThan(0.001);
    expect(Math.abs(white.c)).toBeLessThan(0.001);
    expect(Number.isFinite(white.h)).toBe(true);
  });

  it('converts black', () => {
    const black = hexToOklch('#000000');
    expect(Math.abs(black.l)).toBeLessThan(0.001);
    expect(Number.isFinite(black.h)).toBe(true);
  });

  it('never returns NaN for greys', () => {
    for (const hex of ['#808080', '#111111', '#eeeeee']) {
      const color = hexToOklch(hex);
      expect(Number.isFinite(color.h)).toBe(true);
      expect(Number.isFinite(color.c)).toBe(true);
    }
  });

  it('agrees with culori', () => {
    for (const hex of sampleHexes(50)) {
      const ours = hexToOklch(hex);
      const oracle = oklch(parse(hex))!;
      expect(Math.abs(ours.l - oracle.l)).toBeLessThan(0.002);
      expect(Math.abs(ours.c - oracle.c)).toBeLessThan(0.002);
      if (oracle.h !== undefined && oracle.c > 0.02) {
        const delta = Math.abs(ours.h - oracle.h);
        expect(Math.min(delta, 360 - delta)).toBeLessThan(0.002 * 360);
      }
    }
  });
});

describe('oklchToHex', () => {
  it('round trips 50 hex values', () => {
    for (const hex of sampleHexes(50)) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it('reduces chroma for out of gamut colors', () => {
    const hex = oklchToHex({ l: 0.9, c: 0.4, h: 150 });
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(Math.abs(hexToOklch(hex).l - 0.9)).toBeLessThan(0.05);
  });
});

describe('clampToGamut', () => {
  it('returns the input unchanged when inside sRGB', () => {
    const color = hexToOklch('#3b82f6');
    expect(clampToGamut(color)).toEqual(color);
  });

  it('reduces chroma when outside sRGB', () => {
    const clamped = clampToGamut({ l: 0.9, c: 0.4, h: 150 });
    expect(clamped.c).toBeLessThan(0.4);
    expect(clamped.l).toBe(0.9);
    expect(clamped.h).toBe(150);
  });
});

describe('oklchToCss', () => {
  it('formats with fixed decimals', () => {
    expect(oklchToCss({ l: 0.5, c: 0.2, h: 300 })).toBe(
      'oklch(0.5000 0.2000 300.00)',
    );
  });

  it('never prints negative zero', () => {
    expect(oklchToCss({ l: -0.00001, c: -0, h: -0.001 })).toBe(
      'oklch(0.0000 0.0000 0.00)',
    );
  });

  it('wraps a hue that rounds to 360 to 0', () => {
    expect(oklchToCss({ l: 0.5, c: 0.1, h: 359.999 })).toBe(
      'oklch(0.5000 0.1000 0.00)',
    );
    expect(oklchToCss({ l: 0.5, c: 0.1, h: 360 })).toBe(
      'oklch(0.5000 0.1000 0.00)',
    );
  });
});

describe('display-p3 gamut', () => {
  const toP3 = converter('p3');
  const inP3 = (color: { l: number; c: number; h: number }): boolean => {
    const { r, g, b } = toP3({ mode: 'oklch', ...color });
    return [r, g, b].every((v) => v >= -2e-3 && v <= 1 + 2e-3);
  };

  it('keeps more chroma in p3 than in srgb', () => {
    const color = { l: 0.7, c: 0.3, h: 150 };
    expect(clampToGamut(color, 'p3').c).toBeGreaterThan(clampToGamut(color).c);
  });

  it('lands inside p3', () => {
    expect(inP3(clampToGamut({ l: 0.7, c: 0.3, h: 150 }, 'p3'))).toBe(true);
  });

  it('returns an in-gamut color unchanged for both gamuts', () => {
    const color = { l: 0.6, c: 0.05, h: 200 };
    expect(clampToGamut(color, 'srgb')).toEqual(color);
    expect(clampToGamut(color, 'p3')).toEqual(color);
  });

  it('converts a p3-only color to a 7 character hex', () => {
    const color = { l: 0.7, c: 0.3, h: 150 };
    expect(oklchToHex(color)).toMatch(/^#[0-9a-f]{6}$/);
    expect(oklchToHex(color)).toBe(oklchToHex(clampToGamut(color)));
  });
});
