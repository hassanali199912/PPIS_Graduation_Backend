const fs = require("fs/promises");
const path = require("path");
const https = require("https");
const http = require("http");
const { v4: uuidv4 } = require("uuid");

/** Matches frontend LogoStyle: icon | text | mix */
const LOGO_STYLE_LABELS = {
  icon: "Icon / symbol only — symbol mark only, no wordmark text, no letters",
  text: "Wordmark / typography only — stylized brand name lettering, minimal or no icon",
  mix: "Combination mark — balanced icon plus brand name text",
};

/** Matches frontend BrandVibe: pro | fun | lux | min */
const BRAND_VIBE_LABELS = {
  pro: "Professional / corporate — trust and institutional feel",
  fun: "Fun / energetic — lively colors and dynamic energy",
  lux: "Luxury / elegant — refined premium details",
  min: "Minimal / modern — clean whitespace and calm simplicity",
};

/** Matches frontend BrandPalette: as | nile | sun | ai */
const BRAND_PALETTES = {
  as: {
    nameEn: "Assiut Heritage",
    colors: ["#1B4C8C", "#C9A05D", "#F9FAFB", "#111827", "#059669"],
  },
  nile: {
    nameEn: "Calm Nile",
    colors: ["#0D2F5E", "#38BDF8", "#E5E7EB", "#1E293B", "#22C55E"],
  },
  sun: {
    nameEn: "Upper Egypt Sun",
    colors: ["#B45309", "#FDE68A", "#FFFBEB", "#422006", "#15803D"],
  },
  ai: {
    nameEn: "AI-selected palette",
    colors: [],
  },
};

/** When frontend sends AudienceId instead of a display label */
const AUDIENCE_ID_TO_LABEL = {
  youth: "Youth",
  kids: "Children",
  business: "Business professionals",
  all: "General public",
};

const LOGO_TEXT_READABILITY_RULES = [
  "The ONLY text allowed in the image is the brand name — spelled exactly once, nothing else",
  "Do NOT render tagline, slogan, business type, dates, URLs, or any secondary text in the image",
  "Do NOT add curved text, circular text, text on rings, badges, seals, borders, or emblems",
  "Do NOT add decorative letter strings, random glyphs, fake words, or filler typography anywhere",
  "Do NOT put text in corners, edges, or around the logo perimeter",
  "Typography must be crystal clear: sharp, evenly spaced, correctly spelled brand name only",
  "No distorted, melted, blurred, overlapping, or gibberish text",
  "High contrast between logo and background; plain solid white or light background only",
  "Flat minimal vector-style logo; clean edges; readable at small sizes",
  "Simple centered composition with generous empty space — no clutter",
];

const LOGO_NO_EXTRA_TEXT_RULES = [
  "Strict text limit: zero extra words beyond the single brand name wordmark",
  "No mockup frame, no watermark, no photo background, no 3D scene, no busy patterns",
  "No stamp, certificate, label, ribbon, banner, or subtitle under the logo",
];

/**
 * @param {string} text
 */
function containsArabicScript(text) {
  return /[\u0600-\u06FF]/.test(String(text));
}

/**
 * @param {string | undefined} audience
 */
function resolveAudienceLabel(audience) {
  if (audience == null || String(audience).trim() === "") {
    return "General public";
  }
  const key = String(audience).trim();
  return AUDIENCE_ID_TO_LABEL[key] ?? key;
}

/**
 * @param {string | undefined} paletteId
 */
function resolvePalettePrompt(paletteId) {
  const id = paletteId != null ? String(paletteId).trim() : "as";
  const entry = BRAND_PALETTES[id];

  if (!entry) {
    return String(paletteId ?? "balanced professional colors");
  }

  if (id === "ai" || entry.colors.length === 0) {
    return `${entry.nameEn}: choose a harmonious professional palette that fits the brand and Egyptian market`;
  }

  return `${entry.nameEn} — use these hex colors: ${entry.colors.join(", ")}`;
}

/**
 * @param {string | null | undefined} logoUrl
 * @returns {string | null}
 */
function logoUrlToLocalPath(logoUrl) {
  if (!logoUrl) return null;

  let pathname;
  try {
    const urlStr = String(logoUrl);
    pathname = urlStr.startsWith("http") ? new URL(urlStr).pathname : urlStr;
  } catch {
    return null;
  }

  if (!pathname.includes("/uploads/logos/")) return null;

  const logosDir = path.resolve(process.cwd(), "uploads", "logos");
  const filePath = path.resolve(logosDir, path.basename(pathname));

  if (!filePath.startsWith(logosDir + path.sep) && filePath !== logosDir) {
    return null;
  }

  return filePath;
}

/**
 * @param {string | null | undefined} logoUrl
 */
async function deleteStoredLogoFile(logoUrl) {
  const filePath = logoUrlToLocalPath(logoUrl);
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err && err.code !== "ENOENT") {
      console.warn("Failed to delete old logo file:", err.message);
    }
  }
}

/**
 * @param {Record<string, string | undefined>} data
 * @param {{ variationSeed?: string }} [options]
 */
