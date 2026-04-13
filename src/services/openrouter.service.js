const OpenAI = require("openai");

/**
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function generateFeasibilityJson(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  const response = await client.responses.create({
    model: "gpt-oss-20b",
    input: prompt,
  });

  return response.output_text;
}

module.exports = {
  generateFeasibilityJson,
};
