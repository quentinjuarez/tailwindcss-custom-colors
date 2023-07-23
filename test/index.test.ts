import { generateConfig, generateReactiveStyles } from "../src/index";

describe("generateConfig function", () => {
  const defaultKeys = [
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
  ];

  const oneMultiplierKeys = [
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
  ];

  it("should generate a config object with the correct format when given an array of color names", () => {
    const colorNames = ["red", "green", "blue"];
    const config = generateConfig(colorNames);

    expect(config).toBeDefined();
    expect(typeof config).toBe("object");
    expect(Object.keys(config)).toStrictEqual(colorNames);

    colorNames.forEach((colorName) => {
      expect(Object.keys(config[colorName])).toStrictEqual(defaultKeys);
    });
  });

  it("should generate a config object with the correct format when given a single color name", () => {
    const colorName = "red";
    const config = generateConfig(colorName);

    expect(config).toBeDefined();
    expect(typeof config).toBe("object");
    expect(Object.keys(config)).toStrictEqual([colorName]);
    expect(Object.keys(config[colorName])).toStrictEqual(defaultKeys);
  });

  it("should generate a config object with options", () => {
    const colorName = "red";
    const config = generateConfig(colorName, { suffixMultiplier: 1 });

    expect(config).toBeDefined();
    expect(typeof config).toBe("object");
    expect(Object.keys(config)).toStrictEqual([colorName]);
    expect(Object.keys(config[colorName])).toStrictEqual(oneMultiplierKeys);
  });
});

describe("generateReactiveStyles function", () => {
  it("should generate reactive styles with the correct format when given an array of color params", () => {
    const colorParams = [
      { color: "#FF0000", name: "red" },
      { color: "#00FF00", name: "green" },
      { color: "#0000FF", name: "blue" },
    ];
    const styles = generateReactiveStyles(colorParams);

    expect(styles).toBeDefined();
    expect(styles.split(";\n").length).toBe(colorParams.length * 10);
  });
  it("should generate reactive styles with the correct format when given a single color params", () => {
    const colorParams = { color: "#FF0000", name: "red" };
    const styles = generateReactiveStyles(colorParams);

    expect(styles).toBeDefined();
    expect(styles.split(";\n").length).toBe(10);
  });
});
