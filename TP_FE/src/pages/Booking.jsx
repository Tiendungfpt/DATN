import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import DatePicker from "react-datepicker";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";
import "./Style/Booking.css";

registerLocale("vi", vi);
setDefaultLocale("vi");

function Booking() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [nights, setNights] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (checkInDate && checkOutDate && room) {
      const diffDays = Math.ceil(
        Math.abs(checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
      );
      setNights(diffDays);
      setTotal(diffDays * room.price);
    } else {
      setNights(0);
      setTotal(0);
    }
  }, [checkInDate, checkOutDate, room]);

  const handleMoMoPayment = async (e) => {
    e.preventDefault();

    if (!currentUser || !currentUser._id) {
      alert("Vui lòng đăng nhập để đặt phòng!");
      navigate("/login");
      return;
    }

    if (!checkInDate || !checkOutDate || total <= 0) {
      alert("Vui lòng chọn ngày nhận và trả phòng hợp lệ!");
      return;
    }

    const formData = {
      userId: currentUser._id,
      roomIds: [roomId], 
      checkInDate: checkInDate.toISOString().split("T")[0],
      checkOutDate : checkOutDate.toISOString().split("T")[0],
    };

    try {
      setLoading(true);
      setError("");

      console.log("🔄 Đang tạo booking...", formData);

      const token = localStorage.getItem("token");

      const bookingRes = await axios.post(
        "http://localhost:3000/api/bookings",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let bookingId = null;
      const resData = bookingRes.data;

      if (resData?.booking?._id) bookingId = resData.booking._id;
      else if (resData?._id) bookingId = resData._id;
      else if (resData?.booking?.id) bookingId = resData.booking.id;

      if (!bookingId) {
        throw new Error("Không nhận được ID booking từ server");
      }

      console.log("✅ Booking ID:", bookingId);

      const momoRes = await axios.post(
        "http://localhost:3000/api/momo/create",
        {
          bookingId: bookingId,
        },
      );

      console.log("✅ MoMo Response:", momoRes.data);

      if (momoRes.data?.success && momoRes.data?.payUrl) {
        window.location.href = momoRes.data.payUrl;
      } else {
        throw new Error(
          momoRes.data?.message || "Không thể tạo link thanh toán MoMo",
        );
      }
    } catch (err) {
      console.error("❌ Lỗi thanh toán:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Thanh toán thất bại. Vui lòng thử lại!";
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
            <p className="capacity">
              🛏️ {room.capacity} người • {room.size || "35m²"}
            </p>
            <p className="description">{room.description}</p>
            <div className="price-per-night">
              <span className="price">
                {room.price.toLocaleString("vi-VN")} ₫
              </span>
              <span className="per-night">/ đêm</span>
            </div>
          </div>
        </div>

        <div className="booking-right">
          <div className="booking-card">
            <h2>Thông tin đặt phòng</h2>
            <p className="free-cancel">✔ Hủy miễn phí trước 48 giờ</p>

            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleMoMoPayment}>
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

              <div className="summary">
                <div className="summary-row">
                  <span>Số đêm:</span>
                  <strong>{nights} đêm</strong>
                </div>
                <div className="summary-row">
                  <span>Giá mỗi đêm:</span>
                  <span>{room.price.toLocaleString("vi-VN")} ₫</span>
                </div>
                <div className="total-row">
                  <span>Tổng tiền:</span>
                  <span className="total-price">
                    {total.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="book-button momo-pay-button"
                disabled={!total || loading || !checkInDate || !checkOutDate}
              >
                {loading ? "Đang xử lý..." : "Thanh toán ngay bằng MoMo"}
              </button>

              <p className="guarantee">
                Đảm bảo giá tốt nhất • Thanh toán an toàn qua MoMo
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Booking;
