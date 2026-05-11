const express = require("express");
const https = require("https");
const http = require("http");
const routes = express.Router();

/**
 * GET /api/proxy/image?url=<encoded pollinations url>
 * Fetches the image server-side and pipes it back — avoids browser CORS/403.
 */
routes.get("/image", (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "url query param is required" });
  }

  // Only allow Pollinations URLs
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ message: "Invalid URL" });
  }

  if (!parsed.hostname.endsWith("pollinations.ai")) {
    return res.status(403).json({ message: "Only pollinations.ai URLs are allowed" });
  }

  const client = parsed.protocol === "https:" ? https : http;

  const request = client.get(
    url,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PPIS-Backend/1.0)",
        Accept: "image/*",
      },
      timeout: 300_000, // 5 minutes
    },
    (upstream) => {
      // Follow redirects (Pollinations often redirects once)
      if (
        upstream.statusCode >= 300 &&
        upstream.statusCode < 400 &&
        upstream.headers.location
      ) {
        upstream.resume();
        const redirectUrl = upstream.headers.location;
        const redirectClient = redirectUrl.startsWith("https") ? https : http;
        redirectClient.get(
          redirectUrl,
          { headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" }, timeout: 300_000 },
          (redirected) => {
            if (redirected.statusCode !== 200) {
              res.status(redirected.statusCode ?? 502).json({
                message: `Pollinations returned ${redirected.statusCode}`,
              });
              redirected.resume();
              return;
            }
            res.setHeader("Content-Type", redirected.headers["content-type"] ?? "image/jpeg");
            res.setHeader("Cache-Control", "public, max-age=86400");
            redirected.pipe(res);
          },
        ).on("error", (err) => {
          if (!res.headersSent) res.status(502).json({ message: err.message });
        });
        return;
      }

      if (upstream.statusCode !== 200) {
        res.status(upstream.statusCode ?? 502).json({
          message: `Pollinations returned ${upstream.statusCode}`,
        });
        upstream.resume();
        return;
      }

      res.setHeader("Content-Type", upstream.headers["content-type"] ?? "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      upstream.pipe(res);
    },
  );

  request.on("timeout", () => {
    request.destroy();
    if (!res.headersSent) res.status(504).json({ message: "Pollinations timed out" });
  });

  request.on("error", (err) => {
    if (!res.headersSent) res.status(502).json({ message: err.message });
  });
});

module.exports = routes;
