const Project = require("../models/project");
const { ingestPdfToChunksDb } = require("../services/RAG-system");
const fs  = require("fs");
const storeMarketResearch = async (req, res) => {
  try {
    const pdf = req.file;
    console.log({  pdf});
    const userId = req.userId;
    const { projectId } = req.body;


    console.log({ body :req.body , pdf});
    
    if (!req.file) {
      return res.status(422).json({
        message: "No pdf provided, Please insert valid file",
      });
    }

    if (!projectId) {
      fs.unlink(pdf.path, (err) => {
        if (err) console.log(err);
      });
      return res.status(400).json({
        message: "projectId is required",
      });
    }

    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) {
      fs.unlink(pdf.path, (err) => {
        if (err) console.log(err);
      });
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const data = await ingestPdfToChunksDb(pdf.path, userId, projectId);

    await Project.findByIdAndUpdate(projectId, { step: 2 });

    res.json({
      message: "market research stored successfuly",
      data,
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




module.exports = {
  storeMarketResearch,
  getUserProjects,
  step1,
};
