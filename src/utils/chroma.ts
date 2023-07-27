import hexToRgb, { rgbToString } from "./hexToRgb";
import hslToRgb from "./hslToRgb";

function darkenHsl(hsl: [number, number, number], val: number) {
  hsl = [...hsl];

  hsl[2] -= hsl[2] * val;

  return hsl;
}

function lightenHsl(hsl: [number, number, number], val: number) {
  hsl = [...hsl];

  hsl[2] += hsl[2] * val;

  return hsl;
}

export function darken(hsl: [number, number, number], val: number) {
  return rgbToString(hslToRgb(darkenHsl(hsl, val)));
}

export function lighten(hsl: [number, number, number], val: number) {
  return rgbToString(hslToRgb(lightenHsl(hsl, val)));
}

export function contrast(
  hsl: [number, number, number],
  classification: { light: string; dark: string }
) {
  const [r, g, b] = hslToRgb(hsl);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return rgbToString(
    hexToRgb(luminance > 0.5 ? classification.dark : classification.light)
  );
}

export function complement(
  hsl: [number, number, number],
  classification: { light: string; dark: string }
) {
  const [r, g, b] = hslToRgb(hsl);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return rgbToString(
    hexToRgb(luminance < 0.5 ? classification.dark : classification.light)
  );
}
