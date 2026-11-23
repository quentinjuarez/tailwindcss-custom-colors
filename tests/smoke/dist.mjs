import assert from 'node:assert/strict';

import { createTheme } from 'tailwindcss-custom-colors';

assert.equal(typeof createTheme, 'function');
