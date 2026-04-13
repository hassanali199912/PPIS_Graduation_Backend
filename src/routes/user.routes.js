const express = require("express");
const router = express.Router();
const {
  register,
  login,
  createAdminUser,
} = require("../controllers/user.controller");

router.post("/register", register);
router.post("/login", login);
router.get("/admin", createAdminUser);

module.exports = router;
