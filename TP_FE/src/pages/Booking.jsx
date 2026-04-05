import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import DatePicker from "react-datepicker";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaCar,
  FaBroom,
  FaWandMagicSparkles,
  FaDumbbell,
  FaCamera,
  FaEnvelope,
  FaBriefcase,
  FaCheck,
  FaSoap,
  FaSpa,
  FaUtensils,
} from "react-icons/fa6";
import "./style/Booking.css";

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
  const [roomQuantity, setRoomQuantity] = useState(1);

  const [serviceOptions] = useState([
    { _id: "pickup", name: "Thuê xe máy", icon: FaCar, price: 50000 },
    { _id: "room_cleaning", name: "Vệ sinh phòng", icon: FaBroom, price: 75000 },
    { _id: "laundry", name: "Giặt là", icon: FaSoap, price: 60000 },
    { _id: "spa", name: "Spa & Massage", icon: FaSpa, price: 200000 },
    { _id: "gym", name: "Phòng tập", icon: FaDumbbell, price: 150000 },
    { _id: "camera", name: "Chụp ảnh", icon: FaCamera, price: 150000 },
    { _id: "mail", name: "Ăn sáng", icon: FaUtensils, price: 50000 },
    { _id: "office_rental", name: "Cho thuê phòng họp", icon: FaBriefcase, price: 200000 },
  ]);
  const [selectedServices, setSelectedServices] = useState([]);

  const serviceFee = selectedServices.reduce((sum, serviceId) => {
    const item = serviceOptions.find((s) => s._id === serviceId);
    return sum + (item ? item.price : 0);
  }, 0);

  const totalWithService = total + serviceFee;

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
      setTotal(diffDays * room.price * roomQuantity);
    } else {
      setNights(0);
      setTotal(0);
    }
  }, [checkInDate, checkOutDate, room, roomQuantity]);

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

    const payload = {
      room_id: roomId,
      check_in_date: checkInDate.toISOString().split("T")[0],
      check_out_date: checkOutDate.toISOString().split("T")[0],
      room_quantity: roomQuantity,
      services: selectedServices,
      service_fee: serviceFee,
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

      const momoRes = await axios.post("http://localhost:3000/api/momo/create", {
        bookingId,
      });

      if (momoRes?.data?.success && momoRes?.data?.payUrl) {
        window.location.href = momoRes.data.payUrl;
        return;
      }

      throw new Error(momoRes?.data?.message || "Không tạo được link thanh toán MoMo");
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

          <div className="services-section">
            <label>Dịch vụ kèm theo</label>
            <p className="subtext">Chọn dịch vụ nếu bạn muốn thêm.</p>
            <div className="services-grid">
              {serviceOptions.map((service) => {
                const isSelected = selectedServices.includes(service._id);
                const IconComponent = service.icon;
                return (
                  <div
                    key={service._id}
                    className={`service-card ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      const next = [...selectedServices];
                      if (isSelected) {
                        const idx = next.indexOf(service._id);
                        if (idx >= 0) next.splice(idx, 1);
                      } else {
                        next.push(service._id);
                      }
                      setSelectedServices(next);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="service-icon">
                      <IconComponent size={28} />
                    </div>
                    <div className="service-content">
                      <div className="service-label">{service.name}</div>
                      <div className="service-price">+{service.price.toLocaleString("vi-VN")} ₫</div>
                    </div>
                    {isSelected && (
                      <div className="service-check">
                        <FaCheck size={18} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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

              <div className="date-range-group">
                <label>Số lượng phòng muốn đặt</label>
                <input
                  type="number"
                  min={1}
                  value={roomQuantity}
                  onChange={(e) =>
                    setRoomQuantity(Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1))
                  }
                  className="custom-date-input"
                  disabled={loading}
                />
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
                <div className="summary-row">
                  <span>Số phòng:</span>
                  <span>{roomQuantity}</span>
                </div>
                <div className="summary-row">
                  <span>Phí dịch vụ đã chọn:</span>
                  <span>{serviceFee.toLocaleString("vi-VN")} ₫</span>
                </div>
                <div className="total-row">
                  <span>Tổng tiền:</span>
                  <span className="total-price">
                    {totalWithService.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="book-button momo-pay-button"
                disabled={
                  !totalWithService ||
                  loading ||
                  !checkInDate ||
                  !checkOutDate ||
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
                <Link to="/booking-list">trang Booking</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Booking;
