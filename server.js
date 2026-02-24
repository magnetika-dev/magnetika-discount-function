app.get("/", (req, res) => {
  const apiKey = process.env.SHOPIFY_API_KEY;

  res.set("Content-Type", "text/html");
  res.send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Magnetika Volume Discount</title>

    <!-- App Bridge desde CDN de Shopify -->
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  </head>
  <body style="font-family: system-ui; padding: 24px;">
    <h1>Magnetika Volume Discount</h1>
    <p>App is running ✅</p>
    <p style="opacity:.7">
      This is the embedded admin page required for Shopify review checks.
    </p>

    <script>
      const params = new URLSearchParams(window.location.search);
      const host = params.get("host");

      const AppBridge = window['app-bridge'];

      if (!AppBridge || !AppBridge.createApp) {
        console.error("App Bridge no cargó correctamente", AppBridge);
      } else {
        const app = AppBridge.createApp({
          apiKey: ${JSON.stringify(apiKey)},
          host: host,
          forceRedirect: true
        });

        console.log("App Bridge OK", app);
      }
    </script>
  </body>
</html>`);
});