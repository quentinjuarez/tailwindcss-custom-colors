# Dark mode

Pick a strategy with the `dark` option (`--dark` on the CLI):

| Option            | Dark variables go under                         |
| ----------------- | ----------------------------------------------- |
| `'media'` default | `@media (prefers-color-scheme: dark) { :root }` |
| `'class'`         | `.dark`                                         |
| `'light-dark'`    | one `light-dark(light, dark)` per variable      |
| `false`           | nowhere, light only                             |

```js
createTheme({ primary: '#940BDF' }, { dark: 'class' });
```

Because the dark values live in the same variables, `bg-primary-500` adapts on
its own. You do not need `dark:` variants for theme colors.

`'light-dark'` writes one declaration per variable, such as
`--primary-50: light-dark(oklch(...), oklch(...))`, with `color-scheme: light dark`
on `:root`, and two small rules, `.light` and `.dark`, that force a mode with a
class. A value that is the same in both modes, like `--primary-500` or the
contrast color, stays a plain value. It needs a recent browser (Chrome 123,
Firefox 120, Safari 17.5). Tailwind 4 builds for older browsers, so its CSS
compiler rewrites `light-dark()` into its own fallback, which follows the
operating system and the `.light` and `.dark` classes but not an inline
`color-scheme` style. The [runtime kit](#runtime-kit) sets both classes, so it
works with either.

Force a mode with `.light` or `.dark` on `<html>`. In a built Tailwind stylesheet,
a class on a nested element changes nothing, because the fallback resolves the
colors on `:root` and children inherit the result. The dev server, which keeps
the native function, does handle it. For a dark island inside a light page, use
`dark: 'class'`.

`apply(element, 'dark')` writes the dark values as inline styles on the
element. Inline variables beat the stylesheet, so a forced dark `apply` wins
over the media query and the `.dark` class. The same holds for
`apply(element, 'light')`: once `apply` has run on an element, the stylesheet
no longer switches its variables. `apply` does not toggle a class and does not
read `prefers-color-scheme`: for a light, dark or system switch that
remembers the choice, see the [runtime kit](#runtime-kit).

## Runtime colors with `auto`

`apply(element, 'auto')` writes one `light-dark(light, dark)` value per variable
(a plain value when both modes agree), so a color chosen at runtime follows the
`color-scheme` property with a single call:

```js
createTheme({ primary: userColor }).apply(document.documentElement, 'auto');
```

The values are set in the browser, so a CSS build cannot rewrite them: the
browser needs native `light-dark()` (Chrome 123, Firefox 120, Safari 17.5).
`color-scheme: light dark` must be set on the root, which the `light-dark`
strategy already does. Without it, `color-scheme` stays `normal` and every
`light-dark()` resolves to the light value. The inline values also beat the
variable blocks of `dark: 'media'` and `dark: 'class'`, so a bare `.dark` class
switches nothing: use the `light-dark` strategy, whose `.light` and `.dark` rules
set `color-scheme`, or the [runtime kit](#runtime-kit), which sets it inline. It works under a strict Content Security Policy, because
the variables are written through `style.setProperty` and not through a style
attribute or a style element. `vars('auto')` and `variables('auto')` return the
same values as text and as an object.

## Runtime kit

A small opt-in module for the browser: switch between light, dark and system,
remember the choice and avoid a flash on first paint. It has no dependency and
lives behind its own entry point, so it costs nothing unless you import it.

It toggles the `dark` and `light` classes and the `color-scheme` property on
`<html>`, so it needs `dark: 'class'` or `dark: 'light-dark'`. With `'media'` the
OS decides and a class cannot force a mode. The `light` class is new in 2.9, and
it is only used by `'light-dark'`: if your own code uses a `light` class on
`<html>`, or if you allow the inline script from `themeScript()` in a Content
Security Policy with a hash, recompute the hash and check that class. Tailwind 4 needs this line once to make `dark:` utilities follow the
class:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

```js
import {
  applyScheme,
  persist,
  watchScheme,
} from 'tailwindcss-custom-colors/runtime';

const store = persist();
applyScheme(store.get());

watchScheme(() => {
  if (store.get() === 'system') applyScheme('system');
});

button.onclick = () => {
  store.set('dark');
  applyScheme('dark');
};
```

To avoid a flash before your bundle loads, inline the script in `<head>`,
before the stylesheet. It runs the same logic as `applyScheme(persist(key).get())`
and never throws:

```js
import { themeScript } from 'tailwindcss-custom-colors/runtime';

const head = `<script>${themeScript()}</script>`;
```

Under a strict Content Security Policy (`script-src 'self'`), an inline script is
blocked. Write the output of `themeScript()` to a file served from your own
origin and load it with `<script src>`, or allow the script by its hash.

| Function                  | What it does                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `applyScheme(scheme, el)` | Applies `'light'`, `'dark'` or `'system'` to `el` (default `<html>`) and returns the resolved mode. `'system'` reads the OS.  |
| `watchScheme(onChange)`   | Calls `onChange('dark' \| 'light')` when the OS preference changes. Returns a function that stops listening.                  |
| `persist(key)`            | Returns `{ get, set }` backed by `localStorage` (default key `'theme'`). `get` falls back to `'system'` when storage fails.   |
| `themeScript(key)`        | Returns the inline script for `<head>`. The key may only contain letters, digits, `_`, `.`, `:` and `-`, up to 64 characters. |

Do not mix it with `theme.apply(el, 'light')` or `'dark'`: inline variables beat
the class. `theme.apply(el, 'auto')` is fine, since it follows `color-scheme`.
Without `matchMedia` (Node, old browsers), `'system'` means light and
`watchScheme` does nothing.
