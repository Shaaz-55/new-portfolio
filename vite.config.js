import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createTtsHandler } from "./api/tts.js";

export default defineConfig(({ mode }) => {
  const handler = createTtsHandler({
    env: { ...loadEnv(mode, process.cwd(), "FISH_"), ...process.env },
  });
  const install = (server) => {
    server.middlewares.use("/api/tts", handler);
  };
  return {
    plugins: [
      react(),
      {
        name: "local-fish-audio",
        configureServer: install,
        configurePreviewServer: install,
      },
    ],
  };
});
