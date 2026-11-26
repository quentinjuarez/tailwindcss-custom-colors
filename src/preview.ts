import { STEPS, type Scale } from './scale.js';
import type { Mode, Theme } from './theme.js';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escape = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => ESCAPES[char]!);

const STYLE = `
:root { color-scheme: light dark; --bg: #ffffff; --fg: #0f172a; --muted: #64748b; --line: #e2e8f0; --panel: #f8fafc; }
@media (prefers-color-scheme: dark) { :root { --bg: #0b1020; --fg: #e2e8f0; --muted: #94a3b8; --line: #1e293b; --panel: #111827; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
main { max-width: 64rem; margin: 0 auto; padding: 2.5rem 1rem 4rem; }
h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
h2 { margin: 2.5rem 0 0.75rem; font-size: 1.125rem; }
p { margin: 0 0 0.5rem; color: var(--muted); }
.row { display: grid; grid-template-columns: repeat(11, 1fr); gap: 0.25rem; margin-bottom: 0.75rem; }
.swatch { border-radius: 0.375rem; padding: 0.5rem 0.25rem; min-height: 4.5rem; font-size: 0.7rem; display: flex; flex-direction: column; justify-content: flex-end; word-break: break-all; }
.trio { display: flex; height: 4rem; border-radius: 0.75rem; overflow: hidden; }
.trio div { flex: 1; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1rem; }
.card { padding: 1rem; border-radius: 0.75rem; border: 1px solid var(--line); }
.card strong { display: block; font-size: 1.05rem; }
.card p { margin: 0.25rem 0 0.75rem; color: inherit; opacity: 0.75; }
.btn, .chip { display: inline-block; font-weight: 600; font-size: 0.8rem; margin-right: 0.5rem; }
.btn { padding: 0.4rem 0.8rem; border-radius: 0.5rem; }
.chip { padding: 0.15rem 0.6rem; border-radius: 999px; }
pre { background: var(--panel); border: 1px solid var(--line); border-radius: 0.5rem; padding: 1rem; overflow-x: auto; font-size: 0.8rem; }
code { font-family: ui-monospace, monospace; }
@media (max-width: 40rem) { .row { grid-template-columns: repeat(4, 1fr); } }
`;

const swatches = (scale: Scale): string =>
  STEPS.map((step) => {
    const { hex, oklch } = scale.steps[step];
    return `<div class="swatch" style="background:${hex};background:${oklch};color:${scale.on[step]}"><b>${step}</b>${hex}</div>`;
  }).join('');

const ramp = (label: string, scale: Scale): string =>
  `<p>${label}, text on 500: ${scale.contrast} (${scale.ratio.toFixed(2)}:1, Lc ${scale.apca.toFixed(1)})</p><div class="row">${swatches(scale)}</div>`;

const card = (theme: Theme, mode: Mode, names: string[]): string => {
  const [first, second, third] = names.map(escape) as [
    string,
    string?,
    string?,
  ];
  const variables = theme.vars(mode).split('\n').join('');
  const buttons = [
    `<span class="btn" style="background:var(--${first}-500);color:var(--${first}-contrast)">Action</span>`,
    second
      ? `<span class="btn" style="border:1px solid var(--${second}-800);color:var(--${second}-800)">Secondary</span>`
      : '',
    third
      ? `<span class="chip" style="background:var(--${third}-500);color:var(--${third}-contrast)">New</span>`
      : '',
  ].join('');
  return `<div class="card" style="${escape(variables)}background:var(--${first}-50);color:var(--${first}-950)"><strong>Page title (${mode})</strong><p>A supporting text to judge the balance.</p>${buttons}</div>`;
};

export const previewHtml = (theme: Theme, dark: boolean): string => {
  const names = Object.keys(theme.scales);
  const modes: Mode[] = dark ? ['light', 'dark'] : ['light'];
  const sections = names
    .map((name) => {
      const { light, dark: darkScale } = theme.scales[name]!;
      return `<h2>${escape(name)}</h2>${ramp('Light', light)}${dark ? ramp('Dark', darkScale) : ''}`;
    })
    .join('');
  const palette =
    names.length >= 3
      ? `<h2>Palette</h2><div class="trio">${names
          .slice(0, 3)
          .map(
            (name) =>
              `<div style="background:${theme.scales[name]!.light.steps['500'].hex}"></div>`,
          )
          .join('')}</div>`
      : '';
  const cards = modes.map((mode) => card(theme, mode, names)).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>tailwindcss-custom-colors preview</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<h1>tailwindcss-custom-colors</h1>
<p>Theme preview</p>
${sections}${palette}<h2>Preview</h2><div class="cards">${cards}</div><h2>CSS</h2><pre><code>${escape(theme.css)}</code></pre>
</main>
</body>
</html>
`;
};
