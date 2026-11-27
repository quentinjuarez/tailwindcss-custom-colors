# CLI

No script needed if the colors are known at build time:

```bash
npx tailwindcss-custom-colors primary=#940BDF > theme.css
npx tailwindcss-custom-colors primary=#940BDF accent=#FFD534 --dark class > theme.css
```

Then import it:

```css
@import 'tailwindcss';
@import './theme.css';
```

| Flag                | What it does                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `--dark media`      | Dark variables under `prefers-color-scheme: dark` (default)                                                  |
| `--dark class`      | Dark variables under a `.dark` selector                                                                      |
| `--dark light-dark` | One `light-dark()` per variable, see [Dark mode](dark-mode.md#dark-mode)                                     |
| `--dark none`       | No dark variables                                                                                            |
| `--gamut p3`        | Keep Display P3 colors, `srgb` is the default                                                                |
| `--contrast apca`   | Pick on-colors with APCA instead of WCAG, see [Contrast](contrast.md#contrast)                               |
| `--target AAA`      | Pass threshold used by `--report`: `AA` (default), `AAA` or a number                                         |
| `--on`              | Also emit one on-color variable per step                                                                     |
| `--neutral`         | Add a tinted `neutral` scale, see [Semantic colors](derived-colors.md#semantic-colors)                       |
| `--status`          | Add `success`, `warning`, `danger` and `info` scales                                                         |
| `--harmony`         | Derive `secondary` and `tertiary` colors, see [Harmony](derived-colors.md#harmony)                           |
| `--seed 3`          | With `--harmony`, pick another palette: a number or any text                                                 |
| `--roles`           | Add the `surface`, `on-surface`, `border` and `muted` variables                                              |
| `--soft`            | Add a quiet `--<name>-soft` background per color, see [Soft backgrounds](derived-colors.md#soft-backgrounds) |
| `--format json`     | Print `css` (default), `json`, `scss`, `tokens` or `html`, see [Formats and CI](#formats-and-ci)             |
| `--out theme.css`   | Write the output to a file instead of stdout                                                                 |
| `--config x.json`   | Read the settings from a JSON file, see [Config file](#config-file)                                          |
| `--watch`           | With a config file and `out`, write again on every config change                                             |
| `--check`           | With `--out`, exit 1 when the file is out of date                                                            |
| `--report`          | Print a contrast report table instead of CSS                                                                 |
| `--help`            | Show the usage                                                                                               |

On invalid input the CLI prints a one line error to stderr and exits with
code 1.

## Formats and CI

`--format` picks what the CLI prints. `css` is the default.

| Format   | Output                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------- |
| `css`    | The stylesheet from [Generated output](api.md#generated-output)                                         |
| `json`   | `{ "light": { "--primary-50": "oklch(...)" }, "dark": { ... } }`                                        |
| `scss`   | Two maps, `$theme-light` and `$theme-dark`, with keys such as `"primary-50"`                            |
| `html`   | One self-contained preview page, see below                                                              |
| `tokens` | Design tokens: `{ "primary": { "50": { "$type": "color", "$value": { "colorSpace": "srgb", ... } } } }` |

`dark` is left out of `json`, `scss`, `tokens` and `html` with `--dark none`. The
`tokens` format follows the stable Design Tokens format (2025.10): each step and
the contrast color is an sRGB color object with `components` and `hex`, and the
dark hex sits under `$extensions["tailwindcss-custom-colors"].dark`. It carries
neither wide gamut precision nor the roles, soft backgrounds and on-colors: use `json` for those.

`--format html` writes a preview page you can open in a browser, with no server
and no network: every scale in light and dark with its hex and the text color
that goes on it, the three first colors side by side, a small interface card in
light and dark, and the generated CSS. Add `--watch` with a config file to write
it again at every change, and reload the page.

```bash
npx tailwindcss-custom-colors primary=#0B6FDF --harmony --format html --out preview.html
```

`--out` writes the file, creates missing folders and prints nothing:

```bash
npx tailwindcss-custom-colors primary=#940BDF --out src/theme.css
```

`--check` compares the output with the file and never writes. It exits with 0
when they match and with 1 otherwise, so a CI step can catch a stale file:

```bash
npx tailwindcss-custom-colors primary=#940BDF --out src/theme.css --check
```

The comparison is exact, line endings included. `--report` cannot be combined
with `--format`, and a blank `--out` path is rejected.

If a formatter runs on your committed files, add the generated file to its ignore
list. A formatter that rewrites it makes `--check` fail.

## Config file

Instead of repeating the arguments, put them in a JSON file named
`tailwindcss-custom-colors.config.json` next to your `package.json`:

```json
{
  "colors": { "primary": "#0B6FDF", "accent": "#FFD534" },
  "dark": "class",
  "roles": true,
  "harmony": true,
  "out": "src/theme.css"
}
```

With no arguments, the CLI reads that file from the current directory and
writes `src/theme.css`:

```bash
npx tailwindcss-custom-colors
npx tailwindcss-custom-colors --check
```

The second command is the one for CI: it fails when the file is out of date.
Use `--config path/to/file.json` for another file name or place.

| Key        | Same as                                                                              |
| ---------- | ------------------------------------------------------------------------------------ |
| `colors`   | the `name=color` arguments, as an object                                             |
| `dark`     | `--dark`, or `ThemeOptions['dark']`: `"media"`, `"class"`, `"light-dark"` or `false` |
| `gamut`    | `--gamut`                                                                            |
| `contrast` | `--contrast`, `--target` and `--on`, as the `contrast` option object                 |
| `neutral`  | `--neutral`: `true` (`"auto"` also works)                                            |
| `status`   | `--status`                                                                           |
| `roles`    | `--roles`                                                                            |
| `soft`     | `--soft`                                                                             |
| `harmony`  | `--harmony`                                                                          |
| `seed`     | `--seed`: a number or a string                                                       |
| `format`   | `--format`: `"css"`, `"json"`, `"scss"`, `"tokens"` or `"html"`                      |
| `out`      | `--out`                                                                              |

Every key is optional, and any other key is an error. The types of the values are
checked when the file is read, so a flag cannot hide a mistake. The settings are merged
in this order: the defaults, then the config file, then the flags you pass. A
flag replaces the matching config value. `--on`, `--neutral`, `--status`,
`--roles`, `--soft` and `--harmony` can only turn a setting on. Colors passed as
`name=color` arguments replace `colors` from the config file entirely, and the
config file is then not read unless you also pass `--config`.

`out` is relative to the folder of the config file and must stay inside it: no
absolute path and no `..` leaving the folder, because a config file that comes
with a cloned project is not code you wrote. A symbolic link cannot lead out of
the folder either, and a link to nothing is refused, `out` cannot end with a slash, and it cannot be the config
file itself. `--out` on the command line is yours to type and can point
anywhere. `--report` prints the table and ignores the `out` of the config file.

### Watch

```bash
npx tailwindcss-custom-colors --watch
```

writes the file once, then writes it again every time the config file changes.
It needs a config file and an `out`, and it cannot be combined with `--check`
or `--report`. When you save an invalid config, the error is printed and the
last good file is left untouched. Fix the config and the next save writes
again. Stop it with Ctrl+C.
