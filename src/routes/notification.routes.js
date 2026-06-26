const express = require("express");
const routes = express.Router();
const {
  createNotification,
  getAllNotifications,
  getMyNotifications,
  getUnreadCount,
  getNotificationById,
  updateNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require("../controllers/notification.controller");
const { checkToken } = require("../middleware/isAuth");

routes.post("/", checkToken, createNotification);
routes.get("/all", checkToken, getAllNotifications);
routes.get("/my", checkToken, getMyNotifications);
routes.get("/unread-count", checkToken, getUnreadCount);
routes.patch("/read-all", checkToken, markAllNotificationsAsRead);
routes.get("/:id", checkToken, getNotificationById);
routes.patch("/:id/read", checkToken, markNotificationAsRead);
routes.patch("/:id", checkToken, updateNotification);
routes.delete("/:id", checkToken, deleteNotification);

module.exports = routes;
