const OpenAI = require("openai");

function wrapOpenRouterError(error) {
  const status = error?.status ?? error?.statusCode;
  const apiMessage =
    error?.error?.message ?? error?.message ?? "OpenRouter request failed";

  if (status === 401 && /user not found/i.test(apiMessage)) {
    throw new Error(
      "OpenRouter rejected the API key (401 User not found). Generate a new key at https://openrouter.ai/settings/keys and update OPENROUTER_API_KEY in .env",
    );
  }

  if (status === 402) {
    throw new Error(
      "OpenRouter account has insufficient credits. Add credits at https://openrouter.ai/settings/credits",
    );
  }

  throw new Error(apiMessage);
}

/**
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function generateFeasibilityJson(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.BASE_URL || "http://localhost",
      "X-Title": "Feasibility Study App",
    },
  });

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const text = response.choices?.[0]?.message?.content;
    if (!text || !String(text).trim()) {
      throw new Error("OpenRouter returned an empty response");
    }

    return String(text).trim();
  } catch (error) {
    wrapOpenRouterError(error);
  }
}

module.exports = {
  generateFeasibilityJson,
};
