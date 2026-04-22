import { Link, NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Sidebar() {
    const navigate = useNavigate();
    const [me, setMe] = useState(null);
    const token = localStorage.getItem("token");

    useEffect(() => {
        const cached = JSON.parse(localStorage.getItem("user") || "null");
        if (cached) setMe(cached);
        if (!token) return;
        axios
            .get("/api/users/profile", { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                const merged = { ...(cached || {}), ...(res.data || {}) };
                setMe(merged);
                localStorage.setItem("user", JSON.stringify(merged));
            })
            .catch(() => {
                // ignore
            });
    }, [token]);

    return (
        <div className="sidebar">
            <div className="sidebar-profile" role="button" tabIndex={0} onClick={() => navigate("/thong-tin-tai-khoan?tab=profile")}>
                <div className="sidebar-avatar">
                    {me?.avatar ? (
                        <img src={`/uploads/${me.avatar}`} alt="Avatar" />
                    ) : (
                        <span>{String(me?.name || "A").trim().charAt(0).toUpperCase() || "A"}</span>
                    )}
                </div>
                <div className="sidebar-profile-meta">
                    <div className="sidebar-profile-name">{me?.name || "Admin"}</div>
                    <div className="sidebar-profile-role">{me?.role === "admin" ? "Quản trị viên" : "Người dùng"}</div>
                </div>
            </div>

            <Link to="/" className="sidebar-title-link">
                <h2 className="sidebar-title">Thịnh Phát Hotel</h2>
            </Link>
            <p className="sidebar-subtitle">Quản trị hệ thống đặt phòng</p>

            <ul className="sidebar-menu">
                <li>
                    <NavLink
                        to="/admin/dashboard"
                        end
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        🏨 Tổng quan
                    </NavLink>
                </li>
                <li className="menu-group">Quản lý </li>

                <li>
                    <NavLink
                        to="/admin/rooms"
                        end
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        📋 Danh sách phòng
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/admin/room-types"
                        end
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        {"\ud83c\udfe8 Lo\u1ea1i ph\u00f2ng (danh m\u1ee5c)"}
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/admin/users-pagination"
                        end
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        📋 Danh sách người dùng
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/admin/bookings"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        📋 Danh sách booking
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/admin/bookings/all"
                        end
                        className={({ isActive }) =>
                            isActive ? "sub-menu-item active" : "sub-menu-item"
                        }
                    >
                        • Tất cả
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/admin/bookings/pending"
                        end
                        className={({ isActive }) =>
                            isActive ? "sub-menu-item active" : "sub-menu-item"
                        }
                    >
                        • Phòng chờ xác nhận
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/admin/bookings/confirmed"
                        end
                        className={({ isActive }) =>
                            isActive ? "sub-menu-item active" : "sub-menu-item"
                        }
                    >
                        • Đã xác nhận
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/admin/bookings/checked-in"
                        end
                        className={({ isActive }) =>
                            isActive ? "sub-menu-item active" : "sub-menu-item"
                        }
                    >
                        • Đang check-in
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/admin/bookings/completed"
                        end
                        className={({ isActive }) =>
                            isActive ? "sub-menu-item active" : "sub-menu-item"
                        }
                    >
                        • Đã check-out
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/admin/reviews"
                        end
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        📋 Danh sách Review
                    </NavLink>
                </li>

                <li>
                    <NavLink
                        to="/admin/services-catalog"
                        end
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        🧾 Quản lý dịch vụ
                    </NavLink>
                </li>

                <li>
                    <NavLink
                        to="/admin/rooms/create"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        ➕ Thêm phòng
                    </NavLink>
                </li>
            </ul>
        </div>
    );
}