## Installation

```bash
# Via npm
npm i tailwindcss-custom-colors@latest

# Via yarn
yarn add tailwindcss-custom-colors@latest
```

[![npm version](https://badge.fury.io/js/tailwindcss-custom-colors.svg)](https://badge.fury.io/js/tailwindcss-custom-colors)

<!-- ![NPM](https://img.shields.io/npm/l/tailwindcss-custom-colors)
![GitHub Repo stars](https://img.shields.io/github/stars/ibodev1/tailwindcss-custom-colors?style=social)
![node-current](https://img.shields.io/node/v/tailwindcss-custom-colors)
![GitHub last commit](https://img.shields.io/github/last-commit/ibodev1/tailwindcss-custom-colors)
![npm](https://img.shields.io/npm/dw/tailwindcss-custom-colors)
![GitHub top language](https://img.shields.io/github/languages/top/ibodev1/tailwindcss-custom-colors) -->

## Usage

### Import

```js
import { generateConfig } from "tailwindcss-custom-colors";
```

```js
import { generateStyleVariables } from "tailwindcss-custom-colors";
```

### generateConfig()

```js
const extendedColors = generateConfig(colorNames, options);
```

#### The generateConfig function takes the following parameters:

- `colorNames`: An array of color names or a single color name.
- `options` (optional): An object of options that allows you to customize the generated colors. The available option is `suffixMultiplier` (default: `100`), which determines the suffix used to generate variables names (e.g `[1, 10, 100]`).

The function returns a config object for Tailwind CSS with the specified color names and their respective tints.

### generateStyleVariables()

```js
const variables = generateStyleVariables(colorParams, options);
```

#### The generateConfig function takes the following parameters:

- `colorParams`: An array of color params or a single color params including a color (hex) and a name.
- `options` (optional): An object of options that allows you to customize the generated colors. The available option is `suffixMultiplier` (default: `100`), which determines the suffix used to generate variables names (e.g `[1, 10, 100]`).
  of css variables with the specified color names and their respective tints.

## Example

Extend your tailwind config

```js
/** @type {import('tailwindcss').Config} */
import { generateConfig } from "tailwindcss-custom-colors";

const extendedColors = generateConfig(["primary", "secondary"]);

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: extendedColors,
    },
  },
  plugins: [],
};
```

#### Output for `extendedColors`:

```json
{
  "primary": {
    "DEFAULT": "rgb(var(--primary) / <alpha-value>)",
    "100": "rgb(var(--primary-100) / <alpha-value>)",
    "200": "rgb(var(--primary-200) / <alpha-value>)",
    "300": "rgb(var(--primary-300) / <alpha-value>)",
    "400": "rgb(var(--primary-400) / <alpha-value>)",
    "500": "rgb(var(--primary-500) / <alpha-value>)",
    "600": "rgb(var(--primary-600) / <alpha-value>)",
    "700": "rgb(var(--primary-700) / <alpha-value>)",
    "800": "rgb(var(--primary-800) / <alpha-value>)",
    "900": "rgb(var(--primary-900) / <alpha-value>)"
  },
  "secondary": {
    "DEFAULT": "rgb(var(--secondary) / <alpha-value>)",
    "100": "rgb(var(--secondary-100) / <alpha-value>)",
    "200": "rgb(var(--secondary-200) / <alpha-value>)",
    "300": "rgb(var(--secondary-300) / <alpha-value>)",
    "400": "rgb(var(--secondary-400) / <alpha-value>)",
    "500": "rgb(var(--secondary-500) / <alpha-value>)",
    "600": "rgb(var(--secondary-600) / <alpha-value>)",
    "700": "rgb(var(--secondary-700) / <alpha-value>)",
    "800": "rgb(var(--secondary-800) / <alpha-value>)",
    "900": "rgb(var(--secondary-900) / <alpha-value>)"
  }
}
```

### Variables

Generate css variables

```js
import { generateStyleVariables } from "tailwindcss-custom-colors";

const variables = generateStyleVariables(
  {
    color: "#940BDF",
    name: "primary",
  },
  {
    color: "#FFD534",
    name: "secondary",
  }
);
```

#### Output for `variables`:

```css
--primary: 148 11 223;
--primary-100: 223 171 251;
--primary-200: 315 413 262;
--primary-300: 413 671 275;
--primary-400: 482 852 283;
--primary-500: 148 11 223;
--primary-600: 400 635 273;
--primary-700: 268 288 257;
--primary-800: 139 10 208;
--primary-900: 28 2 42;
--secondary: 255 213 52;
--secondary-100: 255 263 296;
--secondary-200: 255 329 626;
--secondary-300: 255 400 979;
--secondary-400: 255 449 1226;
--secondary-500: 255 213 52;
--secondary-600: 255 390 929;
--secondary-700: 255 295 456;
--secondary-800: 255 210 29;
--secondary-900: 57 45 0;
```

### Import variables

#### by creating a style tag

```js
const style = document.create("style");
style.innerHTML = `
    @layer base {
      :root {
        ${variables}
      }
    }`;
document.head.appendChild(style);
```

#### by creating a v-bind style attribute (VueJS)

```vue
<template>
  <div :style="variables"></div>
</template>
```
