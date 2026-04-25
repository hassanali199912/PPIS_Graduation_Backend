const express = require("express");
const routes = express.Router();
const {createRequest} = require("../controllers/request.controller");
const {checkToken} = require("../middleware/isAuth");

routes.post("/create-request",checkToken,createRequest)

module.exports = routes;
