import type { Plugin } from "vite";
export default function rollupGuard(): Plugin {
  return {
    name: "rollup-guard",
    enforce: "pre",
    config() {
      return {
        build: {
          rollupOptions: {
            onwarn(warning, defaultHandler) {
              // Allow specific benign warnings by code if needed:
              const allow = new Set<string>([
                // "THIS_IS_UNDEFINED",
              ]);
              if (!allow.has(warning.code || "")) {
                throw new Error(`[rollup-guard] ${warning.code}: ${warning.message}`);
              }
              defaultHandler(warning);
            }
          }
        }
      };
    }
  };
}