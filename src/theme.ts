import {
  apcaContrast,
  pickOn,
  wcagRatio,
  type ContrastMethod,
} from './color/contrast.js';
import {
  clampToGamut,
  oklchToCss,
  oklchToHex,
  type Gamut,
  type Oklch,
} from './color/convert.js';
import { parseColor } from './color/parse.js';
import { deriveHarmony } from './harmony.js';
import { assertConfigKey } from './names.js';
import {
  darkScale,
  lightScale,
  STEPS,
  type Scale,
  type Step,
} from './scale.js';

export type Mode = 'light' | 'dark';

export type ThemeMode = Mode | 'auto';

export type ContrastOptions = {
  method?: ContrastMethod;
  target?: 'AA' | 'AAA' | number;
  on?: boolean;
};

export type ThemeOptions = {
  dark?: 'media' | 'class' | 'light-dark' | false;
  gamut?: Gamut;
  contrast?: ContrastOptions;
  neutral?: boolean | 'auto';
  status?: boolean;
  roles?: boolean;
  soft?: boolean;
  harmony?: boolean;
  seed?: number | string;
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
  vars(mode?: ThemeMode): string;
  variables(mode?: ThemeMode): Record<string, string>;
  apply(element?: StyleTarget, mode?: ThemeMode): void;
  scales: Record<string, { light: Scale; dark: Scale }>;
  report(): ReportRow[];
};

