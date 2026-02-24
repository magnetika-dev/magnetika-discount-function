import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;
app.set("trust proxy", 1);

// Para leer JSON (si luego lo necesitas)
app.use(express.json());

// Health
app.get("/health", (_req, res) => res.status(200).send("ok"));

// Endpoint para probar que el frontend manda Authorization: Bearer <token>
app.get("/api/ping", (req, res) => {
  const auth = req.headers.authorization || "";
  // Solo respondemos y registramos (verificación JWT la podemos agregar después)
  res.status(200).json({
    ok: true,
    gotAuthorizationHeader: Boolean(auth),
    authorizationHeaderStartsWithBearer: auth.toLowerCase().startsWith("bearer "),
  });
});

// Home embebido (para checks)
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

    <!-- Required: App Bridge config via meta -->
    <meta name="shopify-api-key" content="${apiKey}" />

    <!-- Required: latest App Bridge from Shopify CDN -->
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
  </head>

  <body style="font-family: system-ui; padding: 24px;">
    <h1>Magnetika Volume Discount</h1>
    <p>App is running ✅</p>
    <p style="opacity:.7">This is the embedded admin page required for Shopify review checks.</p>

    <div id="status" style="margin: 12px 0; font-size: 13px;"></div>

    <button id="btnToken" style="padding:10px 12px; cursor:pointer;">
      Probar Session Token (shopify.idToken) y mandar a /api/ping
    </button>

    <pre id="out" style="margin-top:12px; background:#111; color:#ddd; padding:12px; border-radius:8px; overflow:auto;"></pre>

    <script>
      (function () {
        var statusEl = document.getElementById("status");
        var outEl = document.getElementById("out");
        var btn = document.getElementById("btnToken");

        function setStatus(msg, color) {
          statusEl.innerHTML = "<span style='color:" + color + "'>" + msg + "</span>";
        }
        function log(obj) {
          outEl.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
        }

        // 1) Confirmar host param
        var params = new URLSearchParams(window.location.search);
        var host = params.get("host");
        if (!host) {
          setStatus("⚠️ Falta host en la URL. Asegúrate de abrir la app desde Shopify Admin (Apps) y NO en una pestaña directa.", "orange");
        } else {
          setStatus("✅ host detectado en URL.", "green");
        }

        // 2) Con App Bridge nuevo, el objeto importante es window.shopify (no createApp)
        // Si no existe, normalmente es porque el script no se ejecutó o no está en contexto embebido correcto.
        if (!window.shopify) {
          console.error("window.shopify is undefined. App Bridge script loaded but global not available.");
          setStatus("❌ window.shopify NO disponible (App Bridge no inicializó global).", "red");
        } else {
          console.log("window.shopify OK:", window.shopify);
          setStatus("✅ window.shopify disponible (App Bridge OK).", "green");
        }

        // 3) Probar session token y mandarlo al backend
        btn.addEventListener("click", async function () {
          try {
            if (!window.shopify || typeof window.shopify.idToken !== "function") {
              setStatus("❌ shopify.idToken() no disponible. (App Bridge no listo).", "red");
              log({ error: "shopify.idToken not available", shopify: window.shopify || null });
              return;
            }

            setStatus("⏳ Solicitando token con shopify.idToken()...", "orange");
            const token = await window.shopify.idToken();

            setStatus("✅ Token obtenido. Enviando a /api/ping con Authorization: Bearer ...", "green");

            const resp = await fetch("/api/ping", {
              method: "GET",
              headers: {
                "Authorization": "Bearer " + token
              }
            });

            const data = await resp.json();
            log({
              tokenPreview: token ? (token.slice(0, 20) + "...") : null,
              apiPingResponse: data
            });

          } catch (e) {
            console.error(e);
            setStatus("❌ Error pidiendo token o llamando /api/ping", "red");
            log({ error: String(e) });
          }
        });
      })();
    </script>
  </body>
</html>`);
});

// Webhooks endpoint
app.post("/webhooks", express.raw({ type: "*/*" }), (_req, res) => {
  res.status(200).send("ok");
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});