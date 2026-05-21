const Request = require("../models/request");

const createRequest = async (req, res) => {
  try {
    const { projectId, type } = req.body;
    const userId = req.userId;

    if (!projectId || !userId || !type) {
      return res.status(400).json({
        message: "projectId, userId and type are required",
      });
    }

    const request = await Request.create({
      projectId,
      userId,
      assignedSpecialistId: null,
      type,
      status: "PENDING",
      adminNotes: "",
      completedAt: null,
    });

    res.status(201).json({
      message: "Request created successfully",
      data: request,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({
      message: "Create request failed",
      error: error.message,
    });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const requests = await Request.find()
      .populate("projectId")
      .populate("userId")
      .populate("assignedSpecialistId");

    res.json({
      message: "success",
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get requests failed",
      error: error.message,
    });
  }
};

const getRequestsForUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.userId;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    const requests = await Request.find({ userId })
      .populate("projectId")
      .populate("assignedSpecialistId");

    res.json({
      message: "success",
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get user requests failed",
      error: error.message,
    });
  }
};

const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const request = await Request.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate("projectId")
    .populate("userId")
    .populate("assignedSpecialistId");;

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    res.json({
      message: "Request updated successfully",
      data: request,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({
      message: "Update request failed",
      error: error.message,
    });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findByIdAndDelete(id);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    res.json({
      message: "Request deleted successfully",
      data: request,
    });
  } catch (error) {
    res.status(500).json({
      message: "Delete request failed",
      error: error.message,
    });
  }
};

module.exports = {
  createRequest,
  getAllRequests,
  getRequestsForUser,
  updateRequest,
  deleteRequest,
};
