const BLACK = '#000000';
const WHITE = '#ffffff';

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
