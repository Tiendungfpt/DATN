import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { createBooking } from "../services/bookingApi";
import { getBookingAvailability } from "../services/roomsApi";
import "./style/Booking.css";

function Booking() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [room, setRoom] = useState(null);
  const [nights, setNights] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [quantity, setQuantity] = useState(0);
  const [availableCount, setAvailableCount] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const qIn = searchParams.get("checkIn") || "";
  const qOut = searchParams.get("checkOut") || "";

  const [form, setForm] = useState({
    checkIn: qIn,
    checkOut: qOut,
  });

  useEffect(() => {
    const cin = searchParams.get("checkIn");
    const cout = searchParams.get("checkOut");
    if (cin || cout) {
      setForm((f) => ({
        ...f,
        ...(cin ? { checkIn: cin } : {}),
        ...(cout ? { checkOut: cout } : {}),
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      alert("Vui lòng đăng nhập để đặt phòng");
      const qs = searchParams.toString();
      navigate("/login", {
        state: { from: `/booking/${roomId}${qs ? `?${qs}` : ""}` },
      });
    }
  }, [navigate, roomId, searchParams]);

  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/rooms/${roomId}`)
      .then((res) => setRoom(res.data))
      .catch(console.log);
  }, [roomId]);

  const loadAvailability = useCallback(async () => {
    if (!form.checkIn || !form.checkOut || !roomId) {
      setAvailableCount(null);
      setAvailabilityError("");
      return;
    }

    const inDate = new Date(form.checkIn);
    const outDate = new Date(form.checkOut);
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime()) || outDate <= inDate) {
      setAvailableCount(null);
      setAvailabilityError("");
      return;
    }

    setLoadingAvailability(true);
    setAvailabilityError("");
    try {
      const { data } = await getBookingAvailability({
        roomId,
        checkInDate: form.checkIn,
        checkOutDate: form.checkOut,
      });
      const count = data.availableCount ?? 0;
      setAvailableCount(count);
      setQuantity(0);
    } catch (err) {
      const data = err.response?.data;
      const msg =
        (data && (data.message || data.error)) ||
        err.message ||
        "Không kiểm tra được phòng trống.";
      setAvailabilityError(msg);
      setAvailableCount(null);
      setQuantity(0);
    } finally {
      setLoadingAvailability(false);
    }
  }, [form.checkIn, form.checkOut, roomId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    if (!room || !form.checkIn || !form.checkOut) {
      setNights(0);
      setTotal(0);
      return;
    }
    const inDate = new Date(form.checkIn);
    const outDate = new Date(form.checkOut);
    const diff = (outDate - inDate) / (1000 * 60 * 60 * 24);
    if (diff <= 0) {
      setNights(0);
      setTotal(0);
      return;
    }
    setNights(diff);
    if (quantity < 1) {
      setTotal(0);
      return;
    }
    let qty = quantity;
    if (availableCount === 0) {
      qty = 0;
    } else if (availableCount != null && availableCount > 0) {
      qty = Math.min(quantity, availableCount);
    }
    setTotal(diff * room.price * qty);
  }, [form.checkIn, form.checkOut, room, quantity, availableCount]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    const newForm = {
      ...form,
      [name]: value,
    };

    if (newForm.checkIn && newForm.checkOut) {
      const inDate = new Date(newForm.checkIn);
      const outDate = new Date(newForm.checkOut);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (inDate < today) {
        alert("Không thể chọn ngày trong quá khứ");
        return;
      }

      if (outDate <= inDate) {
        alert("Ngày trả phòng phải sau ngày nhận phòng");
        return;
      }
    }

    setForm(newForm);
  };

  const handleQuantityChange = (e) => {
    const v = parseInt(e.target.value, 10);
    setQuantity(Number.isNaN(v) ? 0 : v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    if (!form.checkIn || !form.checkOut) {
      alert("Vui lòng chọn ngày hợp lệ");
      return;
    }

    if (quantity < 1) {
      alert("Vui lòng chọn số phòng (ít nhất 1 phòng).");
      return;
    }

    if (!total) {
      alert("Vui lòng kiểm tra lại ngày và số phòng.");
      return;
    }

    try {
      setLoading(true);

      const fresh = await getBookingAvailability({
        roomId,
        checkInDate: form.checkIn,
        checkOutDate: form.checkOut,
      });
      const count = fresh.data.availableCount ?? 0;
      const ids = fresh.data.availableRoomIds || [];

      setAvailableCount(count);

      if (count === 0) {
        alert(
          "Không còn phòng trống cùng loại trong khoảng ngày này. Hiện còn 0 phòng."
        );
        return;
      }

      if (quantity > count) {
        alert(
          `Số lượng bạn chọn vượt quá phòng còn trống. Hiện chỉ còn ${count} phòng. Vui lòng chọn tối đa ${count} phòng.`
        );
        setQuantity(Math.min(quantity, count));
        return;
      }

      const roomIds = ids.slice(0, quantity);
      if (roomIds.length !== quantity) {
        alert(
          `Không đủ phòng để đặt. Chỉ còn ${roomIds.length} phòng khả dụng.`
        );
        return;
      }

      const res = await createBooking({
        roomIds,
        checkInDate: form.checkIn,
        checkOutDate: form.checkOut,
      });

      alert("✅ Đặt phòng thành công");

      const bookingId = res.data.booking._id;
      navigate(`/payment/${bookingId}`);
    } catch (err) {
      alert(err.response?.data?.message || "Đặt phòng thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (!room) return <h2>Đang tải...</h2>;

  const today = new Date().toISOString().split("T")[0];

  const maxRooms =
    availableCount != null && availableCount >= 0 ? availableCount : 0;
  const effectiveMax = loadingAvailability ? 0 : maxRooms;
  const qtyOptions = Array.from({ length: effectiveMax + 1 }, (_, i) => i);

  const selectDisabled = loadingAvailability || !!availabilityError;

  const canSubmit =
    quantity >= 1 &&
    total > 0 &&
    !loading &&
    !loadingAvailability &&
    availableCount != null &&
    availableCount > 0 &&
    quantity <= availableCount &&
    !availabilityError;

  return (
    <div className="booking-wrapper">
      <div className="booking-left">
        <img
          src={
            room.image?.startsWith("http")
              ? room.image
              : `http://localhost:3000/uploads/${room.image}`
          }
          alt={room.name}
        />

        <h2>{room.name}</h2>
        <p>{room.description}</p>

        <h3 className="price">
          {room.price.toLocaleString("vi-VN")} đ / đêm / phòng
        </h3>
      </div>

      <form className="booking-right" onSubmit={handleSubmit}>
        <h2>Thông tin đặt phòng</h2>

        <label>Nhận phòng</label>
        <input
          type="date"
          name="checkIn"
          min={today}
          required
          value={form.checkIn}
          onChange={handleChange}
        />

        <label>Trả phòng</label>
        <input
          type="date"
          name="checkOut"
          min={form.checkIn || today}
          required
          value={form.checkOut}
          onChange={handleChange}
        />

        {form.checkIn && form.checkOut && (
          <div className="booking-room-qty-box">
            <label className="booking-room-qty-label" htmlFor="booking-qty">
              Số phòng
            </label>

            {loadingAvailability && (
              <p className="booking-avail-loading">Đang kiểm tra phòng trống…</p>
            )}

            {availabilityError && (
              <p className="booking-avail-error">{availabilityError}</p>
            )}

            <div className="booking-select-room-wrap">
              <select
                id="booking-qty"
                className="booking-select-room"
                value={Math.min(quantity, effectiveMax)}
                onChange={handleQuantityChange}
                disabled={selectDisabled}
              >
                {qtyOptions.map((n) => (
                  <option key={n} value={n}>
                    {n} phòng
                  </option>
                ))}
              </select>
            </div>

            {availableCount != null && !loadingAvailability && !availabilityError && (
              <p className="booking-qty-hint">
                {availableCount === 0 ? (
                  <>
                    Hiện không còn phòng trống cùng loại trong khoảng ngày này (chỉ
                    chọn được <strong>0 phòng</strong>).
                  </>
                ) : (
                  <>
                    Chọn từ <strong>0 phòng</strong> đến{" "}
                    <strong>{availableCount} phòng</strong>. Số phòng trống tối
                    đa do hệ thống tính theo ngày; admin có thể cấu hình chi tiết
                    sau.
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <div className="summary">
          <p>
            Số đêm: <b>{nights}</b>
          </p>
          <p>
            Số phòng: <b>{quantity}</b>
          </p>
          <p>
            Giá / đêm / phòng: {room.price.toLocaleString("vi-VN")} đ
          </p>

          <h3>
            Tổng tiền (ước tính):
            <span>{total.toLocaleString("vi-VN")} đ</span>
          </h3>
          <p className="booking-hint">
            Giá cuối cùng do hệ thống tính khi xác nhận đặt phòng.
          </p>
        </div>

        <button type="submit" disabled={!canSubmit}>
          {loading ? "Đang xử lý..." : "Thanh toán ngay"}
        </button>
      </form>
    </div>
  );
}

export default Booking;
