const mongoose = require("mongoose");
const Notification = require("../models/notification");

const NotificationType = Notification.NotificationType;
const NotificationPriority = Notification.NotificationPriority;

const POPULATE_FIELDS = [
  { path: "userId", select: "name email phoneNumber role" },
  { path: "actorId", select: "name email phoneNumber role" },
];

/**
 * @param {import("express").Request} req
 * @param {import("mongoose").Document | null} notification
 */
function canAccessNotification(req, notification) {
  if (!notification) return false;
  if (req.role === "admin") return true;
  return String(notification.userId) === String(req.userId);
}

const createNotification = async (req, res) => {
  try {
    const {
      userId,
      actorId,
      type,
      priority,
      title,
      message,
      isRead,
      metadata,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "title and message are required",
      });
    }

    let targetUserId = userId;

    if (req.role === "admin") {
      if (!targetUserId) {
        return res.status(400).json({
          message: "userId is required",
        });
      }
    } else {
      targetUserId = req.userId;
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    if (actorId != null && !mongoose.Types.ObjectId.isValid(actorId)) {
      return res.status(400).json({ message: "Invalid actorId" });
    }

    const notification = await Notification.create({
      userId: targetUserId,
      actorId: actorId ?? req.userId ?? null,
      type,
      priority,
      title,
      message,
      isRead: req.role === "admin" ? isRead : false,
      metadata: metadata ?? {},
    });

    const populated = await Notification.findById(notification._id).populate(
      POPULATE_FIELDS,
    );

    res.status(201).json({
      message: "Notification created successfully",
      data: populated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({
      message: "Create notification failed",
      error: error.message,
    });
  }
};

const getAllNotifications = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { type, priority, isRead } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (isRead !== undefined) filter.isRead = isRead === "true";

    const notifications = await Notification.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 });

    res.json({
      message: "success",
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get all notifications failed",
      error: error.message,
    });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const { type, priority, isRead } = req.query;
    const filter = { userId: req.userId };

    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (isRead !== undefined) filter.isRead = isRead === "true";

    const notifications = await Notification.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 });

    res.json({
      message: "success",
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get my notifications failed",
      error: error.message,
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.userId,
      isRead: false,
    });

    res.json({
      message: "success",
      count,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get unread count failed",
      error: error.message,
    });
  }
};

const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findById(id).populate(
      POPULATE_FIELDS,
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!canAccessNotification(req, notification)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({
      message: "success",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get notification failed",
      error: error.message,
    });
  }
};

const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!canAccessNotification(req, notification)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const allowedFields =
      req.role === "admin"
        ? ["type", "priority", "title", "message", "isRead", "metadata", "actorId"]
        : ["isRead"];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updated = await Notification.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate(POPULATE_FIELDS);

    res.json({
      message: "Notification updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({
      message: "Update notification failed",
      error: error.message,
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!canAccessNotification(req, notification)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updated = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true, runValidators: true },
    ).populate(POPULATE_FIELDS);

    res.json({
      message: "Notification marked as read",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Mark notification as read failed",
      error: error.message,
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { isRead: true },
    );

    res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      message: "Mark all notifications as read failed",
      error: error.message,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!canAccessNotification(req, notification)) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Notification.findByIdAndDelete(id);

    res.json({
      message: "Notification deleted successfully",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      message: "Delete notification failed",
      error: error.message,
    });
  }
};

module.exports = {
  NotificationType,
  NotificationPriority,
  createNotification,
  getAllNotifications,
  getMyNotifications,
  getUnreadCount,
  getNotificationById,
  updateNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
