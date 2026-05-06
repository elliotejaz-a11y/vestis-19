import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" &&
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
  ].filter(Boolean),
  optimizeDeps: {
    exclude: ["@imgly/background-removal"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Terser: two compression passes + strip console.* in production
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 2,
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.warn", "console.error", "console.info"],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Core React runtime — most stable, largest
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("react-router")
          ) {
            return "vendor-react";
          }

          // Supabase client — stable, large
          if (id.includes("@supabase")) return "vendor-supabase";

          // Radix UI primitives — stable, large
          if (id.includes("@radix-ui")) return "vendor-radix";

          // TanStack (Query + Virtual) — stable
          if (id.includes("@tanstack")) return "vendor-tanstack";

          // Lucide icons — large icon set, changes infrequently
          if (id.includes("lucide-react")) return "vendor-lucide";

          // Recharts — only used on analytics/profile; keep isolated
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-")) {
            return "vendor-charts";
          }

          // date-fns — utility library, changes rarely
          if (id.includes("date-fns")) return "vendor-datefns";
        },
      },
    },
  },
}));
