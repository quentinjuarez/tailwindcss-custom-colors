export default function hexToRgb(hex: string): [number, number, number] {
  const hexString = hex.replace("#", "");

  const validHexRegExp = /^[0-9A-Fa-f]{6}$/;
  if (!validHexRegExp.test(hexString)) {
    throw new Error(`Invalid hexadecimal color code: ${hex}`);
  }

  const r = parseInt(hexString.substring(0, 2), 16);
  const g = parseInt(hexString.substring(2, 4), 16);
  const b = parseInt(hexString.substring(4, 6), 16);
  return [r, g, b];
}

export function rgbToString([r, g, b]: [
  number,
  number,
  number
]): `${number} ${number} ${number}` {
  return `${r} ${g} ${b}`;
}

export function hexToRgbString(hex: string): `${number} ${number} ${number}` {
  return rgbToString(hexToRgb(hex));
}
