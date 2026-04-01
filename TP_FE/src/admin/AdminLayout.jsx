import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import "./AdminLayout.css";

export default function AdminLayout() {
    return (
        <div className="admin-layout">
            <Sidebar />
            <div className="admin-main">
                <Outlet />
            </div>
        </div>
    );
}
