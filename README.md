# tailwindcss-custom-colors

One color in, a complete Tailwind CSS 4 theme out: an OKLCH shade scale, a dark
scale, a contrast color, all behind CSS variables you can swap at runtime.

[Try it live](https://quentinjuarez.github.io/tailwindcss-custom-colors/)

![Shade scales from 50 to 950 that createTheme generates for four brand colors, in light and dark mode](assets/scales.svg)

[![npm version](https://img.shields.io/npm/v/tailwindcss-custom-colors)](https://www.npmjs.com/package/tailwindcss-custom-colors)
[![npm downloads](https://img.shields.io/npm/dm/tailwindcss-custom-colors)](https://www.npmjs.com/package/tailwindcss-custom-colors)
[![license](https://img.shields.io/npm/l/tailwindcss-custom-colors)](LICENSE)

- [Why](#why)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Guides](#guides)
- [Limits](#limits)
- [Upgrading from 1.x](#upgrading-from-1x)
- [Development](#development)
- [Releasing](#releasing)
- [License](#license)

## Why

Some apps do not know their brand color at build time: white label products,
one theme per tenant, a color the user picks. Tailwind 4 can already mix any
CSS variable, but it cannot turn one color into a full scale for you.

You give `createTheme` one color per name. It gives you back:

- `primary-50` to `primary-950` plus `primary-contrast`, as Tailwind utilities
  (`bg-primary-500`, `text-primary-contrast`, `bg-primary-500/50`, and so on);
- the CSS variables behind them, for light and dark mode;
- an `apply()` to swap the whole theme in the browser without a rebuild;
- the computed values as data (OKLCH and hex), for charts, emails or canvas.

Shades are computed in OKLCH, so scales look even across hues. Your input color
is exactly step `500`. Zero runtime dependency.

## Installation

```bash
npm install tailwindcss-custom-colors
# or
yarn add tailwindcss-custom-colors
```

Requires Tailwind CSS 4 and Node.js 22 or later (the CLI needs it too). For
Tailwind 3, stay on 1.x (see [MIGRATION.md](MIGRATION.md)).

## Quick start

Build the theme and write its `css` to a stylesheet, for example in a build
script:

```js
import { writeFileSync } from 'node:fs';

import { createTheme } from 'tailwindcss-custom-colors';

writeFileSync('src/theme.css', createTheme({ primary: '#940BDF' }).css);
```

Import it after Tailwind:

```css
@import 'tailwindcss';
@import './theme.css';
```

Use the utilities:

```html
<button class="bg-primary-500 text-primary-contrast hover:bg-primary-600">
  Save
</button>
```

Swap the theme at runtime, with no rebuild:

```js
createTheme({ primary: '#0B6FDF' }).apply(document.documentElement, 'auto');
```

`apply()` rewrites the CSS variables on `document.documentElement`, so every
`bg-primary-500` on the page follows. The color names must be the ones the
stylesheet was built with, since Tailwind only generates utilities for those.

The mode `'auto'` follows the dark mode through the `color-scheme` property, so
`:root` needs `color-scheme: light dark`. Build with `dark: 'light-dark'`, which
writes it for you, or add it to your CSS.

Both `import` and `require` work:

```js
const { createTheme } = require('tailwindcss-custom-colors');
```

> [!IMPORTANT]
> Dark mode is on by default (`dark: 'media'`). When the OS prefers dark, the
> shades are mirrored: `50` becomes the dark end and `950` the light end. A
> light only app must pass `{ dark: false }`.
>
> Without a mode, `apply()` pins the light values as inline variables, and they
> beat the stylesheet. `apply(element, 'auto')` writes `light-dark(light, dark)`
> instead, so the colors follow your `color-scheme`. It needs a browser with
> native `light-dark()` and `color-scheme: light dark` on `:root`. See [Dark mode](https://github.com/quentinjuarez/tailwindcss-custom-colors/blob/main/docs/dark-mode.md#dark-mode).

## Guides

- [CLI, formats, config file and watch mode](https://github.com/quentinjuarez/tailwindcss-custom-colors/blob/main/docs/cli.md)
- [Vite plugin](https://github.com/quentinjuarez/tailwindcss-custom-colors/blob/main/docs/vite.md)
- [Accepted color syntaxes and wide gamut](https://github.com/quentinjuarez/tailwindcss-custom-colors/blob/main/docs/colors.md)
- [Dark mode strategies and the runtime kit](https://github.com/quentinjuarez/tailwindcss-custom-colors/blob/main/docs/dark-mode.md)
- [Neutral, status colors, roles, soft backgrounds and harmony](https://github.com/quentinjuarez/tailwindcss-custom-colors/blob/main/docs/derived-colors.md)
- [Contrast, APCA and on-colors](https://github.com/quentinjuarez/tailwindcss-custom-colors/blob/main/docs/contrast.md)
- [API reference, generated output and server rendering](https://github.com/quentinjuarez/tailwindcss-custom-colors/blob/main/docs/api.md)

## Limits

- Color input is capped at 100 characters.
- The library does not name or pick colors for you: you choose the names and
  give one color for each.
- Only the formats in [Accepted input](https://github.com/quentinjuarez/tailwindcss-custom-colors/blob/main/docs/colors.md#accepted-input). Relative colors
  (`from`), `calc()` and `color-mix()` are not supported.
- The input is exactly step `500`, so a very light or very dark input (for
  example `#0f172a`, `#facc15`, a near white or `#ffffff`) leaves less room on
  one side of it. Some steps then end up close together or identical in hex.
  Pure white pins steps `50` to `400`, pure black pins `600` to `950`.
- Tailwind CSS 4 and Node.js 22 or later only.

## Upgrading from 1.x

2.0 drops Tailwind 3 and replaces `generateConfig` and friends with
`createTheme`. See [MIGRATION.md](MIGRATION.md).

## Development

```bash
yarn install
yarn verify      # lint, format check, typecheck, tests, build, dist smoke tests
yarn test:watch
yarn assets      # rebuild, then regenerate assets/scales.svg from dist
```

The image at the top of this README is generated by `createTheme` itself, from
`scripts/generate-assets.mjs`. Run `yarn assets` after changing the scale
algorithm and commit the result.

## Releasing

Releases are driven by the commit messages. Push to `main` and CI decides
whether to publish, from the Conventional Commit prefixes in that push:

| Commit                                           | Release |
| ------------------------------------------------ | ------- |
| `feat!:`, or a `BREAKING CHANGE:` footer         | major   |
| `feat:`                                          | minor   |
| `fix:`, `perf:`                                  | patch   |
| `chore:`, `docs:`, `ci:`, `test:`, anything else | none    |

The highest bump in the push wins. CI runs `yarn verify`, publishes to npm,
then commits the version bump and tags it. Nothing to run by hand, and no
version is bumped by a commit that does not change the published code.

To publish without a qualifying commit, run the workflow manually and pick a
strategy. `current` publishes the version already in `package.json`, which is
what a first release or a retry after a credentials failure needs.

```bash
gh workflow run CI --field strategy=minor
```

## License

MIT. See [LICENSE](LICENSE).
