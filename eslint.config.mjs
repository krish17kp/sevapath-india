// eslint-config-next 16 ships native flat config, so no FlatCompat wrapper.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      ".venv/**",
      "rag-corpus/raw_sources_auto/**",
      "rag-corpus/index/**",
      "next-env.d.ts"
    ]
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "error",
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }]
    }
  },
  {
    // Build and collection scripts are CLIs; printing is their job.
    files: ["rag-corpus/scripts/**/*.mjs", "scripts/**/*.mjs"],
    rules: { "no-console": "off" }
  },
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: { "no-console": "off" }
  }
];

export default config;
