import { wcagRatio } from '../src/color/contrast.js';
import {
  clampToGamut,
  hexToOklch,
  oklchToHex,
  type Oklch,
} from '../src/color/convert.js';
import { deriveHarmony } from '../src/harmony.js';
import { createTheme } from '../src/theme.js';

const PROFILES: [string, number, number][] = [
  ['normal', 0.6, 0.18],
  ['dull', 0.5, 0.1],
  ['light', 0.75, 0.12],
  ['dark', 0.15, 0.05],
  ['black', 0.05, 0],
  ['nearwhite', 0.92, 0.01],
  ['gray', 0.5, 0.015],
  ['vivid', 0.62, 0.28],
  ['edgeHigh', 0.72, 0.06],
  ['edgeWarm', 0.74, 0.08],
  ['edgeLow', 0.44, 0.1],
  ['edgeMid', 0.46, 0.1],
];

const SEEDS = [0, 1, 2, 3, 4];

type Case = {
  profile: string;
  hex: string;
  seed: number;
  colors: Oklch[];
  first: Oklch;
};

const grid: Case[] = [];
for (const [profile, l, c] of PROFILES) {
  for (let hue = 0; hue < 360; hue += 10) {
    const hex = oklchToHex(clampToGamut({ l, c, h: hue }));
    const first = hexToOklch(hex);
    for (const seed of SEEDS) {
      const { secondary, tertiary } = deriveHarmony(first, hex, seed, 'srgb');
      grid.push({
        profile,
        hex,
        seed,
        first,
        colors: [first, secondary, tertiary],
      });
    }
  }
}

const distance = (p: Oklch, q: Oklch) =>
  Math.hypot(
    p.l - q.l,
    p.c * Math.cos((p.h * Math.PI) / 180) -
      q.c * Math.cos((q.h * Math.PI) / 180),
    p.c * Math.sin((p.h * Math.PI) / 180) -
      q.c * Math.sin((q.h * Math.PI) / 180),
  );

const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('harmony option', () => {
  it('adds nothing by default', () => {
    const base = createTheme({ primary: '#0B6FDF' });
    expect(Object.keys(base.scales)).toEqual(['primary']);
    expect(createTheme({ primary: '#0B6FDF' }, { harmony: false }).css).toBe(
      base.css,
    );
    expect(createTheme({ primary: '#0B6FDF' }, { seed: 4 }).css).toBe(base.css);
  });

  it('adds secondary and tertiary before neutral and status', () => {
    const { scales } = createTheme(
      { primary: '#0B6FDF', accent: '#E5484D' },
      { harmony: true, neutral: 'auto', status: true },
    );
    expect(Object.keys(scales)).toEqual([
      'primary',
      'accent',
      'secondary',
      'tertiary',
      'neutral',
      'success',
      'warning',
      'danger',
      'info',
    ]);
  });

  it('derives from the first color only and keeps neutral on its hue', () => {
    const only = createTheme(
      { primary: '#0B6FDF' },
      { harmony: true, neutral: 'auto' },
    );
    const withOther = createTheme(
      { primary: '#0B6FDF', accent: '#E5484D' },
      { harmony: true, neutral: 'auto' },
    );
    expect(withOther.scales.secondary).toEqual(only.scales.secondary);
    expect(withOther.scales.tertiary).toEqual(only.scales.tertiary);
    expect(withOther.scales.neutral).toEqual(only.scales.neutral);
  });

  it('keeps a color you define and derives the other', () => {
    const own = createTheme(
      { primary: '#0B6FDF', secondary: '#00ff88' },
      { harmony: true },
    );
    const plain = createTheme({ primary: '#0B6FDF', secondary: '#00ff88' });
    expect(own.scales.secondary).toEqual(plain.scales.secondary);
    expect(Object.keys(own.scales)).toEqual([
      'primary',
      'secondary',
      'tertiary',
    ]);
    expect(own.css.match(/--secondary-50:/g)).toHaveLength(2);
  });

  it('feeds contrast, roles and report like any other scale', () => {
    const theme = createTheme(
      { primary: '#0B6FDF' },
      { harmony: true, roles: true, contrast: { on: true } },
    );
    expect(theme.css).toContain('--secondary-500-on:');
    expect(theme.css).toContain('--color-tertiary-500: var(--tertiary-500);');
    expect(theme.report()).toHaveLength(4 * 2 * 11);
    expect(theme.scales.tertiary!.dark.steps['50'].hex).toBe(
      theme.scales.tertiary!.light.steps['950'].hex,
    );
  });
});

