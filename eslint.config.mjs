import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      ".wrangler/",
      "worker-configuration.d.ts",
      "apps/creator-web/dist/",
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
);
