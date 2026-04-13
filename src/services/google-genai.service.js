const { GoogleGenAI } = require("@google/genai");

/**
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function generateFeasibilityJson(prompt) {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENAI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const text = response.text;
  if (text == null || text === "") {
    throw new Error("Gemini returned no text");
  }
  return text;
}

module.exports = {
  generateFeasibilityJson,
};
