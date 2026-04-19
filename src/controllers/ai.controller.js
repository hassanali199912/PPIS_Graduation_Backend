const {
  defaultFeasibilityInput,
} = require("../models/feasibilityStudy.schema");
const {
  buildFeasibilityPrompt,
  mergeFeasibilityPromptWithRag,
} = require("../services/prompt.service");
const openrouterService = require("../services/openrouter.service");
const googleGenaiService = require("../services/google-genai.service");
const { getRelevantContext } = require("../services/RAG-system");

const RAG_FIELD_NAMES = ["ragQuery", "chunksPath", "ragLimit", "ragTypes"];

const LEGACY_WIZARD_KEYS = new Set([
  "project_name",
  "description",
  "location",
  "target_audience",
  "budget",
  "brand_style",
]);

function stripRagFields(obj) {
  const out = { ...obj };
  for (const k of RAG_FIELD_NAMES) delete out[k];
  return out;
}

function hasAnyQuestionKey(obj) {
  if (!obj || typeof obj !== "object") return false;
  return Object.keys(obj).some((k) => /^q\d+$/i.test(String(k)));
}

/**
 * توحيد المفاتيح إلى q1..q24 (حتى لو أرسلها العميل Q1 أو Question1 لاحقًا).
 * @param {Record<string, unknown>} filtered
 */
function normalizeWizardShape(filtered) {
  const normalized = {};
  for (const [k, v] of Object.entries(filtered)) {
    const key = String(k).trim();
    const m = /^q(\d+)$/i.exec(key);
    if (m) normalized[`q${m[1]}`] = v;
    else if (LEGACY_WIZARD_KEYS.has(key)) normalized[key] = v;
  }
  return normalized;
}

/**
 * يستخرج أسئلة الـ wizard من الجسم مباشرة أو من questions / answers / wizard / data.
 */
function extractWizardPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};

  let raw = stripRagFields(body);

  if (!hasAnyQuestionKey(raw)) {
    let nested =
      body.questions ||
      body.answers ||
      body.wizard ||
      (typeof body.data === "object" &&
      body.data !== null &&
      !Array.isArray(body.data)
        ? body.data
        : null);

    if (typeof nested === "string") {
      try {
        nested = JSON.parse(nested);
      } catch {
        nested = null;
      }
    }

    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      raw = stripRagFields(nested);
    }
  }

  if (!hasAnyQuestionKey(raw)) return {};

  const filtered = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k).trim();
    if (/^q\d+$/i.test(key) || LEGACY_WIZARD_KEYS.has(key)) filtered[key] = v;
  }

  return normalizeWizardShape(filtered);
}

/**
 * يفصل حقول RAG عن بيانات الـ wizard.
 * @param {Record<string, unknown>} body
 */
function pickWizardAndRag(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      wizardData: defaultFeasibilityInput,
      ragQuery: null,
      ragOptions: {},
    };
  }

  const ragQuery = body.ragQuery;
  const chunksPath = body.chunksPath;
  const ragLimit = body.ragLimit;
  const ragTypes = body.ragTypes;

  const normalizedWizard = extractWizardPayload(body);

  const hasWizard =
    Object.keys(normalizedWizard).length > 0 &&
    (Object.keys(normalizedWizard).some((k) => /^q\d+$/.test(k)) ||
      normalizedWizard.project_name != null ||
      normalizedWizard.description != null);

  const wizardData = hasWizard ? normalizedWizard : defaultFeasibilityInput;

  const ragOptions = {};
  if (chunksPath != null && chunksPath !== "")
    ragOptions.storePath = chunksPath;
  if (ragLimit != null) ragOptions.limit = Number(ragLimit) || 5;
  if (Array.isArray(ragTypes) && ragTypes.length) ragOptions.types = ragTypes;

  return {
    wizardData,
    ragQuery:
      ragQuery != null && String(ragQuery).trim() !== ""
        ? String(ragQuery).trim()
        : null,
    ragOptions,
  };
}

async function buildPromptWithOptionalRag(body) {

  let prompt = buildFeasibilityPrompt(body);
  const ragQuery = `${body.q1} في ${body.q5} تحليل السوق والتكاليف والمنافسين`;

  if (!ragQuery) return prompt;

  try {
    const ragContext = await getRelevantContext(ragQuery,{});
    prompt = mergeFeasibilityPromptWithRag(prompt, ragContext);
  } catch (err) {
    console.warn("RAG context skipped:", err.message);
  }

  return prompt;
}

const useGoogle = async (req, res) => {
  try {
    const prompt = await buildPromptWithOptionalRag(req.body);
    const text = await googleGenaiService.generateFeasibilityJson(prompt);
    console.log(text);
    res.json({
      message: "success",
      res: JSON.parse(text),
    });
  } catch (error) {
    res.json({
      message: "error happen",
      error: error,
    });
  }
};

const useOpenAi = async (req, res) => {
  try {
    const prompt = await buildPromptWithOptionalRag(req.body);

    const outputText = await openrouterService.generateFeasibilityJson(prompt);

    res.json({
      message: "success",
      prompt,
      res: JSON.parse(outputText),
    });
  } catch (error) {
    res.json({
      message: "error happen",
      error: error,
    });
  }
};

const isWorking = async (req, res) => {
  try {
    res.json({
      message: "success",
    });
  } catch (error) {
    res.json({
      message: "error happen ",
      error: error,
    });
  }
};

module.exports = {
  useOpenAi,
  isWorking,
  useGoogle,
};
