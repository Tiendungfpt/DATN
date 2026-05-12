import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./style/BookingCheckout.css";

function BookingCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const checkoutData = location.state || null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("captureWallet");
  const [payDepositNow, setPayDepositNow] = useState(true);
  const [adults, setAdults] = useState(() =>
    Math.max(1, Number.parseInt(String(checkoutData?.adults ?? ""), 10) || 2),
  );
  const [children, setChildren] = useState(() =>
    Math.max(0, Number.parseInt(String(checkoutData?.children ?? ""), 10) || 0),
  );

  const total = Number(checkoutData?.total) || 0;
  const requiredDeposit = Math.max(0, Number(checkoutData?.depositTotal) || 0);
  const prepaidAmount = payDepositNow ? requiredDeposit : 0;
  const checkInDate = checkoutData?.checkInDate ? new Date(checkoutData.checkInDate) : null;
  const checkOutDate = checkoutData?.checkOutDate ? new Date(checkoutData.checkOutDate) : null;

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      setGuestName(String(user?.name || "").trim());
      setGuestEmail(String(user?.email || "").trim());
    } catch (_err) {
      localStorage.removeItem("user");
    }
  }, []);

  useEffect(() => {
    if (requiredDeposit <= 0) {
      setPayDepositNow(false);
    }
  }, [requiredDeposit]);

  useEffect(() => {
    if (!checkoutData) return;
    setAdults(Math.max(1, Number.parseInt(String(checkoutData.adults ?? ""), 10) || 2));
    setChildren(Math.max(0, Number.parseInt(String(checkoutData.children ?? ""), 10) || 0));
  }, [checkoutData?.adults, checkoutData?.children]);

  const lineItems = useMemo(
    () =>
      (checkoutData?.checkoutLines || []).map((line) => ({
        room_type_id: line.room_type_id,
        quantity: Math.max(1, Number.parseInt(String(line.quantity), 10) || 1),
      })),
    [checkoutData],
  );

  const formatDate = (date) => {
    if (!date) return "Chưa chọn";
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const submitBookingAndPay = async () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    let currentUser = null;
    if (userStr) {
      try {
        currentUser = JSON.parse(userStr);
      } catch (_err) {
        currentUser = null;
      }
    }

    if (!currentUser?._id) {
      alert("Vui lòng đăng nhập để đặt phòng!");
      navigate("/login");
      return;
    }
    if (currentUser?.role === "admin") {
      alert("Tài khoản admin không được phép đặt phòng.");
      return;
    }
    if (!checkoutData || !checkInDate || !checkOutDate || total <= 0) {
      alert("Thiếu dữ liệu đặt phòng. Vui lòng quay lại chọn phòng.");
      navigate("/book");
      return;
    }
    if (lineItems.length === 0) {
      alert("Không có dòng đặt phòng hợp lệ. Vui lòng thử lại.");
      return;
    }
    if (payDepositNow && requiredDeposit <= 0) {
      alert("Loại phòng chưa được cấu hình tiền cọc. Vui lòng liên hệ khách sạn.");
      return;
    }
    if (!guestName.trim() || !guestPhone.trim() || !guestEmail.trim()) {
      alert("Vui lòng nhập đầy đủ họ tên, số điện thoại và email.");
      return;
    }
    const adultsN = Math.max(1, Number.parseInt(String(adults), 10) || 1);
    const childrenN = Math.max(0, Number.parseInt(String(children), 10) || 0);

    const payload = {
      line_items: lineItems,
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim(),
      guest_email: guestEmail.trim(),
      adults: adultsN,
      children: childrenN,
      booking_type: "overnight",
      check_in_date: checkInDate.toISOString().split("T")[0],
      check_out_date: checkOutDate.toISOString().split("T")[0],
      // HanoiHotel policy: deposit required to confirm; allow creating pending booking when paying later
      payment_mode: "deposit",
      prepaid_amount: 0,
    };

    try {
      setLoading(true);
      setError("");

      const bookingRes = await axios.post("/api/bookings", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const bookingId = bookingRes?.data?.booking?._id;
      if (!bookingId) {
        throw new Error("Không lấy được bookingId để thanh toán");
      }

      if (payDepositNow) {
        const momoRes = await axios.post("/api/momo/create", {
          bookingId,
          requestType: paymentMethod,
          type: "deposit",
        });

        if (momoRes?.data?.success && momoRes?.data?.payUrl) {
          window.location.href = momoRes.data.payUrl;
          return;
        }

        throw new Error(momoRes?.data?.message || "Không tạo được link thanh toán MoMo");
      }

      alert("Đặt phòng đã được tạo. Vui lòng thanh toán tiền cọc để được xác nhận.");
      navigate("/thong-tin-tai-khoan?tab=history");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Đặt phòng thất bại. Vui lòng thử lại!";
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!checkoutData) {
    return (
      <div className="checkout-page">
        <div className="checkout-missing">
          <h2>Không có dữ liệu checkout</h2>
          <p>Vui lòng quay lại trang đặt phòng và chọn thông tin lưu trú trước.</p>
          <button
            type="button"
            className="checkout-confirm-btn"
            onClick={() => navigate("/dat-phong")}
          >
            Quay lại danh sách phòng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-header">
          <button
            type="button"
            className="checkout-back"
            onClick={() => navigate("/book")}
          >
            ←
          </button>
          <h1>Xác nhận & Thanh toán</h1>
        </div>

        {error && <p className="checkout-error">{error}</p>}

        <div className="checkout-grid">
          <section className="checkout-card">
            <h3>Lựa chọn của bạn</h3>
            <div className="checkout-room-row">
              <img
                src={
                  checkoutData.roomImage?.startsWith("http")
                    ? checkoutData.roomImage
                  : `/uploads/${checkoutData.roomImage}`
                }
                alt={checkoutData.roomName}
                onError={(e) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";
                }}
              />
              <div>
                <strong>{checkoutData.roomName}</strong>
                <p>{checkoutData.totalRoomCount || 1} phòng</p>
              </div>
            </div>

            <div className="checkout-stay">
              <div>
                <span>Nhận phòng</span>
                <strong>{formatDate(checkInDate)}</strong>
              </div>
              <div>
                <span>Trả phòng</span>
                <strong>{formatDate(checkOutDate)}</strong>
              </div>
              <div>
                <span>Lưu trú</span>
                <strong>{`${checkoutData.nights || 0} đêm`}</strong>
              </div>
            </div>

            <div className="checkout-line-list">
              {(checkoutData.checkoutLines || []).map((line, idx) => (
                <div className="checkout-line-row" key={`${line.room_type_id}-${idx}`}>
                  <span>
                    {line.room_type_name} x {line.quantity}
                  </span>
                  <strong>{Number(line.subtotal || 0).toLocaleString("vi-VN")}₫</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="checkout-card">
            <h3>Chi tiết thanh toán</h3>
            <div className="checkout-line-row">
              <span>Tiền phòng</span>
              <strong>{total.toLocaleString("vi-VN")}₫</strong>
            </div>
            <div className="checkout-line-row checkout-total">
              <span>Tổng thanh toán</span>
              <strong>{total.toLocaleString("vi-VN")}₫</strong>
            </div>
          </section>

          <section className="checkout-card">
            <h3>Người đặt phòng</h3>
            <div className="checkout-form-group">
              <label>Số khách lưu trú</label>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Người lớn
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={adults}
                    onChange={(e) => setAdults(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                    disabled={loading}
                    style={{ width: 72 }}
                  />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Trẻ em
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={children}
                    onChange={(e) => setChildren(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
                    disabled={loading}
                    style={{ width: 72 }}
                  />
                </label>
                <span className="text-muted small">
                  Tổng: <strong>{adults + children}</strong> khách
                </span>
              </div>
              <small className="text-muted">Dùng cho check-in / khai báo lưu trú.</small>
            </div>
            <div className="checkout-form-group">
              <label>Họ tên</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="checkout-form-group">
              <label>Số điện thoại</label>
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="checkout-form-group">
              <label>Email</label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </section>

          <section className="checkout-card">
            <h3>Chọn phương thức thanh toán</h3>
            <div className="checkout-form-group">
              <label>Thanh toán tiền cọc (bắt buộc để xác nhận)</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="pay_deposit_now"
                    value="now"
                    checked={payDepositNow}
                    onChange={() => setPayDepositNow(true)}
                    disabled={loading}
                  />
                  <span>Thanh toán ngay</span>
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="pay_deposit_now"
                    value="later"
                    checked={!payDepositNow}
                    onChange={() => setPayDepositNow(false)}
                    disabled={loading}
                  />
                  <span>Thanh toán sau (booking sẽ ở trạng thái chờ)</span>
                </label>
              </div>
            </div>

            <div className="checkout-form-group">
              <label>Tiền cọc cần thanh toán</label>
              <input type="text" value={requiredDeposit.toLocaleString("vi-VN")} disabled />
              <small>Tiền cọc được cấu hình theo loại phòng (không chỉnh sửa).</small>
            </div>

            <div className="checkout-form-group">
              <label>Thanh toán MoMo</label>
              <div className="checkout-momo-brand">
                <div className="checkout-momo-logo" aria-label="MoMo logo">
                  MoMo
                </div>
                <div>
                  <strong>Ví điện tử MoMo</strong>
                  <p>Thanh toán qua MoMo (bản thử)</p>
                </div>
              </div>
              <div className="checkout-radio-list">
                <label className={paymentMethod === "captureWallet" ? "active" : ""}>
                  <input
                    type="radio"
                    name="momo_method"
                    value="captureWallet"
                    checked={paymentMethod === "captureWallet"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={loading}
                  />
                  <span>Ví MoMo / QR</span>
                </label>
                <label className={paymentMethod === "payWithATM" ? "active" : ""}>
                  <input
                    type="radio"
                    name="momo_method"
                    value="payWithATM"
                    checked={paymentMethod === "payWithATM"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={loading}
                  />
                  <span>Thẻ ATM nội địa</span>
                </label>
                <label className={paymentMethod === "payWithCC" ? "active" : ""}>
                  <input
                    type="radio"
                    name="momo_method"
                    value="payWithCC"
                    checked={paymentMethod === "payWithCC"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={loading}
                  />
                  <span>Thẻ quốc tế (Visa/Master/JCB)</span>
                </label>
              </div>
              {paymentMethod === "captureWallet" ? (
                <p className="text-muted small mb-0" style={{ lineHeight: 1.45, marginTop: 8 }}>
                  Nên cài <strong>MoMo Test App</strong>. OTP thử hay là <strong>000000</strong>.{" "}
                  <a href="https://developers.momo.vn/v3/docs/payment/onboarding/test-instructions" target="_blank" rel="noopener noreferrer">
                    Hướng dẫn của MoMo
                  </a>
                  .
                </p>
              ) : (
                <p className="text-muted small mb-0" style={{ lineHeight: 1.45, marginTop: 8 }}>
                  Nhập <strong>SĐT 10 số</strong> và làm theo màn hình MoMo. Thẻ mẫu:{" "}
                  <strong>9704000000000018</strong> — NGUYEN VAN A — 03/07.{" "}
                  <a href="https://developers.momo.vn/v3/docs/payment/onboarding/test-instructions" target="_blank" rel="noopener noreferrer">
                    Chi tiết
                  </a>
                  .
                </p>
              )}
            </div>

            <div className="checkout-line-row checkout-pay-now">
              <span>Thanh toán ngay</span>
              <strong>{prepaidAmount.toLocaleString("vi-VN")}₫</strong>
            </div>

            <button
              type="button"
              className="checkout-confirm-btn"
              onClick={submitBookingAndPay}
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Xác nhận và thanh toán"}
            </button>

            <p className="checkout-history-link">
              Xem lại lịch sử tại{" "}
              <Link to="/thong-tin-tai-khoan?tab=history">Lịch sử đặt phòng</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default BookingCheckout;
