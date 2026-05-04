/**
 * وحدة سوقية خفيفة لـ RAG: استخراج نص PDF، تقسيم، تخزين، بحث، وسياق للـ prompt.
 * CommonJS — Node.js
 */

const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const MarketResearch = require("../models/marketResarch");

/** @typedef {"market" | "pricing" | "competitors" | "costs"} ChunkType */

const TYPE_KEYWORDS = {
  market: [
    "سوق",
    "السوق",
    "طلب",
    "عملاء",
    "مستهلك",
    "قطاع",
    "نمو",
    "اتجاه",
    "توزيع",
    "جغراف",
    "حصة",
    "توقعات",
    "SWOT",
    "market",
    "demand",
    "customer",
    "segment",
    "growth",
    "trend",
  ],
  pricing: [
    "سعر",
    "تسعير",
    "هامش",
    "خصم",
    "قائمة الأسعار",
    "تكلفة البيع",
    "revenue",
    "price",
    "pricing",
    "margin",
    "discount",
    "fee",
    "subscription",
  ],
  competitors: [
    "منافس",
    "منافسين",
    "بديل",
    "بدائل",
    "حصة سوقية",
    "comparison",
    "competitor",
    "rival",
    "benchmark",
    "substitute",
  ],
  costs: [
    "تكلفة",
    "مصروف",
    "مصاريف",
    "إيجار",
    "رواتب",
    "خامات",
    "تشغيل",
    "CAPEX",
    "OPEX",
    "cost",
    "expense",
    "salary",
    "rent",
    "material",
    "overhead",
  ],
};

const TYPE_ORDER = ["market", "pricing", "competitors", "costs"];

/**
 * إزالة الفراغات الزائدة والأسطر الفارغة المتكررة.
 * @param {string} raw
 */
