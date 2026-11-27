# Derived colors

## Semantic colors

Three opt-in options derive more colors from the ones you pass. Each extra
scale goes through the same engine, so it has a dark mirror, a contrast color,
the `contrast` options and its own rows in `report()`.

```js
createTheme(
  { primary: '#0B6FDF' },
  { neutral: true, status: true, roles: true },
);
```

| Option          | Adds                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------- |
| `neutral: true` | A `neutral` scale tinted with the hue of your first color, with a chroma of at most 0.02 |
| `status: true`  | `success`, `warning`, `danger` and `info`, from fixed hues (145, 85, 27 and 250)         |
| `roles: true`   | Four variables for the common cases, and it adds `neutral` when you have none            |

The roles point at neutral steps, so the dark mirror switches them with no
extra value:

| Role       | Variable       | Value                | Utility           |
| ---------- | -------------- | -------------------- | ----------------- |
| Background | `--surface`    | `var(--neutral-50)`  | `bg-surface`      |
| Text       | `--on-surface` | `var(--neutral-950)` | `text-on-surface` |
| Dividers   | `--border`     | `var(--neutral-200)` | `border-border`   |
| Quiet text | `--muted`      | `var(--neutral-600)` | `text-muted`      |

```html
<div class="bg-surface text-on-surface border border-border">
  <p class="text-muted">Same markup in light and dark.</p>
</div>
```

With the derived neutral, `muted` over `surface` reaches 4.5:1 in light and
dark for any hue. That guarantee does not hold for a `neutral` you pass
yourself.

The derived scale is registered as `--color-neutral-*`, which replaces
Tailwind's built-in `neutral` palette for the whole app. The role names
`--border` and `--muted` are plain variables, so they can clash with a UI kit
that uses the same names.

A color you define yourself always wins. If you pass a color named `neutral`,
`success`, `warning`, `danger` or `info`, it is kept as is and the derived one is
skipped. The roles then use your `neutral`.

## Soft backgrounds

`soft: true` (`--soft` on the CLI) adds one `--<name>-soft` variable per color,
for quiet backgrounds behind text, such as a success banner or a selected row.

```js
createTheme({ primary: '#0B6FDF' }, { status: true, soft: true });
```

```html
<p class="bg-success-soft text-success-800">Saved.</p>
```

In light mode it is step 100. Dark mode does not mirror it: the mirrored step
100 is a loud, saturated block, so `soft` keeps the dark end of the scale
(lightness of step 950) with only a quarter of the chroma of your color, a
calm tinted background. In light mode, step 800 text passes WCAG AA on it for
every status color, and `theme.report()` lists the ratio of every step if you
want to pick another.

## Harmony

`harmony: true` derives two more colors from your first one, named `secondary`
and `tertiary`, so a single brand color gives a palette that reads as designed.

```js
createTheme({ primary: '#0B6FDF' }, { harmony: true });
```

Each color has its own role, and the three are staged in lightness, from deep
to mid to light, instead of three flat blocks of the same weight:

| Your color is                | `secondary` is | `tertiary` is |
| ---------------------------- | -------------- | ------------- |
| mid (lightness 0.45 to 0.72) | deep           | light         |
| dark (lightness under 0.45)  | mid            | light         |
| light (lightness over 0.72)  | deep           | mid           |

Lightness is the OKLCH `L`. The roles switch at the two limits, so two nearly
identical colors on each side of 0.45 or 0.72 get different palettes. Each role
also keeps a lightness gap of at least 0.1 from your color.

- When the secondary is deeper than your color, it follows your hue with a
  slight shift toward cold, like a navy next to a blue. Warm hues (roughly
  yellow to lime and orange) turn into brick or mud when deepened, and so do
  they when they are dark, so they get a cool color instead, like a navy next
  to a yellow. In the other cases the secondary stays within 20 degrees of your
  hue.
- The tertiary is the single accent: a hue away from the brand, chosen so that
  it stays apart from the other two and avoids the muddy yellow greens.
- Chroma stays moderate, so a very saturated brand does not give saturated
  supporting colors, and a dull brand still gets real colors.
- A colorless brand (black, white, gray) has no hue to follow: the seed draws
  one from a short list of pleasant hues.

The result is deterministic. The same color and seed always give the same
palette, and the default seed is `0`, so it only depends on your color. Pass
another `seed`, a number or any text, to try a different palette. An integer
and its text give the same palette (`3` and `'3'`):

```js
createTheme({ primary: '#0B6FDF' }, { harmony: true, seed: 3 });
```

```bash
npx tailwindcss-custom-colors primary=#0B6FDF --harmony --seed 3
```

Write a negative seed as `--seed=-2`. The CLI needs `--harmony` with `--seed`,
while the API ignores a `seed` when `harmony` is off.

The palette derives from the first color only. A color you name `secondary` or
`tertiary` always wins and is kept as is. The other one is still derived, and a
derived `tertiary` stays apart from a `secondary` you define. The
derived scales get a dark mirror, `contrast` and `report()` rows like any other
color, and they sit before `neutral` and the status colors.

The palette for a given color and seed may be retuned in a later minor release.
To pin one, pass your own `secondary` and `tertiary` colors.
