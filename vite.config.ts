import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Eterna Photos",
        short_name: "Eterna",
        description: "Capture e compartilhe os momentos inesquecíveis do seu evento.",
        start_url: "/",
        display: "standalone",
        background_color: "#080808",
        theme_color: "#000000",
        orientation: "portrait-primary",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Cacheia o shell do app (HTML, CSS, JS)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Não cacheia as chamadas de API/Supabase
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/rest\//, /^\/storage\//, /^\/functions\//],
        runtimeCaching: [
          {
            // Fotos do storage — cacheia por 1h
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-photos",
              expiration: { maxEntries: 200, maxAgeSeconds: 3600 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
