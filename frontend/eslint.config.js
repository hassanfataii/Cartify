import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

import {
  defineConfig,
  globalIgnores,
} from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist",
    "coverage",
  ]),

  {
    files: [
      "**/*.{js,jsx}",
    ],

    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      globals: globals.browser,

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      /*
       * Cartify loads authentication, cart, wishlist and
       * API data through effects. The React 19 rule also
       * flags state changes inside stable async callbacks,
       * even though those updates happen after requests.
       */
      "react-hooks/set-state-in-effect": "off",
    },
  },

  {
    files: [
      "src/context/**/*.{js,jsx}",
    ],

    rules: {
      /*
       * Context modules intentionally export both their
       * provider component and matching consumer hook.
       */
      "react-refresh/only-export-components": "off",
    },
  },
]);