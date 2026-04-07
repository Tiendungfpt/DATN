import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Header() {
  const [logo, setLogo] = useState("");
  const [user, setUser] = useState(null);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const loadCurrentUser = async () => {
      try {
        const savedUser = JSON.parse(localStorage.getItem("user") || "null");
        if (savedUser) {
          setUser(savedUser);
        } else {
          setUser({ name: "Khách hàng" });
        }

        const res = await axios.get("http://localhost:3000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profile = res.data || {};
        const mergedUser = { ...(savedUser || {}), ...profile };
        setUser(mergedUser);
        localStorage.setItem("user", JSON.stringify(mergedUser));
      } catch (err) {
        console.error("Lỗi đồng bộ user header:", err);
      }
    };

    loadCurrentUser();
  }, [token]);

  useEffect(() => {
    if (!token) {
      setNotificationItems([]);
      setNotificationUnread(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/users/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setNotificationItems(items.slice(0, 5));
        setNotificationUnread(Number(res.data?.unread || 0));
      } catch (err) {
        console.error("Lỗi tải thông báo header:", err);
      }
    };

    fetchNotifications();
  }, [token]);

  const markAllNotificationsRead = async () => {
    if (!token) return;
    try {
      await axios.patch(
        "http://localhost:3000/api/users/notifications/read-all",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNotificationUnread(0);
      setNotificationItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      console.error("Lỗi đánh dấu thông báo đã đọc:", err);
    }
  };

  const getNotificationTarget = (item) => {
    if (item?.booking_id) {
      return `/thong-tin-tai-khoan?tab=history&bookingId=${item.booking_id}`;
    }
    return "/thong-tin-tai-khoan?tab=notifications";
  };

  const handleNotificationClick = async (item) => {
    if (!item?._id) return;
    try {
      if (!item.is_read && token) {
        await axios.patch(
          `http://localhost:3000/api/users/notifications/${item._id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setNotificationItems((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, is_read: true } : n)),
        );
        setNotificationUnread((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Lỗi mở thông báo:", err);
    } finally {
      navigate(getNotificationTarget(item));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
    window.location.reload();
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow sticky-top py-3">
        <div className="container">
          {/* Logo */}
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <img
              src={
                logo
                  ? `http://localhost:3000/uploads/${logo}`
                  : "http://localhost:3000/uploads/Logo.jpg"
              }
              alt="Thịnh Phát Hotel"
              style={{ height: "55px", objectFit: "contain" }}
            />
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-center gap-1">
              <li className="nav-item">
                <NavLink className="nav-link fw-medium px-3" to="/">
                  Trang chủ
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link fw-medium px-3" to="/khach-san">
                  Danh sách phòng
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link fw-medium px-3" to="/lien-he">
                  Liên hệ
                </NavLink>
              </li>

              {!token ? (
                <>
                  <li className="nav-item ms-3">
                    <NavLink
                      className="btn btn-outline-primary px-4 fw-medium"
                      to="/register"
                    >
                      Đăng ký
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink
                      className="btn btn-primary px-4 fw-medium"
                      to="/login"
                    >
                      Đăng nhập
                    </NavLink>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item ms-3 dropdown">
                    <button
                      className="btn btn-light position-relative"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      title="Thông báo"
                    >
                      <i className="bi bi-bell fs-5"></i>
                      {notificationUnread > 0 ? (
                        <span
                          className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                        >
                          {notificationUnread > 99 ? "99+" : notificationUnread}
                        </span>
                      ) : null}
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end shadow" style={{ minWidth: "350px" }}>
                      <li className="px-3 py-2 d-flex justify-content-between align-items-center">
                        <strong>Thông báo</strong>
                        <button
                          className="btn btn-sm btn-link p-0 text-decoration-none"
                          onClick={markAllNotificationsRead}
                          type="button"
                        >
                          Đọc tất cả
                        </button>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      {notificationItems.length === 0 ? (
                        <li className="px-3 py-2 text-muted small">Chưa có thông báo nào.</li>
                      ) : (
                        notificationItems.map((item) => (
                          <li key={item._id} className="border-bottom">
                            <button
                              type="button"
                              className="dropdown-item px-3 py-2"
                              onClick={() => handleNotificationClick(item)}
                            >
                              <div className="d-flex justify-content-between gap-2">
                                <strong className="small">{item.title}</strong>
                                {!item.is_read ? <span className="badge bg-danger">Mới</span> : null}
                              </div>
                              <div className="small text-muted text-wrap">{item.message}</div>
                            </button>
                          </li>
                        ))
                      )}
                      <li>
                        <button
                          className="dropdown-item text-primary fw-semibold"
                          type="button"
                          onClick={() => navigate("/thong-tin-tai-khoan?tab=notifications")}
                        >
                          Xem tất cả thông báo
                        </button>
                      </li>
                    </ul>
                  </li>

                  {user?.role === "admin" && (
                    <li className="nav-item ms-2">
                      <NavLink
                        className="btn btn-warning px-3 fw-semibold"
                        to="/admin/dashboard"
                      >
                        Admin
                      </NavLink>
                    </li>
                  )}
                  {/* === Phần Dropdown khi đã đăng nhập === */}
                  <li className="nav-item ms-3 dropdown">
                    <a
                      className="nav-link dropdown-toggle fw-medium d-flex align-items-center gap-2"
                      href="#"
                      role="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <i className="bi bi-person-circle fs-5"></i>
                      Xin chào, <span className="fw-semibold">{user?.name}</span>
                    </a>

                    <ul className="dropdown-menu dropdown-menu-end shadow">
                      <li>
                        <a className="dropdown-item" href="/thong-tin-tai-khoan">
                          <i className="bi bi-person me-2"></i>Thông tin tài khoản
                        </a>
                      </li>
                      <li>
                        <a
                          className="dropdown-item"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.href = "/thong-tin-tai-khoan?tab=history";
                          }}
                        >
                          <i className="bi bi-bookmark me-2"></i>
                          Lịch sử đặt phòng
                        </a>
                      </li>
                      <li>
                        <hr className="dropdown-divider" />
                      </li>
                      <li>
                        <button
                          onClick={handleLogout}
                          className="dropdown-item text-danger fw-medium"
                        >
                          <i className="bi bi-box-arrow-right me-2"></i>Đăng xuất
                        </button>
                      </li>
                    </ul>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
