const express = require("express");
const routes = express.Router();
const {
  createRequest,
  getAllRequests,
  getRequestsForUser,
  updateRequest,
  deleteRequest,
} = require("../controllers/request.controller");
const { checkToken } = require("../middleware/isAuth");

routes.post("/create-request", checkToken, createRequest);
routes.get("/all", checkToken, getAllRequests);
routes.get("/my-requests", checkToken, getRequestsForUser);
routes.get("/user/:userId", checkToken, getRequestsForUser);
routes.patch("/:id", checkToken, updateRequest);
routes.delete("/:id", checkToken, deleteRequest);

module.exports = routes;
