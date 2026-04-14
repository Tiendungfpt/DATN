import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import DatePicker from "react-datepicker";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";
import "./style/Booking.css";

registerLocale("vi", vi);
setDefaultLocale("vi");

function Booking() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  //his
  const [reviews, setReviews] = useState([]);
const [roomSummary, setRoomSummary] = useState({ avg: 0, total: 0 });
const [visibleCount, setVisibleCount] = useState(4);
useEffect(() => {
  if (!roomId) return;

  const fetchReviews = async () => {
    try {
      const res = await axios.get(
        `http://localhost:3000/api/reviews/room/${roomId}?aggregateByType=1`
      );
      const data = Array.isArray(res.data) ? res.data : [];
      setReviews(data);

      // tính trung bình và tổng số đánh giá
      const total = data.length;
      const avg =
        total > 0
          ? (data.reduce((sum, r) => sum + (r.rating || 0), 0) / total).toFixed(1)
          : 0;

      setRoomSummary({ avg, total });
    } catch (err) {
      console.error("Không tải được đánh giá:", err);
    }
  };

  fetchReviews();
}, [roomId]);

  const [room, setRoom] = useState(null);
  const [nights, setNights] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (err) {
        console.error("Lỗi parse user:", err);
        localStorage.removeItem("user");
      }
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setGuestName(String(currentUser.name || "").trim());
    setGuestEmail(String(currentUser.email || "").trim());
  }, [currentUser]);

  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  /** Gio hang nhieu loai phong: dong dau = loai tu URL */
  const [cartLines, setCartLines] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);

  const isDevEnvironment =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const [paymentMethod, setPaymentMethod] = useState(
    isDevEnvironment ? "payWithCC" : "payWithATM",
  );
  const [paymentMode, setPaymentMode] = useState("full");
  const [depositAmount, setDepositAmount] = useState(0);

  const prepaidAmount = paymentMode === "full" ? total : depositAmount;

  useEffect(() => {
    if (!roomId) return;

    axios
      .get(`http://localhost:3000/api/rooms/${roomId}`)
      .then((res) => setRoom(res.data))
      .catch((err) => {
        console.error("Lỗi load phòng:", err);
        setError("Không thể tải thông tin phòng. Vui lòng thử lại sau.");
      });
  }, [roomId]);

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/room-types")
      .then((res) => setRoomTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRoomTypes([]));
  }, []);

  useEffect(() => {
    const mainId = room?.roomType?._id ?? room?.roomType;
    if (!mainId) return;
    const mainStr = String(mainId);
    setCartLines((prev) => {
      if (prev.length === 0) {
        return [{ key: "main", room_type_id: mainStr, quantity: 1 }];
      }
      const next = [...prev];
      next[0] = { ...next[0], room_type_id: mainStr };
      return next;
    });
  }, [room?.roomType, room?._id]);

  useEffect(() => {
    if (checkInDate && checkOutDate && roomTypes.length > 0 && cartLines.length > 0) {
      const diffDays = Math.ceil(
        Math.abs(checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
      );
      setNights(diffDays);
      let sum = 0;
      for (const line of cartLines) {
        const rt = roomTypes.find((r) => String(r._id) === String(line.room_type_id));
        const p = Number(rt?.price) || 0;
        const q = Math.max(1, Number.parseInt(String(line.quantity), 10) || 1);
        sum += diffDays * p * q;
      }
      setTotal(sum);
    } else {
      setNights(0);
      setTotal(0);
    }
  }, [checkInDate, checkOutDate, roomTypes, cartLines]);

  useEffect(() => {
    // Keep deposit value always valid against current estimated room total.
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

  const handleCreateBooking = async (e) => {
    e.preventDefault();

    if (!currentUser || !currentUser._id) {
      alert("Vui lòng đăng nhập để đặt phòng!");
      navigate("/login");
      return;
    }
    if (currentUser?.role === "admin") {
      alert("Tài khoản admin không được phép đặt phòng.");
      return;
    }

    if (!checkInDate || !checkOutDate || total <= 0) {
      alert("Vui lòng chọn ngày nhận và trả phòng hợp lệ!");
      return;
    }

    if (paymentMode === "deposit" && (depositAmount <= 0 || depositAmount >= total)) {
      alert("Số tiền đặt cọc phải lớn hơn 0 và nhỏ hơn tổng tiền phòng.");
      return;
    }

    if (!room?.roomType) {
      alert("Loại phòng chưa được gán cho phòng này. Vui lòng liên hệ khách sạn.");
      return;
    }
    const line_items = cartLines
      .filter((l) => l.room_type_id && Number(l.quantity) >= 1)
      .map((l) => ({
        room_type_id: l.room_type_id,
        quantity: Math.max(1, Number.parseInt(String(l.quantity), 10) || 1),
      }));
    if (line_items.length === 0) {
      alert("Vui lòng chọn ít nhất một loại phòng và số lượng.");
      return;
    }
    const gn = guestName.trim();
    const gp = guestPhone.trim();
    const ge = guestEmail.trim();
    if (!gn || !gp || !ge) {
      alert("Vui lòng nhập họ tên, số điện thoại và email.");
      return;
    }

    const payload = {
      line_items,
      guest_name: gn,
      guest_phone: gp,
      guest_email: ge,
      check_in_date: checkInDate.toISOString().split("T")[0],
      check_out_date: checkOutDate.toISOString().split("T")[0],
      payment_mode: paymentMode,
      prepaid_amount: prepaidAmount,
    };

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const bookingRes = await axios.post(
        "http://localhost:3000/api/bookings",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const bookingId = bookingRes?.data?.booking?._id;
      if (!bookingId) {
        throw new Error("Không lấy được bookingId để thanh toán");
      }

      try {
        const momoRes = await axios.post("http://localhost:3000/api/momo/create", {
          bookingId,
          requestType: paymentMethod,
        });

        if (momoRes?.data?.success && momoRes?.data?.payUrl) {
          window.location.href = momoRes.data.payUrl;
          return;
        }

        throw new Error(momoRes?.data?.message || "Không tạo được link thanh toán MoMo");
      } catch (momoErr) {
        const momoMsg =
          momoErr.response?.data?.message ||
          momoErr.message ||
          "Không thể kết nối cổng thanh toán";
        alert(
          `Đặt phòng thành công nhưng chưa tạo được link thanh toán.\n${momoMsg}\nBạn có thể kiểm tra đơn trong lịch sử đặt phòng và thử lại sau.`,
        );
        navigate("/thong-tin-tai-khoan?tab=history");
      }
    } catch (err) {
      console.error("❌ Lỗi đặt phòng/thanh toán:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Đặt phòng thất bại. Vui lòng thử lại!";
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (date) => {
    if (!date) return "Chưa chọn";
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const mainRoomTypeId = String(room?.roomType?._id ?? room?.roomType ?? "");

  const updateCartLine = (key, patch) => {
    setCartLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const addCartLine = () => {
    const firstOther =
      roomTypes.find((r) => String(r._id) !== mainRoomTypeId)?._id ||
      roomTypes[0]?._id;
    const id = firstOther != null ? String(firstOther) : mainRoomTypeId;
    setCartLines((prev) => [
      ...prev,
      { key: `extra-${Date.now()}`, room_type_id: id, quantity: 1 },
    ]);
  };

  const removeCartLine = (key) => {
    setCartLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((l) => l.key !== key);
    });
  };

  const totalRoomCount = cartLines.reduce(
    (s, l) => s + Math.max(1, Number.parseInt(String(l.quantity), 10) || 1),
    0,
  );

  if (!room) {
    return <div className="booking-loading">Đang tải thông tin phòng...</div>;
  }

  return (
    <div className="booking-container">
      <div className="booking-content">
        <div className="booking-left">
          <div className="room-image-container">
            <img
              src={
                room.image?.startsWith("http")
                  ? room.image
                  : `http://localhost:3000/uploads/${room.image}`
              }
              alt={room.name}
              className="room-image"
              onError={(e) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";
              }}
            />
          </div>

          <div className="room-info">
            <h1>{room.name}</h1>
            <p className="capacity">🛏️ {room.capacity} người</p>
            <p className="description">
              Phòng tiện nghi, phù hợp cho kỳ nghỉ thoải mái.
            </p>
            <div className="price-per-night">
              <span className="price">
                {room.price.toLocaleString("vi-VN")} ₫
              </span>
              <span className="per-night">/ đêm</span>
            </div>
          </div>

          <p className="subtext" style={{ marginTop: 16 }}>
            Add-on services only after check-in (hotel policy).
          </p>
        </div>

        <div className="booking-right">
          <div className="booking-card">
            <h2>Thông tin đặt phòng</h2>
            <p className="free-cancel">✔ Kiểm tra lịch trống tự động</p>

            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleCreateBooking}>
              <div className="date-range-group">
                <label>Chọn ngày nhận - trả phòng</label>
                <div className="date-picker-wrapper">
                  <DatePicker
                    selected={checkInDate}
                    onChange={(dates) => {
                      const [start, end] = dates;
                      setCheckInDate(start);
                      setCheckOutDate(end);
                    }}
                    startDate={checkInDate}
                    endDate={checkOutDate}
                    minDate={new Date()}
                    selectsRange
                    monthsShown={2}
                    locale="vi"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn khoảng thời gian lưu trú"
                    className="custom-date-input"
                    calendarClassName="custom-calendar"
                    showPopperArrow={false}
                    isClearable={true}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="selected-dates">
                <div className="date-box">
                  <span className="label">Nhận phòng</span>
                  <strong>{formatDateDisplay(checkInDate)}</strong>
                </div>
                <div className="date-box">
                  <span className="label">Trả phòng</span>
                  <strong>{formatDateDisplay(checkOutDate)}</strong>
                </div>
              </div>

              <div className="date-range-group booking-cart">
                <label>Phòng và số lượng</label>
                <p className="booking-cart-hint">
                  Dòng đầu là loại phòng bạn đang xem. Bấm &quot;Thêm loại phòng khác&quot; để gộp
                  nhiều loại trong một đơn (không cần quay lại trang chủ).
                </p>
                {cartLines.map((line, idx) => {
                  const rt = roomTypes.find(
                    (r) => String(r._id) === String(line.room_type_id),
                  );
                  const q = Math.max(1, Number.parseInt(String(line.quantity), 10) || 1);
                  const unit =
                    Number(rt?.price) || (idx === 0 ? Number(room.price) || 0 : 0);
                  const lineSubtotal = nights * unit * q;
                  return (
                    <div
                      key={line.key}
                      className={
                        idx === 0
                          ? "booking-cart-line booking-cart-line--featured"
                          : "booking-cart-line"
                      }
                    >
                      <div className="booking-cart-line-top">
                        {idx === 0 ? (
                          <div className="booking-cart-line-main">
                            <span className="booking-cart-badge">Đang xem</span>
                            <span className="booking-cart-field-label">Loại phòng</span>
                            <span className="booking-cart-type-name">
                              {rt?.name || room.name}
                            </span>
                          </div>
                        ) : (
                          <div className="booking-cart-select-wrap">
                            <span className="booking-cart-field-label">Loại phòng</span>
                            <select
                              className="custom-date-input"
                              value={String(line.room_type_id || "")}
                              onChange={(e) =>
                                updateCartLine(line.key, {
                                  room_type_id: e.target.value,
                                })
                              }
                              disabled={loading}
                              aria-label="Chọn loại phòng"
                            >
                              <option value="">— Chọn —</option>
                              {roomTypes.map((r) => (
                                <option key={r._id} value={String(r._id)}>
                                  {`${r.name} — ${Number(r.price).toLocaleString("vi-VN")} ₫/đêm`}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="booking-cart-qty">
                          <span className="booking-cart-field-label">Số phòng</span>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateCartLine(line.key, {
                                quantity: Math.max(
                                  1,
                                  Number.parseInt(e.target.value || "1", 10) || 1,
                                ),
                              })
                            }
                            className="custom-date-input"
                            disabled={loading}
                            aria-label="Số lượng phòng"
                          />
                        </div>
                        {idx > 0 && (
                          <button
                            type="button"
                            className="booking-cart-remove"
                            onClick={() => removeCartLine(line.key)}
                            disabled={loading}
                          >
                            Xóa dòng
                          </button>
                        )}
                      </div>
                      {nights > 0 && unit > 0 && (
                        <div className="booking-cart-line-subtotal">
                          Tạm tính dòng:{" "}
                          {`${lineSubtotal.toLocaleString("vi-VN")} ₫`}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="booking-cart-add"
                  onClick={addCartLine}
                  disabled={loading || roomTypes.length === 0}
                >
                  + Thêm loại phòng khác
                </button>
              </div>

              <div className="date-range-group">
                <label>Họ và tên</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="custom-date-input"
                  required
                  disabled={loading}
                />
              </div>
              <div className="date-range-group">
                <label>Số điện thoại (đối chiếu khi check-in)</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="custom-date-input"
                  required
                  disabled={loading}
                />
              </div>
              <div className="date-range-group">
                <label>Email</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="custom-date-input"
                  required
                  disabled={loading}
                />
              </div>

              <div className="summary">
                <div className="summary-row">
                  <span>Số đêm:</span>
                  <strong>{nights} đêm</strong>
                </div>
                {cartLines.map((line, idx) => {
                  const rt = roomTypes.find(
                    (r) => String(r._id) === String(line.room_type_id),
                  );
                  const name = idx === 0 ? rt?.name || room.name : rt?.name || "—";
                  const q = Math.max(1, Number.parseInt(String(line.quantity), 10) || 1);
                  const p =
                    Number(rt?.price) || (idx === 0 ? Number(room.price) || 0 : 0);
                  const sub = nights * p * q;
                  return (
                    <div key={line.key} className="summary-row summary-row--line">
                      <span>
                        {name} × {q}:
                      </span>
                      <span>{sub.toLocaleString("vi-VN")} ₫</span>
                    </div>
                  );
                })}
                <div className="summary-row">
                  <span>Tổng số phòng:</span>
                  <span>{totalRoomCount}</span>
                </div>
                <div className="total-row">
                  <span>Tạm tính tiền phòng:</span>
                  <span className="total-price">
                    {total.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              </div>

              <div className="date-range-group">
                <label>Hình thức thanh toán khi đặt phòng</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="custom-date-input"
                  disabled={loading}
                >
                  <option value="full">Thanh toán toàn bộ tiền phòng</option>
                  <option value="deposit">Đặt cọc một phần</option>
                </select>
              </div>

              {paymentMode === "deposit" && (
                <div className="date-range-group">
                  <label>Số tiền đặt cọc (VND)</label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, total - 1)}
                    value={depositAmount}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value || "0", 10) || 0;
                      setDepositAmount(next);
                    }}
                    className="custom-date-input"
                    disabled={loading || total <= 0}
                  />
                  <small className="text-muted">
                    Tiền cọc phải &gt; 0 và &lt; {total.toLocaleString("vi-VN")} ₫.
                  </small>
                </div>
              )}

              <div className="summary">
                <div className="summary-row">
                  <span>Số tiền thanh toán ngay:</span>
                  <strong>{prepaidAmount.toLocaleString("vi-VN")} ₫</strong>
                </div>
              </div>

              <div className="date-range-group">
                <label>Phương thức thanh toán MoMo</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="custom-date-input"
                  disabled={loading}
                >
                  <option value="payWithATM">Thẻ ATM nội địa (Napas)</option>
                  <option value="payWithCC">Thẻ quốc tế (Visa/Master/JCB)</option>
                </select>
              </div>

              <button
                type="submit"
                className="book-button momo-pay-button"
                disabled={
                  !total ||
                  loading ||
                  !checkInDate ||
                  !checkOutDate ||
                  (paymentMode === "deposit" &&
                    (depositAmount <= 0 || depositAmount >= total)) ||
                  currentUser?.role === "admin"
                }
              >
                {currentUser?.role === "admin"
                  ? "Admin không thể đặt phòng"
                  : loading
                    ? "Đang xử lý..."
                    : "Xác nhận đặt phòng"}
              </button>

              <p className="guarantee">
                Lịch sử đặt phòng của bạn tại{" "}
                <Link to="/thong-tin-tai-khoan?tab=history">Lịch sử đặt phòng</Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      
      {/* ⭐ REVIEW SECTION */}
<div className="mt-5 p-4 bg-white rounded shadow"
  style={{
    maxWidth: "1100px",
    margin: "40px auto",
  }}>
  <h3 className="fw-bold mb-3 text-center">⭐ Đánh giá từ khách hàng</h3>

  <div className="mb-4 text-center">
    <h1 className="text-warning fw-bold">{roomSummary.avg} / 5</h1>
    <p className="text-muted">{roomSummary.total} đánh giá</p>
  </div>

  {reviews.length === 0 ? (
    <p className="text-muted text-center">Chưa có đánh giá</p>
  ) : (
    reviews.slice(0, visibleCount).map((r) => (
      <div key={r._id} className="border-top pt-3 mb-3">
        <p className="fw-bold mb-1">
  👤 {r.user_id?.name || "Ẩn danh"} 
</p>

<p className="text-muted mb-1">
  🏨 Phòng: {r.room_id?.room_no || "Không rõ"}
</p>
        <p className="text-warning mb-1">⭐ {r.rating} / 5</p>
        <p className="text-muted mb-0">{r.comment || "Không có nhận xét"}</p>
        {r.adminReply ? (
          <div className="alert alert-primary py-2 px-3 mt-2 mb-0">
            <strong>Phản hồi từ khách sạn:</strong> {r.adminReply}
          </div>
        ) : null}
      </div>
    ))
  )}

  <div className="text-center mt-3">
    {visibleCount < reviews.length ? (
      <button
        className="btn btn-outline-primary"
        onClick={() => setVisibleCount(visibleCount + 4)}
      >
        Xem thêm
      </button>
    ) : reviews.length > 4 ? (
      <button
        className="btn btn-outline-secondary"
        onClick={() => setVisibleCount(4)}
      >
        Thu gọn
      </button>
    ) : null}
  </div>
</div>
    </div>
    
  );
}


export default Booking;
