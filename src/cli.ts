import { parseArgs } from 'node:util';

import {
  createTheme,
  type ContrastOptions,
  type ReportRow,
  type ThemeOptions,
} from './theme.js';

export type CliResult = { stdout: string; stderr: string; code: number };

const DARK_MODES: Record<string, ThemeOptions['dark']> = {
  media: 'media',
  class: 'class',
  none: false,
};

const USAGE = `Usage: tailwindcss-custom-colors <name=color>... [--dark media|class|none] [--gamut srgb|p3] [--contrast wcag|apca] [--target AA|AAA|<n>] [--on] [--report]

Prints Tailwind CSS v4 theme CSS for each color.

Options:
  --dark <mode>    dark mode strategy: media (default), class or none
  --gamut <space>  color gamut: srgb (default) or p3
  --contrast <m>   contrast method: wcag (default) or apca
  --target <t>     pass threshold for --report: AA (default), AAA or a number
  --on             also emit --<name>-<step>-on variables
  --report         print a contrast report instead of CSS
  --help           show this help

Example:
  npx tailwindcss-custom-colors primary=#940BDF --dark class > theme.css
`;

const formatReport = (rows: ReportRow[]): string => {
  const table = [
    ['color', 'mode', 'step', 'on', 'ratio', 'apca', 'pass'],
    ...rows.map((row) => [
      row.color,
      row.mode,
      row.step,
      row.on,
      row.ratio.toFixed(2),
      row.apca.toFixed(1),
      row.pass ? 'yes' : 'no',
    ]),
  ];
  const widths = table[0]!.map((_, column) =>
    Math.max(...table.map((line) => line[column]!.length)),
  );
  return `${table
    .map((line) =>
      line
        .map((cell, column) => cell.padEnd(widths[column]!))
        .join('  ')
        .trimEnd(),
    )
    .join('\n')}\n`;
};

const fail = (message: string): CliResult => ({
  stdout: '',
  stderr: `${message}\n`,
  code: 1,
});

const firstSentence = (message: string): string =>
  (message.split('\n')[0] ?? message).split('. ')[0] ?? message;

export const run = (argv: string[]): CliResult => {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        dark: { type: 'string' },
        gamut: { type: 'string' },
        contrast: { type: 'string' },
        target: { type: 'string' },
        on: { type: 'boolean' },
        report: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    return fail(firstSentence((error as Error).message));
  }

  const { values, positionals } = parsed;

  if (values.help) return { stdout: USAGE, stderr: '', code: 0 };

  if (positionals.length === 0) {
    return fail(
      'Usage: tailwindcss-custom-colors <name=color>... [--dark media|class|none] [--gamut srgb|p3] [--contrast wcag|apca] [--target AA|AAA|<n>] [--on] [--report]',
    );
  }

  let dark: ThemeOptions['dark'] = 'media';
  if (values.dark !== undefined) {
    if (!Object.hasOwn(DARK_MODES, values.dark)) {
      return fail(
        `Invalid --dark value: ${values.dark}. Expected media, class or none`,
      );
    }
    dark = DARK_MODES[values.dark];
  }

  let gamut: ThemeOptions['gamut'] = 'srgb';
  if (values.gamut !== undefined) {
    if (values.gamut !== 'srgb' && values.gamut !== 'p3') {
      return fail(
        `Invalid --gamut value: ${values.gamut}. Expected srgb or p3`,
      );
    }
    gamut = values.gamut;
  }

  let method: ContrastOptions['method'] = 'wcag';
  if (values.contrast !== undefined) {
    if (values.contrast !== 'wcag' && values.contrast !== 'apca') {
      return fail(
        `Invalid --contrast value: ${values.contrast}. Expected wcag or apca`,
      );
    }
    method = values.contrast;
  }

  let target: ContrastOptions['target'] = 'AA';
  if (values.target !== undefined) {
    const number = Number(values.target);
    if (values.target === 'AA' || values.target === 'AAA') {
      target = values.target;
    } else if (/^\d+(\.\d+)?$/.test(values.target) && number > 0) {
      target = number;
    } else {
      return fail(
        `Invalid --target value: ${values.target}. Expected AA, AAA or a positive number`,
      );
    }
  }

  const colors = Object.create(null) as Record<string, string>;
  for (const pair of positionals) {
    const index = pair.indexOf('=');
    const name = index === -1 ? '' : pair.slice(0, index);
    const color = index === -1 ? '' : pair.slice(index + 1);
    if (!name || !color) {
      return fail(`Invalid argument: ${pair}. Expected name=color`);
    }
    if (Object.hasOwn(colors, name)) {
      return fail(`Duplicate color name: ${name}`);
    }
    colors[name] = color;
  }

  try {
    const theme = createTheme(colors, {
      dark,
      gamut,
      contrast: { method, target, on: values.on === true },
    });
    return {
      stdout: values.report ? formatReport(theme.report()) : theme.css,
      stderr: '',
      code: 0,
    };
  } catch (error) {
    return fail((error as Error).message);
  }
};
