const assert = require('node:assert/strict');

const pkg = require('tailwindcss-custom-colors');

assert.equal(typeof pkg.createTheme, 'function');

const runtime = require('tailwindcss-custom-colors/runtime');

for (const name of ['applyScheme', 'watchScheme', 'persist', 'themeScript']) {
  assert.equal(typeof runtime[name], 'function');
}
assert.equal(typeof runtime.themeScript('k'), 'string');

const vite = require('tailwindcss-custom-colors/vite');
assert.equal(typeof vite.customColors, 'function');
assert.equal(
  vite.customColors({ colors: { a: 'red' } }).name,
  'tailwindcss-custom-colors',
);
