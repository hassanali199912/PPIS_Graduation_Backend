const express = require("express");
const fileUpload = require("../services/multer");
const routes = express.Router();
const {storeMarketResearch , getUserProjects,step1} = require("../controllers/project.controller");
const {checkToken} = require("../middleware/isAuth");

routes.post("/market-research",checkToken, fileUpload.single("pdf"),storeMarketResearch)
routes.get("/get-my-projects",checkToken,getUserProjects)
routes.get("/step1",checkToken,step1)

module.exports = routes;
