import hexToRgb from "../../src/utils/hexToRgb";

describe("generateConfig function", () => {
  it("should throw an error if hex color is malformed", () => {
    const hex = "rgb(255, 255, 255)";
    try {
      hexToRgb(hex);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty(
        "message",
        `Invalid hexadecimal color code: ${hex}`
      );
    }
  });
});
