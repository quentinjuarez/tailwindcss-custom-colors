import hslToRgb from '../../src/utils/hslToRgb';

describe('hslToRgb', () => {
  it('should convert a plain hsl triplet', () => {
    expect(hslToRgb([0, 0, 0])).toEqual([0, 0, 0]);
    expect(hslToRgb([0, 0, 1])).toEqual([255, 255, 255]);
  });

  it('should clamp components to 0-255 when lightness overflows', () => {
    // Regression: lightening a bright color pushes l above 1, which used to
    // produce invalid values such as [255, 263, 296].
    const [r, g, b] = hslToRgb([50, 1, 1.28]);
    for (const component of [r, g, b]) {
      expect(component).toBeGreaterThanOrEqual(0);
      expect(component).toBeLessThanOrEqual(255);
    }
  });

  it('should clamp components when lightness underflows', () => {
    const [r, g, b] = hslToRgb([50, 1, -0.4]);
    expect([r, g, b]).toEqual([0, 0, 0]);
  });
});
