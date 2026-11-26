import { formatTheme } from '../src/format.js';
import { previewHtml } from '../src/preview.js';
import { createTheme, type Theme } from '../src/theme.js';

const count = (text: string, part: string) => text.split(part).length - 1;

type Options = { dark?: 'media' | 'class' | 'light-dark' | false };

const withOptions = (colors: Record<string, string>, options: Options = {}) => {
  const theme = createTheme(colors, options);
  return { theme, html: previewHtml(theme, options.dark !== false) };
};

describe('previewHtml', () => {
  it('is a self contained html5 page', () => {
    const { html } = withOptions({ primary: '#940BDF' });
    expect(html.startsWith('<!doctype html>\n<html lang="en">')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('<title>tailwindcss-custom-colors preview</title>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/<link\b|@import|url\(/i);
    expect(html.endsWith('</html>\n')).toBe(true);
  });

  it('shows 22 swatches for one color and 11 without a dark side', () => {
    expect(count(withOptions({ a: 'red' }).html, 'class="swatch"')).toBe(22);
    expect(
      count(withOptions({ a: 'red' }, { dark: false }).html, 'class="swatch"'),
    ).toBe(11);
    expect(
      count(
        withOptions({ a: 'red', b: 'blue', c: 'green' }).html,
        'class="swatch"',
      ),
    ).toBe(66);
  });

  it('shows the measured contrast and the on color of each swatch', () => {
    const { theme, html } = withOptions({ primary: '#940BDF' });
    const { light } = theme.scales.primary!;
    expect(html).toContain(
      `Light, text on 500: ${light.contrast} (${light.ratio.toFixed(2)}:1, Lc ${light.apca.toFixed(1)})`,
    );
    expect(html).toContain(`color:${light.on['50']}"><b>50</b>`);
    expect(html).toContain(light.steps['500'].hex);
  });

  it('adds the palette section only with three colors or more', () => {
    expect(withOptions({ a: 'red', b: 'blue' }).html).not.toContain(
      '<h2>Palette</h2>',
    );
    const three = withOptions({ a: '#0B6FDF' }, { harmony: true } as never);
    expect(three.html).toContain('<h2>Palette</h2>');
    expect(count(three.html, '<div class="trio">')).toBe(1);
  });

  it('orders the sections: colors, palette, preview, css', () => {
    const { html } = withOptions({ a: '#0B6FDF' }, { harmony: true } as never);
    const at = (part: string) => html.indexOf(part);
    expect(at('<h2>a</h2>')).toBeLessThan(at('<h2>secondary</h2>'));
    expect(at('<h2>tertiary</h2>')).toBeLessThan(at('<h2>Palette</h2>'));
    expect(at('<h2>Palette</h2>')).toBeLessThan(at('<h2>Preview</h2>'));
    expect(at('<h2>Preview</h2>')).toBeLessThan(at('<h2>CSS</h2>'));
  });

  it('draws one card per mode with the theme variables inline', () => {
    const { theme, html } = withOptions({ a: 'red', b: 'blue', c: 'green' });
    expect(count(html, '<div class="card"')).toBe(2);
    expect(html).toContain('Page title (light)');
    expect(html).toContain('Page title (dark)');
    expect(html).toContain(theme.vars('light').split('\n').join(''));
    expect(html).toContain(theme.vars('dark').split('\n').join(''));
    expect(html).toContain('background:var(--a-50);color:var(--a-950)');
    expect(html).toContain('var(--b-800)');
    expect(html).toContain('var(--c-contrast)');
    const single = withOptions({ a: 'red' }, { dark: false });
    expect(count(single.html, '<div class="card"')).toBe(1);
    expect(single.html).not.toContain('Page title (dark)');
    expect(single.html).not.toContain('>Secondary<');
    expect(single.html).not.toContain('>New<');
  });

  it('does not depend on the dark strategy outside the css block', () => {
    const body = (dark: 'media' | 'class' | 'light-dark') =>
      withOptions(
        { a: '#0B6FDF', b: '#E5484D', c: 'teal' },
        { dark },
      ).html.split('<h2>CSS</h2>')[0];
    expect(body('class')).toBe(body('media'));
    expect(body('light-dark')).toBe(body('media'));
  });

  it('works with harmony, status and roles', () => {
    const { html } = withOptions({ primary: '#0B6FDF' }, {
      harmony: true,
      status: true,
      roles: true,
      neutral: 'auto',
    } as never);
    for (const name of ['secondary', 'tertiary', 'neutral', 'danger']) {
      expect(html).toContain(`<h2>${name}</h2>`);
    }
    expect(html).toContain('--surface:');
  });

  it('escapes every inserted value', () => {
    const real = createTheme({ a: 'red' });
    const stub = {
      scales: { '<b>x</b>': real.scales.a! },
      css: 'a & b <c> "d" \'e\'',
      vars: () => '--x: "y";',
    } as unknown as Theme;
    const html = previewHtml(stub, true);
    expect(html).toContain('<h2>&lt;b&gt;x&lt;/b&gt;</h2>');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;');
    expect(html).toContain('--x: &quot;y&quot;;');
    expect(html).toContain('var(--&lt;b&gt;x&lt;/b&gt;-50)');
  });

  it('is what the html format returns', () => {
    const theme = createTheme({ a: 'red' });
    expect(formatTheme(theme, 'html', true)).toBe(previewHtml(theme, true));
    expect(formatTheme(theme, 'html', false)).toBe(previewHtml(theme, false));
  });
});
