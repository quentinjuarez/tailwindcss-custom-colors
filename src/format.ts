import { previewHtml } from './preview.js';
import { STEPS } from './scale.js';
import type { Theme } from './theme.js';

export type Format = 'css' | 'json' | 'scss' | 'tokens' | 'html';

const EXTENSION = 'tailwindcss-custom-colors';

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const scssMap = (name: string, tokens: Record<string, string>): string =>
  `$${name}: (\n${Object.entries(tokens)
    .map(([key, value]) => `  "${key.slice(2)}": ${value}`)
    .join(',\n')}\n);`;

const channel = (hex: string, index: number): number =>
  Number(
    (parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255).toFixed(4),
  );

const colorValue = (hex: string) => ({
  colorSpace: 'srgb',
  components: [channel(hex, 0), channel(hex, 1), channel(hex, 2)],
  hex,
});

const leaf = (light: string, dark?: string) => ({
  $type: 'color',
  $value: colorValue(light),
  ...(dark === undefined ? {} : { $extensions: { [EXTENSION]: { dark } } }),
});

const designTokens = (theme: Theme, dark: boolean) =>
  Object.fromEntries(
    Object.entries(theme.scales).map(([name, scale]) => [
      name,
      {
        ...Object.fromEntries(
          STEPS.map((step) => [
            step,
            leaf(
              scale.light.steps[step].hex,
              dark ? scale.dark.steps[step].hex : undefined,
            ),
          ]),
        ),
        contrast: leaf(
          scale.light.contrast,
          dark ? scale.dark.contrast : undefined,
        ),
      },
    ]),
  );

export const formatTheme = (
  theme: Theme,
  format: Format,
  dark: boolean,
): string => {
  if (format === 'css') return theme.css;
  if (format === 'html') return previewHtml(theme, dark);
  if (format === 'json') {
    return json({
      light: theme.variables('light'),
      ...(dark ? { dark: theme.variables('dark') } : {}),
    });
  }
  if (format === 'scss') {
    const maps = [scssMap('theme-light', theme.variables('light'))];
    if (dark) maps.push(scssMap('theme-dark', theme.variables('dark')));
    return `${maps.join('\n\n')}\n`;
  }
  return json(designTokens(theme, dark));
};
