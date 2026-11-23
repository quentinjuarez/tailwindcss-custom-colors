import { pickContrast } from './color/contrast.js';
import { oklchToCss, oklchToHex, type Oklch } from './color/convert.js';
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

export type ThemeOptions = { dark?: 'media' | 'class' | false };

export type StyleTarget = {
  style: { setProperty(name: string, value: string): void };
};

export type Theme = {
  css: string;
  vars(mode?: Mode): string;
  apply(element?: StyleTarget, mode?: Mode): void;
  scales: Record<string, { light: Scale; dark: Scale }>;
};

const buildScale = (steps: Record<Step, Oklch>): Scale => {
  const entries = STEPS.map((step) => [
    step,
    { oklch: oklchToCss(steps[step]), hex: oklchToHex(steps[step]) },
  ]);
  const { contrast, ratio } = pickContrast(oklchToHex(steps['500']));
  return {
    steps: Object.fromEntries(entries) as Scale['steps'],
    contrast,
    ratio,
  };
};

const entriesOf = (scales: Theme['scales'], mode: Mode): [string, string][] =>
  Object.entries(scales).flatMap(([name, scale]) => [
    ...STEPS.map((step): [string, string] => [
      `--${name}-${step}`,
      scale[mode].steps[step].oklch,
    ]),
    [`--${name}-contrast`, scale[mode].contrast] as [string, string],
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
  const scales: Theme['scales'] = {};

  for (const [name, input] of inputs) {
    assertConfigKey(name);
    const light = lightScale(parseColor(input));
    scales[name] = {
      light: buildScale(light),
      dark: buildScale(darkScale(light)),
    };
  }

  const vars = (mode: Mode = 'light'): string =>
    declarations(entriesOf(scales, assertMode(mode)), '');

  const tokens = Object.keys(scales).flatMap((name) => [
    ...STEPS.map(
      (step) => `  --color-${name}-${step}: var(--${name}-${step});`,
    ),
    `  --color-${name}-contrast: var(--${name}-contrast);`,
  ]);

  const blocks = [
    `:root {\n${declarations(entriesOf(scales, 'light'), '  ')}\n}`,
  ];
  if (dark === 'media') {
    blocks.push(
      `@media (prefers-color-scheme: dark) {\n  :root {\n${declarations(
        entriesOf(scales, 'dark'),
        '    ',
      )}\n  }\n}`,
    );
  } else if (dark === 'class') {
    blocks.push(`.dark {\n${declarations(entriesOf(scales, 'dark'), '  ')}\n}`);
  }
  blocks.push(`@theme inline {\n${tokens.join('\n')}\n}`);

  return {
    css: `${blocks.join('\n\n')}\n`,
    vars,
    apply(element, mode = 'light') {
      const entries = entriesOf(scales, assertMode(mode));
      const target = resolveTarget(element);
      for (const [name, value] of entries) {
        target.style.setProperty(name, value);
      }
    },
    scales,
  };
};
