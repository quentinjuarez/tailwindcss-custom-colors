import { clampToGamut, type Gamut, type Oklch } from './color/convert.js';

export const STEPS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

export type Step = (typeof STEPS)[number];

export type Scale = {
  steps: Record<Step, { oklch: string; hex: string }>;
  contrast: '#000000' | '#ffffff';
  ratio: number;
  apca: number;
  on: Record<Step, '#000000' | '#ffffff'>;
};

const LIGHT_END = 0.975;
const DARK_END = 0.25;
const MIN_ROOM = 0.4;

const CURVE: Record<Step, { towardEnd: number; chroma: number }> = {
  '50': { towardEnd: 1, chroma: 0.08 },
  '100': { towardEnd: 0.88, chroma: 0.18 },
  '200': { towardEnd: 0.72, chroma: 0.34 },
  '300': { towardEnd: 0.52, chroma: 0.56 },
  '400': { towardEnd: 0.27, chroma: 0.8 },
  '500': { towardEnd: 0, chroma: 1 },
  '600': { towardEnd: 0.2, chroma: 0.98 },
  '700': { towardEnd: 0.4, chroma: 0.9 },
  '800': { towardEnd: 0.6, chroma: 0.78 },
  '900': { towardEnd: 0.78, chroma: 0.62 },
  '950': { towardEnd: 1, chroma: 0.45 },
};

const isLightStep = (step: Step): boolean => Number(step) < 500;

export const lightScale = (
  base: Oklch,
  gamut: Gamut = 'srgb',
): Record<Step, Oklch> => {
  const lightEnd = Math.max(LIGHT_END, base.l + (1 - base.l) * MIN_ROOM);
  const darkEnd = Math.min(DARK_END, base.l * (1 - MIN_ROOM));

  const lightnessAt = (step: Step, towardEnd: number): number => {
    if (isLightStep(step)) {
      return base.l >= 1 ? 1 : base.l + (lightEnd - base.l) * towardEnd;
    }
    return base.l <= 0 ? 0 : base.l + (darkEnd - base.l) * towardEnd;
  };

  const entries = STEPS.map((step): [Step, Oklch] => {
    if (step === '500') return [step, base];
    const { towardEnd, chroma } = CURVE[step];
    const color = clampToGamut(
      {
        l: lightnessAt(step, towardEnd),
        c: base.c * chroma,
        h: base.h,
      },
      gamut,
    );
    return [step, color];
  });

  return Object.fromEntries(entries) as Record<Step, Oklch>;
};

export const darkScale = (light: Record<Step, Oklch>): Record<Step, Oklch> =>
  Object.fromEntries(
    STEPS.map((step) => [step, light[String(1000 - Number(step)) as Step]]),
  ) as Record<Step, Oklch>;
