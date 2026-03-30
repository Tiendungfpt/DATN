import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import DatePicker from "react-datepicker";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";
import { addDays } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { createBooking } from "../services/bookingApi";
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

    const user = JSON.parse(localStorage.getItem("user"));

    const [checkInDate, setCheckInDate] = useState(null);
    const [checkOutDate, setCheckOutDate] = useState(null);

    useEffect(() => {
        axios
            .get(`http://localhost:3000/api/rooms/${roomId}`)
            .then((res) => setRoom(res.data))
            .catch((err) => console.error("Lỗi load phòng:", err));
    }, [roomId]);

    useEffect(() => {
        if (checkInDate && checkOutDate && room) {
            const diffTime = Math.abs(checkOutDate - checkInDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            setNights(diffDays);
            setTotal(diffDays * room.price);
        } else {
            setNights(0);
            setTotal(0);
        }
    }, [checkInDate, checkOutDate, room]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!checkInDate || !checkOutDate || !total) {
            alert("Vui lòng chọn ngày nhận và trả phòng hợp lệ");
            return;
        }

        const formData = {
            userId: user?._id,
            roomId: roomId,
            checkIn: checkInDate.toISOString().split("T")[0],
            checkOut: checkOutDate.toISOString().split("T")[0],
        };

        try {
            setLoading(true);
            const res = await createBooking(formData);
            alert("✅ Đặt phòng thành công!");
            navigate(`/payment/${res.data.booking._id}`);
        } catch (err) {
            alert(err.response?.data?.message || "Đặt phòng thất bại");
        } finally {
            setLoading(false);
        }
    };

    if (!room) {
        return <div className="booking-loading">Đang tải thông tin phòng...</div>;
    }

    const formatDateDisplay = (date) => {
        if (!date) return "Chọn ngày";
        return date.toLocaleDateString("vi-VN", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

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
                                e.target.src = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";
                            }}
                        />
                    </div>

                    <div className="room-info">
                        <h1>{room.name}</h1>
                        <p className="capacity">🛏️ {room.capacity} người • {room.size || "35m²"}</p>
                        <p className="description">{room.description}</p>

                        <div className="price-per-night">
                            <span className="price">{room.price.toLocaleString("vi-VN")} ₫</span>
                            <span className="per-night">/ đêm</span>
                        </div>
                    </div>
                </div>

                <div className="booking-right">
                    <div className="booking-card">
                        <h2>Thông tin đặt phòng</h2>
                        <p className="free-cancel">✔ Hủy miễn phí trước 48 giờ</p>

                        <form onSubmit={handleSubmit}>
                            {/* Date Range Picker */}
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
                                        placeholderText="Chọn khoảng thời gian"
                                        className="custom-date-input"
                                        calendarClassName="custom-calendar"
                                        showPopperArrow={false}
                                        isClearable={true}
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
                                    <strong>{nights}</strong>
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
                                className="book-button"
                                disabled={!total || loading}
                            >
                                {loading ? "Đang xử lý..." : "Thanh toán ngay"}
                            </button>

                            <p className="guarantee">Đảm bảo giá tốt nhất • Thanh toán an toàn</p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Booking;