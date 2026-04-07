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
    const [revenueOverview, setRevenueOverview] = useState({
        totalRevenueFormatted: "0",
        monthlyRevenueChart: [],
        weeklyRevenueCurrentMonth: [],
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(
                    "http://localhost:3000/api/dashboard"
                );

                setStats({
                    rooms: res.data.totals?.rooms || 0,
                    users: res.data.totals?.users || 0,
                    bookings: res.data.stats?.bookings || 0,
                });
                setRevenueOverview({
                    totalRevenueFormatted: res.data.revenueOverview?.totalRevenueFormatted || "0",
                    monthlyRevenueChart: res.data.revenueOverview?.monthlyRevenueChart || [],
                    weeklyRevenueCurrentMonth: res.data.revenueOverview?.weeklyRevenueCurrentMonth || [],
                });
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
        </div>
    );
}