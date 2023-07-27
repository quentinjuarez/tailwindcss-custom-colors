import {
  darken,
  lighten,
  contrast as contrastCalc,
  complement as complementCalc,
} from "./utils/chroma";
import { hexToRgbString } from "./utils/hexToRgb";
import hexToHsl from "./utils/hexToHsl";
import round from "./utils/round";
import variableName from "./utils/variableName";

const shades = {
  100: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  50: [
    0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5,
  ],
};

export interface Options {
  suffixMultiplier?: 100 | 10 | 1;
  variablePrefix?: string;
  contrast?: boolean;
  complement?: boolean;
  classification?: {
    light: string;
    dark: string;
  };
  steps?: 100 | 50;
}

interface DefaultOptions {
  suffixMultiplier: 100;
  variablePrefix: undefined;
  contrast: true;
  complement: true;
  classification: {
    light: "#FFFFFF";
    dark: "#000000";
  };
  steps: 100;
}

const defaultOptions: DefaultOptions = {
  suffixMultiplier: 100,
  variablePrefix: undefined,
  contrast: true,
  complement: true,
  classification: {
    light: "#FFFFFF",
    dark: "#000000",
  },
  steps: 100,
};

interface TailwindColorsConfig {
  [key: string]: Record<string, string>;
}

/**
 * Generate a config colors object for tailwindcss
 * @param {string[] | string} colorNames - An array of color names or a single color name
 * @param {Options} [options] - An object of options (optional)
 * @returns {TailwindColorsConfig} A config object for tailwindcss
 */
const generateConfig = (
  colorNames: string[] | string,
  options?: Options
): TailwindColorsConfig => {
  const { suffixMultiplier, variablePrefix, contrast, complement, steps } = {
    ...defaultOptions,
    ...(options || {}),
  };

  const colors = Array.isArray(colorNames) ? colorNames : [colorNames];

  const config: TailwindColorsConfig = {};

  colors.forEach((colorName) => {
    const colorTints: Record<string, string> = {
      DEFAULT: `rgb(var(${variableName(
        colorName,
        variablePrefix
      )}) / <alpha-value>)`,
      ...(contrast
        ? {
            contrast: `rgb(var(${variableName(
              colorName,
              variablePrefix,
              "contrast"
            )}) / <alpha-value>)`,
          }
        : {}),
      ...(complement
        ? {
            complement: `rgb(var(${variableName(
              colorName,
              variablePrefix,
              "complement"
            )}) / <alpha-value>)`,
          }
        : {}),
    };
    shades[steps].forEach((shade) => {
      const tintSuffix = `${shade * suffixMultiplier}`;
      colorTints[tintSuffix] = `rgb(var(${variableName(
        colorName,
        variablePrefix,
        tintSuffix
      )}) / <alpha-value>)`;
    });

    config[colorName] = colorTints;
  });

  return config;
};

interface ColorParams {
  color: string;
  name: string;
}

/**
 * Generate reactive styles
 * @param {ColorParams[] | ColorParams} colorParams - An array of color params or a single color params
 * @param {Options} [options] - An object of options (optional)
 * @returns {string} A string of css variables
 */
const generateStyleVariables = (
  colorParams: ColorParams[] | ColorParams,
  options?: Options
): string => {
  const {
    suffixMultiplier,
    variablePrefix,
    contrast,
    complement,
    classification,
    steps,
  } = {
    ...defaultOptions,
    ...(options || {}),
  };
  const colors = Array.isArray(colorParams) ? colorParams : [colorParams];

  const styles = colors.map(({ color, name }) => {
    const hslColor = hexToHsl(color);
    const tintsString = [
      `${variableName(name, variablePrefix)}: ${hexToRgbString(color)}`,
      ...(contrast
        ? [
            `${variableName(name, variablePrefix, "contrast")}: ${contrastCalc(
              hslColor,
              classification
            )}`,
          ]
        : []),
      ...(complement
        ? [
            `${variableName(
              name,
              variablePrefix,
              "complement"
            )}: ${complementCalc(hslColor, classification)}`,
          ]
        : []),
    ];
    shades[steps].forEach((shade) => {
      const tintSuffix = `${shade * suffixMultiplier}`;
      if (shade === 5) {
        tintsString.push(
          `${variableName(name, variablePrefix, tintSuffix)}: ${hexToRgbString(
            color
          )}`
        );
      } else if (shade < 5) {
        let ratio = round(-0.2 * shade + 1);
        tintsString.push(
          `${variableName(name, variablePrefix, tintSuffix)}: ${lighten(
            hslColor,
            ratio
          )}`
        );
      } else {
        let ratio = round(0.2 * shade - 1.0);
        tintsString.push(
          `${variableName(name, variablePrefix, tintSuffix)}: ${darken(
            hslColor,
            ratio
          )}`
        );
      }
    });
    return tintsString.join(";\n");
  });

  return styles.join(";\n");
};

export { generateConfig, generateStyleVariables };
