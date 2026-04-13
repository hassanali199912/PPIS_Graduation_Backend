const { defaultFeasibilityInput } = require("../models/feasibilityStudy.schema");
const { buildFeasibilityPrompt } = require("../services/prompt.service");
const openrouterService = require("../services/openrouter.service");
const googleGenaiService = require("../services/google-genai.service");

const useGoogle = async (req, res) => {
  try {
    const prompt = buildFeasibilityPrompt(defaultFeasibilityInput);
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
    const prompt = buildFeasibilityPrompt(defaultFeasibilityInput);
    const outputText = await openrouterService.generateFeasibilityJson(prompt);
    console.log(outputText);

    res.json({
      message: "success",
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
