import { parseArgs } from 'node:util';

import { createTheme, type ThemeOptions } from './theme.js';

export type CliResult = { stdout: string; stderr: string; code: number };

const DARK_MODES: Record<string, ThemeOptions['dark']> = {
  media: 'media',
  class: 'class',
  none: false,
};

const USAGE = `Usage: tailwindcss-custom-colors <name=color>... [--dark media|class|none]

Prints Tailwind CSS v4 theme CSS for each color.

Options:
  --dark <mode>  dark mode strategy: media (default), class or none
  --help         show this help

Example:
  npx tailwindcss-custom-colors primary=#940BDF --dark class > theme.css
`;

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
      'Usage: tailwindcss-custom-colors <name=color>... [--dark media|class|none]',
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
    return {
      stdout: createTheme(colors, { dark }).css,
      stderr: '',
      code: 0,
    };
  } catch (error) {
    return fail((error as Error).message);
  }
};
