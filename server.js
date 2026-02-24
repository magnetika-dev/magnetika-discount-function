import express from "express";
import crypto from "crypto";

const app = express();

const PORT = process.env.PORT || 3000;
app.set("trust proxy", 1);
app.use(express.json());

function base64UrlDecode(input) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

function verifyShopifySessionToken(token, apiSecret) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  const expectedSig = crypto
    .createHmac("sha256", apiSecret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (expectedSig !== sigB64) throw new Error("Invalid JWT signature");

  const payloadJson = base64UrlDecode(payloadB64);
  const payload = JSON.parse(payloadJson);

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("JWT expired");
  if (payload.nbf && payload.nbf > now) throw new Error("JWT not active yet");

  // Validate audience = API key (recommended)
  const apiKey =
    process.env.SHOPIFY_API_KEY ||
    process.env.SHOPIFY_API_KEY ||
    process.env.SHOPIFY_API_KEY ||
    "";

  if (payload.aud && apiKey && payload.aud !== apiKey) {
    throw new Error("JWT audience mismatch");
  }

  return payload;
}

function requireSessionToken(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ ok: false, error: "Missing Bearer token" });
    }

    const token = auth.slice(7);

    // Accept multiple env var names just in case
    const secret =
      process.env.SHOPIFY_API_SECRET ||
      process.env.SHOPIFY_API_SECRET ||
      process.env.SHOPIFY_API_SECRET ||
      "";

    if (!secret) {
      return res.status(500).json({
        ok: false,
        error:
          "Missing Shopify API secret env var. Set SHOPIFY_API_SECRET (or SHOPIFY_API_SECRET).",
      });
    }

    const payload = verifyShopifySessionToken(token, secret);
    req.shopifySession = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: String(e.message || e) });
  }
}

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.get("/api/ping", requireSessionToken, (req, res) => {
  res.status(200).json({
    ok: true,
    authenticated: true,
    sessionPreview: {
      iss: req.shopifySession?.iss,
      dest: req.shopifySession?.dest,
      aud: req.shopifySession?.aud,
      exp: req.shopifySession?.exp,
      sub: req.shopifySession?.sub,
    },
  });
});

app.get("/", (_req, res) => {
  const apiKey =
    process.env.SHOPIFY_API_KEY ||
    process.env.SHOPIFY_API_KEY ||
    process.env.SHOPIFY_API_KEY ||
    "";

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
    <p style="opacity:.7">This is the embedded admin page required for Shopify review checks.</p>

    <div id="status" style="margin: 12px 0; font-size: 13px;"></div>
    <button id="btnToken" style="padding:10px 12px; cursor:pointer;">
      Probar Session Token y autenticar en backend (/api/ping)
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

        if (!window.shopify) {
          setStatus("❌ window.shopify NO disponible.", "red");
          return;
        }
        setStatus("✅ window.shopify disponible (App Bridge OK).", "green");

        btn.addEventListener("click", async function () {
          try {
            if (typeof window.shopify.idToken !== "function") {
              setStatus("❌ shopify.idToken() no disponible.", "red");
              return;
            }

            setStatus("⏳ Obteniendo token...", "orange");
            const token = await window.shopify.idToken();

            setStatus("⏳ Enviando a /api/ping con Authorization: Bearer ...", "orange");
            const resp = await fetch("/api/ping", {
              method: "GET",
              headers: { "Authorization": "Bearer " + token }
            });

            const data = await resp.json();

            if (resp.ok && data && data.authenticated) {
              setStatus("✅ Backend autenticó el Session Token correctamente.", "green");
            } else {
              setStatus("❌ Backend NO autenticó el token (ver output).", "red");
            }

            log({
              tokenPreview: token ? (token.slice(0, 20) + "...") : null,
              responseStatus: resp.status,
              apiPingResponse: data
            });
          } catch (e) {
            setStatus("❌ Error", "red");
            log({ error: String(e) });
          }
        });
      })();
    </script>
  </body>
</html>`);
});

app.post("/webhooks", express.raw({ type: "*/*" }), (_req, res) =>
  res.status(200).send("ok")
);

app.listen(PORT, () => console.log("Server running on port " + PORT));