import { existsSync } from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// On Vercel, every file in /api becomes a server function automatically.
// `npm run dev` doesn't know about Vercel, so this small plugin does the same job locally:
// a request to /api/route runs the POST function exported by api/route.ts.
function localApi(): Plugin {
  async function handle(server: ViteDevServer, req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const name = url.pathname.replace(/^\/api\//, "");
    const file = path.resolve("api", `${name}.ts`);
    if (!/^[a-z-]+$/.test(name) || !existsSync(file)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }
    const mod = await server.ssrLoadModule(file);
    const handler = mod[req.method ?? "GET"];
    if (typeof handler !== "function") {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "method_not_allowed" }));
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
    });
    const response: Response = await handler(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  }

  return {
    name: "turnaround-local-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        handle(server, req, res).catch((err) => {
          console.error(err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "server_error", message: String(err) }));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make ORS_API_KEY from .env.local visible to the /api functions during `npm run dev`.
  // It is NOT given to the browser: Vite only exposes variables that start with VITE_.
  const env = loadEnv(mode, process.cwd(), "");
  if (env.ORS_API_KEY && !process.env.ORS_API_KEY) process.env.ORS_API_KEY = env.ORS_API_KEY;

  return {
    plugins: [
      react(),
      localApi(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
        manifest: {
          name: "TurnAround",
          short_name: "TurnAround",
          description: "Get out of Meyerland without driving into water.",
          theme_color: "#0B2545",
          background_color: "#0B2545",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // The app shell (HTML, JS, CSS, icons, Harvey data) is saved for offline use.
          globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Map tiles you've already looked at stay available with no signal.
              urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
              handler: "CacheFirst",
              options: {
                cacheName: "osm-tiles",
                expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
      }),
    ],
  };
});
