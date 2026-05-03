import Notification from "../models/Notification.js";
import ContactMessage from "../models/ContactMessage.js";
import User from "../models/User.js";

async function syncContactReplyRead(notification, userId, userEmail = "") {
  if (!notification) return;
  if (notification.type !== "contact_reply") return;
  const fallbackContactId = String(notification.event_key || "").match(
    /^contact_reply_([a-f\d]{24})_/i,
  )?.[1];
  const contactId = notification.contact_message_id || fallbackContactId;
  if (!contactId) return;

  const normalizedEmail = String(userEmail || "").trim().toLowerCase();
  const contact = await ContactMessage.findOne({
    _id: contactId,
    $or: [
      { user_id: userId },
      ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
    ],
    admin_reply: { $ne: null },
  });
  if (!contact) return;
  if (contact.user_read_reply_at) return;

  contact.user_read_reply_at = new Date();
  await contact.save();
}

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
    const me = await User.findById(req.userId).select("email").lean();
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { is_read: true },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }
    await syncContactReplyRead(updated, req.userId, me?.email);
    return res.json({ message: "Đã đánh dấu đã đọc", notification: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const me = await User.findById(req.userId).select("email").lean();
    const contactReplyNotis = await Notification.find({
      user_id: req.userId,
      is_read: false,
      type: "contact_reply",
      contact_message_id: { $ne: null },
    })
      .select("_id type contact_message_id")
      .lean();

    await Notification.updateMany(
      { user_id: req.userId, is_read: false },
      { is_read: true },
    );

    for (const notification of contactReplyNotis) {
      await syncContactReplyRead(notification, req.userId, me?.email);
    }

    return res.json({ message: "Đã đánh dấu tất cả đã đọc" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
