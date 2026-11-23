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