function buildLogoPrompt(data, options = {}) {
  const vibeKey = data.vibe != null ? String(data.vibe).trim() : "pro";
  const styleKey = data.logoStyle != null ? String(data.logoStyle).trim() : "mix";
  const paletteKey = data.palette != null ? String(data.palette).trim() : "as";
  const brandName = String(data.brandName || "My Brand").trim();
  const styleLabel =
    LOGO_STYLE_LABELS[styleKey] ?? data.logoStyle ?? LOGO_STYLE_LABELS.mix;

  const parts = [
    "You are a senior brand identity designer creating a minimal professional vector logo",
    "English-only design brief",
    `Brand name — the ONLY text that may appear in the image: "${brandName}"`,
    `Tagline (context only — do NOT write this in the image): "${data.tagline || "none"}"`,
    `Business type (context only — do NOT write this in the image): "${data.businessType || "general business"}"`,
    `Target audience: "${resolveAudienceLabel(data.audience)}"`,
    `Brand spirit: ${BRAND_VIBE_LABELS[vibeKey] ?? data.vibe ?? BRAND_VIBE_LABELS.pro}`,
    `Logo style: ${styleLabel}`,
    `Color palette: ${resolvePalettePrompt(paletteKey)}`,
    ...LOGO_TEXT_READABILITY_RULES,
    ...LOGO_NO_EXTRA_TEXT_RULES,
  ];

  if (styleKey === "icon") {
    parts.push(
      "Symbol-only logo: pure icon/mark with absolutely no letters, numbers, or words anywhere in the image",
    );
  } else if (styleKey === "text") {
    parts.push(
      `Wordmark-only: show "${brandName}" once, centered, bold clean sans-serif — no icon, no ring, no circle border, no surrounding text`,
    );
  } else {
    parts.push(
      `Combination logo: simple icon plus "${brandName}" wordmark only — icon and brand name, nothing else`,
      "Horizontal or stacked layout; no circular badge, no text wrapped around the icon, no double rings",
    );
  }

  if (containsArabicScript(brandName) && styleKey !== "icon") {
    parts.push(
      `Arabic brand name: render "${brandName}" once with proper connected Arabic letter shapes, OR use one clear Latin transliteration — no extra Arabic or English text around it`,
    );
  }

  if (data.symbolHint && String(data.symbolHint).trim() !== "") {
    parts.push(
      `Symbol or visual hint from client: "${String(data.symbolHint).trim()}"`,
    );
  }

  if (options.variationSeed) {
    parts.push(
      `Variation ${options.variationSeed}: new icon shape and layout, same rules — brand name only, no extra text`,
    );
  }

  parts.push(
    "Final check: image contains logo graphic plus brand name only — remove any other letters or symbols that look like text",
  );

  return parts.join(". ");
}

/**
 * @param {string} url
 * @param {number} [redirects]
 * @returns {Promise<Buffer>}
 */
function downloadImage(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      reject(err);
      return;
    }

    const client = parsed.protocol === "https:" ? https : http;

    const request = client.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Feasibility-Backend/1.0)",
          Accept: "image/*",
        },
        timeout: 300_000,
      },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location &&
          redirects > 0
        ) {
          response.resume();
          const nextUrl = new URL(response.headers.location, url).toString();
          downloadImage(nextUrl, redirects - 1).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(
            new Error(
              `Image provider returned status ${response.statusCode ?? "unknown"}`,
            ),
          );
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      },
    );

    request.on("timeout", () => {
      request.destroy();
      reject(new Error("Image generation timed out"));
    });

    request.on("error", reject);
  });
}

/**
 * Generates a logo via Pollinations, saves it under uploads/logos, returns public URL.
 * @param {string} prompt
 * @param {{ seed?: string; replaceLogoUrl?: string | null }} [options] replaceLogoUrl — previous logo path; deleted only after the new image is saved
 */
async function generateAndSaveLogo(prompt, options = {}) {
  const seed =
    options.seed ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const encodedPrompt = encodeURIComponent(prompt);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${encodeURIComponent(seed)}`;

  const imageBuffer = await downloadImage(pollinationsUrl);

  const logosDir = path.resolve(process.cwd(), "uploads", "logos");
  await fs.mkdir(logosDir, { recursive: true });

  const filename = `${uuidv4()}-logo.png`;
  const filePath = path.join(logosDir, filename);
  await fs.writeFile(filePath, imageBuffer);

  const relativeUrl = `/uploads/logos/${filename}`;
  const baseUrl = process.env.BASE_URL || "http://localhost:8090"
    ? String(process.env.BASE_URL).replace(/\/$/, "")
    : "";
  const logoUrl = baseUrl ? `${baseUrl}${relativeUrl}` : relativeUrl;

  // Remove previous logo only after the new file is saved (keep old logo if generation failed).
  if (options.replaceLogoUrl) {
    await deleteStoredLogoFile(options.replaceLogoUrl);
  }

  return {
    filePath,
    filename,
    logoUrl,
    relativeUrl,
    logoPrompt: prompt,
    pollinationsUrl,
    seed,
  };
}

module.exports = {
  LOGO_STYLE_LABELS,
  BRAND_VIBE_LABELS,
  BRAND_PALETTES,
  AUDIENCE_ID_TO_LABEL,
  LOGO_TEXT_READABILITY_RULES,
  LOGO_NO_EXTRA_TEXT_RULES,
  resolveAudienceLabel,
  resolvePalettePrompt,
  buildLogoPrompt,
  deleteStoredLogoFile,
  generateAndSaveLogo,
};
