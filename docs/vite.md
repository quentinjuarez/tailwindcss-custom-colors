# Vite plugin

With Vite, skip the file and the CLI: the plugin generates the theme for you.
It does not import Vite, so it adds no dependency, and it is tested with
Vite 8.

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
import { customColors } from 'tailwindcss-custom-colors/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [customColors({ colors: { primary: '#940BDF' } }), tailwindcss()],
});
```

```css
@import 'tailwindcss';
@import 'virtual:theme.css';
```

List `customColors` before `tailwindcss()`: Tailwind resolves imports itself and
cannot find `virtual:theme.css` otherwise. Every `ThemeOptions` option works
next to `colors` (`dark`, `gamut`, `contrast`, `neutral`, `status`, `roles`, `soft`, `harmony`).

`colors` can also be the path of a JSON file, relative to the Vite root:

```ts
customColors({ colors: 'theme-colors.json', dark: 'class' });
```

```json
{ "primary": "#940BDF", "accent": "#FFD534" }
```

The file is watched. Saving it updates the styles in the running dev server,
with no restart. An invalid file reports a one line error.

The plugin writes the generated CSS to a file in
`tailwindcss-custom-colors/` inside Vite's cache directory and points the import
at it, so there is nothing to commit. Media and layer conditions after the
import are kept, as in `@import 'virtual:theme.css' layer(theme);`. A plain `import 'virtual:theme.css'` in a JavaScript file also works,
and serves the same CSS as a style module.

The import is rewritten only in CSS files that Vite itself transforms: your
entry stylesheet, and style blocks of single file components. Tailwind reads
files that it follows through `@import` or `@reference` on its own, so the
line cannot live in such a file. For those, generate a real file with the
[CLI](cli.md#formats-and-ci) instead.

Tools that read your stylesheet entry to learn the theme, such as a Tailwind
class linter or a class sorter, cannot resolve `virtual:theme.css`, so they see
the theme classes as unknown. With such tools, generate a real file with the
CLI, commit it, and let `--check` guard it.

Errors are one line each:

- `customColors expects an options object`
- `customColors needs a colors option (an object or a path to a JSON file)`
- `Cannot read colors file <path>: <reason>`
- `Invalid colors file <path>: <reason>`

The types `CustomColorsOptions` and `VitePlugin` are exported from
`tailwindcss-custom-colors/vite`.
