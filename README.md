# tailwindcss-custom-colors

Generate a full Tailwind CSS shade scale, the matching CSS variables and
automatic contrast colors from a single hex color.

[![npm version](https://img.shields.io/npm/v/tailwindcss-custom-colors)](https://www.npmjs.com/package/tailwindcss-custom-colors)
[![npm downloads](https://img.shields.io/npm/dm/tailwindcss-custom-colors)](https://www.npmjs.com/package/tailwindcss-custom-colors)
[![license](https://img.shields.io/npm/l/tailwindcss-custom-colors)](LICENSE)

You declare `primary` once. The package gives you `primary-50` through
`primary-950`, plus `primary`, `primary-contrast` and `primary-complement`, all
wired to CSS variables so a theme can be swapped at runtime.

## Installation

```bash
yarn add tailwindcss-custom-colors
# or
npm install tailwindcss-custom-colors
```

The package is published as CommonJS so it can be required from a
`tailwind.config.js`.

## Usage

Two functions, used together. `generateConfig` produces the Tailwind color
config, which references CSS variables. `generateStyleVariables` produces the
values for those variables.

### Tailwind config

```js
/** @type {import('tailwindcss').Config} */
const { generateConfig } = require('tailwindcss-custom-colors');

module.exports = {
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: generateConfig(['primary', 'secondary']),
    },
  },
};
```

`generateConfig(['primary'])` returns:

```json
{
  "primary": {
    "50": "rgb(var(--primary-50) / <alpha-value>)",
    "100": "rgb(var(--primary-100) / <alpha-value>)",
    "200": "rgb(var(--primary-200) / <alpha-value>)",
    "300": "rgb(var(--primary-300) / <alpha-value>)",
    "400": "rgb(var(--primary-400) / <alpha-value>)",
    "500": "rgb(var(--primary-500) / <alpha-value>)",
    "600": "rgb(var(--primary-600) / <alpha-value>)",
    "700": "rgb(var(--primary-700) / <alpha-value>)",
    "800": "rgb(var(--primary-800) / <alpha-value>)",
    "900": "rgb(var(--primary-900) / <alpha-value>)",
    "950": "rgb(var(--primary-950) / <alpha-value>)",
    "DEFAULT": "rgb(var(--primary) / <alpha-value>)",
    "contrast": "rgb(var(--primary-contrast) / <alpha-value>)",
    "complement": "rgb(var(--primary-complement) / <alpha-value>)"
  }
}
```

Because every shade goes through a CSS variable, `bg-primary-500` follows
whatever `--primary-500` is set to, and a whole theme can be re-skinned by
rewriting the variables.

### CSS variables

Pass an array of `{ color, name }` pairs. A single object also works.

```js
const { generateStyleVariables } = require('tailwindcss-custom-colors');

const variables = generateStyleVariables([
  { color: '#940BDF', name: 'primary' },
  { color: '#FFD534', name: 'secondary' },
]);
```

Which returns:

```css
--primary: 148 11 223;
--primary-contrast: 255 255 255;
--primary-complement: 0 0 0;
--primary-50: 231 192 252;
--primary-100: 223 172 251;
--primary-200: 207 128 249;
--primary-300: 188 80 247;
--primary-400: 172 36 245;
--primary-500: 148 11 223;
--primary-600: 120 8 180;
--primary-700: 91 6 136;
--primary-800: 58 4 88;
--primary-900: 29 2 44;
--primary-950: 16 1 24;
--secondary: 255 213 52;
--secondary-contrast: 0 0 0;
--secondary-complement: 255 255 255;
/* and --secondary-50 through --secondary-950, same as above */
```

Inject them wherever your theme lives:

```js
const style = document.createElement('style');
style.innerHTML = `@layer base { :root { ${variables} } }`;
document.head.appendChild(style);
```

## API

### `generateConfig(names, options?)`

`names` is a color name or an array of them. Returns a Tailwind `colors` object
whose every entry points at a CSS variable.

### `generateConfigWithColors(colorParams, options?)`

Same shape as `generateConfig`, but takes `{ color, name }` pairs and inlines the
computed `rgb()` values instead of referencing CSS variables. Use it when you do
not want a runtime-swappable theme.

### `generateStyleVariables(colorParams, options?)`

Takes `{ color, name }` pairs and returns the CSS variable declarations as a
string, separated by `;`.

## Options

| Option             | Type                              | Default                                 | What it does                                                                     |
| ------------------ | --------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `suffixMultiplier` | `100 \| 10 \| 1`                  | `100`                                   | Scale of the shade suffixes, so `500` becomes `50` or `5`                        |
| `variablePrefix`   | `string`                          | `undefined`                             | Prefix for generated variable names, for example `app` gives `--app-primary-500` |
| `contrast`         | `boolean`                         | `true`                                  | Emit a `contrast` color, readable on top of the base color                       |
| `complement`       | `boolean`                         | `true`                                  | Emit a `complement` color, the inverse of `contrast`                             |
| `classification`   | `{ light: string, dark: string }` | `{ light: '#FFFFFF', dark: '#000000' }` | The two colors `contrast` and `complement` pick between                          |
| `steps`            | `100 \| 50`                       | `100`                                   | `50` adds the half steps, `150`, `250` and so on                                 |
| `default`          | `boolean`                         | `true`                                  | Emit the unsuffixed `DEFAULT` entry                                              |
| `extraShades`      | `boolean`                         | `true`                                  | Emit the outer `50` and `950` shades                                             |

## Development

```bash
yarn install
yarn verify      # lint, format check, typecheck, tests, build
yarn test:watch
```

## Releasing

Publishing is triggered by a tag, never by a push to `main`.

```bash
yarn release           # verify, bump, commit, tag. Defaults to patch
yarn release minor     # or minor / major
git push --follow-tags # pushing the tag is what publishes
```

The tag push runs `.github/workflows/release.yml`, which re-runs `yarn verify`
on a clean checkout, checks that the tag matches the version in
`package.json`, and only then publishes to npm.

## License

MIT. See [LICENSE](LICENSE).
