# Contrast

Each scale has a `contrast` color, black or white, whichever has the higher
WCAG contrast ratio against step `500`, and that `ratio`:

```js
const { light } = createTheme({ primary: '#940BDF' }).scales.primary;

light.contrast; // '#ffffff'
light.ratio; // 6.23
```

`text-primary-contrast` on `bg-primary-500` uses it.

The caveat: a mid-tone `500` cannot reach 4.5:1 against both black and white,
so only one of them is readable on it, and for some colors the better one is
close to the 4.5:1 line. The library does not promise WCAG AA for you. It
exposes the measured ratio so you can check it, in a test or at runtime. The
ratio is measured against step `500` only, not the other steps.

With `gamut: 'p3'`, `contrast` and `ratio` are computed on the sRGB `hex`
fallback, so on a wide gamut display the real ratio can differ by a few tenths.

## APCA, targets and on-colors

Every scale also has `apca`, the absolute APCA lightness contrast (Lc) of its
`contrast` color over step `500`, and `on`, the black or white pick for each of
the 11 steps. The `contrast` option tunes how they are picked and judged:

```js
const theme = createTheme(
  { primary: '#940BDF' },
  { contrast: { method: 'apca', target: 'AAA', on: true } },
);
```

| Key      | Values                               | Default  | Effect                                                                 |
| -------- | ------------------------------------ | -------- | ---------------------------------------------------------------------- |
| `method` | `'wcag'`, `'apca'`                   | `'wcag'` | Which measure picks black or white (`contrast` and `on`).              |
| `target` | `'AA'`, `'AAA'` or a positive number | `'AA'`   | Threshold used by `report()`: 4.5 or Lc 60 for AA, 7 or Lc 75 for AAA. |
| `on`     | `true`, `false`                      | `false`  | Emit `--<name>-<step>-on` variables, with `--color-<name>-<step>-on`.  |

`on: true` lets you write `text-primary-600-on` on `bg-primary-600`. With the
default options the CSS is exactly what 2.1 produced. `method: 'apca'` can change
the `--<name>-contrast` pick, and a numeric `target` is used as is, so keep it
in the range of the method (WCAG ratios go up to 21, APCA Lc up to about 108).

`theme.report()` returns one row per color, mode and step, so you can check a
palette in a test or print it:

```js
theme.report()[5];
// { color: 'primary', mode: 'light', step: '500', on: '#ffffff',
//   ratio: 6.23, apca: 84.1, pass: true }
```

`pass` compares the value of the active method (`ratio` for WCAG, `apca` for
APCA) with the target. All measures use the sRGB `hex` of each step. The CLI
prints the same rows with `--report`.
