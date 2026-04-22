import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../components/BookingAdmin.css";

/**
 * GET /api/bookings/:id/checkout-preview
 * PUT /api/bookings/:id/check-out — totals + creates Invoice (never before this).
 */
export default function CheckOut() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId") || "";
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [overrideTimeWindow, setOverrideTimeWindow] = useState(false);

  const token = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const res = await axios.get(`/api/bookings/${bookingId}/folio`, { headers: token() });
        setPreview(res.data);
      } catch (e) {
        setErr(e.response?.data?.message || "Cannot load preview");
      }
    })();
  }, [bookingId]);

  const settle = async () => {
    setErr("");
    try {
      await axios.put(
        `/api/bookings/${bookingId}/check-out`,
        { payment_method: payMethod, settle_balance: true, override_time_window: overrideTimeWindow },
        { headers: token() },
      );
      navigate("/admin/bookings/completed");
    } catch (e) {
      setErr(e.response?.data?.message || "Check-out failed");
    }
  };

  if (!bookingId) return <p>Missing bookingId</p>;

  return (
    <section style={{ maxWidth: 520 }} className="booking-admin-section">
      <h3>Check-out & invoice</h3>
      {!preview && !err && <p>Loading...</p>}
      {preview && (
        <>
          <p>Room subtotal: {preview.room_subtotal?.toLocaleString("vi-VN")} đ</p>
          <p>Services: {preview.service_subtotal?.toLocaleString("vi-VN")} đ</p>
          <p>Prepaid: {preview.prepaid_amount?.toLocaleString("vi-VN")} đ</p>
          <p>
            <strong>Grand total: {preview.grand_total?.toLocaleString("vi-VN")} đ</strong>
          </p>
          <p>
            <strong>Balance due: {preview.balance_due?.toLocaleString("vi-VN")} đ</strong>
          </p>
          <label>
            Payment method{" "}
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="cash">cash</option>
              <option value="card">card</option>
              <option value="momo">momo</option>
            </select>
          </label>
          <label style={{ display: "block", marginTop: 12 }}>
            <input
              type="checkbox"
              checked={overrideTimeWindow}
              onChange={(e) => setOverrideTimeWindow(e.target.checked)}
            />{" "}
            Override khung giờ check-out (trước 12:00)
          </label>
          <p>
            <button type="button" onClick={settle}>
              Pay balance & create invoice
            </button>
          </p>
        </>
      )}
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </section>
  );
}
