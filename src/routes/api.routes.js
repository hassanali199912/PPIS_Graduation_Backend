const express = require("express");
const routes = express.Router();

/* ------------ User Routes -------------- */
const userRoutes = require("./user.routes");
routes.use("/user", userRoutes);

/* ------------ AI Routes -------------- */
const aiRoutes = require("./ai.routes");
routes.use("/ai", aiRoutes);

/* ------------ Project Routes -------------- */
const projectRoutes = require("./project.routes");
routes.use("/project", projectRoutes);

/* ------------ Project Routes -------------- */
const requestRoutes = require("./request.routes");
routes.use("/request", requestRoutes);

module.exports = routes;
