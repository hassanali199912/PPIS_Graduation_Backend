const express = require("express");
const router = express.Router();
const {
  useGoogle,
  useOpenAi,
} = require("../controllers/ai.controller");

router.post("/openai", useOpenAi);
router.get("/googelai", useGoogle);

module.exports = router;
