import {
  apcaContrast,
  pickContrast,
  pickOn,
  wcagRatio,
} from '../../src/color/contrast.js';

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

describe('apcaContrast', () => {
  it('is about 106 for black text on white', () => {
    expect(apcaContrast('#000000', '#ffffff')).toBeCloseTo(106.04, 1);
  });

  it('is about -108 for white text on black', () => {
    expect(apcaContrast('#ffffff', '#000000')).toBeCloseTo(-107.88, 1);
  });

  it('is 0 for the same color and for nearly equal colors', () => {
    expect(apcaContrast('#808080', '#808080')).toBe(0);
    expect(apcaContrast('#888888', '#898989')).toBe(0);
  });

  it('depends on which color is the text', () => {
    expect(apcaContrast('#940bdf', '#ffffff')).not.toBe(
      apcaContrast('#ffffff', '#940bdf'),
    );
  });

  it('never returns NaN across a grid of colors', () => {
    for (const a of ['#000000', '#0a0a0a', '#808080', '#ffd534', '#ffffff']) {
      for (const b of ['#000000', '#101010', '#940bdf', '#ffffff']) {
        expect(Number.isNaN(apcaContrast(a, b))).toBe(false);
      }
    }
  });
});

describe('pickOn', () => {
  it('defaults to wcag and matches pickContrast', () => {
    expect(pickOn('#940bdf')).toMatchObject(pickContrast('#940bdf'));
    expect(pickOn('#940bdf', 'wcag')).toEqual(pickOn('#940bdf'));
  });

  it('adds the apca value of the chosen color with one decimal', () => {
    expect(pickOn('#940bdf')).toEqual({
      contrast: '#ffffff',
      ratio: 6.23,
      apca: 84.1,
    });
  });

  it('lets the method change the pick', () => {
    expect(pickOn('#808080', 'wcag').contrast).toBe('#000000');
    expect(pickOn('#808080', 'apca').contrast).toBe('#ffffff');
  });

  it('reports ratio and apca of the chosen color for both methods', () => {
    expect(pickOn('#808080', 'apca')).toEqual({
      contrast: '#ffffff',
      ratio: 3.95,
      apca: 72.4,
    });
  });
});
