import {
  apcaContrast,
  pickOn,
  wcagRatio,
  type ContrastMethod,
} from './color/contrast.js';
import {
  oklchToCss,
  oklchToHex,
  type Gamut,
  type Oklch,
} from './color/convert.js';
import { parseColor } from './color/parse.js';
import { assertConfigKey } from './names.js';
import {
  darkScale,
  lightScale,
  STEPS,
  type Scale,
  type Step,
} from './scale.js';

export type Mode = 'light' | 'dark';

export type ContrastOptions = {
  method?: ContrastMethod;
  target?: 'AA' | 'AAA' | number;
  on?: boolean;
};

export type ThemeOptions = {
  dark?: 'media' | 'class' | false;
  gamut?: Gamut;
  contrast?: ContrastOptions;
};

export type ReportRow = {
  color: string;
  mode: Mode;
  step: Step;
  on: '#000000' | '#ffffff';
  ratio: number;
  apca: number;
  pass: boolean;
};

export type StyleTarget = {
  style: { setProperty(name: string, value: string): void };
};

export type Theme = {
  css: string;
  vars(mode?: Mode): string;
  apply(element?: StyleTarget, mode?: Mode): void;
  scales: Record<string, { light: Scale; dark: Scale }>;
  report(): ReportRow[];
};

const buildScale = (
  steps: Record<Step, Oklch>,
  method: ContrastMethod,
): Scale => {
  const entries = STEPS.map((step) => [
    step,
    { oklch: oklchToCss(steps[step]), hex: oklchToHex(steps[step]) },
  ]);
  const { contrast, ratio, apca } = pickOn(oklchToHex(steps['500']), method);
  const on = STEPS.map((step) => [
    step,
    pickOn(oklchToHex(steps[step]), method).contrast,
  ]);
  return {
    steps: Object.fromEntries(entries) as Scale['steps'],
    contrast,
    ratio,
    apca,
    on: Object.fromEntries(on) as Scale['on'],
  };
};

const entriesOf = (
  scales: Theme['scales'],
  mode: Mode,
  withOn: boolean,
): [string, string][] =>
  Object.entries(scales).flatMap(([name, scale]) => [
    ...STEPS.map((step): [string, string] => [
      `--${name}-${step}`,
      scale[mode].steps[step].oklch,
    ]),
    [`--${name}-contrast`, scale[mode].contrast] as [string, string],
    ...(withOn
      ? STEPS.map((step): [string, string] => [
          `--${name}-${step}-on`,
          scale[mode].on[step],
        ])
      : []),
  ]);

const declarations = (entries: [string, string][], indent: string): string =>
  entries.map(([name, value]) => `${indent}${name}: ${value};`).join('\n');

const resolveTarget = (element?: StyleTarget): StyleTarget => {
  if (element) return element;
  const doc = (globalThis as { document?: { documentElement?: StyleTarget } })
    .document;
  if (!doc?.documentElement) {
    throw new Error(
      'apply() needs an element when no global document is available',
    );
  }
  return doc.documentElement;
};

const assertMode = (mode: unknown): Mode => {
  if (mode !== 'light' && mode !== 'dark') {
    throw new Error(
      `Invalid mode: ${String(mode)}. Expected 'light' or 'dark'`,
    );
  }
  return mode;
};

const resolveDark = (dark: unknown): ThemeOptions['dark'] => {
  if (dark === undefined) return 'media';
  if (dark !== 'media' && dark !== 'class' && dark !== false) {
    throw new Error(
      `Invalid dark option: ${String(dark)}. Expected 'media', 'class' or false`,
    );
  }
  return dark;
};

const resolveGamut = (gamut: unknown): Gamut => {
  if (gamut === undefined) return 'srgb';
  if (gamut !== 'srgb' && gamut !== 'p3') {
    throw new Error(
      `Invalid gamut option: ${String(gamut)}. Expected 'srgb' or 'p3'`,
    );
  }
  return gamut;
};

type Contrast = { method: ContrastMethod; threshold: number; on: boolean };

const THRESHOLDS = {
  wcag: { AA: 4.5, AAA: 7 },
  apca: { AA: 60, AAA: 75 },
};

const CONTRAST_KEYS = ['method', 'target', 'on'];

