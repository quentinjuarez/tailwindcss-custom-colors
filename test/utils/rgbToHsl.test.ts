import rgbToHsl from "../../src/utils/rgbToHsl";

describe("generateConfig function", () => {
  it("Test no chroma branch", () => {
    expect(rgbToHsl([0, 0, 0])).toEqual([0, 0, 0]);
  });
  it("Test ensure hue is positive branch", () => {
    expect(rgbToHsl([128, 0, 128])).toEqual([300, 1, 0.25]);
  });
});
