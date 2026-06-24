const fs = require("fs/promises");
const path = require("path");
const https = require("https");
const http = require("http");
const { v4: uuidv4 } = require("uuid");

/** Matches frontend LogoStyle: icon | text | mix */
const LOGO_STYLE_LABELS = {
  icon: "Icon / symbol only (أيقونة ورمز) — symbol mark only, no wordmark text",
  text: "Wordmark / typography only (اسم بخط مميز) — stylized brand name lettering, minimal or no icon",
  mix: "Combination mark (ميكس بين الاثنين) — balanced icon plus brand name text",
};

/** Matches frontend BrandVibe: pro | fun | lux | min */
const BRAND_VIBE_LABELS = {
  pro: "Professional / corporate — trust and institutional feel (احترافي: ثقة ومؤسسية)",
  fun: "Fun / energetic — lively colors and dynamic energy (مرح وحيوي: ألوان وطاقة)",
  lux: "Luxury / elegant — refined premium details (فاخر وراقي: تفاصيل راقية)",
  min: "Minimal / modern — clean whitespace and calm simplicity (بسيط وعصري: مساحات وهدوء)",
};

/** Matches frontend BrandPalette: as | nile | sun | ai */
const BRAND_PALETTES = {
  as: {
    nameAr: "تراث أسيوط",
    colors: ["#1B4C8C", "#C9A05D", "#F9FAFB", "#111827", "#059669"],
  },
  nile: {
    nameAr: "نيل هادئ",
    colors: ["#0D2F5E", "#38BDF8", "#E5E7EB", "#1E293B", "#22C55E"],
  },
  sun: {
    nameAr: "شمس الصعيد",
    colors: ["#B45309", "#FDE68A", "#FFFBEB", "#422006", "#15803D"],
  },
  ai: {
    nameAr: "AI يختار الألوان",
    colors: [],
  },
};

/** When frontend sends AudienceId instead of Arabic apiValue */
const AUDIENCE_ID_TO_API = {
  youth: "شباب",
  kids: "أطفال",
  business: "رجال أعمال",
  all: "عامة الناس",
};

/**
 * @param {string | undefined} audience
 */
function resolveAudienceLabel(audience) {
  if (audience == null || String(audience).trim() === "") {
    return "عامة الناس";
  }
  const key = String(audience).trim();
  return AUDIENCE_ID_TO_API[key] ?? key;
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
    return `${entry.nameAr}: choose a harmonious professional palette that fits the brand and Egyptian market`;
  }

  return `${entry.nameAr} — use these hex colors: ${entry.colors.join(", ")}`;
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

  const parts = [
    "You are now acting as a Senior Brand Identity Designer with 15 years of experience creating successful logos for global technology and startup companies. Your goal is to generate a powerful, versatile, and instantly recognizable vector-style logo. Focus on strong typography, clean lines, a memorable symbol, and a unified composition that perfectly represents the core values of the brand.",
    `Brand name: "${data.brandName || "My Brand"}"`,
    `Tagline: "${data.tagline || "none"}"`,
    `Business type: "${data.businessType || "general business"}"`,
    `Target audience: "${resolveAudienceLabel(data.audience)}"`,
    `Brand spirit: ${BRAND_VIBE_LABELS[vibeKey] ?? data.vibe ?? BRAND_VIBE_LABELS.pro}`,
    `Logo style: ${LOGO_STYLE_LABELS[styleKey] ?? data.logoStyle ?? LOGO_STYLE_LABELS.mix}`,
    `Color palette: ${resolvePalettePrompt(paletteKey)}`,
    "No mockup, no watermark, no photo background, crisp edges, suitable for website and print",
  ];

  if (data.symbolHint && String(data.symbolHint).trim() !== "") {
    parts.push(`Symbol or visual hint from client: "${String(data.symbolHint).trim()}"`);
  }

  if (options.variationSeed) {
    parts.push(
      `Create a distinct new logo concept (variation ${options.variationSeed}). Use a different icon shape, layout, and visual motif while keeping the same brand identity`,
    );
  }

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
  const baseUrl = process.env.BASE_URL
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
  AUDIENCE_ID_TO_API,
  resolveAudienceLabel,
  resolvePalettePrompt,
  buildLogoPrompt,
  deleteStoredLogoFile,
  generateAndSaveLogo,
};
