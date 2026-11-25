import assert from 'node:assert/strict';

import { createTheme } from 'tailwindcss-custom-colors';

assert.equal(typeof createTheme, 'function');

const runtime = await import('tailwindcss-custom-colors/runtime');

for (const name of ['applyScheme', 'watchScheme', 'persist', 'themeScript']) {
  assert.equal(typeof runtime[name], 'function');
}
assert.equal(typeof runtime.themeScript('k'), 'string');

const vite = await import('tailwindcss-custom-colors/vite');
assert.equal(typeof vite.customColors, 'function');
assert.equal(
  vite.customColors({ colors: { a: 'red' } }).name,
  'tailwindcss-custom-colors',
);
