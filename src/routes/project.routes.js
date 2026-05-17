const express = require("express");
const fileUpload = require("../services/multer");
const routes = express.Router();
const {
  storeMarketResearch,
  getUserProjects,
  step1,
  step2,
  step3,
  step4,
  getProjectData,
  saveLogo,
} = require("../controllers/project.controller");
const { checkToken } = require("../middleware/isAuth");

routes.post(
  "/market-research",
  checkToken,
  fileUpload.single("pdf"),
  storeMarketResearch,
);
routes.get("/get-my-projects", checkToken, getUserProjects);
routes.get("/step1", checkToken, step1);
routes.post("/step2", checkToken, step2);
routes.post("/step3", checkToken, step3);
routes.post("/step4", checkToken, step4);
routes.get("/get-project/:projectId", checkToken, getProjectData);
routes.post("/save-logo", checkToken, saveLogo);

module.exports = routes;
