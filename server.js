import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;
app.set("trust proxy", 1);

app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.get("/", (req, res) => {
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

    <meta name="shopify-api-key" content="${apiKey}" />

    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  </head>
  <body style="font-family: system-ui; padding: 24px;">
    <h1>Magnetika Volume Discount</h1>
    <p>App is running ✅</p>
    <p style="opacity:.7">
      This is the embedded admin page required for Shopify review checks.
    </p>

    <script>
      (function () {
        try {
          var params = new URLSearchParams(window.location.search);
          var host = params.get("host");
          var apiKey = document.querySelector('meta[name="shopify-api-key"]').content;

          if (!window.ShopifyAppBridge || !window.ShopifyAppBridge.createApp) {
            console.error("Shopify App Bridge did not load.");
            return;
          }

          window.app = window.ShopifyAppBridge.createApp({
            apiKey: apiKey,
            host: host,
            forceRedirect: true
          });

          console.log("App Bridge initialized OK");
        } catch (e) {
          console.error(e);
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