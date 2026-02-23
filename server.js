const express = require("express");
const rawBody = require("raw-body");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.post("/webhooks", async (req, res) => {
  try {
    const hmac = req.get("X-Shopify-Hmac-Sha256");
    const body = await rawBody(req);

    const hash = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(body)
      .digest("base64");

    if (hash !== hmac) {
      return res.status(401).send("HMAC validation failed");
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
});

app.get("/", (req, res) => {
  res.send("App is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});