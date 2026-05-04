const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    assigenTo: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: Number,
    },
    step: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      default: 1,
    },
    questionAnswers: {
      type: [String],
      default: [],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length <= 24;
        },
        message: "questionAnswers must have at most 24 entries (index 0 = question 1)",
      },
    },
    feasibilityPrompt: {
      type: String,
      default: null,
    },
    feasibilityResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timeseries: true },
);

const Project = mongoose.model("Project", projectSchema);
module.exports = Project;
