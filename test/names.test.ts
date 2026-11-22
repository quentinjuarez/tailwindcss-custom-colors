import { assertColorName, assertConfigKey } from '../src/names.js';

describe('assertColorName', () => {
  it.each(['primary', 'brand-café', 'my_color-2', '日本'])(
    'accepts %j',
    (name) => {
      expect(() => assertColorName(name)).not.toThrow();
    },
  );

  it.each([
    'a: 0; } body { display:none',
    'a b',
    'a.b',
    'a/b',
    'brand/dark',
    'a;b',
    'a{b}',
    'a(b)',
    'a"b',
    '',
  ])('rejects an invalid name: %j', (name) => {
    expect(() => assertColorName(name)).toThrow(/Invalid color name/);
  });
});

describe('assertConfigKey', () => {
  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects the reserved name %s',
    (name) => {
      expect(() => assertConfigKey(name)).toThrow(/Reserved color name/);
    },
  );

  it('rejects an invalid name first', () => {
    expect(() => assertConfigKey('a b')).toThrow(/Invalid color name/);
  });
});
