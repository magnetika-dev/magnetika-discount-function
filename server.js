import express from "express";

const app = express();

// --- Config ---
const PORT = process.env.PORT || 3000;
// Shopify recommends setting this for embedded apps
app.set("trust proxy", 1);

// --- Routes ---
app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

// Minimal embedded app home
app.get("/", (_req, res) => {
  // This page only needs to load inside Shopify admin iframe.
  // It includes App Bridge from Shopify CDN and initializes it.
  // We are not doing any Admin API calls here yet.
  res
    .status(200)
    .set("Content-Type", "text/html; charset=utf-8")
    .send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Magnetika Volume Discount</title>

    <!-- Required for embedded apps -->
    <meta name="shopify-api-key" content="${process.env.SHOPIFY_API_KEY || ""}" />

    <!-- App Bridge (CDN) -->
    <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
  </head>
  <body>
    <div style="font-family: system-ui; padding: 16px;">
      <h2>Magnetika Volume Discount</h2>
      <p>App is running ✅</p>
      <p style="opacity:.7;font-size:13px;">
        This is the embedded admin page required for Shopify review checks.
      </p>
    </div>

    <script>
      // App Bridge init (must run inside Shopify Admin iframe)
      try {
        const params = new URLSearchParams(window.location.search);
        const host = params.get("host");

        const apiKey = document.querySelector('meta[name="shopify-api-key"]').content;

        if (!apiKey) console.warn("Missing SHOPIFY_API_KEY env var");
        if (!host) console.warn("Missing host param (open app from Shopify Admin)");

        if (window["app-bridge"] && apiKey && host) {
          window.app = window["app-bridge"].default.createApp({
            apiKey,
            host,
            forceRedirect: true
          });
        }
      } catch (e) {
        console.error(e);
      }
    </script>
  </body>
</html>`);
});

// Webhooks endpoint (you already registered /webhooks)
app.post("/webhooks", express.raw({ type: "*/*" }), (_req, res) => {
  // For review checks, it’s enough that endpoint exists and returns 200.
  // Later you can implement HMAC verification and topic handling.
  res.status(200).send("ok");
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});