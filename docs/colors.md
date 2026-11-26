# Colors

## Accepted input

| Format       | Examples                                                        |
| ------------ | --------------------------------------------------------------- |
| Hex          | `#940BDF`, `940bdf`, `#94d`, `#94df`, `#940BDF80`               |
| Named colors | `rebeccapurple`, `teal`                                         |
| `rgb()`      | `rgb(148 11 223)`, `rgba(148, 11, 223, 0.5)`, `rgb(58% 4% 87%)` |
| `hsl()`      | `hsl(279 91% 46%)`, `hsla(279deg, 91%, 46%, 1)`                 |
| `hwb()`      | `hwb(279 4% 13%)`                                               |
| `lab()`      | `lab(40% 70 -80)` (D50)                                         |
| `lch()`      | `lch(40% 100 300)` (D50)                                        |
| `oklab()`    | `oklab(0.53 0.1 -0.2)`                                          |
| `oklch()`    | `oklch(0.53 0.27 306.8)`, `oklch(53% 0.27 307)`                 |
| `color()`    | `color(display-p3 0 1 0)`, `color(xyz-d65 0.3 0.2 0.4)`         |

- `color()` channels accept percentages (`color(srgb 50% 0% 100%)`). Spaces: `srgb`, `srgb-linear`, `display-p3`, `a98-rgb`,
  `prophoto-rgb`, `rec2020`, `xyz`, `xyz-d50` and `xyz-d65`.
- Modern (space separated) and legacy (comma separated) syntaxes both work
  for `rgb()` and `hsl()`.
- Hue accepts `deg`, `grad`, `rad` and `turn`, or no unit. Negative hues and
  hues above 360 wrap around.
- `none` stands for 0 wherever a number is accepted.
- Hex works with 3, 4, 6 or 8 digits, with or without `#`.
- Alpha is parsed and ignored: a theme color is opaque. Use the opacity
  modifier (`/50`) instead.
- Every color is clamped into the chosen [gamut](#gamut), sRGB by default. The
  `hex` values are always clamped to sRGB.
- Color names follow `/^[\p{L}\p{N}_-]+$/u` (letters, digits, `_` and `-`, any
  script). `__proto__`, `constructor` and `prototype` are rejected.

Invalid input throws an `Error` with a one line message that names the color
and gives the reason in parentheses:

```text
Invalid color: nope (unknown color name)
Invalid color: color(foo 1 2 3) (unknown color space: foo)
```

## Gamut

By default every color is clamped into sRGB. With `gamut: 'p3'`, colors from
the wider Display P3 gamut keep their saturation, and the generated steps can
also use P3 chroma, even for sRGB inputs:

```js
createTheme({ vivid: 'color(display-p3 0 1 0)' }, { gamut: 'p3' });
```

```bash
npx tailwindcss-custom-colors vivid='color(display-p3 0 1 0)' --gamut p3
```

With `gamut: 'p3'` the `oklch` CSS values may lie outside sRGB, and browsers
render them on a wide gamut display. The `hex` values stay sRGB: they are the
clamped fallback. The `contrast` color and `ratio` are computed on that
fallback, see [Contrast](contrast.md#contrast). The default `'srgb'` output is unchanged
from 2.0.
