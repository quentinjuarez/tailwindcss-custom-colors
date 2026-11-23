# Migrating from 1.x to 2.0

2.0 is a rewrite for Tailwind CSS 4. Tailwind 4 declares colors in CSS with
`@theme`, so a Tailwind 3 config object is no longer the right output. The
three generator functions are replaced by a single `createTheme`.

## Tailwind 3 support is dropped

2.0 targets Tailwind CSS 4 only. If you are on Tailwind 3, stay on 1.x. It
stays published and installable:

```bash
npm install tailwindcss-custom-colors@1
```

## Removed exports

| Removed                    | Replacement                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `generateConfig`           | `createTheme(colors).css`, which includes the `@theme` tokens |
| `generateConfigWithColors` | `createTheme(colors).scales` for the computed values          |
| `generateStyleVariables`   | `createTheme(colors).vars()`, or `apply()` in the browser     |
| `Options` type             | `ThemeOptions`                                                |

## Removed options

| Removed            | What happens now                                                          |
| ------------------ | ------------------------------------------------------------------------- |
| `complement`       | Removed. There is no `complement` color.                                  |
| `suffixMultiplier` | Removed. Steps are always `50`, `100` to `900`, `950`.                    |
| `steps`            | Removed. No half steps.                                                   |
| `default`          | Removed. There is no unsuffixed `primary` color, use `primary-500`.       |
| `extraShades`      | Removed. `50` and `950` are always generated.                             |
| `classification`   | Removed. `contrast` is always black or white, and its `ratio` is exposed. |
| `variablePrefix`   | Removed. Variables are named `--<name>-<step>` and `--<name>-contrast`.   |
| `contrast`         | Removed as an option. `--<name>-contrast` is always generated.            |

The only option left is `dark: 'media' | 'class' | false`.

## Other changes

- Variables hold full `oklch()` colors instead of space separated RGB channels
  (`148 11 223`). Code that wrapped them in `rgb(var(--primary-500))` must use
  `var(--primary-500)` directly.
- Shades are computed in OKLCH, so the values differ from 1.x.
- A dark scale is generated. By default it applies under
  `prefers-color-scheme: dark`; pass `{ dark: false }` to keep light only.
- Input is no longer hex only: `rgb()`, `hsl()`, `oklch()` and CSS named
  colors are accepted too. Since 2.1, `hwb()`, `lab()`, `lch()`, `oklab()` and
  `color()` are accepted as well.
- The package is published as ESM and CommonJS, and ships a CLI.
- Node.js 22 or later is required.

## Before and after

Before, with Tailwind 3:

```js
// tailwind.config.js
const { generateConfig } = require('tailwindcss-custom-colors');

module.exports = {
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: generateConfig(['primary']),
    },
  },
};
```

```js
// at runtime
const { generateStyleVariables } = require('tailwindcss-custom-colors');

const variables = generateStyleVariables({ color: '#940BDF', name: 'primary' });
const style = document.createElement('style');
style.innerHTML = `@layer base { :root { ${variables} } }`;
document.head.appendChild(style);
```

After, with Tailwind 4. Generate the stylesheet once:

```bash
npx tailwindcss-custom-colors primary=#940BDF > src/theme.css
```

```css
/* src/app.css */
@import 'tailwindcss';
@import './theme.css';
```

Swap the colors at runtime:

```js
import { createTheme } from 'tailwindcss-custom-colors';

createTheme({ primary: '#940BDF' }).apply();
```

Utilities such as `bg-primary-500`, `text-primary-contrast` and
`bg-primary-500/50` keep their names. `bg-primary` and
`text-primary-complement` no longer exist.
