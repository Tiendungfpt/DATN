import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../components/List.css";
import "./AdminDashboard.css";

const API = "http://localhost:3000/api";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${API}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Không tải được dữ liệu tổng quan",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="admin-dashboard">
        <p className="text-muted">Đang tải tổng quan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  const stats = [
    {
      key: "rooms",
      label: "Tổng số phòng",
      value: data?.totalRooms ?? 0,
      icon: "🏨",
      to: "/admin/rooms",
      hint: "Xem danh sách phòng",
    },
    {
      key: "bookings",
      label: "Tổng số booking",
      value: data?.totalBookings ?? 0,
      icon: "📅",
      to: "/admin/bookings",
      hint: "Xem booking",
    },
    {
      key: "users",
      label: "Tổng số người dùng",
      value: data?.totalUsers ?? 0,
      icon: "👥",
      to: "/admin/users-pagination",
      hint: "Xem người dùng",
    },
  ];

  return (
    <div className="admin-dashboard hotel-container">
      <h1 className="admin-dashboard-title">Tổng quan</h1>
      <p className="admin-dashboard-lead text-muted">
        Số liệu thống kê nhanh từ hệ thống.
      </p>

      <div className="admin-dashboard-grid">
        {stats.map((s) => (
          <Link key={s.key} to={s.to} className="admin-dashboard-card">
            <span className="admin-dashboard-card-icon" aria-hidden>
              {s.icon}
            </span>
            <div className="admin-dashboard-card-body">
              <span className="admin-dashboard-card-label">{s.label}</span>
              <strong className="admin-dashboard-card-value">
                {Number(s.value).toLocaleString("vi-VN")}
              </strong>
              <span className="admin-dashboard-card-hint">{s.hint} →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
