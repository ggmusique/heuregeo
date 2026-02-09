import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/pwa-192.png", "icons/pwa-512.png", "icons/apple-touch-icon.png"],
      manifest: {
        lang: "fr",
        name: "Heures de Geo",
        short_name: "Heures",
        description: "Suivi des heures, bilans et historique",
        theme_color: "#0a001f",
        background_color: "#0a001f",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
});
