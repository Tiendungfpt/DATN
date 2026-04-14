import { Link, NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
    return (
        <div className="sidebar">
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