## Installation

```bash
# With npm
npm i tailwindcss-custom-colors@latest

# With yarn
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

### Options

The `Options` interface allows you to customize the behavior of the package. Below are the available options and their default values.

#### Available Options

- `suffixMultiplier` (optional): Determines the multiplier for suffixes. Possible values are `100`, `10`, or `1`. Default is `100`.
- `variablePrefix` (optional): Specifies a prefix for variable names. Default is `undefined`.
- `contrast` (optional): If set to `true`, calculates the contrast. Default is `true`.
- `complement` (optional): If set to `true`, calculates the complementary color. Default is `true`.
- `classification` (optional): An object containing color classifications for light and dark themes. Default is `{ light: "#FFFFFF", dark: "#000000" }`.
  - `light`: Hex color for light theme. Default is `"#FFFFFF"`.
  - `dark`: Hex color for dark theme. Default is `"#000000"`.
- `steps` (optional): Determines the step values for shades. Possible values are `100` or `50`. Default is `100`.
- `default` (optional): If set to `true`, uses the default configuration. Default is `true`.

#### Default Options

The `defaultOptions` object represents the default configuration for the package:

```typescript
const defaultOptions: DefaultOptions = {
  suffixMultiplier: 100,
  variablePrefix: undefined,
  contrast: true,
  complement: true,
  classification: {
    light: "#FFFFFF",
    dark: "#000000",
  },
  steps: 100,
  default: true,
};
```

### generateConfig()

```js
const extendedColors = generateConfig(colorNames, options);
```

#### The generateConfig function takes the following parameters:

- `colorNames`: An array of color names or a single color name.
- `options` (optional): An object of options that allows you to customize the generated colors. The available options are `suffixMultiplier` (default: `100`), which determines the suffix used to generate variables names (e.g `[1, 10, 100]`) and `variablePrefix` (default: `undefined`), which determines the prefix for the css variable name, none by default.

The function returns a config object for Tailwind CSS with the specified color names and their respective tints.

### generateStyleVariables()

```js
const variables = generateStyleVariables(colorParams, options);
```

#### The generateStyleVariables function takes the following parameters:

- `colorParams`: An array of color params or a single color params including a color (hex) and a name.
- `options` (optional): An object of options that allows you to customize the generated colors. The available options are `suffixMultiplier` (default: `100`), which determines the suffix used to generate variables names (e.g `[1, 10, 100]`) and `variablePrefix` (default: `undefined`), which determines the prefix for the css variable name, none by default.

## Example

Extend your tailwind config

_tailwind.config.js_

```js
/** @type {import('tailwindcss').Config} */
import { generateConfig } from "tailwindcss-custom-colors";

const extendedColors = generateConfig(["primary", "secondary"]);

module.exports = {
  content: ["./src/**/*.{index,vue,js,ts,jsx,tsx}"],
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
    "100": "rgb(var(--primary-100) / <alpha-value>)",
    "200": "rgb(var(--primary-200) / <alpha-value>)",
    "300": "rgb(var(--primary-300) / <alpha-value>)",
    "400": "rgb(var(--primary-400) / <alpha-value>)",
    "500": "rgb(var(--primary-500) / <alpha-value>)",
    "600": "rgb(var(--primary-600) / <alpha-value>)",
    "700": "rgb(var(--primary-700) / <alpha-value>)",
    "800": "rgb(var(--primary-800) / <alpha-value>)",
    "900": "rgb(var(--primary-900) / <alpha-value>)",
    "DEFAULT": "rgb(var(--primary) / <alpha-value>)",
    "contrast": "rgb(var(--primary-contrast) / <alpha-value>)",
    "complement": "rgb(var(--primary-complement) / <alpha-value>)"
  },
  "secondary": {
    "100": "rgb(var(--secondary-100) / <alpha-value>)",
    "200": "rgb(var(--secondary-200) / <alpha-value>)",
    "300": "rgb(var(--secondary-300) / <alpha-value>)",
    "400": "rgb(var(--secondary-400) / <alpha-value>)",
    "500": "rgb(var(--secondary-500) / <alpha-value>)",
    "600": "rgb(var(--secondary-600) / <alpha-value>)",
    "700": "rgb(var(--secondary-700) / <alpha-value>)",
    "800": "rgb(var(--secondary-800) / <alpha-value>)",
    "900": "rgb(var(--secondary-900) / <alpha-value>)",
    "DEFAULT": "rgb(var(--secondary) / <alpha-value>)",
    "contrast": "rgb(var(--secondary-contrast) / <alpha-value>)",
    "complement": "rgb(var(--secondary-complement) / <alpha-value>)"
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
  },
);
```

#### Output for `variables`:

```css
--primary: 148 11 223;
--primary-contrast: 255 255 255;
--primary-complement: 0 0 0;
--primary-100: 223 172 251;
--primary-200: 207 128 249;
--primary-300: 188 80 247;
--primary-400: 172 36 245;
--primary-500: 148 11 223;
--primary-600: 120 8 180;
--primary-700: 91 6 136;
--primary-800: 58 4 88;
--primary-900: 29 2 44;
--secondary: 255 213 52;
--secondary-contrast: 0 0 0;
--secondary-complement: 255 255 255;
--secondary-100: 255 263 296;
--secondary-200: 255 251 235;
--secondary-300: 255 239 173;
--secondary-400: 255 226 112;
--secondary-500: 255 213 52;
--secondary-600: 245 196 0;
--secondary-700: 184 147 0;
--secondary-800: 122 98 0;
--secondary-900: 61 49 0;
```

### Import variables

```js
const style = document.createElement("style");
style.innerHTML = `
    @layer base {
      :root {
        ${variables}
      }
    }`;
document.head.appendChild(style);
```
