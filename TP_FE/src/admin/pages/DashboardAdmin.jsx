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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthLabel = String(now.getMonth() + 1).padStart(2, "0");
  const roomTypePalette = ["#7c6ed6", "#78d4a6", "#f2c35e", "#5aa9e6", "#f59e99", "#6ee7b7"];

  const [stats, setStats] = useState({
    rooms: 0,
    bookings: 0,
    users: 0,
  });
  const [roomSummary, setRoomSummary] = useState({
    total: 0,
    occupied: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [revenueOverview, setRevenueOverview] = useState({
    totalRevenueFormatted: "0",
    monthlyRevenueChart: [],
    weeklyRevenueCurrentMonth: [],
  });
  const [occupancyTrend, setOccupancyTrend] = useState([]);
  const [roomTypeDistribution, setRoomTypeDistribution] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({
    avg: 0,
    total: 0,
    byStar: [
      { star: 5, count: 0, pct: 0 },
      { star: 4, count: 0, pct: 0 },
      { star: 3, count: 0, pct: 0 },
      { star: 2, count: 0, pct: 0 },
      { star: 1, count: 0, pct: 0 },
    ],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

        const [adminRes, revenueRes, bookingsRes, roomsRes, reviewsRes] = await Promise.all([
          axios.get("/api/admin/dashboard", authHeaders),
          axios.get("/api/dashboard"),
          axios.get("/api/admin/bookings?sort=createdAt_desc", authHeaders),
          axios.get("/api/admin/rooms", authHeaders),
          axios.get("/api/admin/reviews", authHeaders),
        ]);

        const bookingItems = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
        const roomItems = Array.isArray(roomsRes.data) ? roomsRes.data : [];
        const reviewItems = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];

        setStats({
          rooms: adminRes.data?.totalRooms || 0,
          users: adminRes.data?.totalUsers || 0,
          bookings: adminRes.data?.totalBookings || 0,
        });

        setRevenueOverview({
          totalRevenueFormatted: revenueRes.data?.revenueOverview?.totalRevenueFormatted || "0",
          monthlyRevenueChart: revenueRes.data?.revenueOverview?.monthlyRevenueChart || [],
          weeklyRevenueCurrentMonth: revenueRes.data?.revenueOverview?.weeklyRevenueCurrentMonth || [],
        });

        setRecentBookings(bookingItems.slice(0, 10));

        const occupied = roomItems.filter((r) => String(r?.status) === "occupied").length;
        setRoomSummary({
          total: roomItems.length,
          occupied,
        });

        const typeMap = roomItems.reduce((acc, room) => {
          const key = String(room?.room_type || room?.name || "Khác").trim() || "Khác";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
        setRoomTypeDistribution(typeData);

        const activeStatuses = new Set(["confirmed", "checked_in", "checked_out", "completed"]);
        const totalRooms = Math.max(1, roomItems.length);
        const trend = [];
        for (let i = 6; i >= 0; i -= 1) {
          const day = new Date();
          day.setHours(0, 0, 0, 0);
          day.setDate(day.getDate() - i);
          const dayStart = new Date(day);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);

          const inUseRooms = bookingItems.reduce((sum, booking) => {
            if (!activeStatuses.has(String(booking?.status || ""))) return sum;
            const checkIn = booking?.check_in_date ? new Date(booking.check_in_date) : null;
            const checkOut = booking?.check_out_date ? new Date(booking.check_out_date) : null;
            if (!checkIn || !checkOut || Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
              return sum;
            }
            const overlaps = checkIn <= dayEnd && checkOut >= dayStart;
            if (!overlaps) return sum;
            return sum + Math.max(1, Number(booking?.room_quantity || 1));
          }, 0);

          const occupancy = Math.min(100, Math.round((inUseRooms / totalRooms) * 100));
          trend.push({
            day: day.toLocaleDateString("vi-VN", { weekday: "short" }),
            occupancy,
          });
        }
        setOccupancyTrend(trend);

        const byStarCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let ratingSum = 0;
        reviewItems.forEach((review) => {
          const star = Math.max(1, Math.min(5, Math.round(Number(review?.rating || 0))));
          byStarCount[star] += 1;
          ratingSum += star;
        });
        const totalReview = reviewItems.length;
        const avg = totalReview > 0 ? ratingSum / totalReview : 0;
        const byStar = [5, 4, 3, 2, 1].map((star) => ({
          star,
          count: byStarCount[star],
          pct: totalReview > 0 ? Math.round((byStarCount[star] / totalReview) * 100) : 0,
        }));
        setRatingSummary({ avg, total: totalReview, byStar });
      } catch (error) {
        console.error("Lỗi gọi API dashboard:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="dashboard">
      <h2>Tổng quan</h2>
      <p className="subtitle">Số liệu thống kê nhanh</p>

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

      <div className="dashboard-quick-grid">
        <section className="chart-card">
          <h4>📈 Thống Kê Phòng</h4>
          <div className="dashboard-room-stats">
            <div className="dashboard-room-stat">
              <div className="dashboard-room-number">{roomSummary.total}</div>
              <div className="dashboard-room-label">Tổng phòng</div>
            </div>
            <div className="dashboard-room-stat dashboard-room-stat--green">
              <div className="dashboard-room-number">{roomSummary.occupied}</div>
              <div className="dashboard-room-label">Đang sử dụng</div>
            </div>
          </div>
        </section>

        <section className="chart-card">
          <h4>📊 Tỷ Lệ Lấp Đầy Theo Thời Gian</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={occupancyTrend}>
              <defs>
                <linearGradient id="occupancyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Area type="monotone" dataKey="occupancy" stroke="#f59e0b" fill="url(#occupancyFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="chart-card">
          <h4>🛏️ Phân Bố Loại Phòng</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={roomTypeDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={74}
                label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
              >
                {roomTypeDistribution.map((_, idx) => (
                  <Cell key={`type-${idx}`} fill={roomTypePalette[idx % roomTypePalette.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} phòng`} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="dashboard-quick-grid dashboard-quick-grid--bottom">
        <section className="chart-card">
          <h4>⭐ Đánh Giá Khách Hàng</h4>
          <div className="dashboard-rating-head">
            <div className="dashboard-rating-avg">{ratingSummary.avg.toFixed(1)}</div>
            <div className="dashboard-rating-meta">/5 từ {ratingSummary.total} đánh giá</div>
          </div>
          <div className="dashboard-rating-bars">
            {ratingSummary.byStar.map((row) => (
              <div key={row.star} className="dashboard-rating-row">
                <span>{row.star} ⭐</span>
                <div className="dashboard-rating-track">
                  <div className="dashboard-rating-fill" style={{ width: `${row.pct}%` }} />
                </div>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="chart-card">
          <h4>📉 Xu Hướng Doanh Thu</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueOverview.monthlyRevenueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString("vi-VN")} đ`} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="dashboard-note">
            Theo dõi theo tháng ({currentYear}) để nhận biết giai đoạn cao điểm và thấp điểm.
          </p>
        </section>
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
                    <td style={{ padding: "10px 8px", fontWeight: 700 }}>{b.guest_name || b.user_id?.name || "—"}</td>
                    <td style={{ padding: "10px 8px" }}>
                      {b.check_in_date ? new Date(b.check_in_date).toLocaleDateString("vi-VN") : "—"} →{" "}
                      {b.check_out_date ? new Date(b.check_out_date).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td style={{ padding: "10px 8px" }}>{b.status || "—"}</td>
                    <td style={{ padding: "10px 8px" }}>{(Number(b.total_price) || 0).toLocaleString("vi-VN")} đ</td>
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