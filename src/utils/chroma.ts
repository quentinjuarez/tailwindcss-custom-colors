import { rgbToString } from "./hexToRgb";
import hslToRgb from "./hslToRgb";

function darkenHsl(hsl: [number, number, number], val: number) {
  hsl[2] -= hsl[2] * val;

  return hsl;
}

function lightenHsl(hsl: [number, number, number], val: number) {
  hsl[2] += hsl[2] * val;

  return hsl;
}

export function darken(hsl: [number, number, number], val: number) {
  return rgbToString(hslToRgb(darkenHsl(hsl, val)));
}

export function lighten(hsl: [number, number, number], val: number) {
  return rgbToString(hslToRgb(lightenHsl(hsl, val)));
}
