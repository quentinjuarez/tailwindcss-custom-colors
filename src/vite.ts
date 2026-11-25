import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { createTheme, type ThemeOptions } from './theme.js';

export type CustomColorsOptions = ThemeOptions & {
  colors: Record<string, string> | string;
};

type PluginContext = { addWatchFile?(file: string): void } | void;

export type VitePlugin = {
  name: string;
  enforce: 'pre';
  configResolved(config: { root: string; cacheDir?: string }): void;
  resolveId(id: string): string | null;
  load(this: PluginContext, id: string): string | null;
  transform(this: PluginContext, code: string, id: string): string | null;
  watchChange(id: string): void;
};

const VIRTUAL_ID = 'virtual:theme.css';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const MARKER =
  /@import\s*(?:url\(\s*)?(['"])virtual:theme\.css\1(?:\s*\))?([^;\n{}]*);?/g;
const CSS_ID = /\.css(?:$|\?)|[?&]lang\.css(?:$|&)/;
const JS_WRAPPED = /[?&](?:raw|url)(?:$|&|=)/;

const NEEDS_COLORS =
  'customColors needs a colors option (an object or a path to a JSON file)';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const reasonOf = (error: unknown): string =>
  (error as NodeJS.ErrnoException).code ??
  ((error as Error).message ?? String(error)).split('\n')[0]!;

const readColors = (path: string): Record<string, string> => {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read colors file ${path}: ${reasonOf(error)}`, {
      cause: error,
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid colors file ${path}: ${reasonOf(error)}`, {
      cause: error,
    });
  }
  if (
    !isRecord(parsed) ||
    !Object.values(parsed).every((value) => typeof value === 'string')
  ) {
    throw new Error(
      `Invalid colors file ${path}: expected an object of name: color strings`,
    );
  }
  return parsed as Record<string, string>;
};

export const customColors = (options: CustomColorsOptions): VitePlugin => {
  if (!isRecord(options)) {
    throw new Error('customColors expects an options object');
  }
  const { colors, ...themeOptions } = options;
  if (typeof colors === 'string' ? colors === '' : !isRecord(colors)) {
    throw new Error(NEEDS_COLORS);
  }

  let root = process.cwd();
  let cacheDir = join(root, 'node_modules', '.cache');
  let css: string | undefined;

  const colorsPath = (): string | undefined =>
    typeof colors === 'string' ? resolve(root, colors) : undefined;

  const key = createHash('sha1')
    .update(JSON.stringify([colors, themeOptions]))
    .digest('hex')
    .slice(0, 8);

  const themeFile = (): string =>
    join(cacheDir, 'tailwindcss-custom-colors', `theme-${key}.css`);

  const generate = (context: PluginContext): string => {
    const path = colorsPath();
    if (path !== undefined) context?.addWatchFile?.(path);
    if (css === undefined) {
      css = createTheme(
        path === undefined
          ? (colors as Record<string, string>)
          : readColors(path),
        themeOptions,
      ).css;
    }
    const file = themeFile();
    if (!existsSync(file) || readFileSync(file, 'utf8') !== css) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, css);
    }
    return css;
  };

  return {
    name: 'tailwindcss-custom-colors',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
      cacheDir = config.cacheDir ?? join(root, 'node_modules', '.cache');
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      return id === RESOLVED_ID ? generate(this) : null;
    },
    transform(code, id) {
      if (!CSS_ID.test(id) || JS_WRAPPED.test(id)) return null;
      if (!code.includes(VIRTUAL_ID)) return null;
      generate(this);
      const file = JSON.stringify(themeFile().replaceAll('\\', '/'));
      const out = code.replace(
        MARKER,
        (_match, _quote, params: string) =>
          `@import ${file}${params.trimEnd()};`,
      );
      return out === code ? null : out;
    },
    watchChange(id) {
      if (resolve(id) === colorsPath()) css = undefined;
    },
  };
};
