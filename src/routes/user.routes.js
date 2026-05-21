const express = require("express");
const router = express.Router();
const {
  register,
  login,
  createAdminUser,
  getAllUsersForAdmin,
} = require("../controllers/user.controller");
const { checkToken } = require("../middleware/isAuth");

router.post("/register", register);
router.post("/login", login);
router.get("/admin", createAdminUser);
router.get("/users", checkToken, getAllUsersForAdmin);

module.exports = router;
