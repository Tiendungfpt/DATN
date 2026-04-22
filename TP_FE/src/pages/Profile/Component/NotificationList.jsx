import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN");
}

export default function NotificationList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const token = localStorage.getItem("token");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/users/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setUnread(Number(res.data?.unread || 0));
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchNotifications();
  }, [token]);

  const markOneRead = async (id) => {
    try {
      await axios.patch(
        `/api/users/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, is_read: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc:", err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(
        "/api/users/notifications/read-all",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch (err) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  };

  const getNotificationTarget = (item) => {
    if (item?.booking_id) {
      return `/thong-tin-tai-khoan?tab=history&bookingId=${item.booking_id}`;
    }
    return "/thong-tin-tai-khoan?tab=notifications";
  };

  const openNotification = async (item) => {
    try {
      if (!item.is_read) {
        await markOneRead(item._id);
      }
    } finally {
      navigate(getNotificationTarget(item));
    }
  };

  if (loading) {
    return <p className="text-muted">Đang tải thông báo...</p>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Thông báo hệ thống</h4>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-danger">{unread} chưa đọc</span>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={markAllRead}
            disabled={unread === 0}
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-muted">Bạn chưa có thông báo nào.</div>
      ) : (
        <div className="d-grid gap-3">
          {items.map((n) => (
            <div
              key={n._id}
              className={`border rounded-3 p-3 ${n.is_read ? "bg-light" : "bg-white"}`}
            >
              <div className="d-flex justify-content-between gap-2">
                <div>
                  <button
                    type="button"
                    className="btn btn-link p-0 text-start fw-semibold text-decoration-none"
                    onClick={() => openNotification(n)}
                  >
                    {n.title}
                  </button>
                  <div className="text-muted small">{n.message}</div>
                  <div className="text-secondary small mt-1">
                    {formatDateTime(n.createdAt)}
                  </div>
                </div>
                {!n.is_read ? (
                  <button
                    className="btn btn-sm btn-outline-success"
                    onClick={() => markOneRead(n._id)}
                  >
                    Đã đọc
                  </button>
                ) : (
                  <span className="badge bg-secondary">Đã đọc</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
