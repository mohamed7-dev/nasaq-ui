// @ts-check

import * as react from "@chance/eslint/react";
import * as base from "./index.js";
import storybook from "eslint-plugin-storybook";

/** @type {import("eslint").Linter.Config[]} */
export const config = [
  base.js,
  base.ts,
  react.config,
  base.overrides,
  {
    rules: {
      "react/jsx-pascal-case": ["warn", { allowNamespace: true }],
      "react/display-name": "error",
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          controlComponents: ["Checkbox"],
          depth: 3,
        },
      ],
    },
  },
  // @ts-expect-error - storybook config is not compatible with eslint 9
  ...storybook.configs["flat/recommended"],
  { ignores: ["**/dist/**"] },
];
