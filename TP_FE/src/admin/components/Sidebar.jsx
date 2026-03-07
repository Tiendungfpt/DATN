import { Link } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
    return (
        <div className="sidebar">
            <h2 className="sidebar-title">ADMIN</h2>

            <ul className="sidebar-menu">
                <li className="menu-group">Quản lý phòng</li>

                <li>
                    <Link to="/admin/rooms" className="menu-item">
                        📋 Danh sách phòng
                    </Link>
                </li>

                <li>
                    <Link to="/admin/rooms/create" className="menu-item">
                        ➕ Thêm phòng
                    </Link>
                </li>
                <li>
                    <Link to="/admin/rooms/update" className="menu-item">
                        ✏️ Cập nhật phòng
                    </Link>
                </li>
                <li>
                    <Link to="/admin/rooms/delete" className="menu-item">
                        🗑️ Xóa phòng
                    </Link>
                </li>
            </ul>
        </div>
    );
}
