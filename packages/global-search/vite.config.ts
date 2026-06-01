import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import v8 from "v8";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "hardware",
      configureServer(server) {
        server.middlewares.use("/json", (req, res) => {
          setTimeout(() => {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                nodeMemory: process.memoryUsage(),
                v8HeapStats: v8.getHeapStatistics(),
              }),
            );
          }, 5000);
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
