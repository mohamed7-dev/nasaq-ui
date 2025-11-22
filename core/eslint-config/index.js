// @ts-check
import * as eslintJs from "@chance/eslint";
import { globals } from "@chance/eslint/globals";
import * as typescript from "@chance/eslint/typescript";

/**
 * @type {import("eslint").Linter.Config}
 */
export const js = eslintJs.getConfig({
  ...globals.node,
  ...globals.browser,
});

/**
 * @type {import("eslint").Linter.Config}
 */
export const ts = typescript.config;

/**
 * @type {import("eslint").Linter.Config}
 */
export const overrides = {
  ignores: ["dist/**"],
  rules: {
    "prefer-const": ["warn", { destructuring: "all" }],
  },
};

/**
 * @type {import("eslint").Linter.Config[]}
 */
export const configs = [js, ts, overrides];
