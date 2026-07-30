import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { handlePrayerTimes } from "./server/prayerTimes";

// Geliştirme sırasında Vercel serverless route'unu taklit eder; API anahtarı
// yoksa örnek verilerle çalışır (allowDemo yalnızca yerelde açıktır).
function devApi(): Plugin {
  return {
    name: "dev-prayer-times-api",
    configureServer(server) {
      server.middlewares.use("/api/prayer-times", (req, res) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const city = url.searchParams.get("city") ?? "";
        handlePrayerTimes(city, { allowDemo: true })
          .then((result) => {
            res.statusCode = result.status;
            res.setHeader("content-type", "application/json; charset=utf-8");
            res.end(JSON.stringify(result.body));
          })
          .catch((err) => {
            console.error(err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "internal" }));
          });
      });
    },
  };
}

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
        },
      },
    },
  },
  plugins: [
    react(),
    devApi(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Namaz 365",
        short_name: "Namaz 365",
        description: "Namaz vakitleri ve günlük namaz takibi",
        lang: "tr",
        start_url: "/",
        display: "standalone",
        background_color: "#f6f4ef",
        theme_color: "#11675c",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        importScripts: ["push-sw.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/prayer-times/,
            handler: "NetworkFirst",
            options: {
              cacheName: "prayer-times",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 35 },
            },
          },
        ],
      },
    }),
  ],
});
