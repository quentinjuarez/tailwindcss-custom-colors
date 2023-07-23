export default function rgbToHsl([r, g, b]: [number, number, number]): [
  number,
  number,
  number
] {
  // Normalize RGB values to the range [0, 1]
  const normalizedR = r / 255;
  const normalizedG = g / 255;
  const normalizedB = b / 255;

  // Find the min and max values among R, G, and B
  const min = Math.min(normalizedR, normalizedG, normalizedB);
  const max = Math.max(normalizedR, normalizedG, normalizedB);
  const delta = max - min;

  // Calculate the hue (H)
  let h = 0;
  if (delta === 0) {
    h = 0; // No chroma, hue is undefined or arbitrary (here set to 0)
  } else if (max === normalizedR) {
    h = ((normalizedG - normalizedB) / delta) % 6;
  } else if (max === normalizedG) {
    h = (normalizedB - normalizedR) / delta + 2;
  } else {
    h = (normalizedR - normalizedG) / delta + 4;
  }

  h = Math.round(h * 60); // Convert hue to degrees

  if (h < 0) {
    h += 360; // Ensure hue is a positive angle
  }

  // Calculate the lightness (L)
  const l = (max + min) / 2;

  // Calculate the saturation (S)
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
  }

  // Round saturation and lightness to two decimal places
  s = Math.round(s * 100) / 100;
  const roundedL = Math.round(l * 100) / 100;

  return [h, s, roundedL];
}
