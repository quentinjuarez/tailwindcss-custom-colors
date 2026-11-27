import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import type { Format } from './format.js';
import type { ContrastOptions, ThemeOptions } from './theme.js';

export type CliConfig = {
  colors?: Record<string, string>;
  dark?: ThemeOptions['dark'];
  gamut?: ThemeOptions['gamut'];
  contrast?: ContrastOptions;
  neutral?: ThemeOptions['neutral'];
  status?: boolean;
  soft?: boolean;
  roles?: boolean;
  harmony?: boolean;
  seed?: number | string;
  format?: Format;
  out?: string;
};

const KEYS = [
  'colors',
  'dark',
  'gamut',
  'contrast',
  'neutral',
  'status',
  'soft',
  'roles',
  'harmony',
  'seed',
  'format',
  'out',
];

const FORMATS = ['css', 'json', 'scss', 'tokens', 'html'];

const exists = (path: string): boolean => {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
};

const resolvesOutside = (base: string, target: string): boolean => {
  let probe = target;
  while (!exists(probe)) {
    const parent = dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  let real: string;
  try {
    real = realpathSync(probe);
  } catch {
    return true;
  }
  const inside = relative(realpathSync(base), real);
  return isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const reasonOf = (error: unknown): string =>
  (error as NodeJS.ErrnoException).code ??
  ((error as Error).message ?? String(error)).split('\n')[0]!;

export const loadConfig = (path: string): CliConfig => {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read config file ${path}: ${reasonOf(error)}`, {
      cause: error,
    });
  }
  const invalid = (reason: string): never => {
    throw new Error(`Invalid config file ${path}: ${reason}`);
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`Invalid config file ${path}: ${reasonOf(error)}`, {
      cause: error,
    });
  }
  if (!isRecord(parsed)) return invalid('expected an object');
  const unknownKey = Object.keys(parsed).find((key) => !KEYS.includes(key));
  if (unknownKey !== undefined) {
    return invalid(`unknown key ${JSON.stringify(unknownKey.slice(0, 40))}`);
  }
  const { colors, contrast, format, out, dark, gamut, neutral, seed } = parsed;
  if (
    colors !== undefined &&
    (!isRecord(colors) ||
      Object.keys(colors).length === 0 ||
      !Object.values(colors).every((value) => typeof value === 'string'))
  ) {
    return invalid('colors must be an object of name: color strings');
  }
  if (
    dark !== undefined &&
    dark !== 'media' &&
    dark !== 'class' &&
    dark !== 'light-dark' &&
    dark !== false
  ) {
    return invalid('dark must be "media", "class", "light-dark" or false');
  }
  if (gamut !== undefined && gamut !== 'srgb' && gamut !== 'p3') {
    return invalid('gamut must be "srgb" or "p3"');
  }
  if (
    neutral !== undefined &&
    neutral !== true &&
    neutral !== 'auto' &&
    neutral !== false
  ) {
    return invalid('neutral must be true or false');
  }
  for (const key of ['status', 'roles', 'soft', 'harmony']) {
    if (parsed[key] !== undefined && typeof parsed[key] !== 'boolean') {
      return invalid(`${key} must be true or false`);
    }
  }
  if (
    seed !== undefined &&
    !(typeof seed === 'number' && Number.isFinite(seed)) &&
    !(typeof seed === 'string' && seed !== '')
  ) {
    return invalid('seed must be a number or a non empty string');
  }
  if (contrast !== undefined && !isRecord(contrast)) {
    return invalid('contrast must be an object');
  }
  if (format !== undefined && !FORMATS.includes(format as string)) {
    return invalid('format must be css, json, scss, tokens or html');
  }
  if (out !== undefined && (typeof out !== 'string' || out.trim() === '')) {
    return invalid('out must be a non empty string');
  }
  if (typeof out === 'string') {
    const base = dirname(path);
    const target = resolve(base, out);
    const inside = relative(base, target);
    if (
      isAbsolute(out) ||
      isAbsolute(inside) ||
      inside === '..' ||
      inside.startsWith(`..${sep}`) ||
      resolvesOutside(base, target)
    ) {
      return invalid('out must stay inside the config directory');
    }
    if (/[\\/]$/.test(out)) return invalid('out must be a file path');
    if (target === path) return invalid('out cannot be the config file itself');
  }
  return parsed as CliConfig;
};
