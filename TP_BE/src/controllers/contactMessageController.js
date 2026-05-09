import ContactMessage from "../models/ContactMessage.js";
import User from "../models/User.js";
import { createNotification } from "../utils/notification.js";
import { sendContactReplyEmail } from "../services/emailService.js";

export const createContactMessage = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, email, chủ đề và nội dung." });
    }

    let linkedUserId = req.userId || null;
    if (!linkedUserId && email) {
      const linkedUser = await User.findOne({ email }).select("_id").lean();
      linkedUserId = linkedUser?._id || null;
    }

    const created = await ContactMessage.create({
      user_id: linkedUserId,
      name,
      email,
      phone,
      subject,
      message,
    });
    return res.status(201).json({ message: "Đã gửi liên hệ thành công.", item: created });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error?.message || "Lỗi server khi gửi liên hệ." });
  }
};

export const getMyContactMessages = async (req, res) => {
  try {
    const me = await User.findById(req.userId).select("_id email").lean();
    if (!me) return res.status(401).json({ message: "Bạn chưa đăng nhập." });

    const items = await ContactMessage.find({
      $or: [{ user_id: me._id }, { email: String(me.email || "").trim().toLowerCase() }],
    })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ items });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllContactMessagesAdmin = async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim();
    const unreadOnly = String(req.query.unread_only || "").trim() === "1";
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const q = {};
    if (status) q.status = status;
    if (unreadOnly) q.user_read_reply_at = null;
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ name: re }, { email: re }, { phone: re }, { subject: re }, { message: re }];
    }

    const [items, total] = await Promise.all([
      ContactMessage.find(q)
        .populate("replied_by", "name email")
        .sort({ status: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactMessage.countDocuments(q),
    ]);

    return res.json({
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const replyContactMessageAdmin = async (req, res) => {
  try {
    const item = await ContactMessage.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Không tìm thấy liên hệ." });

    const reply = String(req.body?.reply || "").trim();
    if (!reply) return res.status(400).json({ message: "Nội dung phản hồi không được để trống." });

    const desiredStatus = String(req.body?.status || "").trim().toLowerCase();
    const nextStatus = desiredStatus === "closed" ? "closed" : "replied";

    const wasNew = String(item.status) === "new";

    item.admin_reply = reply;
    item.status = nextStatus;
    item.replied_by = req.userId || null;
    item.replied_at = new Date();
    item.user_read_reply_at = null;
    await item.save();

    try {
      let notifyUserId = item.user_id || null;
      if (!notifyUserId && item.email) {
        const linkedUser = await User.findOne({ email: item.email }).select("_id").lean();
        notifyUserId = linkedUser?._id || null;
      }
      if (wasNew && notifyUserId) {
        await createNotification({
          userId: notifyUserId,
          contactMessageId: item._id,
          type: "contact_reply",
          title: "Bạn có phản hồi mới từ khách sạn",
          message: `Chủ đề: ${item.subject}. Phản hồi đã được gửi qua email.`,
          eventKey: `contact_reply_${item._id}_${item.replied_at.getTime()}`,
        });
      }
    } catch {
      // non-blocking notify
    }

    // Auto email to the address provided in the contact form.
    // Gửi email mỗi lần admin lưu phản hồi để đảm bảo người dùng nhận được cập nhật.
    if (item.email) {
      void sendContactReplyEmail({
        to: item.email,
        name: item.name,
        subject: item.subject,
        reply,
      }).catch((err) => {
        console.error("Send contact reply email failed:", err?.message || err);
      });
    }

    return res.json({ message: "Đã lưu phản hồi.", item });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const closeContactMessageAdmin = async (req, res) => {
  try {
    const item = await ContactMessage.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Không tìm thấy liên hệ." });

    item.status = "closed";
    item.replied_by = req.userId || null;
    // Use replied_at as a generic "processed time" for drawer history.
    item.replied_at = item.replied_at || new Date();

    await item.save();
    return res.json({ message: "Đã đóng liên hệ.", item });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Lỗi server khi đóng liên hệ." });
  }
};

export const markContactReplyAsRead = async (req, res) => {
  try {
    const me = await User.findById(req.userId).select("_id email").lean();
    if (!me) return res.status(401).json({ message: "Bạn chưa đăng nhập." });

    const item = await ContactMessage.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Không tìm thấy liên hệ." });

    const isOwner =
      String(item.user_id || "") === String(me._id) ||
      String(item.email || "").trim().toLowerCase() === String(me.email || "").trim().toLowerCase();
    if (!isOwner) return res.status(403).json({ message: "Bạn không có quyền cập nhật liên hệ này." });
    if (!item.admin_reply) return res.status(400).json({ message: "Liên hệ này chưa có phản hồi." });

    item.user_read_reply_at = new Date();
    await item.save();
    return res.json({ message: "Đã đánh dấu đã đọc phản hồi.", item });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
