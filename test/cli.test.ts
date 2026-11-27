import { describe, expect, it } from 'vitest';

import { run } from '../src/cli.js';
import { createTheme } from '../src/theme.js';

describe('run', () => {
  it('prints the theme css for one color', () => {
    const result = run(['primary=#940BDF']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(createTheme({ primary: '#940BDF' }).css);
  });

  it('accepts several colors', () => {
    const result = run(['primary=#940BDF', 'accent=teal']);
    expect(result.stdout).toBe(
      createTheme({ primary: '#940BDF', accent: 'teal' }).css,
    );
  });

  it('keeps everything after the first equals sign in the color', () => {
    const result = run(['primary=rgb(1 2 3 / 50%)']);
    expect(result.stdout).toBe(
      createTheme({ primary: 'rgb(1 2 3 / 50%)' }).css,
    );
  });

  it('maps --dark class', () => {
    const result = run(['primary=#940BDF', '--dark', 'class']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      createTheme({ primary: '#940BDF' }, { dark: 'class' }).css,
    );
  });

  it('maps --dark none to false', () => {
    const result = run(['primary=#940BDF', '--dark', 'none']);
    expect(result.stdout).toBe(
      createTheme({ primary: '#940BDF' }, { dark: false }).css,
    );
  });

  it('maps --dark media', () => {
    const result = run(['--dark=media', 'primary=#940BDF']);
    expect(result.stdout).toBe(
      createTheme({ primary: '#940BDF' }, { dark: 'media' }).css,
    );
  });

  it('prints a one line usage hint on stderr without arguments', () => {
    const result = run([]);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/name=color/);
    expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
    expect(result.stderr.endsWith('\n')).toBe(true);
  });

  it('prints the usage on stdout for --help', () => {
    const result = run(['--help']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/name=color/);
    expect(result.stdout).toMatch(/--dark/);
    expect(result.stdout).toMatch(/--help/);
  });

  it.each([['primary'], ['=red'], ['primary=']])(
    'rejects the malformed pair %s',
    (pair) => {
      const result = run([pair]);
      expect(result.code).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toMatch(/name=color/);
      expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
    },
  );

  it('rejects a duplicate name', () => {
    const result = run(['primary=red', 'primary=blue']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/primary/);
    expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
  });

  it('rejects an invalid color with the createTheme message', () => {
    const result = run(['primary=nope']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/Invalid color: nope/);
    expect(result.stderr.endsWith('\n')).toBe(true);
  });

  it('rejects a reserved name', () => {
    const result = run(['constructor=red']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toBe('');
  });

  it.each([[['__proto__=red', 'primary=blue']], [['__proto__=red']]])(
    'rejects __proto__ with the reserved name message: %j',
    (args) => {
      const result = run(args);
      expect(result.code).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('Reserved color name: __proto__\n');
    },
  );

  it('splits on the first equals sign and validates the rest as a color', () => {
    const result = run(['a=b=c']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('Invalid color: b=c (unknown color name)\n');
  });

  it('still maps --dark none to false next to other colors', () => {
    const result = run(['--dark', 'none', 'primary=#940BDF', 'accent=teal']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      createTheme({ primary: '#940BDF', accent: 'teal' }, { dark: false }).css,
    );
  });

  it('rejects an unknown --dark value and lists the three', () => {
    const result = run(['primary=red', '--dark', 'auto']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/media/);
    expect(result.stderr).toMatch(/class/);
    expect(result.stderr).toMatch(/none/);
    expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
  });

  it('rejects an unknown flag', () => {
    const result = run(['primary=red', '--nope']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/--nope/);
    expect(result.stderr.trimEnd().split('\n')).toHaveLength(1);
  });

  it('passes --gamut p3 to the theme', () => {
    const result = run(['a=color(display-p3 0 1 0)', '--gamut', 'p3']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(
      createTheme({ a: 'color(display-p3 0 1 0)' }, { gamut: 'p3' }).css,
    );
  });

  it('uses srgb when --gamut srgb is given', () => {
    const result = run(['a=#940BDF', '--gamut', 'srgb']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(createTheme({ a: '#940BDF' }).css);
  });

  it('rejects an unknown --gamut value on one line', () => {
    const result = run(['a=red', '--gamut', 'rec2020']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe(
      'Invalid --gamut value: rec2020. Expected srgb or p3\n',
    );
  });

  it('prints a reasoned color error on a single line', () => {
    const result = run(['a=nope']);
    expect(result.code).toBe(1);
    expect(result.stderr).toBe('Invalid color: nope (unknown color name)\n');
  });

  it('lists --gamut in the usage', () => {
    expect(run(['--help']).stdout).toContain(
      '--gamut <space>  color gamut: srgb (default) or p3',
    );
  });
});

describe('accessibility flags', () => {
  it('passes --contrast apca to the theme', () => {
    const result = run(['gray=#808080', '--contrast', 'apca']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      createTheme({ gray: '#808080' }, { contrast: { method: 'apca' } }).css,
    );
    expect(result.stdout).toContain('--gray-contrast: #ffffff;');
  });

  it('emits on-color variables with --on', () => {
    const result = run(['a=#940BDF', '--on']);
    expect(result.stdout).toContain('--a-600-on: #');
  });

  it('prints a text report with --report', () => {
    const result = run(['a=#940BDF', '--report']);
    const lines = result.stdout.trimEnd().split('\n');
    expect(result.code).toBe(0);
    expect(lines[0]).toMatch(
      /^color\s+mode\s+step\s+on\s+ratio\s+apca\s+pass$/,
    );
    expect(lines).toHaveLength(1 + 22);
    expect(lines[1]).toMatch(/^a\s+light\s+50\s+#000000\s+/);
    expect(result.stdout).not.toContain(':root');
  });

  it('applies --target to the report', () => {
    const passes = (target: string) =>
      run(['a=#6b7280', '--report', '--target', target]).stdout.match(/yes$/gm)
        ?.length ?? 0;
    expect(passes('AAA')).toBeLessThan(passes('AA'));
    expect(passes('12')).toBeLessThan(passes('AAA'));
  });

  it.each([
    [
      ['--contrast', 'x'],
      'Invalid --contrast value: x. Expected wcag or apca\n',
    ],
    [
      ['--target', 'nope'],
      'Invalid --target value: nope. Expected AA, AAA or a positive number\n',
    ],
    [
      ['--target', ' 0x10 '],
      'Invalid --target value:  0x10 . Expected AA, AAA or a positive number\n',
    ],
    [
      ['--target', '1e1'],
      'Invalid --target value: 1e1. Expected AA, AAA or a positive number\n',
    ],
    [
      ['--target', '0'],
      'Invalid --target value: 0. Expected AA, AAA or a positive number\n',
    ],
    [
      ['--target', ''],
      'Invalid --target value: . Expected AA, AAA or a positive number\n',
    ],
  ])('rejects %j', (flags, message) => {
    const result = run(['a=red', ...flags]);
    expect(result).toEqual({ stdout: '', stderr: message, code: 1 });
  });

  it('lists the flags in the usage', () => {
    const { stdout } = run(['--help']);
    for (const flag of ['--contrast', '--target', '--on', '--report']) {
      expect(stdout).toContain(flag);
    }
  });
});

describe('semantic flags', () => {
  it('maps --neutral, --status and --roles', () => {
    const result = run(['primary=#940BDF', '--neutral', '--status', '--roles']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      createTheme(
        { primary: '#940BDF' },
        { neutral: 'auto', status: true, roles: true },
      ).css,
    );
  });

  it('maps --soft to the option', () => {
    const result = run(['primary=#940BDF', '--soft']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      createTheme({ primary: '#940BDF' }, { soft: true }).css,
    );
    expect(result.stdout).toContain('--primary-soft:');
  });

  it('lists the flags in the usage', () => {
    const { stdout } = run(['--help']);
    for (const flag of ['--neutral', '--status', '--roles', '--soft']) {
      expect(stdout).toContain(flag);
    }
  });
});

describe('harmony flags', () => {
  it('maps --harmony to the option', () => {
    const result = run(['primary=#0B6FDF', '--harmony']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      createTheme({ primary: '#0B6FDF' }, { harmony: true }).css,
    );
    expect(result.stdout).toContain('--tertiary-500:');
  });

  it('passes an integer seed as a number and other text as a string', () => {
    const colors = { primary: '#0B6FDF' };
    expect(run(['primary=#0B6FDF', '--harmony', '--seed', '3']).stdout).toBe(
      createTheme(colors, { harmony: true, seed: 3 }).css,
    );
    expect(run(['primary=#0B6FDF', '--harmony', '--seed=-2']).stdout).toBe(
      createTheme(colors, { harmony: true, seed: -2 }).css,
    );
    expect(run(['primary=#0B6FDF', '--harmony', '--seed', 'abc']).stdout).toBe(
      createTheme(colors, { harmony: true, seed: 'abc' }).css,
    );
  });

  it('rejects --seed without --harmony and an empty seed', () => {
    expect(run(['primary=#0B6FDF', '--seed', '3']).stderr).toBe(
      '--seed needs --harmony\n',
    );
    expect(run(['primary=#0B6FDF', '--harmony', '--seed=']).stderr).toBe(
      '--seed needs a value\n',
    );
  });

  it('lists the flags in the usage', () => {
    const { stdout } = run(['--help']);
    expect(stdout).toContain('--harmony');
    expect(stdout).toContain('--seed');
  });
});
