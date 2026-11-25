import { clampToGamut, type Gamut, type Oklch } from './color/convert.js';

const SEED_HUES = [30, 150, 195, 270, 340, 230];
const OFFSETS = [150, 165, 180, 195, 210, 45, -45, 60, -60];

const PLAN = {
  mid: { secondary: [0.26, 0.36], tertiary: [0.8, 0.86] },
  dark: { secondary: [0.56, 0.66], tertiary: [0.8, 0.86] },
  light: { secondary: [0.3, 0.4], tertiary: [0.56, 0.66] },
} as const;

const wrap = (hue: number): number => ((hue % 360) + 360) % 360;

const limit = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const hueGap = (a: number, b: number): number =>
  Math.abs(((a - b + 540) % 360) - 180);

const distance = (p: Oklch, q: Oklch): number =>
  Math.hypot(
    p.l - q.l,
    p.c * Math.cos((p.h * Math.PI) / 180) -
      q.c * Math.cos((q.h * Math.PI) / 180),
    p.c * Math.sin((p.h * Math.PI) / 180) -
      q.c * Math.sin((q.h * Math.PI) / 180),
  );

const fnv1a = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seedNumber = (seed: number | string): number => {
  if (typeof seed === 'string') {
    return /^-?\d{1,15}$/.test(seed) ? Number(seed) % 4294967296 : fnv1a(seed);
  }
  return Number.isInteger(seed) ? seed % 4294967296 : fnv1a(String(seed));
};

const mulberry32 = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const deriveHarmony = (
  first: Oklch,
  hex: string,
  seed: number | string,
  gamut: Gamut,
  chosenSecondary?: Oklch,
): { secondary: Oklch; tertiary: Oklch } => {
  const seedValue = seedNumber(seed);
  const random = mulberry32(fnv1a(hex) + seedValue * 7919);
  const between = (a: number, b: number): number => a + (b - a) * random();

  const hueless = first.c < 0.03;
  const baseHue = hueless
    ? wrap(
        SEED_HUES[Math.floor(random() * SEED_HUES.length)]! + between(-10, 10),
      )
    : first.h;
  const reference = limit(first.c, 0.09, 0.17);
  const band = first.l < 0.45 ? 'dark' : first.l > 0.72 ? 'light' : 'mid';
  const plan = PLAN[band];
  const secondaryRange: [number, number] =
    band === 'mid'
      ? [plan.secondary[0], Math.min(plan.secondary[1], first.l - 0.12)]
      : band === 'dark'
        ? [
            Math.max(plan.secondary[0], first.l + 0.12),
            Math.max(plan.secondary[1], first.l + 0.18),
          ]
        : [plan.secondary[0], plan.secondary[1]];
  const tertiaryRange: [number, number] =
    band === 'mid'
      ? [
          Math.max(plan.tertiary[0], first.l + 0.1),
          Math.max(plan.tertiary[1], first.l + 0.16),
        ]
      : band === 'light'
        ? [plan.tertiary[0], Math.min(plan.tertiary[1], first.l - 0.1)]
        : [plan.tertiary[0], plan.tertiary[1]];

  const secondaryL = between(secondaryRange[0], secondaryRange[1]);
  const warm = baseHue > 35 && baseHue < 130;
  let secondaryH: number;
  if (warm && (secondaryL < 0.45 || band === 'dark')) {
    secondaryH = wrap(baseHue + 180 + between(-25, 25));
  } else if (secondaryL < first.l) {
    const diff = ((265 - baseHue + 540) % 360) - 180;
    secondaryH = wrap(baseHue + limit(diff * 0.25, -22, 22) + between(-6, 6));
  } else {
    secondaryH = wrap(baseHue + between(-20, 20));
  }
  if (secondaryH > 82 && secondaryH < 135 && secondaryL < 0.78) {
    secondaryH = secondaryH < 108 ? 78 : 138;
  }
  const secondary = clampToGamut(
    {
      l: secondaryL,
      c: Math.min(0.13, reference * between(0.6, 0.85)),
      h: secondaryH,
    },
    gamut,
  );

  const partner = chosenSecondary ?? secondary;
  const tertiaryL = between(tertiaryRange[0], tertiaryRange[1]);
  const light = tertiaryL >= 0.78;
  let best: { color: Oklch; score: number } | undefined;
  for (const offset of OFFSETS) {
    const h = wrap(baseHue + offset + between(-10, 10));
    const c = light
      ? Math.min(0.13, reference * between(0.55, 0.85))
      : Math.min(0.16, reference * between(0.7, 1));
    const color = clampToGamut({ l: tertiaryL, c, h }, gamut);
    const dirty = h > 85 && h < 130 && tertiaryL < 0.78 ? -2 : 0;
    const crowded = hueGap(h, partner.h) < 45 ? -10 : 0;
    const distinct =
      Math.min(
        1,
        Math.min(distance(first, color), distance(partner, color)) / 0.14,
      ) * 2;
    const opposite = -Math.abs(hueGap(h, baseHue) - 180) / 180;
    const score = dirty + crowded + distinct + opposite + random() * 0.3;
    if (!best || score > best.score) best = { color, score };
  }

  return { secondary, tertiary: best!.color };
};
