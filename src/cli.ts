import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { loadConfig, type CliConfig } from './config.js';
import { formatTheme, type Format } from './format.js';
import {
  createTheme,
  type ContrastOptions,
  type ReportRow,
  type ThemeOptions,
} from './theme.js';

export type CliResult = {
  stdout: string;
  stderr: string;
  code: number;
  watch?: string;
  wrote?: string;
};

const CONFIG_NAME = 'tailwindcss-custom-colors.config.json';

const DARK_MODES: Record<string, ThemeOptions['dark']> = {
  media: 'media',
  class: 'class',
  'light-dark': 'light-dark',
  none: false,
};

const USAGE = `Usage: tailwindcss-custom-colors <name=color>... [--dark media|class|light-dark|none] [--gamut srgb|p3] [--contrast wcag|apca] [--target AA|AAA|<n>] [--on] [--neutral] [--status] [--roles] [--harmony] [--seed <value>] [--format css|json|scss|tokens|html] [--out <path>] [--check] [--report] [--config <path>] [--watch]

Prints Tailwind CSS v4 theme CSS for each color.

Options:
  --dark <mode>    dark mode strategy: media (default), class, light-dark or none
  --gamut <space>  color gamut: srgb (default) or p3
  --contrast <m>   contrast method: wcag (default) or apca
  --target <t>     pass threshold for --report: AA (default), AAA or a number
  --on             also emit --<name>-<step>-on variables
  --neutral        add a tinted neutral scale
  --status         add success, warning, danger and info scales
  --roles          add --surface, --on-surface, --border and --muted
  --format <f>     output format: css (default), json, scss, tokens or html
  --out <path>     write the output to a file instead of stdout
  --check          with --out, fail when the file is out of date
  --harmony        derive secondary and tertiary colors
  --seed <value>   seed for --harmony: a number or any text
  --report         print a contrast report instead of CSS
  --config <path>  read settings from a JSON config file
  --watch          with a config file and --out, regenerate on every change
  --help           show this help

With no arguments, tailwindcss-custom-colors.config.json in the current
directory is used when it exists.

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

const FORMATS: Format[] = ['css', 'json', 'scss', 'tokens', 'html'];

const reasonOf = (error: unknown): string =>
  (error as NodeJS.ErrnoException).code ??
  ((error as Error).message ?? String(error)).split('\n')[0]!;

const fail = (message: string): CliResult => ({
  stdout: '',
  stderr: `${message}\n`,
  code: 1,
});

const firstSentence = (message: string): string =>
  (message.split('\n')[0] ?? message).split('. ')[0] ?? message;

const toFile = (path: string, output: string, check: boolean): CliResult => {
  if (check) {
    let existing: string;
    try {
      existing = readFileSync(path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return fail(
          `${path} does not exist. Run the command without --check to create it`,
        );
      }
      return fail(`Cannot read ${path}: ${reasonOf(error)}`);
    }
    return existing === output
      ? { stdout: '', stderr: '', code: 0 }
      : fail(
          `${path} is out of date. Run the command without --check to update it`,
        );
  }
  try {
    if (existsSync(path) && readFileSync(path, 'utf8') === output) {
      return { stdout: '', stderr: '', code: 0 };
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, output);
  } catch (error) {
    return fail(`Cannot write ${path}: ${reasonOf(error)}`);
  }
  return { stdout: '', stderr: '', code: 0 };
};

export const run = (argv: string[], cwd: string = process.cwd()): CliResult => {
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
        neutral: { type: 'boolean' },
        status: { type: 'boolean' },
        roles: { type: 'boolean' },
        harmony: { type: 'boolean' },
        seed: { type: 'string' },
        format: { type: 'string' },
        out: { type: 'string' },
        check: { type: 'boolean' },
        report: { type: 'boolean' },
        config: { type: 'string' },
        watch: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    return fail(firstSentence((error as Error).message));
  }

  const { values, positionals } = parsed;

  if (values.help) return { stdout: USAGE, stderr: '', code: 0 };

  let configPath: string | undefined;
  if (values.config !== undefined) {
    if (values.config.trim() === '') return fail('--config needs a path');
    configPath = resolve(cwd, values.config);
  } else if (positionals.length === 0 && existsSync(join(cwd, CONFIG_NAME))) {
    configPath = join(cwd, CONFIG_NAME);
  }

  if (positionals.length === 0 && configPath === undefined) {
    return fail(
      'Usage: tailwindcss-custom-colors <name=color>... [--dark media|class|light-dark|none] [--gamut srgb|p3] [--contrast wcag|apca] [--target AA|AAA|<n>] [--on] [--neutral] [--status] [--roles] [--harmony] [--seed <value>] [--format css|json|scss|tokens|html] [--out <path>] [--check] [--report] [--config <path>] [--watch]',
    );
  }

  let config: CliConfig = {};
  if (configPath !== undefined) {
    try {
      config = loadConfig(configPath);
    } catch (error) {
      return fail((error as Error).message);
    }
  }

  let format: Format = config.format ?? 'css';
  if (values.format !== undefined) {
    if (!FORMATS.includes(values.format as Format)) {
      return fail(
        `Invalid --format value: ${values.format}. Expected css, json, scss, tokens or html`,
      );
    }
    format = values.format as Format;
    if (values.report) {
      return fail('--report cannot be combined with --format');
    }
  }
  if (values.out !== undefined && values.out.trim() === '') {
    return fail('--out needs a path');
  }
  const out =
    values.out ??
    (!values.report && config.out !== undefined && configPath !== undefined
      ? resolve(dirname(configPath), config.out)
      : undefined);
  if (values.check && out === undefined) {
    return fail('--check needs --out');
  }

  if (values.watch) {
    if (configPath === undefined) return fail('--watch needs a config file');
    if (values.check) return fail('--watch cannot be combined with --check');
    if (values.report) return fail('--watch cannot be combined with --report');
    if (out === undefined) return fail('--watch needs --out');
  }

  if (values.seed !== undefined) {
    if (!values.harmony && config.harmony !== true) {
      return fail('--seed needs --harmony');
    }
    if (values.seed === '') return fail('--seed needs a value');
  }

  let dark: ThemeOptions['dark'] = config.dark ?? 'media';
  if (values.dark !== undefined) {
    if (!Object.hasOwn(DARK_MODES, values.dark)) {
      return fail(
        `Invalid --dark value: ${values.dark}. Expected media, class, light-dark or none`,
      );
    }
    dark = DARK_MODES[values.dark];
  }

  let gamut: ThemeOptions['gamut'] = config.gamut ?? 'srgb';
  if (values.gamut !== undefined) {
    if (values.gamut !== 'srgb' && values.gamut !== 'p3') {
      return fail(
        `Invalid --gamut value: ${values.gamut}. Expected srgb or p3`,
      );
    }
    gamut = values.gamut;
  }

  const contrast: ContrastOptions = { ...config.contrast };
  if (values.contrast !== undefined) {
    if (values.contrast !== 'wcag' && values.contrast !== 'apca') {
      return fail(
        `Invalid --contrast value: ${values.contrast}. Expected wcag or apca`,
      );
    }
    contrast.method = values.contrast;
  }

  if (values.target !== undefined) {
    const number = Number(values.target);
    if (values.target === 'AA' || values.target === 'AAA') {
      contrast.target = values.target;
    } else if (/^\d+(\.\d+)?$/.test(values.target) && number > 0) {
      contrast.target = number;
    } else {
      return fail(
        `Invalid --target value: ${values.target}. Expected AA, AAA or a positive number`,
      );
    }
  }
  if (values.on) contrast.on = true;

  let colors: Record<string, string>;
  if (positionals.length > 0) {
    colors = Object.create(null) as Record<string, string>;
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
  } else if (config.colors !== undefined) {
    colors = config.colors;
  } else {
    return fail(
      'No colors: add them to the config file or pass name=color arguments',
    );
  }

  const seed = values.seed ?? config.seed;
  try {
    const theme = createTheme(colors, {
      dark,
      gamut,
      contrast,
      neutral: values.neutral ? 'auto' : config.neutral,
      status: values.status === true ? true : config.status,
      roles: values.roles === true ? true : config.roles,
      harmony: values.harmony === true ? true : config.harmony,
      ...(seed === undefined ? {} : { seed }),
    });
    const output = values.report
      ? formatReport(theme.report())
      : formatTheme(theme, format, dark !== false);
    if (out === undefined) {
      return { stdout: output, stderr: '', code: 0 };
    }
    const result = toFile(out, output, values.check === true);
    return values.watch && result.code === 0
      ? { ...result, watch: configPath, wrote: out }
      : result;
  } catch (error) {
    return fail((error as Error).message);
  }
};
