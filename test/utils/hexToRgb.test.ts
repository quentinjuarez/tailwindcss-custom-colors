import hexToRgb from '../../src/utils/hexToRgb';

describe('hexToRgb validation', () => {
  it('should throw an error if hex color is malformed', () => {
    const hex = 'rgb(255, 255, 255)';
    expect(() => hexToRgb(hex)).toThrow(
      `Invalid hexadecimal color code: ${hex}`,
    );
  });
});

describe('hexToRgb parsing', () => {
  it('accepts a hex with or without a leading #', () => {
    expect(hexToRgb('#940BDF')).toEqual([148, 11, 223]);
    expect(hexToRgb('940BDF')).toEqual([148, 11, 223]);
  });

  it('rejects a # that is not at the start', () => {
    expect(() => hexToRgb('ab#cdef')).toThrow(/Invalid hexadecimal color code/);
    expect(() => hexToRgb('##940BDF')).toThrow(
      /Invalid hexadecimal color code/,
    );
  });
});
