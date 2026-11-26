# API reference

## API

### `createTheme(colors, options?)`

```ts
function createTheme(
  colors: Record<string, string>,
  options?: ThemeOptions,
): Theme;
```

`colors` maps a name to a color in any [accepted format](colors.md#accepted-input). It
needs at least one entry. Throws an `Error` with a one line message when
`colors` is not an object or is empty, and on an invalid name, an invalid color
or an invalid `dark` or `gamut` option.

### `ThemeOptions`

```ts
type ThemeOptions = {
  dark?: 'media' | 'class' | 'light-dark' | false;
  gamut?: 'srgb' | 'p3';
  contrast?: {
    method?: 'wcag' | 'apca';
    target?: 'AA' | 'AAA' | number;
    on?: boolean;
  };
  neutral?: boolean | 'auto';
  status?: boolean;
  roles?: boolean;
  harmony?: boolean;
  seed?: number | string;
};
```

`dark` defaults to `'media'` and `gamut` to `'srgb'`; `neutral`, `status`,
`roles` and `harmony` are off, and `seed` is `0`. Any other value throws. See [Dark mode](dark-mode.md#dark-mode),
[Gamut](colors.md#gamut), [Semantic colors](derived-colors.md#semantic-colors) and
[Contrast](contrast.md#apca-targets-and-on-colors).

### `Theme`

```ts
type Theme = {
  css: string;
  vars(mode?: ThemeMode): string;
  variables(mode?: ThemeMode): Record<string, string>;
  apply(element?: StyleTarget, mode?: ThemeMode): void;
  scales: Record<string, { light: Scale; dark: Scale }>;
  report(): ReportRow[];
};
```

| Member                 | What it is                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `css`                  | The full stylesheet shown in [Generated output](#generated-output).                                                                                                              |
| `vars(mode)`           | The variable declarations only, one per line, for `mode` (default `'light'`). No selector around them.                                                                           |
| `variables(mode)`      | The same variables as `vars`, as an object of `'--name': value`, in the same order.                                                                                              |
| `apply(element, mode)` | Sets the variables of `mode` (default `'light'`) as inline styles on `element`, by default `document.documentElement`. Throws when there is no element and no global `document`. |
| `report()`             | A contrast row per color, mode and step, see [Contrast](contrast.md#apca-targets-and-on-colors).                                                                                 |
| `scales`               | The computed values, per color name and mode.                                                                                                                                    |

The mode `'auto'` merges both modes into `light-dark(light, dark)`, see
[Runtime colors with `auto`](dark-mode.md#runtime-colors-with-auto). `vars`,
`variables` and `apply` throw on any other mode.
`apply()` only sets variables: it does not remove the ones an earlier call set
for other color names.

`StyleTarget` is anything with `style.setProperty(name, value)`, so any DOM
element works.

### `Scale`

```ts
type Step =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | '950';

type Scale = {
  steps: Record<Step, { oklch: string; hex: string }>;
  contrast: '#000000' | '#ffffff';
  ratio: number;
  apca: number;
  on: Record<Step, '#000000' | '#ffffff'>;
};

type ReportRow = {
  color: string;
  mode: 'light' | 'dark';
  step: Step;
  on: '#000000' | '#ffffff';
  ratio: number;
  apca: number;
  pass: boolean;
};
```

```js
theme.scales.primary.light.steps['500']; // { oklch: 'oklch(0.5277 0.2669 306.79)', hex: '#940bdf' }
theme.scales.primary.dark.steps['50'].hex; // the darkest shade in dark mode
```

The types `Theme`, `ThemeOptions`, `ContrastOptions`, `ContrastMethod`,
`ReportRow`, `Scale`, `Step`, `Mode`, `ThemeMode` (`'light' | 'dark' | 'auto'`)
and `StyleTarget` are exported.

## Generated output

`npx tailwindcss-custom-colors primary=#940BDF` prints this (trimmed, the
omitted steps follow the same pattern):

<!-- prettier-ignore -->
```css
:root {
  --primary-50: oklch(0.9750 0.0150 306.79);
  --primary-100: oklch(0.9213 0.0480 306.79);
  /* 200 to 400 */
  --primary-500: oklch(0.5277 0.2669 306.79);
  /* 600 to 900 */
  --primary-950: oklch(0.2500 0.1201 306.79);
  --primary-contrast: #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-50: oklch(0.2500 0.1201 306.79);
    /* 100 to 400 */
    --primary-500: oklch(0.5277 0.2669 306.79);
    /* 600 to 900 */
    --primary-950: oklch(0.9750 0.0150 306.79);
    --primary-contrast: #ffffff;
  }
}

@theme inline {
  --color-primary-50: var(--primary-50);
  /* 100 to 900 */
  --color-primary-950: var(--primary-950);
  --color-primary-contrast: var(--primary-contrast);
}
```

Three blocks:

- `:root` holds the light values. Steps are `50`, `100` to `900`, and `950`.
- The dark block mirrors the light scale: dark step `s` takes the value of
  light step `1000 - s`, so `50` becomes the darkest shade and `500` does not
  change.
- `@theme inline` registers the Tailwind tokens. They point at the variables
  instead of holding values, which is what makes the runtime swap work. The
  opacity modifier (`bg-primary-500/50`) works through Tailwind's
  `color-mix()`.

Variables hold `oklch()` values with no fallback. If you target a browser
without OKLCH support, use the `hex` values from `theme.scales`.

## Server rendering

`css` and `vars()` are plain strings, and `createTheme` touches neither the DOM
nor the file system. `vars()` returns the declarations only, with no selector,
so you wrap them yourself. On the server, build the theme for the current tenant
or user and inline both modes in the page, so the first paint already has the
right colors:

```js
const theme = createTheme({ primary: tenant.color });
const style = `<style>:root{${theme.vars()}}@media (prefers-color-scheme: dark){:root{${theme.vars('dark')}}}</style>`;
```

Put this `<style>` after the link to `theme.css`, so it wins the cascade.

Only `apply()` needs a DOM.

## Planned removals in 3.0

Nothing is removed in 2.x and nothing warns at run time. These are planned to
go in a 3.0, so prefer the alternative today:

- `vars()`: use `variables()`, an object that is easy to turn into text.
- `persist()` and `watchScheme()` of the [runtime kit](dark-mode.md#runtime-kit):
  use `localStorage` and `matchMedia('(prefers-color-scheme: dark)')` directly.
  `applyScheme()` and `themeScript()` stay.
