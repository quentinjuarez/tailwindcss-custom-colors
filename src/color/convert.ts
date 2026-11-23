export type Oklch = { l: number; c: number; h: number };

type Rgb = [number, number, number];

const GAMUT_EPSILON = 1e-4;
const ACHROMATIC_CHROMA = 1e-4;
const SEARCH_ITERATIONS = 24;

const srgbToLinear = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const linearToSrgb = (value: number): number =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;

const oklchToLinearRgb = ({ l, c, h }: Oklch): Rgb => {
  const hue = (h * Math.PI) / 180;
  const a = c * Math.cos(hue);
  const b = c * Math.sin(hue);

  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
    -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
    -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp,
  ];
};

const isInGamut = (color: Oklch): boolean =>
  oklchToLinearRgb(color).every(
    (channel) => channel >= -GAMUT_EPSILON && channel <= 1 + GAMUT_EPSILON,
  );

export const clampToGamut = (color: Oklch): Oklch => {
  if (isInGamut(color)) return color;

  let low = 0;
  let high = color.c;
  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    if (isInGamut({ ...color, c: mid })) low = mid;
    else high = mid;
  }
  return { l: color.l, c: low, h: color.h };
};

export const hexToOklch = (hex6: string): Oklch => {
  const digits = hex6.replace(/^#/, '');
  const [r, g, b] = [0, 2, 4].map((i) =>
    srgbToLinear(parseInt(digits.slice(i, i + 2), 16) / 255),
  );

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.hypot(a, bb);
  const hue =
    chroma < ACHROMATIC_CHROMA
      ? 0
      : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;

  return { l: lightness, c: chroma, h: hue };
};

export const oklchToHex = (color: Oklch): string => {
  const clamped = clampToGamut(color);
  return `#${oklchToLinearRgb(clamped)
    .map((channel) => {
      const value = Math.round(
        linearToSrgb(Math.min(1, Math.max(0, channel))) * 255,
      );
      return value.toString(16).padStart(2, '0');
    })
    .join('')}`;
};

const toFixedUnsigned = (value: number, digits: number): string => {
  const text = value.toFixed(digits);
  return /^-0(\.0*)?$/.test(text) ? text.slice(1) : text;
};

const formatHue = (hue: number): string => {
  const text = toFixedUnsigned(((hue % 360) + 360) % 360, 2);
  return text === '360.00' ? '0.00' : text;
};

export const oklchToCss = ({ l, c, h }: Oklch): string =>
  `oklch(${toFixedUnsigned(l, 4)} ${toFixedUnsigned(c, 4)} ${formatHue(h)})`;
