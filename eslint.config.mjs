import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptEslintParser from "@typescript-eslint/parser";
import prettierPlugin from "eslint-plugin-prettier";

export default [
  {
    files: ["*.ts"],
    languageOptions: {
      parser: typescriptEslintParser,
    },
    plugins: {
      typescriptEslint,
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierPlugin.configs.recommended.rules,
    },
    ignores: ["node_modules", "dist"],
  },
];
