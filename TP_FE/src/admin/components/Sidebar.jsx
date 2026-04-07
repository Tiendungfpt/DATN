import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
    return (
        <div className="sidebar">
            <h2 className="sidebar-title">ADMIN PANEL</h2>
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