function cleanText(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[\u200c\u200f\u202a-\u202e]/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * كلمات مفتاحية بسيطة من النص (عربي/لاتيني).
 * @param {string} text
 * @param {number} max
 */
function extractKeywords(text, max = 12) {
  const normalized = text.toLowerCase();
  const tokens = normalized.match(/[\u0600-\u06FFA-Za-z]{3,}/g) || [];
  const seen = new Set();
  const out = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * يحدد نوع الـ chunk بناءً على عدد مطابقة كلمات لكل فئة.
 * @param {string} text
 * @returns {ChunkType}
 */
function detectChunkType(text) {
  const lower = text.toLowerCase();
  let bestType = /** @type {ChunkType} */ ("market");
  let bestScore = -1;

  for (const type of TYPE_ORDER) {
    const list = TYPE_KEYWORDS[type];
    let score = 0;
    for (const kw of list) {
      const k = kw.toLowerCase();
      if (lower.includes(k)) score += k.length >= 4 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return bestScore > 0 ? bestType : "market";
}

/**
 * نقطة قطع مناسبة داخل نافذة نصية (جملة أو سطر).
 * @param {string} slice
 * @param {number} minRel
 */
function findBreakAfter(slice, minRel) {
  const prefer = ["\n\n", "\n", ". ", "।", "؟ ", "! ", "، ", ", "];
  const searchFrom = Math.max(minRel, Math.floor(slice.length * 0.6));
  for (let i = slice.length - 1; i >= searchFrom; i--) {
    for (const sep of prefer) {
      const idx = slice.lastIndexOf(sep, i);
      if (idx >= minRel && idx + sep.length <= slice.length) {
        return idx + sep.length;
      }
    }
  }
  return slice.length;
}

/**
 * تقسيم النص إلى chunks بحجم بين minLen و maxLen حرفًا تقريبًا.
 * @param {string} text
 * @param {number} minLen
 * @param {number} maxLen
 */
function splitIntoChunks(text, minLen = 500, maxLen = 1000) {
  const chunks = [];
  let pos = 0;
  const len = text.length;

  while (pos < len) {
    let end = Math.min(pos + maxLen, len);
    if (end < len) {
      const slice = text.slice(pos, end);
      const relativeMin = Math.min(minLen, slice.length);
      const breakAt = findBreakAfter(slice, relativeMin);
      end = pos + (breakAt > 0 ? breakAt : slice.length);
    }
    const chunk = text.slice(pos, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    pos = end;
  }

  return chunks;
}

/**
 * بناء مصفوفة chunks مع metadata.
 * @param {string[]} rawChunks
 * @param {{ prefix?: string }} opts
 */
function enrichChunks(rawChunks, opts = {}) {
  const prefix = opts.prefix || "chunk";
  return rawChunks.map((text, index) => {
    const id = `${prefix}_${String(index + 1).padStart(4, "0")}`;
    const type = detectChunkType(text);
    const keywords = extractKeywords(text);
    return {
      id,
      text,
      type,
      keywords,
    };
  });
}

/**
 * قراءة PDF من المسار واستخراج النص الخام.
 * @param {string} pdfPath
 */
async function extractTextFromPdf(pdfPath) {
  const absolute = path.resolve(pdfPath);
  const buffer = await fsPromises.readFile(absolute);
  const data = await pdfParse(buffer);
  return typeof data.text === "string" ? data.text : "";
}

/**
 * مسار افتراضي لتخزين النتيجة بجانب المشروع.
 */
const DEFAULT_STORE_PATH = path.join(__dirname, "..", "..", "data", "market-chunks.json");

/**
 * معالجة PDF كاملة: تنظيف، تقسيم، metadata، وحفظ JSON.
 * @param {string} pdfPath مثل market.pdf
 * @param {string} [outputPath]
 * @param {{ minChunk?: number; maxChunk?: number }} [options]
 */
async function ingestPdfToChunksFile(pdfPath, outputPath, options = {}) {
  const minChunk = options.minChunk ?? 500;
  const maxChunk = options.maxChunk ?? 1000;
  const out = outputPath ? path.resolve(outputPath) : DEFAULT_STORE_PATH;

  const rawText = await extractTextFromPdf(pdfPath);
  const cleaned = cleanText(rawText);
  const pieces = splitIntoChunks(cleaned, minChunk, maxChunk);
  const chunks = enrichChunks(pieces, { prefix: "mk" });

  const payload = {
    source: path.basename(pdfPath),
    sourcePath: path.resolve(pdfPath),
    createdAt: new Date().toISOString(),
    chunkCount: chunks.length,
    minChunk,
    maxChunk,
    chunks,
  };

  await fsPromises.mkdir(path.dirname(out), { recursive: true });
  await fsPromises.writeFile(out, JSON.stringify(payload, null, 2), "utf8");

  return { outputPath: out, chunkCount: chunks.length, chunks };
}

/**
 * معالجة PDF كاملة وتخزين الـ chunks في قاعدة البيانات.
 * @param {string} pdfPath
 * @param {string} userId
 * @param {string} projectId
 * @param {{ minChunk?: number; maxChunk?: number }} [options]
 */
async function ingestPdfToChunksDb(pdfPath, userId, projectId, options = {}) {
  const minChunk = options.minChunk ?? 500;
  const maxChunk = options.maxChunk ?? 1000;

  const rawText = await extractTextFromPdf(pdfPath);
  const cleaned = cleanText(rawText);
  const pieces = splitIntoChunks(cleaned, minChunk, maxChunk);
  const chunks = enrichChunks(pieces, { prefix: "mk" });

  const payload = {
    source: path.basename(pdfPath),
    sourcePath: path.resolve(pdfPath),
    createdAt: new Date().toISOString(),
    chunkCount: chunks.length,
    minChunk,
    maxChunk,
    chunks,
    project: projectId,
    user: userId,
  };

  const record = await MarketResearch.create(payload);

  return {
    marketResearchId: record._id,
    chunkCount: record.chunkCount,
    chunks: record.chunks,
  };
}

/**
 * تحميل الـ chunks من ملف JSON.
 * @param {string} [storePath]
 */
async function loadChunksFromFile(storePath) {
  const p = storePath ? path.resolve(storePath) : DEFAULT_STORE_PATH;
  const raw = await fsPromises.readFile(p, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.chunks)) {
    throw new Error("Invalid chunks file: missing chunks array");
  }
  return data;
}

/**
 * تقسيم الاستعلام إلى كلمات للمطابقة.
 * @param {string} q
 */
function tokenizeQuery(q) {
  const s = q.toLowerCase().trim();
  const parts = s.split(/[^\u0600-\u06FFA-Za-z0-9]+/).filter((x) => x.length > 1);
  return [...new Set(parts)];
}

/**
 * يحوّل chunk من MongoDB/Mongoose أو كائنًا عاديًا إلى شكل ثابت للبحث وللطباعة في الـ prompt.
 * كائنات الـ subdocument في Mongoose لا تنتشر ({...chunk}) مثل JSON العادي فيُفقد النص والحقول.
 * @param {unknown} chunk
 * @returns {{ id: string; text: string; type: string; keywords: string[] }}
 */
function normalizeChunkForRag(chunk) {
  if (chunk == null || typeof chunk !== "object") {
    return { id: "", text: "", type: "market", keywords: [] };
  }

  let raw;
  if (
    typeof chunk === "object" &&
    chunk !== null &&
    "toObject" in chunk &&
    typeof /** @type {{ toObject?: (opts?: object) => object }} */ (chunk).toObject ===
      "function"
  ) {
    raw = /** @type {{ toObject: (opts?: object) => object }} */ (chunk).toObject({
      flattenMaps: true,
    });
  } else {
    raw = { .../** @type {Record<string, unknown>} */ (chunk) };
  }

  const id =
    raw.id != null && raw.id !== ""
      ? String(raw.id)
      : raw._id != null
        ? String(raw._id)
        : "";

  const text = raw.text != null ? String(raw.text) : "";
  const type =
    raw.type != null && String(raw.type).trim() !== ""
      ? String(raw.type)
      : "market";

  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.map((k) => String(k))
    : [];

  return { id, text, type, keywords };
}

/**
 * نقاط بسيطة: تطابق النص، الكلمات المفتاحية في الـ chunk، وتطابق نوع محدد.
 * @param {string} query
 * @param {{ id: string; text: string; type: string; keywords: string[] }} chunk
 * @param {{ types?: ChunkType[] }} opts
 */
function scoreChunk(query, chunk, opts = {}) {
  const q = query.toLowerCase().trim();
  const text = String(chunk.text ?? "").toLowerCase();
  const tokens = tokenizeQuery(query);
  let score = 0;

  if (text.includes(q) && q.length > 2) score += 12;

  for (const t of tokens) {
    if (text.includes(t)) score += 3;
    const kw = (chunk.keywords || []).map((k) => String(k).toLowerCase());
    if (kw.some((k) => k.includes(t) || t.includes(k))) score += 5;
  }

  if (opts.types && opts.types.length && opts.types.includes(chunk.type)) score += 4;

  score += Math.min(String(chunk.text ?? "").length / 4000, 1);

  return score;
}

/**
 * بحث في مصفوفة chunks (مثلاً من قاعدة البيانات) وإرجاع أفضل النتائج.
 * @param {Array<{ id: string; text: string; type: string; keywords: string[] }>} chunks
 * @param {string} query
 * @param {{ limit?: number; types?: ChunkType[] }} [options]
 */
function searchChunksInArray(chunks, query, options = {}) {
  const limit = options.limit ?? 5;
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const ranked = chunks
    .map((chunk) => {
      const plain = normalizeChunkForRag(chunk);
      return {
        chunk: plain,
        score: scoreChunk(query, plain, { types: options.types }),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ chunk, score }) => ({
    ...chunk,
    score: Number(score.toFixed(4)),
  }));
}

/**
 * بحث في الـ chunks وإرجاع أفضل النتائج (افتراضيًا 5).
 * @param {string} query
 * @param {{ limit?: number; types?: ChunkType[]; storePath?: string } & Record<string, unknown>} [options]
 */
async function searchChunks(query, options = {}) {
  const storePath = options.storePath;
  const data = await loadChunksFromFile(storePath);
  return searchChunksInArray(data.chunks, query, options);
}

/**
 * تجميع أفضل النتائج كنص واحد للـ prompt.
 * @param {string} query
 * @param {{ limit?: number; types?: ChunkType[]; storePath?: string; separator?: string }} [options]
 */
async function getRelevantContext(query, options = {}) {
  const sep = options.separator ?? "\n\n---\n\n";
  const results = await searchChunks(query, {
    ...options,
    limit: options.limit ?? 5,
  });

  if (results.length === 0) {
    return "";
  }

  const lines = results.map(
    (r, i) =>
      `[${i + 1}] (type=${r.type}, id=${r.id}, score=${r.score})\n${r.text}`,
  );
  return lines.join(sep);
}

/**
 * تجميع سياق RAG من chunks جاهزة (مثل MarketResearch في MongoDB).
 * @param {Array<{ id: string; text: string; type: string; keywords: string[] }>} chunks
 * @param {string} query
 * @param {{ limit?: number; types?: ChunkType[]; separator?: string }} [options]
 */
function getRelevantContextFromChunks(chunks, query, options = {}) {
  const sep = options.separator ?? "\n\n---\n\n";
  const results = searchChunksInArray(chunks, query, {
    ...options,
    limit: options.limit ?? 5,
  });

  if (results.length === 0) {
    return "";
  }

  const lines = results.map(
    (r, i) =>
      `[${i + 1}] (type=${r.type}, id=${r.id}, score=${r.score})\n${r.text}`,
  );
  return lines.join(sep);
}

module.exports = {
  cleanText,
  extractKeywords,
  detectChunkType,
  splitIntoChunks,
  enrichChunks,
  extractTextFromPdf,
  ingestPdfToChunksFile,
  ingestPdfToChunksDb,
  loadChunksFromFile,
  searchChunks,
  searchChunksInArray,
  scoreChunk,
  getRelevantContext,
  getRelevantContextFromChunks,
  DEFAULT_STORE_PATH,
  TYPE_KEYWORDS,
};
