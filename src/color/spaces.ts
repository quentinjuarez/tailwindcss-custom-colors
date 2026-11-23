import type { Oklch } from './convert.js';

type Vec3 = [number, number, number];
type Matrix = [Vec3, Vec3, Vec3];

export type RgbSpace =
  | 'srgb'
  | 'srgb-linear'
  | 'display-p3'
  | 'a98-rgb'
  | 'prophoto-rgb'
  | 'rec2020';

const ACHROMATIC_CHROMA = 1e-4;

const multiply = (m: Matrix, v: Vec3): Vec3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];

const D50_TO_D65: Matrix = [
  [0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
  [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
  [0.012314001688319899, -0.020507696433477912, 1.3303659366080753],
];

const SRGB_TO_XYZ: Matrix = [
  [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
  [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
  [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
];

const P3_TO_XYZ: Matrix = [
  [0.4865709486482162, 0.26566769316909306, 0.1982172852343625],
  [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
  [0, 0.04511338185890264, 1.043944368900976],
];

const A98_TO_XYZ: Matrix = [
  [0.5766690429101305, 0.1855582379065463, 0.1882286462349947],
  [0.29734497525053605, 0.6273635662554661, 0.0752914584939978],
  [0.02703136138641234, 0.07068885253582723, 0.9913375368376388],
];

const REC2020_TO_XYZ: Matrix = [
  [0.6369580483012914, 0.14461690358620832, 0.1688809751641721],
  [0.2627002120112671, 0.6779980715188708, 0.05930171646986196],
  [0, 0.028072693049087428, 1.060985057710791],
];

const PROPHOTO_TO_XYZ_D50: Matrix = [
  [0.7977604896723027, 0.13518583717574031, 0.0313493495815248],
  [0.2880711282292934, 0.7118432178101014, 0.00008565396060525902],
  [0, 0, 0.8251046025104601],
];

const XYZ_TO_LMS: Matrix = [
  [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
  [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
];

const D50_WHITE: Vec3 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

const withSign = (fn: (abs: number) => number) => (value: number) =>
  value < 0 ? -fn(-value) : fn(value);

const srgbToLinear = withSign((v) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
);

const a98ToLinear = withSign((v) => v ** (563 / 256));

const REC2020_ALPHA = 1.09929682680944;
const REC2020_BETA = 0.018053968510807;

const rec2020ToLinear = withSign((v) =>
  v < REC2020_BETA * 4.5
    ? v / 4.5
    : ((v + REC2020_ALPHA - 1) / REC2020_ALPHA) ** (1 / 0.45),
);

const prophotoToLinear = withSign((v) => (v <= 16 / 512 ? v / 16 : v ** 1.8));

const identity = (v: number): number => v;

const RGB_SPACES: Record<
  RgbSpace,
  { toLinear: (v: number) => number; toXyz: Matrix; white: 'd50' | 'd65' }
> = {
  srgb: { toLinear: srgbToLinear, toXyz: SRGB_TO_XYZ, white: 'd65' },
  'srgb-linear': { toLinear: identity, toXyz: SRGB_TO_XYZ, white: 'd65' },
  'display-p3': { toLinear: srgbToLinear, toXyz: P3_TO_XYZ, white: 'd65' },
  'a98-rgb': { toLinear: a98ToLinear, toXyz: A98_TO_XYZ, white: 'd65' },
  'prophoto-rgb': {
    toLinear: prophotoToLinear,
    toXyz: PROPHOTO_TO_XYZ_D50,
    white: 'd50',
  },
  rec2020: { toLinear: rec2020ToLinear, toXyz: REC2020_TO_XYZ, white: 'd65' },
};

export const oklabToOklch = (l: number, a: number, b: number): Oklch => {
  const c = Math.hypot(a, b);
  const h =
    c < ACHROMATIC_CHROMA
      ? 0
      : ((((Math.atan2(b, a) * 180) / Math.PI) % 360) + 360) % 360;
  return { l, c, h };
};

export const xyzToOklch = (white: 'd50' | 'd65', xyz: Vec3): Oklch => {
  const d65 = white === 'd50' ? multiply(D50_TO_D65, xyz) : xyz;
  const [l, m, s] = multiply(XYZ_TO_LMS, d65).map(Math.cbrt) as Vec3;
  return oklabToOklch(
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  );
};

export const rgbSpaceToOklch = (space: RgbSpace, rgb: Vec3): Oklch => {
  const { toLinear, toXyz, white } = RGB_SPACES[space];
  const linear = rgb.map(toLinear) as Vec3;
  return xyzToOklch(white, multiply(toXyz, linear));
};

const LAB_EPSILON = 216 / 24389;
const LAB_KAPPA = 24389 / 27;

export const labToOklch = (l: number, a: number, b: number): Oklch => {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const expand = (f: number): number =>
    f ** 3 > LAB_EPSILON ? f ** 3 : (116 * f - 16) / LAB_KAPPA;
  const y = l > LAB_KAPPA * LAB_EPSILON ? fy ** 3 : l / LAB_KAPPA;
  return xyzToOklch('d50', [
    expand(fx) * D50_WHITE[0],
    y * D50_WHITE[1],
    expand(fz) * D50_WHITE[2],
  ]);
};

export const lchToOklch = (l: number, c: number, h: number): Oklch => {
  const hue = (h * Math.PI) / 180;
  return labToOklch(l, c * Math.cos(hue), c * Math.sin(hue));
};

export const hwbToOklch = (h: number, w: number, b: number): Oklch => {
  if (w + b >= 1) {
    const gray = w / (w + b);
    return rgbSpaceToOklch('srgb', [gray, gray, gray]);
  }
  const hue = (((h % 360) + 360) % 360) / 60;
  const channel = (offset: number): number => {
    const k = (offset + hue) % 6;
    return 1 - Math.max(0, Math.min(1, k, 4 - k));
  };
  const scale = 1 - w - b;
  return rgbSpaceToOklch('srgb', [
    channel(5) * scale + w,
    channel(3) * scale + w,
    channel(1) * scale + w,
  ]);
};
