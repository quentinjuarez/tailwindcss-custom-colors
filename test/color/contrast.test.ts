import { pickContrast, wcagRatio } from '../../src/color/contrast.js';

describe('wcagRatio', () => {
  it('is 21 between black and white', () => {
    expect(wcagRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
  });

  it('is symmetric', () => {
    expect(wcagRatio('#ffffff', '#940bdf')).toBe(
      wcagRatio('#940bdf', '#ffffff'),
    );
  });

  it('is 1 for the same color', () => {
    expect(wcagRatio('#808080', '#808080')).toBe(1);
  });
});

describe('pickContrast', () => {
  it('picks white on a dark purple', () => {
    expect(pickContrast('#940bdf')).toEqual({
      contrast: '#ffffff',
      ratio: 6.23,
    });
  });

  it('picks black on a bright yellow', () => {
    expect(pickContrast('#ffd534').contrast).toBe('#000000');
  });

  it('rounds the ratio to 2 decimals', () => {
    const { ratio } = pickContrast('#3b82f6');
    expect(Math.round(ratio * 100) / 100).toBe(ratio);
  });
});
