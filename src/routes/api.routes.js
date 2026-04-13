const express = require("express");
const routes = express.Router();

/* ------------ User Routes -------------- */
const userRoutes = require("./user.routes");
routes.use("/user", userRoutes);

/* ------------ AI Routes -------------- */
const aiRoutes = require("./ai.routes");
routes.use("/ai", aiRoutes);

module.exports = routes;
