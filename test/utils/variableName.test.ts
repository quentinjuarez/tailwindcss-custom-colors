import variableName from '../../src/utils/variableName';

describe('variableName', () => {
  it('builds names from valid parts', () => {
    expect(variableName('primary')).toBe('--primary');
    expect(variableName('primary', 'app')).toBe('--app-primary');
    expect(variableName('primary', 'app', '500')).toBe('--app-primary-500');
    expect(variableName('primary', undefined, 'contrast')).toBe(
      '--primary-contrast',
    );
    expect(variableName('brand-café', 'app')).toBe('--app-brand-café');
    expect(variableName('my_color-2', 'My_App-1', '0.5')).toBe(
      '--My_App-1-my_color-2-0.5',
    );
  });

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
    expect(() => variableName(name)).toThrow(/Invalid color name/);
  });

  it('rejects an invalid prefix', () => {
    expect(() => variableName('primary', 'x; y')).toThrow(
      /Invalid variable prefix/,
    );
  });

  it('rejects an invalid tint', () => {
    expect(() => variableName('primary', 'app', '5; x')).toThrow(
      /Invalid tint/,
    );
  });
});