describe('user defined colors', () => {
  const hueOf = (hex: string) => hexToOklch(hex).h;

  it('keeps the tertiary apart from a secondary you define', () => {
    for (const secondary of ['#F5A524', '#fdbd90', '#FFD534', '#E5484D']) {
      const { scales } = createTheme(
        { primary: '#0B6FDF', secondary },
        { harmony: true },
      );
      const own = scales.secondary!.light.steps['500'].hex;
      const tertiary = scales.tertiary!.light.steps['500'].hex;
      expect(tertiary).not.toBe(own);
      expect(hueGap(hueOf(tertiary), hueOf(own))).toBeGreaterThanOrEqual(45);
    }
  });

  it('keeps a tertiary you define and derives the secondary', () => {
    const own = createTheme(
      { primary: '#0B6FDF', tertiary: '#00ff88' },
      { harmony: true },
    );
    const plain = createTheme({ primary: '#0B6FDF', tertiary: '#00ff88' });
    expect(own.scales.tertiary).toEqual(plain.scales.tertiary);
    expect(Object.keys(own.scales)).toEqual([
      'primary',
      'tertiary',
      'secondary',
    ]);
    expect(own.scales.secondary!.light.steps['500'].hex).toBe('#07256a');
  });
});

describe('lightness bands', () => {
  const at = (l: number) =>
    deriveHarmony({ l, c: 0.12, h: 250 }, '#123456', 0, 'srgb');

  it('switches roles at 0.45 and 0.72', () => {
    expect(at(0.449).secondary.l).toBeGreaterThanOrEqual(0.56);
    expect(at(0.451).secondary.l).toBeLessThanOrEqual(0.36);
    expect(at(0.719).tertiary.l).toBeGreaterThanOrEqual(0.8);
    expect(at(0.721).tertiary.l).toBeLessThanOrEqual(0.66);
  });

  it('gives a dark warm brand a cool secondary, never a mud tone', () => {
    for (let h = 40; h <= 125; h += 5) {
      const first = { l: 0.35, c: 0.1, h };
      const { secondary } = deriveHarmony(first, '#6b4a00', 0, 'srgb');
      expect(hueGap(secondary.h, h)).toBeGreaterThanOrEqual(100);
    }
  });
});

describe('determinism and seed', () => {
  it('treats a number and its integer text as the same seed', () => {
    const colors = { p: '#0B6FDF' };
    const css = (seed: number | string) =>
      createTheme(colors, { harmony: true, seed }).css;
    expect(css('3')).toBe(css(3));
    expect(css('-2')).toBe(css(-2));
    expect(css('3.5')).not.toBe(css(3));
    expect(css('abc')).not.toBe(css(3));
  });

  it('keeps fractional and huge seeds apart without losing precision', () => {
    const colors = { p: '#0B6FDF' };
    const css = (seed: number) =>
      createTheme(colors, { harmony: true, seed }).css;
    const outputs = new Set([0, 0.0001, 1e-9, 0.5].map(css));
    expect(outputs.size).toBe(4);
    expect(css(1e21)).toBe(css(1e21));
  });

  it('gives the same palette for the same color and seed', () => {
    const a = createTheme({ primary: '#0B6FDF' }, { harmony: true, seed: 3 });
    const b = createTheme({ primary: '#0b6fdf' }, { harmony: true, seed: 3 });
    expect(a.css).toBe(b.css);
    expect(createTheme({ primary: '#0B6FDF' }, { harmony: true }).css).toBe(
      createTheme({ primary: '#0B6FDF' }, { harmony: true, seed: 0 }).css,
    );
  });

  it('gives another palette for another seed', () => {
    for (const { hex } of grid.filter((c) => c.seed === 0)) {
      const first = hexToOklch(hex);
      const a = deriveHarmony(first, hex, 0, 'srgb');
      const b = deriveHarmony(first, hex, 1, 'srgb');
      expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    }
  });

  it('accepts a string seed that differs from other strings', () => {
    const a = createTheme({ p: '#0B6FDF' }, { harmony: true, seed: 'north' });
    const b = createTheme({ p: '#0B6FDF' }, { harmony: true, seed: 'south' });
    expect(a.css).not.toBe(b.css);
    expect(a.css).toBe(
      createTheme({ p: '#0B6FDF' }, { harmony: true, seed: 'north' }).css,
    );
  });
});

