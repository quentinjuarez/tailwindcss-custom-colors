import hexToRgb from "./hexToRgb";
import rgbToHsl from "./rgbToHsl";

export default function hexToHsl(hex: string) {
  return rgbToHsl(hexToRgb(hex));
}
