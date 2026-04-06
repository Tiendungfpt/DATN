import { useEffect, useState } from "react";
import axios from "axios";
import "../components/Dashboard.css";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [period, setPeriod] = useState("week");

    const [stats, setStats] = useState({
        rooms: 0,
        bookings: 0,
        users: 0,
        revenue: 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:3000/api/dashboard?period=${period}`
                );

                setStats({
                    rooms: res.data.totals?.rooms || 0,
                    users: res.data.totals?.users || 0,
                    bookings: res.data.stats?.bookings || 0,
                    revenue: res.data.stats?.revenue || 0,
                });
            } catch (error) {
                console.error("Lỗi gọi API dashboard:", error);
            }
        };

        fetchStats();
    }, [period]);

    const periodLabel = {
        today: "hôm nay",
        week: "tuần này",
        month: "tháng này",
    };

    return (
        <div className="dashboard">
            <h2>Tổng quan</h2>
            <p className="subtitle">
                Số liệu thống kê nhanh ({periodLabel[period]})
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

                <div className="card">
                    <h4>👤 Tổng số người dùng</h4>
                    <h1>{stats.users}</h1>
                </div>

                <div className="card">
                    <h4>💰 Doanh thu</h4>
                    <h1>{stats.revenue} đ</h1>
                    <div className="period-filter">
                        <button
                            className={period === "today" ? "active" : ""}
                            onClick={() => setPeriod("today")}
                        >
                            Hôm nay
                        </button>
                        <button
                            className={period === "week" ? "active" : ""}
                            onClick={() => setPeriod("week")}
                        >
                            Tuần
                        </button>
                        <button
                            className={period === "month" ? "active" : ""}
                            onClick={() => setPeriod("month")}
                        >
                            Tháng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}