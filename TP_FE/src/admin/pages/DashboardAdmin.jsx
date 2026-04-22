import { useEffect, useState } from "react";
import axios from "axios";
import "../components/Dashboard.css";
import { useNavigate } from "react-router-dom";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthLabel = String(now.getMonth() + 1).padStart(2, "0");

    const [stats, setStats] = useState({
        rooms: 0,
        bookings: 0,
        users: 0,
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [revenueOverview, setRevenueOverview] = useState({
        totalRevenueFormatted: "0",
        monthlyRevenueChart: [],
        weeklyRevenueCurrentMonth: [],
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem("token");

                // 1) Tổng số liệu (đồng bộ với danh sách admin)
                const adminRes = await axios.get(
                    "/api/admin/dashboard",
                    { headers: { Authorization: `Bearer ${token}` } },
                );

                // 2) Revenue charts (đang dùng endpoint /api/dashboard)
                const res = await axios.get("/api/dashboard");

                // 3) Recent bookings (paid deposit/full paid) for dashboard list
                const bookingsRes = await axios.get("/api/admin/bookings?sort=createdAt_desc", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setStats({
                    rooms: adminRes.data?.totalRooms || 0,
                    users: adminRes.data?.totalUsers || 0,
                    bookings: adminRes.data?.totalBookings || 0,
                });
                setRevenueOverview({
                    totalRevenueFormatted: res.data.revenueOverview?.totalRevenueFormatted || "0",
                    monthlyRevenueChart: res.data.revenueOverview?.monthlyRevenueChart || [],
                    weeklyRevenueCurrentMonth: res.data.revenueOverview?.weeklyRevenueCurrentMonth || [],
                });
                setRecentBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data.slice(0, 10) : []);
            } catch (error) {
                console.error("Lỗi gọi API dashboard:", error);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="dashboard">
            <h2>Tổng quan</h2>
            <p className="subtitle">
                Số liệu thống kê nhanh
            </p>

            <div className="cards">
                <div className="card" onClick={() => navigate("/admin/rooms")}>
                    <h4>🏨 Tổng số phòng</h4>
                    <h1>{stats.rooms}</h1>
                    <p className="link">Xem danh sách phòng →</p>
                </div>

                <div className="card" onClick={() => navigate("/admin/bookings")}>
                    <h4>📅 Tổng số booking</h4>
                    <h1>{stats.bookings}</h1>
                    <p className="link">Xem booking →</p>
                </div>

                <div className="card" onClick={() => navigate("/admin/users-pagination")}>
                    <h4>👤 Tổng số người dùng</h4>
                    <h1>{stats.users}</h1>
                    <p className="link">Xem người dùng →</p>
                </div>

                <div className="card">
                    <h4>💵 Tổng doanh thu</h4>
                    <h1>{revenueOverview.totalRevenueFormatted} đ</h1>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <h4>Doanh thu theo tháng (năm {currentYear})</h4>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={revenueOverview.monthlyRevenueChart}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${Number(value).toLocaleString("vi-VN")} đ`} />
                            <Bar dataKey="revenue" fill="#2563eb" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <h4>Doanh thu theo tuần (tháng {currentMonthLabel}/{currentYear})</h4>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={revenueOverview.weeklyRevenueCurrentMonth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${Number(value).toLocaleString("vi-VN")} đ`} />
                            <Bar dataKey="revenue" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="chart-card" style={{ marginTop: 18 }}>
                <h4>Booking mới nhất</h4>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                                <th style={{ padding: "10px 8px" }}>Tên khách</th>
                                <th style={{ padding: "10px 8px" }}>Nhận / Trả</th>
                                <th style={{ padding: "10px 8px" }}>Trạng thái</th>
                                <th style={{ padding: "10px 8px" }}>Số tiền</th>
                                <th style={{ padding: "10px 8px" }}>Phòng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: "12px 8px", color: "#64748b" }}>
                                        Chưa có booking.
                                    </td>
                                </tr>
                            ) : (
                                recentBookings.map((b) => (
                                    <tr key={b._id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                                        <td style={{ padding: "10px 8px", fontWeight: 700 }}>
                                            {b.guest_name || b.user_id?.name || "—"}
                                        </td>
                                        <td style={{ padding: "10px 8px" }}>
                                            {b.check_in_date ? new Date(b.check_in_date).toLocaleDateString("vi-VN") : "—"}{" "}
                                            →{" "}
                                            {b.check_out_date ? new Date(b.check_out_date).toLocaleDateString("vi-VN") : "—"}
                                        </td>
                                        <td style={{ padding: "10px 8px" }}>{b.status || "—"}</td>
                                        <td style={{ padding: "10px 8px" }}>
                                            {(Number(b.total_price) || 0).toLocaleString("vi-VN")} đ
                                        </td>
                                        <td style={{ padding: "10px 8px" }}>
                                            {Array.isArray(b.assigned_room_ids) && b.assigned_room_ids.length > 0
                                                ? b.assigned_room_ids
                                                      .map((r) => `${r?.room_no || ""}`.trim())
                                                      .filter(Boolean)
                                                      .join(", ")
                                                : b.assigned_room_id?.room_no || b.room_id?.room_no || b.room_type_id?.name || "Chưa gán"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div style={{ marginTop: 10 }}>
                    <button className="card" style={{ padding: 12 }} onClick={() => navigate("/admin/bookings/all")}>
                        Xem tất cả booking →
                    </button>
                </div>
            </div>
        </div>
    );
}