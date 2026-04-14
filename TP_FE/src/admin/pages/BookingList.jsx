import { useEffect, useState } from "react";
import axios from "axios";
import "../components/BookingAdmin.css";

/**
 * Admin: GET /api/bookings?status=&sort=createdAt_desc
 * — sort newest first, filter by status.
 */
export default function BookingList() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const token = localStorage.getItem("token");
      const params = { sort: "createdAt_desc" };
      if (status) params.status = status;
      const res = await axios.get("http://localhost:3000/api/bookings", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  if (loading) return <p>Loading...</p>;
  if (err) return <p style={{ color: "crimson" }}>{err}</p>;

  return (
    <section className="booking-admin-section" style={{ maxWidth: 960 }}>
      <h3>Booking list (sorted by createdAt DESC)</h3>
      <label>
        Status filter:{" "}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="pending">pending</option>
          <option value="confirmed">confirmed</option>
          <option value="checked_in">checked_in</option>
          <option value="checked_out">checked_out</option>
          <option value="cancelled">cancelled</option>
        </select>
      </label>
      <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>ID</th>
            <th>Status</th>
            <th>Guest</th>
            <th>Room type</th>
            <th>Dates</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b._id}>
              <td>{String(b._id).slice(-6)}</td>
              <td>{b.status}</td>
              <td>
                {b.guest_name || b.user_id?.name || "—"}
                <br />
                <small>{b.guest_phone || "—"}</small>
              </td>
              <td>{b.room_type_id?.name || b.room_id?.name || "—"}</td>
              <td>
                {new Date(b.check_in_date).toLocaleDateString("vi-VN")} —{" "}
                {new Date(b.check_out_date).toLocaleDateString("vi-VN")}
              </td>
              <td>{b.createdAt ? new Date(b.createdAt).toLocaleString("vi-VN") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
