const mongoose = require("mongoose");

const marketChunkSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, required: true },
  keywords: [{ type: String, required: true }],
});

const marketResearchSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    sourcePath: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    chunkCount: { type: Number, required: true },
    minChunk: { type: Number, required: true },
    maxChunk: { type: Number, required: true },
    chunks: { type: [marketChunkSchema], required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

const MarketResearch = mongoose.model("MarketResearch", marketResearchSchema);

module.exports = MarketResearch;