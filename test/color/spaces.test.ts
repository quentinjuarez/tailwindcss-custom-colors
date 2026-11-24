import { converter } from 'culori';
import { describe, expect, it } from 'vitest';

import type { Oklch } from '../../src/color/convert.js';
import {
  hwbToOklch,
  labToOklch,
  lchToOklch,
  oklabToOklch,
  rgbSpaceToOklch,
  xyzToOklch,
} from '../../src/color/spaces.js';
import type { RgbSpace } from '../../src/color/spaces.js';

const toOklch = converter('oklch');

const expectClose = (actual: Oklch, expected: Oklch) => {
  expect(Math.abs(actual.l - expected.l)).toBeLessThan(2e-3);
  expect(Math.abs(actual.c - expected.c)).toBeLessThan(2e-3);
  if (expected.c > 0.02) {
    const delta = Math.abs(actual.h - expected.h);
    expect(Math.min(delta, 360 - delta)).toBeLessThan(1);
  }
  expect(actual.h).toBeGreaterThanOrEqual(0);
  expect(actual.h).toBeLessThan(360);
};

const oracle = (color: object): Oklch => {
  const { l, c, h } = toOklch(color as never);
  return { l, c, h: h ?? 0 };
};

const rgbSamples: [number, number, number][] = [
  [0, 0, 0],
  [1, 1, 1],
  [0.5, 0.5, 0.5],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [0.2, 0.6, 0.9],
  [0.9, 0.4, 0.1],
  [0.05, 0.3, 0.2],
  [0.7, 0.1, 0.6],
  [1.1, -0.05, 0.3],
];

const culoriModes: Record<RgbSpace, string> = {
  srgb: 'rgb',
  'srgb-linear': 'lrgb',
  'display-p3': 'p3',
  'a98-rgb': 'a98',
  'prophoto-rgb': 'prophoto',
  rec2020: 'rec2020',
};

describe('rgbSpaceToOklch', () => {
  for (const space of Object.keys(culoriModes) as RgbSpace[]) {
    it(`matches culori for ${space}`, () => {
      for (const [r, g, b] of rgbSamples) {
        expectClose(
          rgbSpaceToOklch(space, [r, g, b]),
          oracle({ mode: culoriModes[space], r, g, b }),
        );
      }
    });
  }

  it('maps srgb white to lightness 1', () => {
    expect(Math.abs(rgbSpaceToOklch('srgb', [1, 1, 1]).l - 1)).toBeLessThan(
      1e-3,
    );
  });
});

describe('xyzToOklch', () => {
  const samples: [number, number, number][] = [
    [0.9505, 1, 1.089],
    [0.9643, 1, 0.8251],
    [0.2, 0.3, 0.4],
    [0.4, 0.2, 0.05],
    [0.1, 0.4, 0.1],
    [0.6, 0.7, 0.2],
    [0.05, 0.02, 0.3],
    [0.35, 0.25, 0.15],
    [0.7, 0.5, 0.9],
  ];

  for (const white of ['d50', 'd65'] as const) {
    it(`matches culori for ${white}`, () => {
      for (const [x, y, z] of samples) {
        expectClose(
          xyzToOklch(white, [x, y, z]),
          oracle({ mode: white === 'd50' ? 'xyz50' : 'xyz65', x, y, z }),
        );
      }
    });
  }
});

describe('labToOklch and lchToOklch', () => {
  const samples: [number, number, number][] = [
    [0, 0, 0],
    [100, 0, 0],
    [50, 0, 0],
    [50, 40, 30],
    [70, -50, 20],
    [30, 20, -60],
    [80, 10, 90],
    [60, -70, -30],
    [40, 80, 60],
    [90, -20, 40],
  ];

  it('lab matches culori', () => {
    for (const [l, a, b] of samples) {
      expectClose(labToOklch(l, a, b), oracle({ mode: 'lab', l, a, b }));
    }
  });

  it('lch matches culori', () => {
    for (const [l, a, b] of samples) {
      const c = Math.hypot(a, b);
      const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
      expectClose(lchToOklch(l, c, h), oracle({ mode: 'lch', l, c, h }));
    }
  });

  it('keeps a neutral gray untinted', () => {
    expect(labToOklch(50, 0, 0).c).toBeLessThan(1e-3);
    expect(lchToOklch(50, 0, 0).c).toBeLessThan(1e-3);
  });

  it('wraps negative and large hues', () => {
    const wrapped = lchToOklch(50, 40, -30);
    expectClose(wrapped, lchToOklch(50, 40, 330));
    expectClose(lchToOklch(50, 40, 750), lchToOklch(50, 40, 30));
  });
});

describe('oklabToOklch', () => {
  const samples: [number, number, number][] = [
    [0, 0, 0],
    [1, 0, 0],
    [0.5, 0, 0],
    [0.6, 0.1, 0.1],
    [0.7, -0.1, 0.05],
    [0.4, 0.05, -0.15],
    [0.8, -0.05, -0.1],
    [0.55, 0.2, -0.05],
    [0.9, 0.02, 0.08],
  ];

  it('matches culori', () => {
    for (const [l, a, b] of samples) {
      expectClose(oklabToOklch(l, a, b), oracle({ mode: 'oklab', l, a, b }));
    }
  });
});

describe('hwbToOklch', () => {
  const samples: [number, number, number][] = [
    [0, 0, 0],
    [120, 0, 0],
    [240, 0.2, 0.1],
    [30, 0.1, 0.3],
    [300, 0.4, 0.2],
    [60, 0, 0.5],
    [180, 0.5, 0],
    [330, 0.15, 0.15],
  ];

  it('matches culori', () => {
    for (const [h, w, b] of samples) {
      expectClose(hwbToOklch(h, w, b), oracle({ mode: 'hwb', h, w, b }));
    }
  });

  it('turns w + b >= 1 into a gray', () => {
    expect(hwbToOklch(120, 0.6, 0.6).c).toBeLessThan(1e-3);
    expect(hwbToOklch(0, 1, 1).c).toBeLessThan(1e-3);
  });
});
