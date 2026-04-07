import Notification from "../models/Notification.js";

export const getMyNotifications = async (req, res) => {
  try {
    const items = await Notification.find({ user_id: req.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const unread = items.filter((n) => !n.is_read).length;
    return res.json({ items, unread });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { is_read: true },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }
    return res.json({ message: "Đã đánh dấu đã đọc", notification: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.userId, is_read: false },
      { is_read: true },
    );
    return res.json({ message: "Đã đánh dấu tất cả đã đọc" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
