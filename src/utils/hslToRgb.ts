import round from "./round";

function hueToRgb([p, q, t]: [number, number, number]) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export default function hslToRgb([h, s, l]: [number, number, number]): [
  number,
  number,
  number
] {
  const roundedL = round(l);

  if (s === 0) {
    return [
      Math.round(roundedL * 255),
      Math.round(roundedL * 255),
      Math.round(roundedL * 255),
    ];
  }
  const q = roundedL < 0.5 ? roundedL * (1 + s) : roundedL + s - roundedL * s;
  const p = 2 * roundedL - q;

  return [
    Math.round(hueToRgb([p, q, h + 1 / 3]) * 255),
    Math.round(hueToRgb([p, q, h]) * 255),
    Math.round(hueToRgb([p, q, h - 1 / 3]) * 255),
  ];
}
