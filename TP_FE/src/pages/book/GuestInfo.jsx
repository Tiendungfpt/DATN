import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./BookEngine.css";

export default function GuestInfo() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state || null;

  const [guestEmail, setGuestEmail] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [momoType, setMomoType] = useState("payWithATM");
  const [payMode, setPayMode] = useState("deposit"); // deposit | full

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    try {
      const u = JSON.parse(userStr);
      const name = String(u?.name || "").trim();
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        setGuestLastName(parts.slice(0, -1).join(" "));
        setGuestFirstName(parts.slice(-1).join(" "));
      } else {
        setGuestFirstName(name);
      }
      setGuestEmail(String(u?.email || "").trim());
    } catch {
      // ignore
    }
  }, []);

  const depositRequired = useMemo(() => {
    const lines = Array.isArray(data?.lines) ? data.lines : [];
    return lines.reduce((s, l) => s + (Number(l.deposit_amount) || 0) * (Number(l.quantity) || 0), 0);
  }, [data]);

  if (!data?.checkIn || !data?.checkOut || !Array.isArray(data?.lines)) {
    return (
      <div className="hh-container" style={{ padding: "26px 0" }}>
        <p>Thiếu dữ liệu đặt phòng. Vui lòng quay lại.</p>
        <Link to="/book">Quay lại chọn phòng</Link>
      </div>
    );
  }

  const submitAndPay = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui lòng đăng nhập để đặt phòng.");
      navigate("/login", { replace: true, state: { from: "/book" } });
      return;
    }
    const fullName = `${guestLastName} ${guestFirstName}`.trim();
    if (!guestEmail.trim() || !guestPhone.trim() || !fullName) {
      setError("Vui lòng nhập đầy đủ email, họ tên và số điện thoại.");
      return;
    }
    if (depositRequired <= 0) {
      setError("Loại phòng chưa được cấu hình tiền cọc. Vui lòng liên hệ khách sạn.");
      return;
    }
    try {
      setLoading(true);
      setError("");

      const payload = {
        line_items: data.lines.map((l) => ({
          room_type_id: l.room_type_id,
          quantity: l.quantity,
          rate_plan_key: l.rate_plan_key || "basic",
        })),
        guest_name: fullName,
        guest_phone: guestPhone.trim(),
        guest_email: guestEmail.trim().toLowerCase(),
        booking_type: "overnight",
        check_in_date: data.checkIn,
        check_out_date: data.checkOut,
        payment_mode: "deposit",
        prepaid_amount: 0,
      };

      const bookingRes = await axios.post("/api/bookings", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookingId = bookingRes?.data?.booking?._id;
      if (!bookingId) throw new Error("Không tạo được booking.");

      const momoRes = await axios.post("/api/momo/create", {
        bookingId,
        requestType: momoType,
        type: payMode === "full" ? "balance" : "deposit",
      });
      if (momoRes?.data?.success && momoRes?.data?.payUrl) {
        window.location.href = momoRes.data.payUrl;
        return;
      }
      throw new Error(momoRes?.data?.message || "Không tạo được link MoMo.");
    } catch (e) {
      const status = e?.response?.status;
      const rawMsg = e?.response?.data?.message || e?.message || "Đặt phòng thất bại.";
      const msg =
        String(rawMsg || "").length > 220
          ? "Không tạo được link thanh toán. Vui lòng thử lại hoặc đăng nhập lại."
          : rawMsg;
      if (status === 401) {
        // Token expired/invalid → force re-login and return to this step
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để thanh toán cọc.");
        navigate("/login", {
          replace: true,
          state: { from: "/book/guest", bookingEngineState: data },
        });
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="be-shell">
      <div className="be-topbar">
        <div className="hh-container be-topbar-inner">
          <div className="be-top-item">🗓 {data.checkIn} → {data.checkOut}</div>
          <div className="be-top-item">🏨 {data.lines.reduce((s, l) => s + l.quantity, 0)} phòng</div>
          <div className="be-top-item">💳 Thanh toán online</div>
        </div>
      </div>

      <main className="be-main">
        <div className="hh-container">
          <div className="be-form-grid">
            <section className="be-panel">
              <h3>Thông tin khách</h3>
              <p>Vui lòng nhập thông tin cá nhân của quý khách bằng tiếng Việt.</p>

              <label className="hh-label">Địa chỉ email *</label>
              <input className="hh-input" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div>
                  <label className="hh-label">Họ *</label>
                  <input className="hh-input" value={guestLastName} onChange={(e) => setGuestLastName(e.target.value)} />
                </div>
                <div>
                  <label className="hh-label">Tên *</label>
                  <input className="hh-input" value={guestFirstName} onChange={(e) => setGuestFirstName(e.target.value)} />
                </div>
              </div>

              <label className="hh-label" style={{ marginTop: 10 }}>
                Số điện thoại *
              </label>
              <input className="hh-input" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            </section>

            <section className="be-panel">
              <h3>Thanh toán</h3>
              <p>
                Quý khách có thể thanh toán tiền cọc (trả trước) hoặc thanh toán toàn bộ. Tiền cọc không vượt quá tổng tiền.
              </p>
              <div className="be-sidebar-row">
                <span>Tổng tiền phòng</span>
                <strong>{Number(data.total || 0).toLocaleString("vi-VN")} ₫</strong>
              </div>
              <div className="be-sidebar-row be-sidebar-total">
                <span>{payMode === "full" ? "Thanh toán ngay" : "Tiền cọc cần thanh toán"}</span>
                <strong>
                  {(payMode === "full" ? Number(data.total || 0) : depositRequired).toLocaleString("vi-VN")} ₫
                </strong>
              </div>

              <div style={{ marginTop: 10 }}>
                <label className="hh-label">Hình thức</label>
                <select className="hh-input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                  <option value="deposit">Trả trước (tiền cọc)</option>
                  <option value="full">Trả tất (toàn bộ)</option>
                </select>
              </div>

              <div style={{ marginTop: 10 }}>
                <label className="hh-label">MoMo</label>
                <select className="hh-input" value={momoType} onChange={(e) => setMomoType(e.target.value)}>
                  <option value="payWithATM">Thẻ ATM nội địa</option>
                  <option value="payWithCC">Thẻ quốc tế (Visa/Master/JCB)</option>
                </select>
              </div>

              {error ? <p style={{ color: "#b91c1c", marginTop: 10 }}>{error}</p> : null}

              <div className="be-actions-row">
                <button className="be-pay-btn" type="button" onClick={submitAndPay} disabled={loading}>
                  {loading
                    ? "Đang xử lý…"
                    : payMode === "full"
                      ? "Thanh toán toàn bộ (MoMo)"
                      : "Thanh toán cọc (MoMo)"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