describe('property grid', () => {
  const failures = (check: (c: Case) => boolean) =>
    grid
      .filter((c) => !check(c))
      .map((c) => `${c.profile} ${c.hex} seed ${c.seed}`);

  it('stages the three colors in lightness', () => {
    expect(
      failures((c) => {
        const l = c.colors.map((x) => x.l);
        return Math.max(...l) - Math.min(...l) >= 0.3;
      }),
    ).toEqual([]);
  });

  it('never derives a dirty yellow green', () => {
    expect(
      failures((c) =>
        c.colors
          .slice(1)
          .every((x) => !(x.h > 85 && x.h < 130 && x.l < 0.78 && x.c > 0.06)),
      ),
    ).toEqual([]);
  });

  it('keeps the three colors apart', () => {
    expect(
      failures((c) => {
        const [p, s, t] = c.colors as [Oklch, Oklch, Oklch];
        return Math.min(distance(p, s), distance(p, t), distance(s, t)) >= 0.1;
      }),
    ).toEqual([]);
    expect(
      failures((c) => hueGap(c.colors[1]!.h, c.colors[2]!.h) >= 45),
    ).toEqual([]);
  });

  it('keeps a lightness gap of 0.1 from the first color', () => {
    expect(
      failures((c) =>
        c.colors.slice(1).every((x) => Math.abs(x.l - c.first.l) >= 0.1 - 1e-9),
      ),
    ).toEqual([]);
  });

  it('keeps text readable on the derived 500 steps', () => {
    expect(
      failures((c) =>
        c.colors.slice(1).every((x) => {
          const hex = oklchToHex(x);
          return (
            Math.max(wcagRatio('#ffffff', hex), wcagRatio('#000000', hex)) >=
            4.5
          );
        }),
      ),
    ).toEqual([]);
  });

  it('keeps the derived chroma moderate', () => {
    expect(
      failures((c) =>
        c.colors.slice(1).every((x) => x.c >= 0.04 && x.c <= 0.14),
      ),
    ).toEqual([]);
  });
});

describe('crowded hues', () => {
  it.each([
    ['#c69987', 5],
    ['#c09d7e', 6],
  ])(
    'keeps the tertiary away from the secondary for %s at seed %i',
    (hex, seed) => {
      const first = hexToOklch(hex);
      const { secondary, tertiary } = deriveHarmony(first, hex, seed, 'srgb');
      expect(hueGap(secondary.h, tertiary.h)).toBeGreaterThanOrEqual(45);
    },
  );
});

describe('unusual first colors', () => {
  it.each(['#000000', '#ffffff', '#808080', 'black', 'white'])(
    'derives from %s without NaN',
    (color) => {
      const { css, scales } = createTheme({ a: color }, { harmony: true });
      expect(css).not.toContain('NaN');
      expect(scales.secondary!.light.steps['500'].hex).toMatch(
        /^#[0-9a-f]{6}$/,
      );
      expect(scales.tertiary!.light.steps['500'].hex).toMatch(/^#[0-9a-f]{6}$/);
    },
  );

  it('draws the base hue from the seeded list for a gray input', () => {
    const hues = new Set<number>();
    for (let seed = 0; seed < 12; seed += 1) {
      const { secondary } = deriveHarmony(
        hexToOklch('#808080'),
        '#808080',
        seed,
        'srgb',
      );
      hues.add(Math.round(secondary.h / 30));
    }
    expect(hues.size).toBeGreaterThan(2);
  });

  it('stays in gamut with p3', () => {
    const { css, scales } = createTheme(
      { vivid: 'color(display-p3 0 1 0)' },
      { harmony: true, gamut: 'p3' },
    );
    expect(css).not.toContain('NaN');
    expect(Object.keys(scales)).toEqual(['vivid', 'secondary', 'tertiary']);
  });
});

describe('option validation', () => {
  const run = (options: object) => () =>
    createTheme({ a: 'red' }, options as never);

  it('rejects invalid harmony values', () => {
    expect(run({ harmony: 'auto' })).toThrow(
      'Invalid harmony option: auto. Expected true or false',
    );
    expect(run({ harmony: 1 })).toThrow('Invalid harmony option: 1');
    expect(run({ harmony: Object.create(null) })).toThrow(
      'Invalid harmony option: object',
    );
  });

  it('rejects invalid seeds', () => {
    for (const seed of [Number.NaN, Infinity, {}, null, true, 10n]) {
      expect(run({ harmony: true, seed })).toThrow(/^Invalid seed option: /);
    }
    expect(run({ seed: Object.create(null) })).toThrow(
      'Invalid seed option: object. Expected a number or a string',
    );
  });
});

describe('golden fixture', () => {
  const GOLDEN: [string, string, string][] = [
    ['#0B6FDF', '#07256a', '#fdbd90'],
    ['#940BDF', '#3f2576', '#dbd380'],
    ['#E5484D', '#4a0022', '#66d2db'],
    ['#F5A524', '#004970', '#6a9d2c'],
    ['#FFD534', '#232c69', '#bc4f46'],
    ['#30A46C', '#00453d', '#dfadeb'],
    ['#12A594', '#003739', '#f1b6bd'],
    ['#E93D82', '#4d0841', '#69d4bb'],
    ['#8B8D98', '#361a40', '#a2caa7'],
    ['#7D6B5D', '#1a3a59', '#c9cfa6'],
    ['#000000', '#6c8aa9', '#eaba99'],
    ['#1F3A5F', '#6982a7', '#dac8a3'],
  ];

  it.each(GOLDEN)(
    'pins the derived colors of %s at seed 0',
    (brand, secondary, tertiary) => {
      const { scales } = createTheme({ primary: brand }, { harmony: true });
      expect(scales.secondary!.light.steps['500'].hex).toBe(secondary);
      expect(scales.tertiary!.light.steps['500'].hex).toBe(tertiary);
    },
  );
});
