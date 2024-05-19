import {
  Options,
  generateConfig,
  generateStyleVariables,
  generateConfigWithColors,
} from "../src/index";

const keys = {
  100: [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
    "DEFAULT",
    "contrast",
    "complement",
  ],
  50: [
    "50",
    "100",
    "150",
    "200",
    "250",
    "300",
    "350",
    "400",
    "450",
    "500",
    "550",
    "600",
    "650",
    "700",
    "750",
    "800",
    "850",
    "900",
    "950",
    "DEFAULT",
    "contrast",
    "complement",
  ],
  1: [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "DEFAULT",
    "contrast",
    "complement",
    "0.5",
    "9.5",
  ],
};

describe("generateConfig function", () => {
  it("should generate a config object with the correct format when given an array of color names", () => {
    const colorNames = ["red", "green", "blue"];
    const config = generateConfig(colorNames);

    expect(config).toBeDefined();
    expect(Object.keys(config)).toStrictEqual(colorNames);

    colorNames.forEach((colorName) => {
      expect(Object.keys(config[colorName])).toStrictEqual(keys[100]);
    });
  });

  it("should generate a config object with the correct format when given a single color name", () => {
    const colorName = "red";
    const config = generateConfig(colorName);

    expect(config).toBeDefined();
    expect(Object.keys(config)).toStrictEqual([colorName]);
    expect(Object.keys(config[colorName])).toStrictEqual(keys[100]);
  });

  it("should generate a config object with suffixMultiplier options", () => {
    const colorName = "red";
    const options: Options = { suffixMultiplier: 1 };
    const config = generateConfig(colorName, options);

    expect(config).toBeDefined();
    expect(Object.keys(config)).toStrictEqual([colorName]);
    expect(Object.keys(config[colorName])).toStrictEqual(
      keys[options.suffixMultiplier as 1]
    );
  });

  it("should generate a config object with variablePrefix options", () => {
    const colorName = "red";
    const options: Options = { variablePrefix: "custom" };
    const config = generateConfig(colorName, options);

    expect(config).toBeDefined();
    expect(Object.keys(config)).toStrictEqual([colorName]);
  });

  it("should generate a config object without default, contrast and complement options", () => {
    const colorName = "red";
    const options: Options = {
      contrast: false,
      complement: false,
      default: false,
    };
    const config = generateConfig(colorName, options);

    const disabledKeys = ["DEFAULT", "contrast", "complement"];

    expect(config).toBeDefined();
    expect(Object.keys(config)).toStrictEqual([colorName]);
    expect(Object.keys(config[colorName])).not.toContain(disabledKeys);
  });

  it("should generate a config object with steps equals to 50", () => {
    const colorName = "red";
    const options: Options = { steps: 50 };
    const config = generateConfig(colorName, options);

    expect(config).toBeDefined();
    expect(Object.keys(config)).toStrictEqual([colorName]);
    expect(Object.keys(config[colorName])).toStrictEqual(keys[50]);
  });
});

describe("generateStyleVariables function", () => {
  it("should generate reactive styles with the correct format when given an array of color params", () => {
    const colorParams = [
      { color: "#FF0000", name: "red" },
      { color: "#00FF00", name: "green" },
      { color: "#0000FF", name: "blue" },
    ];
    const styles = generateStyleVariables(colorParams);

    expect(styles).toBeDefined();

    const stylesArray = styles.split(";\n");
    expect(stylesArray.length).toBe(colorParams.length * 14);

    const PALETTE = stylesArray
      .map((style) => {
        const [colorName, colorValue] = style.split(": ");
        const [r, g, b] = colorValue.split(" ").map(Number);
        return `\x1b[48;2;${r};${g};${b}m${colorName}\x1b[0m`;
      })
      .join("\n");
    console.log(PALETTE);
  });
  it("should generate reactive styles with the correct format when given a single color params", () => {
    const colorParams = { color: "#FF0000", name: "red" };
    const styles = generateStyleVariables(colorParams);

    expect(styles).toBeDefined();
    expect(styles.split(";\n").length).toBe(14);
  });
  it("should generate reactive styles with options", () => {
    const colorParams = { color: "#FF0000", name: "red" };
    const options: Options = { suffixMultiplier: 1, variablePrefix: "custom" };
    const styles = generateStyleVariables(colorParams, options);

    expect(styles).toBeDefined();
    const stylesArray = styles.split(";\n");
    expect(stylesArray.length).toBe(14);
    stylesArray.forEach((style) => {
      expect(style).toContain(options.variablePrefix);
    });
  });
  it("should generate reactive styles without contrast and complement options", () => {
    const colorParams = { color: "#FF0000", name: "red" };
    const options: Options = { contrast: false, complement: false };
    const styles = generateStyleVariables(colorParams, options);

    expect(styles).toBeDefined();
    const stylesArray = styles.split(";\n");
    expect(stylesArray.length).toBe(12);
  });

  it("should generate reactive styles with contrast and complement options", () => {
    const colorParams = { color: "#FF0000", name: "red" };
    const options: Options = { steps: 50 };
    const styles = generateStyleVariables(colorParams, options);

    expect(styles).toBeDefined();
    const stylesArray = styles.split(";\n");
    expect(stylesArray.length).toBe(22);
  });
});

describe("generateConfigWithColors function", () => {
  it("should generate a config object with the correct format when given an array of color names", () => {
    const colorParams = [
      { color: "#FF0000", name: "red" },
      { color: "#00FF00", name: "green" },
      { color: "#0000FF", name: "blue" },
    ];
    const config = generateConfigWithColors(colorParams);

    const colorNames = colorParams.map(({ name }) => name);

    expect(config).toBeDefined();
    expect(Object.keys(config)).toStrictEqual(colorNames);

    colorNames.forEach((colorName) => {
      expect(Object.keys(config[colorName])).toStrictEqual(keys[100]);
    });
  });

  it("should generate a config object with the correct format when given a single color name", () => {
    const colorParams = { color: "#FF0000", name: "red" };
    const config = generateConfigWithColors(colorParams);

    expect(config).toBeDefined();
    expect(Object.keys(config)).toStrictEqual([colorParams.name]);
    expect(Object.keys(config[colorParams.name])).toStrictEqual(keys[100]);
  });
});
