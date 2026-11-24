import { clampToGamut, hexToOklch, type Gamut, type Oklch } from './convert.js';
import { cssColorNames } from './names.js';
import {
  hwbToOklch,
  labToOklch,
  lchToOklch,
  oklabToOklch,
  rgbSpaceToOklch,
  xyzToOklch,
  type RgbSpace,
} from './spaces.js';

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/;
const MAX_INPUT_LENGTH = 100;
const HEX = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const HEX_LIKE = /^#?[0-9a-f]*$/;
const FUNCTION = /^([a-z0-9-]+)\(([^()]*)\)$/;
const HUE_UNITS: [string, number][] = [
  ['grad', 0.9],
  ['deg', 1],
  ['rad', 180 / Math.PI],
  ['turn', 360],
];

type Token = { value: number; percent: boolean };

class Reject extends Error {}

const reject = (reason: string): never => {
  throw new Reject(reason);
};

const describeInput = (input: unknown): string => {
  try {
    return String(input);
  } catch {
    return typeof input;
  }
};

const invalid = (input: unknown, reason: string): Error =>
  new Error(`Invalid color: ${describeInput(input)} (${reason})`);

const parseToken = (raw: string): Token | null => {
  if (raw === 'none') return { value: 0, percent: false };
  const percent = raw.endsWith('%');
  const text = percent ? raw.slice(0, -1) : raw;
  if (!NUMBER.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? { value, percent } : null;
};

const token = (raw: string): Token =>
  parseToken(raw) ?? reject('invalid number');

const wrapHue = (degrees: number): number => ((degrees % 360) + 360) % 360;

const hue = (raw: string): number => {
  const unit = HUE_UNITS.find(([suffix]) => raw.endsWith(suffix));
  const parsed = parseToken(unit ? raw.slice(0, -unit[0].length) : raw);
  if (!parsed || parsed.percent) return reject('invalid hue');
  const degrees = parsed.value * (unit ? unit[1] : 1);
  return Number.isFinite(degrees) ? wrapHue(degrees) : reject('invalid hue');
};

const scaled = (raw: string, reference: number): number => {
  const { value, percent } = token(raw);
  return percent ? (value / 100) * reference : value;
};

const lightness = (raw: string, max: number): number => {
  const value = scaled(raw, max);
  return value < 0 ? reject('negative lightness') : Math.min(max, value);
};

const chroma = (raw: string, reference: number): number => {
  const value = scaled(raw, reference);
  return value < 0 ? reject('negative chroma') : value;
};

const splitArguments = (body: string): string[] => {
  const [main, alpha, ...rest] = body.split('/');
  if (rest.length > 0) return reject('too many slashes');
  const components = main
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (alpha !== undefined && components.length !== 3) {
    return reject('wrong number of components');
  }
  if (components.length < 3 || components.length > 4) {
    return reject('wrong number of components');
  }
  const alphaText = alpha === undefined ? components[3] : alpha.trim();
  if (alphaText !== undefined && !parseToken(alphaText)) {
    return reject('invalid alpha');
  }
  return components.slice(0, 3);
};

const channelToByte = (input: Token): number => {
  const byte = input.percent ? (input.value / 100) * 255 : input.value;
  return Math.round(Math.min(255, Math.max(0, byte)));
};

const bytesToHex = (bytes: number[]): string =>
  `#${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;

const expandHex = (digits: string): string => {
  const six =
    digits.length <= 4
      ? [...digits.slice(0, 3)].map((digit) => digit + digit).join('')
      : digits.slice(0, 6);
  return `#${six}`;
};

