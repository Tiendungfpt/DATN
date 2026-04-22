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
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityItems, setAvailabilityItems] = useState([]);
  const [availabilityOk, setAvailabilityOk] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);

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

  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [bookingType, setBookingType] = useState("overnight");
  const [hourlyCheckIn, setHourlyCheckIn] = useState("");
  const [stayHours, setStayHours] = useState(3);
  /** Gio hang nhieu loai phong: dong dau = loai tu URL */
  const [cartLines, setCartLines] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);

  const getHourlyRate = (roomType) => {
    const configured = Number(roomType?.hourly_price) || 0;
    if (configured > 0) return configured;
    const nightly = Number(roomType?.price) || 0;
    if (nightly <= 0) return 0;
    return Math.max(1000, Math.ceil(nightly / 10));
  };

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
    if (bookingType === "hourly") {
      if (!hourlyCheckIn || roomTypes.length === 0 || cartLines.length === 0) {
        setNights(0);
        setTotal(0);
        setCheckInDate(null);
        setCheckOutDate(null);
        return;
      }
      const start = new Date(hourlyCheckIn);
      if (Number.isNaN(start.getTime())) {
        setNights(0);
        setTotal(0);
        setCheckInDate(null);
        setCheckOutDate(null);
        return;
      }
      const hours = Math.max(1, Number.parseInt(String(stayHours), 10) || 1);
      const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
      setCheckInDate(start);
      setCheckOutDate(end);
      setNights(0);
      let sum = 0;
      for (const line of cartLines) {
        const rt = roomTypes.find((r) => String(r._id) === String(line.room_type_id));
        const p = getHourlyRate(rt);
        const q = Math.max(1, Number.parseInt(String(line.quantity), 10) || 1);
        sum += hours * p * q;
      }
      setTotal(sum);
      return;
    }

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
  }, [bookingType, hourlyCheckIn, stayHours, checkInDate, checkOutDate, roomTypes, cartLines]);

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

  const hasValidStayTime =
    bookingType === "hourly"
      ? Boolean(hourlyCheckIn) && Number.parseInt(String(stayHours), 10) >= 1
      : Boolean(checkInDate) && Boolean(checkOutDate);

  const canContinueToGuestInfo =
    hasValidStayTime &&
    Boolean(checkOutDate) &&
    total > 0 &&
    currentUser?.role !== "admin" &&
    cartLines.some((l) => l.room_type_id && Number(l.quantity) >= 1);

  useEffect(() => {
    let timer;
    let cancelled = false;

    const validLines = cartLines
      .filter((l) => l.room_type_id && Number(l.quantity) >= 1)
      .map((l) => ({
        room_type_id: String(l.room_type_id),
        quantity: Math.max(1, Number.parseInt(String(l.quantity), 10) || 1),
      }));

    const canCheckOvernight = bookingType === "overnight" && checkInDate && checkOutDate;
    const canCheckHourly =
      bookingType === "hourly" &&
      hourlyCheckIn &&
      Number.parseInt(String(stayHours), 10) >= 1;

    if (!validLines.length || (!canCheckOvernight && !canCheckHourly)) {
      setAvailabilityItems([]);
      setAvailabilityError("");
      setAvailabilityOk(true);
      setAvailabilityLoading(false);
      return undefined;
    }

    timer = setTimeout(async () => {
      try {
        setAvailabilityLoading(true);
        setAvailabilityError("");
        const params = {
          booking_type: bookingType,
          line_items: JSON.stringify(validLines),
        };
        if (bookingType === "hourly") {
          params.check_in_date = new Date(hourlyCheckIn).toISOString();
          params.stay_hours = Math.max(1, Number.parseInt(String(stayHours), 10) || 1);
        } else {
          params.check_in_date = checkInDate.toISOString().split("T")[0];
          params.check_out_date = checkOutDate.toISOString().split("T")[0];
        }
        const res = await axios.get("http://localhost:3000/api/bookings/availability", {
          params,
        });
        if (cancelled) return;
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setAvailabilityItems(items);
        setAvailabilityOk(Boolean(res.data?.ok));
      } catch (err) {
        if (cancelled) return;
        setAvailabilityItems([]);
        setAvailabilityOk(false);
        setAvailabilityError(
          err.response?.data?.message || "Không thể kiểm tra phòng trống. Vui lòng thử lại.",
        );
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [bookingType, hourlyCheckIn, stayHours, checkInDate, checkOutDate, cartLines]);

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

            <div className="date-range-group">
              <label>Hình thức đặt</label>
              <select
                value={bookingType}
                className="custom-date-input"
                onChange={(e) => setBookingType(e.target.value)}
                disabled={loading}
              >
                <option value="overnight">Đặt theo đêm</option>
                <option value="hourly">Đặt theo giờ</option>
              </select>
            </div>

            {bookingType === "overnight" ? (
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
            ) : (
              <>
                <div className="date-range-group">
                  <label>Giờ nhận phòng</label>
                  <input
                    type="datetime-local"
                    className="custom-date-input"
                    value={hourlyCheckIn}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setHourlyCheckIn(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="date-range-group">
                  <label>Số giờ sử dụng</label>
                  <select
                    className="custom-date-input"
                    value={stayHours}
                    onChange={(e) =>
                      setStayHours(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                    }
                    disabled={loading}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 24].map((h) => (
                      <option key={h} value={h}>
                        {h} giờ
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

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
                const lineAvailability = availabilityItems.find(
                  (item) => String(item.room_type_id) === String(line.room_type_id),
                );
                const q = Math.max(1, Number.parseInt(String(line.quantity), 10) || 1);
                const unit =
                  bookingType === "hourly"
                    ? getHourlyRate(rt)
                    : Number(rt?.price) || (idx === 0 ? Number(room.price) || 0 : 0);
                const duration = bookingType === "hourly" ? Math.max(1, Number(stayHours) || 1) : nights;
                const lineSubtotal = duration * unit * q;
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
                    {duration > 0 && unit > 0 && (
                      <div className="booking-cart-line-subtotal">
                        Tạm tính dòng:{" "}
                        {`${lineSubtotal.toLocaleString("vi-VN")} ₫`}
                      </div>
                    )}
                    {lineAvailability && (
                      <div
                        className="booking-cart-line-subtotal"
                        style={{
                          color: lineAvailability.is_enough ? "#065f46" : "#b91c1c",
                          borderTopStyle: "solid",
                        }}
                      >
                        {lineAvailability.is_enough
                          ? `Còn ${lineAvailability.available} phòng trống cho loại này.`
                          : lineAvailability.message}
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
              {availabilityLoading && (
                <p className="booking-cart-hint" style={{ marginTop: 10 }}>
                  Đang kiểm tra phòng trống...
                </p>
              )}
              {availabilityError && (
                <p className="error-message" style={{ marginTop: 10 }}>
                  {availabilityError}
                </p>
              )}
              {!availabilityLoading && !availabilityError && availabilityItems.length > 0 && !availabilityOk && (
                <p className="error-message" style={{ marginTop: 10 }}>
                  Một số loại phòng không đủ số lượng. Vui lòng đổi loại phòng hoặc giảm số lượng.
                </p>
              )}
            </div>

              <div className="summary">
                <div className="summary-row">
                  <span>{bookingType === "hourly" ? "Số giờ:" : "Số đêm:"}</span>
                  <strong>
                    {bookingType === "hourly" ? `${stayHours} giờ` : `${nights} đêm`}
                  </strong>
                </div>
                {cartLines.map((line, idx) => {
                  const rt = roomTypes.find(
                    (r) => String(r._id) === String(line.room_type_id),
                  );
                  const name = idx === 0 ? rt?.name || room.name : rt?.name || "—";
                  const q = Math.max(1, Number.parseInt(String(line.quantity), 10) || 1);
                  const p =
                    bookingType === "hourly"
                      ? getHourlyRate(rt)
                      : Number(rt?.price) || (idx === 0 ? Number(room.price) || 0 : 0);
                  const duration = bookingType === "hourly" ? Math.max(1, Number(stayHours) || 1) : nights;
                  const sub = duration * p * q;
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

              <button
                type="button"
                className="book-button momo-pay-button"
                onClick={() => {
                  if (!currentUser || !currentUser._id) {
                    alert("Vui lòng đăng nhập để đặt phòng!");
                    navigate("/login");
                    return;
                  }
                  if (!checkInDate || !checkOutDate || total <= 0) {
                    alert("Vui lòng chọn thời gian lưu trú hợp lệ!");
                    return;
                  }
                  if (currentUser?.role === "admin") {
                    alert("Tài khoản admin không được phép đặt phòng.");
                    return;
                  }
                  if (!cartLines.some((l) => l.room_type_id && Number(l.quantity) >= 1)) {
                    alert("Vui lòng chọn ít nhất một loại phòng và số lượng.");
                    return;
                  }
                  const checkoutLines = cartLines
                    .filter((l) => l.room_type_id && Number(l.quantity) >= 1)
                    .map((l, idx) => {
                      const rt = roomTypes.find(
                        (r) => String(r._id) === String(l.room_type_id),
                      );
                      const quantity = Math.max(
                        1,
                        Number.parseInt(String(l.quantity), 10) || 1,
                      );
                      const price =
                        bookingType === "hourly"
                          ? getHourlyRate(rt)
                          : Number(rt?.price) || (idx === 0 ? Number(room.price) || 0 : 0);
                      const duration =
                        bookingType === "hourly" ? Math.max(1, Number(stayHours) || 1) : nights;
                      return {
                        room_type_id: String(l.room_type_id),
                        room_type_name: idx === 0 ? rt?.name || room.name : rt?.name || "—",
                        quantity,
                        price,
                        subtotal: duration * price * quantity,
                      };
                    });

                  navigate("/booking/checkout", {
                    state: {
                      roomId,
                      roomName: room.name,
                      roomImage: room.image,
                      bookingType,
                      stayHours: bookingType === "hourly" ? Math.max(1, Number(stayHours) || 1) : null,
                      checkInDate: checkInDate.toISOString(),
                      checkOutDate: checkOutDate.toISOString(),
                      nights,
                      total,
                      totalRoomCount,
                      checkoutLines,
                    },
                  });
                }}
                disabled={!canContinueToGuestInfo || loading || !availabilityOk || availabilityLoading}
              >
                {currentUser?.role === "admin" ? "Admin không thể đặt phòng" : "Đặt phòng"}
              </button>

              <p className="guarantee">
                Lịch sử đặt phòng của bạn tại{" "}
                <Link to="/thong-tin-tai-khoan?tab=history">Lịch sử đặt phòng</Link>
              </p>
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