const resolveContrast = (option: unknown): Contrast => {
  const reject = (reason: string): never => {
    throw new Error(`Invalid contrast option: ${reason}`);
  };
  if (option === undefined)
    return { method: 'wcag', threshold: 4.5, on: false };
  const proto =
    typeof option === 'object' && option !== null
      ? Object.getPrototypeOf(option)
      : undefined;
  if (proto !== Object.prototype && proto !== null) {
    return reject('expected a plain object');
  }
  const input = option as Record<string, unknown>;
  const unknownKey = Reflect.ownKeys(input).find(
    (key) => typeof key === 'symbol' || !CONTRAST_KEYS.includes(key),
  );
  if (unknownKey !== undefined) {
    return reject(
      `unknown key ${JSON.stringify(String(unknownKey).slice(0, 40))}`,
    );
  }
  const own = (key: string, fallback: unknown): unknown =>
    Object.hasOwn(input, key) ? input[key] : fallback;
  const method = own('method', 'wcag');
  const target = own('target', 'AA');
  const on = own('on', false);
  if (method !== 'wcag' && method !== 'apca') {
    return reject("method must be 'wcag' or 'apca'");
  }
  if (typeof on !== 'boolean') return reject('on must be a boolean');
  if (target === 'AA' || target === 'AAA') {
    return { method, threshold: THRESHOLDS[method][target], on };
  }
  if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0) {
    return reject("target must be 'AA', 'AAA' or a positive number");
  }
  return { method, threshold: target, on };
};

export const createTheme = (
  colors: Record<string, string>,
  options: ThemeOptions = {},
): Theme => {
  if (typeof colors !== 'object' || colors === null || Array.isArray(colors)) {
    throw new Error('createTheme expects an object of name: color pairs');
  }
  const inputs = Object.entries(colors);
  if (inputs.length === 0) {
    throw new Error('createTheme needs at least one color');
  }

  const dark = resolveDark(options.dark);
  const gamut = resolveGamut(options.gamut);
  const contrast = resolveContrast(options.contrast);
  const scales: Theme['scales'] = {};

  for (const [name, input] of inputs) {
    assertConfigKey(name);
    const light = lightScale(parseColor(input, gamut), gamut);
    scales[name] = {
      light: buildScale(light, contrast.method),
      dark: buildScale(darkScale(light), contrast.method),
    };
  }

  const vars = (mode: Mode = 'light'): string =>
    declarations(entriesOf(scales, assertMode(mode), contrast.on), '');

  const tokens = Object.keys(scales).flatMap((name) => [
    ...STEPS.map(
      (step) => `  --color-${name}-${step}: var(--${name}-${step});`,
    ),
    `  --color-${name}-contrast: var(--${name}-contrast);`,
    ...(contrast.on
      ? STEPS.map(
          (step) => `  --color-${name}-${step}-on: var(--${name}-${step}-on);`,
        )
      : []),
  ]);

  const blocks = [
    `:root {\n${declarations(entriesOf(scales, 'light', contrast.on), '  ')}\n}`,
  ];
  if (dark === 'media') {
    blocks.push(
      `@media (prefers-color-scheme: dark) {\n  :root {\n${declarations(
        entriesOf(scales, 'dark', contrast.on),
        '    ',
      )}\n  }\n}`,
    );
  } else if (dark === 'class') {
    blocks.push(
      `.dark {\n${declarations(entriesOf(scales, 'dark', contrast.on), '  ')}\n}`,
    );
  }
  blocks.push(`@theme inline {\n${tokens.join('\n')}\n}`);

  return {
    css: `${blocks.join('\n\n')}\n`,
    vars,
    apply(element, mode = 'light') {
      const entries = entriesOf(scales, assertMode(mode), contrast.on);
      const target = resolveTarget(element);
      for (const [name, value] of entries) {
        target.style.setProperty(name, value);
      }
    },
    scales,
    report() {
      const modes: Mode[] = dark === false ? ['light'] : ['light', 'dark'];
      return Object.entries(scales).flatMap(([color, scale]) =>
        modes.flatMap((mode) =>
          STEPS.map((step): ReportRow => {
            const {
              contrast: on,
              ratio,
              apca,
            } = pickOn(scale[mode].steps[step].hex, contrast.method);
            const { hex } = scale[mode].steps[step];
            const measured =
              contrast.method === 'apca'
                ? Math.abs(apcaContrast(on, hex))
                : wcagRatio(on, hex);
            return {
              color,
              mode,
              step,
              on,
              ratio,
              apca,
              pass: measured >= contrast.threshold,
            };
          }),
        ),
      );
    },
  };
};