const hslToBytes = (degrees: number, saturation: number, light: number) => {
  const h = (((degrees % 360) + 360) % 360) / 360;
  const s = Math.min(1, Math.max(0, saturation));
  const l = Math.min(1, Math.max(0, light));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (offset: number): number => {
    const t = (((h + offset) % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(1 / 3), channel(0), channel(-1 / 3)].map((value) =>
    Math.round(value * 255),
  );
};

const parseRgb = (body: string): Oklch => {
  const bytes = splitArguments(body).map((part) => channelToByte(token(part)));
  return hexToOklch(bytesToHex(bytes));
};

const parseHsl = (body: string): Oklch => {
  const [h, s, l] = splitArguments(body);
  return hexToOklch(
    bytesToHex(hslToBytes(hue(h), token(s).value / 100, token(l).value / 100)),
  );
};

const unit = (raw: string): number =>
  Math.min(1, Math.max(0, token(raw).value / 100));

const parseHwb = (body: string): Oklch => {
  const [h, w, b] = splitArguments(body);
  return hwbToOklch(hue(h), unit(w), unit(b));
};

const parseLab = (body: string): Oklch => {
  const [l, a, b] = splitArguments(body);
  return labToOklch(lightness(l, 100), scaled(a, 125), scaled(b, 125));
};

const parseLch = (body: string): Oklch => {
  const [l, c, h] = splitArguments(body);
  return lchToOklch(lightness(l, 100), chroma(c, 150), hue(h));
};

const parseOklab = (body: string): Oklch => {
  const [l, a, b] = splitArguments(body);
  return oklabToOklch(lightness(l, 1), scaled(a, 0.4), scaled(b, 0.4));
};

const parseOklch = (body: string): Oklch => {
  const [l, c, h] = splitArguments(body);
  return { l: lightness(l, 1), c: chroma(c, 0.4), h: hue(h) };
};

const RGB_SPACES: RgbSpace[] = [
  'srgb',
  'srgb-linear',
  'display-p3',
  'a98-rgb',
  'prophoto-rgb',
  'rec2020',
];

const parseColorFunction = (body: string): Oklch => {
  const trimmed = body.trim();
  const cut = trimmed.search(/\s/);
  const space = cut < 0 ? trimmed : trimmed.slice(0, cut);
  if (!space) return reject('missing color space');
  const channels = splitArguments(cut < 0 ? '' : trimmed.slice(cut)).map(
    (part) => scaled(part, 1),
  ) as [number, number, number];
  if ((RGB_SPACES as string[]).includes(space)) {
    return rgbSpaceToOklch(space as RgbSpace, channels);
  }
  if (space === 'xyz' || space === 'xyz-d65')
    return xyzToOklch('d65', channels);
  if (space === 'xyz-d50') return xyzToOklch('d50', channels);
  return reject(
    /^[a-z0-9-]+$/.test(space)
      ? `unknown color space: ${space}`
      : 'unknown color space',
  );
};

const PARSERS: Record<string, (body: string) => Oklch> = {
  rgb: parseRgb,
  rgba: parseRgb,
  hsl: parseHsl,
  hsla: parseHsl,
  hwb: parseHwb,
  lab: parseLab,
  lch: parseLch,
  oklab: parseOklab,
  oklch: parseOklch,
  color: parseColorFunction,
};

const parseText = (text: string): Oklch => {
  if (!text) return reject('empty input');

  const hex = HEX.exec(text);
  if (hex) return hexToOklch(expandHex(hex[1]));

  const named = Object.hasOwn(cssColorNames, text) ? cssColorNames[text] : null;
  if (named) return hexToOklch(named);

  const fn = FUNCTION.exec(text);
  if (fn) {
    const [, name, body] = fn;
    if (!Object.hasOwn(PARSERS, name)) return reject('unknown color function');
    const color = PARSERS[name](body);
    return [color.l, color.c, color.h].every(Number.isFinite)
      ? { ...color, l: Math.min(1, Math.max(0, color.l)) }
      : reject('component out of range');
  }
  if (/[()]/.test(text)) return reject('malformed color function');
  if (HEX_LIKE.test(text)) return reject('invalid hex color');
  return reject('unknown color name');
};

export const parseColor = (input: string, gamut: Gamut = 'srgb'): Oklch => {
  if (typeof input !== 'string') throw invalid(input, 'expected a string');
  if (input.length > MAX_INPUT_LENGTH) {
    throw invalid(input, `longer than ${MAX_INPUT_LENGTH} characters`);
  }
  try {
    return clampToGamut(parseText(input.trim().toLowerCase()), gamut);
  } catch (error) {
    if (error instanceof Reject) throw invalid(input, error.message);
    throw error;
  }
};
