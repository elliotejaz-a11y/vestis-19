import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  optimizeDeps: {
    exclude: ["@imgly/background-removal"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Skip compressed size measurement — saves several seconds per build in CI
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Split node_modules into stable named chunks so browsers cache them
        // independently from frequently-changing app code.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Pin the most stable, largest libs into named chunks so they survive
          // app-code deploys without invalidating their cached copy.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("react-router")
          ) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack")) return "vendor-tanstack";
          // Return undefined — let Rollup apply its natural splitting for everything else.
        },
      },
    },
  },
}));
