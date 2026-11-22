const assert = require('node:assert/strict');

const pkg = require('tailwindcss-custom-colors');

assert.equal(typeof pkg.createTheme, 'function');
