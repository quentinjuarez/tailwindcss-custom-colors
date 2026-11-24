import assert from 'node:assert/strict';

import { createTheme } from 'tailwindcss-custom-colors';

assert.equal(typeof createTheme, 'function');

const runtime = await import('tailwindcss-custom-colors/runtime');

for (const name of ['applyScheme', 'watchScheme', 'persist', 'themeScript']) {
  assert.equal(typeof runtime[name], 'function');
}
assert.equal(typeof runtime.themeScript('k'), 'string');