const show = (value: unknown): string => {
  try {
    return String(value);
  } catch {
    return typeof value;
  }
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

const ROLES: [string, Step][] = [
  ['surface', '50'],
  ['on-surface', '950'],
  ['border', '200'],
  ['muted', '600'],
];

const SOFT_DARK_CHROMA = 0.25;

const STATUS_BASES: [string, Oklch][] = [
  ['success', { l: 0.62, c: 0.17, h: 145 }],
  ['warning', { l: 0.8, c: 0.16, h: 85 }],
  ['danger', { l: 0.6, c: 0.2, h: 27 }],
  ['info', { l: 0.6, c: 0.16, h: 250 }],
];

type Softs = Record<string, Record<Mode, string>>;

const entriesOf = (
  scales: Theme['scales'],
  mode: Mode,
  withOn: boolean,
  withRoles: boolean,
  softs?: Softs,
): [string, string][] => [
  ...Object.entries(scales).flatMap(([name, scale]) => [
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
    ...(softs
      ? [[`--${name}-soft`, softs[name]![mode]] as [string, string]]
      : []),
  ]),
  ...(withRoles
    ? ROLES.map(([role, step]): [string, string] => [
        `--${role}`,
        `var(--neutral-${step})`,
      ])
    : []),
];

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

const assertMode = (mode: unknown): ThemeMode => {
  if (mode !== 'light' && mode !== 'dark' && mode !== 'auto') {
    throw new Error(
      `Invalid mode: ${show(mode)}. Expected 'light', 'dark' or 'auto'`,
    );
  }
  return mode;
};

const resolveDark = (dark: unknown): ThemeOptions['dark'] => {
  if (dark === undefined) return 'media';
  if (
    dark !== 'media' &&
    dark !== 'class' &&
    dark !== 'light-dark' &&
    dark !== false
  ) {
    throw new Error(
      `Invalid dark option: ${show(dark)}. Expected 'media', 'class', 'light-dark' or false`,
    );
  }
  return dark;
};

const resolveGamut = (gamut: unknown): Gamut => {
  if (gamut === undefined) return 'srgb';
  if (gamut !== 'srgb' && gamut !== 'p3') {
    throw new Error(
      `Invalid gamut option: ${show(gamut)}. Expected 'srgb' or 'p3'`,
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

const resolveNeutral = (neutral: unknown): boolean => {
  if (neutral === undefined || neutral === false) return false;
  if (neutral !== true && neutral !== 'auto') {
    throw new Error(
      `Invalid neutral option: ${show(neutral)}. Expected true or false`,
    );
  }
  return true;
};

const resolveFlag = (name: string, value: unknown): boolean => {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') {
    throw new Error(
      `Invalid ${name} option: ${show(value)}. Expected true or false`,
    );
  }
  return value;
};

const resolveSeed = (seed: unknown): number | string => {
  if (seed === undefined) return 0;
  if (
    typeof seed === 'string' ||
    (typeof seed === 'number' && Number.isFinite(seed))
  ) {
    return seed;
  }
  throw new Error(
    `Invalid seed option: ${typeof seed === 'bigint' ? `${seed}n` : show(seed)}. Expected a number or a string`,
  );
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
  const roles = resolveFlag('roles', options.roles);
  const neutral = resolveNeutral(options.neutral) || roles;
  const soft = resolveFlag('soft', options.soft);
  const status = resolveFlag('status', options.status);
  const harmony = resolveFlag('harmony', options.harmony);
  const seed = resolveSeed(options.seed);
  const scales: Theme['scales'] = {};
  const softs: Softs = {};

  const addScale = (name: string, base: Oklch) => {
    const light = lightScale(base, gamut);
    if (soft)
      softs[name] = {
        light: oklchToCss(light['100']),
        dark: oklchToCss(
          clampToGamut(
            { l: light['950'].l, c: base.c * SOFT_DARK_CHROMA, h: base.h },
            gamut,
          ),
        ),
      };
    scales[name] = {
      light: buildScale(light, contrast.method),
      dark: buildScale(darkScale(light), contrast.method),
    };
  };

  let first: Oklch | undefined;
  let chosenSecondary: Oklch | undefined;
  for (const [name, input] of inputs) {
    assertConfigKey(name);
    const base = parseColor(input, gamut);
    first ??= base;
    if (name === 'secondary') chosenSecondary = base;
    addScale(name, base);
  }

  const harmonic = harmony
    ? deriveHarmony(first!, oklchToHex(first!), seed, gamut, chosenSecondary)
    : undefined;
  const derived: [string, Oklch][] = [
    ...(harmonic
      ? ([
          ['secondary', harmonic.secondary],
          ['tertiary', harmonic.tertiary],
        ] as [string, Oklch][])
      : []),
    ...(neutral
      ? [
          [
            'neutral',
            {
              l: 0.55,
              c: Math.min(0.02, first!.c),
              h: Number.isFinite(first!.h) ? first!.h : 0,
            },
          ] as [string, Oklch],
        ]
      : []),
    ...(status ? STATUS_BASES : []),
  ];
  for (const [name, base] of derived) {
    if (!Object.hasOwn(scales, name)) addScale(name, base);
  }

  const activeSofts = soft ? softs : undefined;

  const modeEntries = (mode: ThemeMode): [string, string][] => {
    if (mode !== 'auto')
      return entriesOf(scales, mode, contrast.on, roles, activeSofts);
    const darkEntries = entriesOf(
      scales,
      'dark',
      contrast.on,
      roles,
      activeSofts,
    );
    return entriesOf(scales, 'light', contrast.on, roles, activeSofts).map(
      ([name, value], index): [string, string] => {
        const other = darkEntries[index]![1];
        return [
          name,
          value === other ? value : `light-dark(${value}, ${other})`,
        ];
      },
    );
  };

  const vars = (mode: ThemeMode = 'light'): string =>
    declarations(modeEntries(assertMode(mode)), '');

  const tokenLines = Object.keys(scales).flatMap((name) => [
    ...STEPS.map(
      (step) => `  --color-${name}-${step}: var(--${name}-${step});`,
    ),
    `  --color-${name}-contrast: var(--${name}-contrast);`,
    ...(soft ? [`  --color-${name}-soft: var(--${name}-soft);`] : []),
    ...(contrast.on
      ? STEPS.map(
          (step) => `  --color-${name}-${step}-on: var(--${name}-${step}-on);`,
        )
      : []),
  ]);

  const roleTokens = roles
    ? ROLES.map(([role]) => `  --color-${role}: var(--${role});`)
    : [];

  const blocks: string[] = [];
  if (dark === 'light-dark') {
    blocks.push(
      `:root {\n  color-scheme: light dark;\n${declarations(modeEntries('auto'), '  ')}\n}`,
      '.light {\n  color-scheme: light;\n}',
      '.dark {\n  color-scheme: dark;\n}',
    );
  } else {
    blocks.push(
      `:root {\n${declarations(entriesOf(scales, 'light', contrast.on, roles, activeSofts), '  ')}\n}`,
    );
  }
  if (dark === 'media') {
    blocks.push(
      `@media (prefers-color-scheme: dark) {\n  :root {\n${declarations(
        entriesOf(scales, 'dark', contrast.on, roles, activeSofts),
        '    ',
      )}\n  }\n}`,
    );
  } else if (dark === 'class') {
    blocks.push(
      `.dark {\n${declarations(entriesOf(scales, 'dark', contrast.on, roles, activeSofts), '  ')}\n}`,
    );
  }
  blocks.push(
    `@theme inline {\n${[...tokenLines, ...roleTokens].join('\n')}\n}`,
  );

  return {
    css: `${blocks.join('\n\n')}\n`,
    vars,
    variables(mode = 'light') {
      return Object.fromEntries(modeEntries(assertMode(mode)));
    },
    apply(element, mode = 'light') {
      const entries = modeEntries(assertMode(mode));
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
