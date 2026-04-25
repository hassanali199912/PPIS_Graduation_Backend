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
  },
  { timeseries: true },
);

const Project = mongoose.model("Project", projectSchema);
module.exports = Project;
