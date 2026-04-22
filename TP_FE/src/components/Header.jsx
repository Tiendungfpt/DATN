import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./HanoiHeader.css";

export default function Header() {
  const [logo, setLogo] = useState("");
  const [user, setUser] = useState(null);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
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

        const res = await axios.get("/api/users/profile", {
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
        const res = await axios.get("/api/users/notifications", {
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
        "/api/users/notifications/read-all",
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
          `/api/users/notifications/${item._id}/read`,
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
      setOpenMenu(false);
      navigate(getNotificationTarget(item));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setOpenMenu(false);
    navigate("/login");
    window.location.reload();
  };

  const navItems = useMemo(
    () => [
      { to: "/", label: "Trang chủ" },
      { to: "/khach-san", label: "Hạng phòng" },
      { to: "/lien-he", label: "Liên hệ" },
    ],
    [],
  );

  useEffect(() => {
    const onDocDown = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpenMenu(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const shortName = String(user?.name || "Khách").trim().split(/\s+/).slice(-1)[0] || "Khách";
  const initial = String(user?.name || "U").trim().charAt(0).toUpperCase() || "U";
  const avatarSrc = user?.avatar ? `/uploads/${user.avatar}` : "";
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  return (
    <>
      <header className="hh-header">
        <div className="hh-container hh-header-inner">
          <Link className="hh-logo" to="/">
            <img
              src={logo ? `/uploads/${logo}` : "/uploads/Logo.jpg"}
              alt="Hanoi Hotel"
            />
          </Link>

          <nav className="hh-nav" aria-label="Main navigation">
            {navItems.map((it) => (
              <NavLink key={it.to} to={it.to} end>
                {it.label}
              </NavLink>
            ))}
          </nav>

          <div className="hh-header-right">
            {!token ? (
              <>
                <span className="hh-user">Xin chào</span>
                <button type="button" className="hh-btn-gold" onClick={() => navigate("/login")}>
                  Đăng nhập
                </button>
              </>
            ) : (
              <div className="hh-account" ref={menuRef}>
                <button
                  type="button"
                  className="hh-account-btn"
                  onClick={() => setOpenMenu((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={openMenu}
                >
                  <span className="hh-avatar" aria-hidden="true">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" />
                    ) : (
                      initial
                    )}
                  </span>
                  <span className="hh-account-name">Xin chào, {shortName}</span>
                  {notificationUnread > 0 ? (
                    <span className="hh-pill" aria-label={`Có ${notificationUnread} thông báo chưa đọc`}>
                      {notificationUnread > 9 ? "9+" : notificationUnread}
                    </span>
                  ) : null}
                </button>
                {openMenu ? (
                  <div className="hh-menu" role="menu">
                    {isAdmin ? (
                      <button
                        type="button"
                        className="hh-menu-item"
                        onClick={() => {
                          setOpenMenu(false);
                          navigate("/admin");
                        }}
                        role="menuitem"
                      >
                        Trang Admin
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="hh-menu-item"
                      onClick={() => {
                        setOpenMenu(false);
                        navigate("/thong-tin-tai-khoan?tab=profile");
                      }}
                      role="menuitem"
                    >
                      Thông tin tài khoản
                    </button>
                    <button
                      type="button"
                      className="hh-menu-item"
                      onClick={() => {
                        setOpenMenu(false);
                        navigate("/thong-tin-tai-khoan?tab=history");
                      }}
                      role="menuitem"
                    >
                      Lịch sử đặt phòng
                    </button>
                    <div className="hh-menu-sep" />
                    <div className="hh-menu-head">
                      <span>Thông báo</span>
                      <button type="button" className="hh-menu-link" onClick={markAllNotificationsRead}>
                        Đánh dấu đã đọc
                      </button>
                    </div>
                    {notificationItems.length > 0 ? (
                      <div className="hh-menu-list">
                        {notificationItems.map((n) => (
                          <button
                            key={n._id}
                            type="button"
                            className={`hh-noti ${n.is_read ? "" : "unread"}`}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <div className="hh-noti-title">{n.title || "Thông báo"}</div>
                            <div className="hh-noti-msg">{n.message || ""}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="hh-menu-empty">Chưa có thông báo.</div>
                    )}
                    <div className="hh-menu-sep" />
                    <button type="button" className="hh-menu-item danger" onClick={handleLogout} role="menuitem">
                      Đăng xuất
                    </button>
                  </div>
                ) : null}
              </div>
            )}
            <button type="button" className="hh-btn-gold" onClick={() => navigate("/book")}>
              Đặt phòng
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
