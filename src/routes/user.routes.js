const express = require("express");
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  sendSecondaryPhoneOtp,
  sendProfileOtp,
  verifySecondaryPhone,
  sendPasswordResetOtp,
  resetPasswordWithOtp,
  register,
  login,
  createAdminUser,
  getAllUsersForAdmin,
} = require("../controllers/user.controller");
const { checkToken } = require("../middleware/isAuth");

router.post("/register", register);
router.post("/login", login);
router.get("/profile", checkToken, getProfile);
router.patch("/profile", checkToken, updateProfile);
router.patch("/profile/password", checkToken, changePassword);

router.post("/profile/otp/send", checkToken, sendProfileOtp);
router.post(
  "/profile/secondary-phone/otp",
  checkToken,
  sendSecondaryPhoneOtp,
);
router.post(
  "/profile/secondary-phone/send-otp",
  checkToken,
  sendSecondaryPhoneOtp,
);
router.post(
  "/profile/secondary-phone",
  checkToken,
  verifySecondaryPhone,
);
router.post("/profile/password/otp", checkToken, sendPasswordResetOtp);
router.post("/profile/password/send-otp", checkToken, sendPasswordResetOtp);
router.patch("/profile/password/reset", checkToken, resetPasswordWithOtp);

router.get("/admin", createAdminUser);
router.get("/users", checkToken, getAllUsersForAdmin);

module.exports = router;
