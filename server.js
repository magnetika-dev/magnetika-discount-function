import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;
app.set("trust proxy", 1);

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/", (_req, res) => {
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  res
    .status(200)
    .set("Content-Type", "text/html; charset=utf-8")
    .send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Magnetika Volume Discount</title>

    <!-- Shopify uses this meta in embedded apps -->
    <meta name="shopify-api-key" content="${apiKey}" />

    <!-- App Bridge from Shopify CDN (required for the review check) -->
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  </head>

  <body style="font-family: system-ui; padding: 24px;">
    <h1>Magnetika Volume Discount</h1>
    <p>App is running ✅</p>
    <p style="opacity:.7">This is the embedded admin page required for Shopify review checks.</p>

    <div id="status" style="margin-top:12px; font-size:13px;"></div>

    <script>
      (function () {
        try {
          var statusEl = document.getElementById("status");

          function setStatus(msg, color) {
            statusEl.innerHTML = "<span style='color:" + color + "'>" + msg + "</span>";
          }

          var params = new URLSearchParams(window.location.search);
          var host = params.get("host");
          var apiKey = document.querySelector('meta[name="shopify-api-key"]').content;

          // App Bridge can be exposed in different globals depending on how it’s loaded.
          // We support all common cases:
          // - window.ShopifyAppBridge
          // - window["app-bridge"]
          // - window["app-bridge"].default
          var AppBridgeGlobal =
            (window["app-bridge"] && (window["app-bridge"].default || window["app-bridge"])) ||
            window.ShopifyAppBridge ||
            null;

          if (!AppBridgeGlobal || !AppBridgeGlobal.createApp) {
            console.error("App Bridge NOT available.", {
              "window['app-bridge']": window["app-bridge"],
              "window.ShopifyAppBridge": window.ShopifyAppBridge
            });
            setStatus("❌ App Bridge NO disponible (aunque el script cargue).", "red");
            return;
          }

          if (!apiKey) {
            console.warn("Missing SHOPIFY_API_KEY env var");
            setStatus("⚠️ Falta SHOPIFY_API_KEY en variables de entorno.", "orange");
            return;
          }

          if (!host) {
            console.warn("Missing host param. Open the app from Shopify Admin.");
            setStatus("⚠️ Falta host en la URL. Abre la app desde Shopify Admin (no en una pestaña directa).", "orange");
            return;
          }

          window.app = AppBridgeGlobal.createApp({
            apiKey: apiKey,
            host: host,
            forceRedirect: true
          });

          console.log("✅ App Bridge initialized OK");
          setStatus("✅ App Bridge initialized OK", "green");
        } catch (e) {
          console.error(e);
          var statusEl = document.getElementById("status");
          if (statusEl) statusEl.innerHTML = "<span style='color:red'>❌ Error inicializando App Bridge</span>";
        }
      })();
    </script>
  </body>
</html>`);
});

app.post("/webhooks", express.raw({ type: "*/*" }), (_req, res) => {
  res.status(200).send("ok");
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});