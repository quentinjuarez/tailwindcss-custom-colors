import { clampToGamut, hexToOklch, type Oklch } from './convert.js';
import { cssColorNames } from './names.js';

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/;
const MAX_INPUT_LENGTH = 100;
const HEX = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const FUNCTION = /^(rgba?|hsla?|oklch)\(([^()]*)\)$/;

type Token = { value: number; percent: boolean };

const invalid = (input: unknown): Error =>
  new Error(`Invalid color: ${String(input)}`);

const parseToken = (raw: string, unit?: string): Token | null => {
  let text = raw;
  let percent = false;
  if (text.endsWith('%')) {
    percent = true;
    text = text.slice(0, -1);
  } else if (unit && text.endsWith(unit)) {
    text = text.slice(0, -unit.length);
  }
  if (!NUMBER.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? { value, percent } : null;
};

const splitArguments = (
  body: string,
  maxComponents: number,
): string[] | null => {
  const [main, alpha, ...rest] = body.split('/');
  if (rest.length > 0) return null;
  const components = main
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (alpha !== undefined) {
    if (components.length !== maxComponents - 1 || !alpha.trim()) return null;
    components.push(alpha.trim());
  }
  if (
    components.length < maxComponents - 1 ||
    components.length > maxComponents
  ) {
    return null;
  }
  return components;
};

const channelToByte = (token: Token): number => {
  const byte = token.percent ? (token.value / 100) * 255 : token.value;
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

const hslToBytes = (hue: number, saturation: number, lightness: number) => {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = Math.min(1, Math.max(0, saturation));
  const l = Math.min(1, Math.max(0, lightness));
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

const parseRgb = (body: string): string | null => {
  const parts = splitArguments(body, 4);
  if (!parts) return null;
  const tokens = parts.slice(0, 3).map((part) => parseToken(part));
  if (tokens.some((token) => token === null)) return null;
  if (parts[3] !== undefined && !parseToken(parts[3])) return null;
  return bytesToHex((tokens as Token[]).map(channelToByte));
};

const parseHsl = (body: string): string | null => {
  const parts = splitArguments(body, 4);
  if (!parts) return null;
  const hue = parseToken(parts[0], 'deg');
  const saturation = parseToken(parts[1]);
  const lightness = parseToken(parts[2]);
  if (!hue || hue.percent || !saturation || !lightness) return null;
  if (parts[3] !== undefined && !parseToken(parts[3])) return null;
  return bytesToHex(
    hslToBytes(hue.value, saturation.value / 100, lightness.value / 100),
  );
};

const parseOklch = (body: string): Oklch | null => {
  const parts = splitArguments(body, 4);
  if (!parts) return null;
  const lightness = parseToken(parts[0]);
  const chroma = parseToken(parts[1]);
  const hue = parseToken(parts[2], 'deg');
  if (!lightness || !chroma || !hue || hue.percent) return null;
  if (parts[3] !== undefined && !parseToken(parts[3])) return null;
  const l = lightness.percent ? lightness.value / 100 : lightness.value;
  const c = chroma.percent ? (chroma.value / 100) * 0.4 : chroma.value;
  if (l < 0 || c < 0) return null;
  return { l: Math.min(1, l), c, h: ((hue.value % 360) + 360) % 360 };
};

export const parseColor = (input: string): Oklch => {
  if (typeof input !== 'string' || input.length > MAX_INPUT_LENGTH) {
    throw invalid(input);
  }
  const text = input.trim().toLowerCase();

  const hex = HEX.exec(text);
  if (hex) return clampToGamut(hexToOklch(expandHex(hex[1])));

  const named = Object.hasOwn(cssColorNames, text) ? cssColorNames[text] : null;
  if (named) return clampToGamut(hexToOklch(named));

  const fn = FUNCTION.exec(text);
  if (fn) {
    const [, name, body] = fn;
    if (name === 'oklch') {
      const color = parseOklch(body);
      if (color) return clampToGamut(color);
    } else {
      const converted = name.startsWith('rgb')
        ? parseRgb(body)
        : parseHsl(body);
      if (converted) return clampToGamut(hexToOklch(converted));
    }
  }

  throw invalid(input);
};
