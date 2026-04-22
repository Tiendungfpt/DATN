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
  const [paymentMethod, setPaymentMethod] = useState("payWithATM");
  const [paymentMode, setPaymentMode] = useState("full");
  const [depositAmount, setDepositAmount] = useState(0);

  const total = Number(checkoutData?.total) || 0;
  const bookingType = checkoutData?.bookingType === "hourly" ? "hourly" : "overnight";
  const stayHours = Math.max(1, Number.parseInt(String(checkoutData?.stayHours || 0), 10) || 1);
  const prepaidAmount = paymentMode === "full" ? total : depositAmount;
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
    if (paymentMode !== "deposit") {
      setDepositAmount(0);
      return;
    }
    if (total <= 0) {
      setDepositAmount(0);
      return;
    }
    setDepositAmount((prev) => {
      if (prev <= 0 || prev >= total) return Math.floor(total * 0.3);
      return prev;
    });
  }, [paymentMode, total]);

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
      navigate(`/booking/${checkoutData?.roomId || ""}`);
      return;
    }
    if (lineItems.length === 0) {
      alert("Không có dòng đặt phòng hợp lệ. Vui lòng thử lại.");
      return;
    }
    if (paymentMode === "deposit" && (depositAmount <= 0 || depositAmount >= total)) {
      alert("Số tiền đặt cọc phải lớn hơn 0 và nhỏ hơn tổng tiền phòng.");
      return;
    }
    if (!guestName.trim() || !guestPhone.trim() || !guestEmail.trim()) {
      alert("Vui lòng nhập đầy đủ họ tên, số điện thoại và email.");
      return;
    }

    const payload = {
      line_items: lineItems,
      guest_name: guestName.trim(),
      guest_phone: guestPhone.trim(),
      guest_email: guestEmail.trim(),
      booking_type: bookingType,
      stay_hours: bookingType === "hourly" ? stayHours : undefined,
      check_in_date:
        bookingType === "hourly"
          ? checkInDate.toISOString()
          : checkInDate.toISOString().split("T")[0],
      check_out_date:
        bookingType === "hourly"
          ? checkOutDate.toISOString()
          : checkOutDate.toISOString().split("T")[0],
      payment_mode: paymentMode,
      prepaid_amount: prepaidAmount,
    };

    try {
      setLoading(true);
      setError("");

      const bookingRes = await axios.post("http://localhost:3000/api/bookings", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const bookingId = bookingRes?.data?.booking?._id;
      if (!bookingId) {
        throw new Error("Không lấy được bookingId để thanh toán");
      }

      const momoRes = await axios.post("http://localhost:3000/api/momo/create", {
        bookingId,
        requestType: paymentMethod,
      });

      if (momoRes?.data?.success && momoRes?.data?.payUrl) {
        window.location.href = momoRes.data.payUrl;
        return;
      }

      throw new Error(momoRes?.data?.message || "Không tạo được link thanh toán MoMo");
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
            onClick={() => navigate(`/booking/${checkoutData.roomId}`)}
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
                    : `http://localhost:3000/uploads/${checkoutData.roomImage}`
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
                <strong>
                  {bookingType === "hourly"
                    ? `${stayHours} giờ`
                    : `${checkoutData.nights || 0} đêm`}
                </strong>
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
              <label>Hình thức thanh toán</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                disabled={loading}
              >
                <option value="full">Thanh toán toàn bộ</option>
                <option value="deposit">Đặt cọc một phần</option>
              </select>
            </div>

            {paymentMode === "deposit" && (
              <div className="checkout-form-group">
                <label>Số tiền đặt cọc</label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, total - 1)}
                  value={depositAmount}
                  onChange={(e) =>
                    setDepositAmount(Number.parseInt(e.target.value || "0", 10) || 0)
                  }
                  disabled={loading || total <= 0}
                />
                <small>Phải lớn hơn 0 và nhỏ hơn {total.toLocaleString("vi-VN")}₫</small>
              </div>
            )}

            <div className="checkout-form-group">
              <label>Cổng thanh toán MoMo</label>
              <div className="checkout-momo-brand">
                <div className="checkout-momo-logo" aria-label="MoMo logo">
                  MoMo
                </div>
                <div>
                  <strong>Ví điện tử MoMo</strong>
                  <p>Thanh toán bảo mật qua cổng MoMo</p>
                </div>
              </div>
              <div className="checkout-radio-list">
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
