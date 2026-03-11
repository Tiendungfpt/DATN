import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
    return (
        <div className="sidebar">
            <h2 className="sidebar-title">ADMIN</h2>

            <ul className="sidebar-menu">
                <li className="menu-group">Quản lý phòng</li>

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
                        to="/admin/rooms/create"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        ➕ Thêm phòng
                    </NavLink>
                </li>

                <li>
                    <NavLink
                        to="/admin/rooms/update"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        ✏️ Cập nhật phòng
                    </NavLink>
                </li>

                <li>
                    <NavLink
                        to="/admin/rooms/delete"
                        className={({ isActive }) =>
                            isActive ? "menu-item active" : "menu-item"
                        }
                    >
                        🗑️ Xóa phòng
                    </NavLink>
                </li>
            </ul>
        </div>
    );
}