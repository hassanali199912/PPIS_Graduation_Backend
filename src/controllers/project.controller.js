const mongoose = require("mongoose");
const Project = require("../models/project");
const MarketResearch = require("../models/marketResarch");
const {
  buildFeasibilityPrompt,
  mergeFeasibilityPromptWithRag,
} = require("../services/prompt.service");
const openrouterService = require("../services/openrouter.service");
const {
  ingestPdfToChunksDb,
  getRelevantContextFromChunks,
} = require("../services/RAG-system");
const fs = require("fs");

/**
 * Maps stored questionAnswers[0..23] to q1..q24 for buildFeasibilityPrompt.
 * @param {string[] | undefined} questionAnswers
 */
function questionAnswersToFeasibilityBody(questionAnswers) {
  const body = {};
  const arr = Array.isArray(questionAnswers) ? questionAnswers : [];
  for (let i = 0; i < 24; i++) {
    const v = arr[i];
    body[`q${i + 1}`] =
      v != null && String(v).trim() !== "" ? String(v) : undefined;
  }
  return body;
}

/** @param {{ feasibilityPrompt?: string | null; feasibilityResponse?: unknown }} project */
function hasStoredFeasibility(project) {
  const hasPrompt =
    project.feasibilityPrompt != null &&
    typeof project.feasibilityPrompt === "string" &&
    project.feasibilityPrompt.trim().length > 0;
  const hasResponse =
    project.feasibilityResponse != null &&
    typeof project.feasibilityResponse === "object";
  return hasPrompt && hasResponse;
}
const storeMarketResearch = async (req, res) => {
  try {
    const pdf = req.file;
    const userId = req.userId;
    const { projectId } = req.body;

    console.log({ body: req.body, pdf });

    if (!req.file) {
      return res.status(422).json({
        message: "No pdf provided, Please insert valid file",
      });
    }

    let project =
      projectId && mongoose.Types.ObjectId.isValid(projectId)
        ? await Project.findOne({ _id: projectId, userId })
        : null;

    let createdProject = false;
    if (!project) {
      createdProject = true;
      project = await Project.create({
        userId,
        name: "default Name",
        status: 1,
        step: 1,
      });
    }

    const effectiveProjectId = project._id;

    const data = await ingestPdfToChunksDb(
      pdf.path,
      userId,
      effectiveProjectId,
    );

    await Project.findByIdAndUpdate(effectiveProjectId, { step: 2 });

    res.json({
      message: "market research stored successfuly",
      data,
      projectId: String(effectiveProjectId),
      createdProject,
    });
  } catch (error) {
    res.status(500).json({
      message: "Store Market Feild",
      error: error.message,
    });
  }
};

const getUserProjects = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const projects = await Project.find({ userId }).sort({ createdAt: -1 });

    res.json({
      message: "success",
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get user projects failed",
      error: error.message,
    });
  }
};

const step1 = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const project = await Project.create({
      userId,
      name: "default Name",
      status: 1,
      step: 1,
    });

    res.status(201).json({
      message: "Step 1 project created successfully",
      data: project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Create step 1 project failed",
      error: error.message,
    });
  }
};

const step2 = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId, answers } = req.body;
    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        message: "projectId is required",
      });
    }

    if (answers === undefined || answers === null) {
      return res.status(400).json({
        message: "answers is required (send an array of up to 24 strings)",
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        message: "answers must be an array",
      });
    }

    if (answers.length > 24) {
      return res.status(400).json({
        message: "answers must have at most 24 items (index 0 = question 1)",
      });
    }

    const questionAnswers = answers.map((a) =>
      a === undefined || a === null ? "" : String(a),
    );

    const projectData = await Project.findOneAndUpdate(
      { _id: projectId, userId },
      {
        questionAnswers,
        step: 3,
      },
      { new: true, runValidators: true },
    );

    if (!projectData) {
      return res.status(404).json({
        message: "Project not found or you do not have access to it",
      });
    }

    res.status(200).json({
      message: "Step 2 answers stored successfully",
      data: projectData,
    });
  } catch (error) {
    res.status(500).json({
      message: "Step 2 answers stored project failed",
      error: error.message,
    });
  }
};

const step3 = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.body;
    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        message: "projectId is required",
      });
    }

    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
      return res.status(404).json({
        message: "Project not found or you do not have access to it",
      });
    }

    if (hasStoredFeasibility(project)) {
      return res.status(200).json({
        message: "success",
        cached: true,
        prompt: project.feasibilityPrompt,
        res: project.feasibilityResponse,
      });
    }

    const marketResearch = await MarketResearch.findOne({
      project: projectId,
      user: userId,
    }).sort({ createdAt: -1 });

    const feasibilityBody = questionAnswersToFeasibilityBody(
      project.questionAnswers,
    );

    let prompt = buildFeasibilityPrompt(feasibilityBody);

    const ragQuery =
      `${feasibilityBody.q1 ?? ""} في ${feasibilityBody.q5 ?? ""} تحليل السوق والتكاليف والمنافسين`.trim() ||
      "تحليل السوق والتكاليف والمنافسين";

    if (
      marketResearch &&
      Array.isArray(marketResearch.chunks) &&
      marketResearch.chunks.length > 0
    ) {
      try {
        const ragContext = getRelevantContextFromChunks(
          marketResearch.chunks,
          ragQuery,
          { limit: 5 },
        );        
        prompt = mergeFeasibilityPromptWithRag(prompt, ragContext);
      } catch (err) {
        console.warn("RAG context skipped:", err.message);
      }
    }

   
   
    const outputText = await openrouterService.generateFeasibilityJson(prompt);

    let feasibilityJson;
    try {
      feasibilityJson = JSON.parse(outputText);
    } catch {
      return res.status(502).json({
        message: "AI returned non-JSON response",
        raw: outputText,
      });
    }

    await Project.findByIdAndUpdate(projectId, {
      step: 4,
      feasibilityPrompt: prompt,
      feasibilityResponse: feasibilityJson,
    });

    res.status(200).json({
      message: "success",
      cached: false,
      prompt,
      res: feasibilityJson,
      marketResearchUsed: Boolean(
        marketResearch && marketResearch.chunks?.length,
      ),
    });
  } catch (error) {
    res.status(500).json({
      message: "Step 3 feasibility generation failed",
      error: error.message,
    });
  }
};

module.exports = {
  storeMarketResearch,
  getUserProjects,
  step1,
  step2,
  step3,
};
