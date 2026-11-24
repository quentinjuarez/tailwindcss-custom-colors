const BLACK = '#000000';
const WHITE = '#ffffff';

export type ContrastMethod = 'wcag' | 'apca';

const channelLuminance = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const relativeLuminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) =>
    channelLuminance(parseInt(hex.slice(i, i + 2), 16) / 255),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const wcagRatio = (hexA: string, hexB: string): number => {
  const [darker, lighter] = [
    relativeLuminance(hexA),
    relativeLuminance(hexB),
  ].sort((a, b) => a - b);
  return (lighter + 0.05) / (darker + 0.05);
};

export const pickContrast = (
  hex: string,
): { contrast: typeof BLACK | typeof WHITE; ratio: number } => {
  const onWhite = wcagRatio(hex, WHITE);
  const onBlack = wcagRatio(hex, BLACK);
  const useWhite = onWhite >= onBlack;
  return {
    contrast: useWhite ? WHITE : BLACK,
    ratio: Math.round((useWhite ? onWhite : onBlack) * 100) / 100,
  };
};

const apcaLuminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map(
    (i) => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.4,
  );
  const y = 0.2126729 * r! + 0.7151522 * g! + 0.072175 * b!;
  return y < 0.022 ? y + (0.022 - y) ** 1.414 : y;
};

export const apcaContrast = (
  textHex: string,
  backgroundHex: string,
): number => {
  const text = apcaLuminance(textHex);
  const background = apcaLuminance(backgroundHex);
  if (Math.abs(background - text) < 0.0005) return 0;
  if (background > text) {
    const sapc = (background ** 0.56 - text ** 0.57) * 1.14;
    return (sapc < 0.1 ? 0 : sapc - 0.027) * 100;
  }
  const sapc = (background ** 0.65 - text ** 0.62) * 1.14;
  return (sapc > -0.1 ? 0 : sapc + 0.027) * 100;
};

export const pickOn = (
  hex: string,
  method: ContrastMethod = 'wcag',
): { contrast: typeof BLACK | typeof WHITE; ratio: number; apca: number } => {
  const ratios = {
    [WHITE]: wcagRatio(hex, WHITE),
    [BLACK]: wcagRatio(hex, BLACK),
  };
  const lcs = {
    [WHITE]: Math.abs(apcaContrast(WHITE, hex)),
    [BLACK]: Math.abs(apcaContrast(BLACK, hex)),
  };
  const scores = method === 'apca' ? lcs : ratios;
  const contrast = scores[WHITE] >= scores[BLACK] ? WHITE : BLACK;
  return {
    contrast,
    ratio: Math.round(ratios[contrast] * 100) / 100,
    apca: Math.round(lcs[contrast] * 10) / 10,
  };
};
