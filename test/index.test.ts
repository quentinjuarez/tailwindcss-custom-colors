import { Options, generateConfig, generateStyleVariables } from "../src/index";

describe("generateConfig function", () => {
  const keys = {
    100: [
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "900",
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
    ],
  };

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

  it("should generate a config object without contrast and complement options", () => {
    const colorName = "red";
    const options: Options = { contrast: false, complement: false };
    const config = generateConfig(colorName, options);

    expect(config).toBeDefined();
    expect(Object.keys(config)).toStrictEqual([colorName]);
    expect(Object.keys(config[colorName])).toStrictEqual(
      keys[100].slice(0, 10)
    );
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
    expect(styles.split(";\n").length).toBe(colorParams.length * 12);
  });
  it("should generate reactive styles with the correct format when given a single color params", () => {
    const colorParams = { color: "#FF0000", name: "red" };
    const styles = generateStyleVariables(colorParams);

    expect(styles).toBeDefined();
    expect(styles.split(";\n").length).toBe(12);
  });
  it("should generate reactive styles with options", () => {
    const colorParams = { color: "#FF0000", name: "red" };
    const options: Options = { suffixMultiplier: 1, variablePrefix: "custom" };
    const styles = generateStyleVariables(colorParams, options);

    expect(styles).toBeDefined();
    const stylesArray = styles.split(";\n");
    expect(stylesArray.length).toBe(12);
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
    expect(stylesArray.length).toBe(10);
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
