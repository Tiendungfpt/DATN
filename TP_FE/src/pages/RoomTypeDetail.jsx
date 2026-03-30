import { useMemo, useState } from "react";
import {
  Link,
  Navigate,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import axios from "axios";
import { PUBLIC_ROOM_TYPES } from "../data/roomTypes";
import { addDaysLocal, localISODate } from "../utils/dateLocal";
import "./Style/RoomTypeDetail.css";

const API = "http://localhost:3000/api";

export default function RoomTypeDetail() {
  const { roomTypeKey } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loadingBook, setLoadingBook] = useState(false);

  const room = useMemo(
    () => PUBLIC_ROOM_TYPES.find((r) => r.key === roomTypeKey),
    [roomTypeKey]
  );

  const today = localISODate();
  const tomorrow = addDaysLocal(1);

  const checkIn = searchParams.get("checkIn") || today;
  const checkOut = searchParams.get("checkOut") || tomorrow;
  const adults = searchParams.get("adults") || "2";
  const children = searchParams.get("children") || "0";

  const fallbackListUrl = useMemo(() => {
    const q = new URLSearchParams({
      checkIn,
      checkOut,
      adults,
      children,
      roomType: roomTypeKey,
    });
    return `/dat-phong?${q.toString()}`;
  }, [checkIn, checkOut, adults, children, roomTypeKey]);

  const handleDatPhong = async () => {
    setLoadingBook(true);
    try {
      const { data } = await axios.get(`${API}/rooms/available`, {
        params: {
          checkIn,
          checkOut,
          adults,
          children,
          roomType: roomTypeKey,
        },
      });

      const rooms = Array.isArray(data) ? data : [];
      if (rooms.length === 0) {
        const ok = window.confirm(
          "Hiện không có phòng trống loại này trong khoảng ngày đã chọn. Bạn có muốn xem danh sách phòng (có thể đổi ngày hoặc loại)?"
        );
        if (ok) navigate(fallbackListUrl);
        return;
      }

      const q = new URLSearchParams({
        checkIn,
        checkOut,
        adults,
        children,
      });
      navigate(`/phong/${rooms[0]._id}?${q.toString()}`);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Không tải được phòng. Thử lại sau.";
      alert(msg);
    } finally {
      setLoadingBook(false);
    }
  };

  if (!room) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="room-type-detail">
      <nav className="room-type-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true"> / </span>
        <span>Loại phòng</span>
        <span aria-hidden="true"> / </span>
        <span className="room-type-breadcrumb-current">{room.name}</span>
      </nav>

      <article className="room-type-article">
        <div className="room-type-hero">
          <img src={room.image} alt={room.name} />
        </div>

        <div className="room-type-body">
          <p className="room-type-tag">Thịnh Phát Hotel</p>
          <h1>{room.name}</h1>

          <p className="room-type-price">
            {room.price.toLocaleString("vi-VN")} đ / đêm
            <span className="room-type-price-note"> (giá tham khảo)</span>
          </p>

          <p className="room-type-lead">{room.desc}</p>

          <section className="room-type-section" aria-labelledby="tien-ich">
            <h2 id="tien-ich">Tiện nghi</h2>
            <ul className="room-type-amenities">
              <li>Điều hòa, wifi miễn phí</li>
              <li>Phòng tắm riêng, đồ dùng vệ sinh</li>
              <li>TV, minibar (tuỳ hạng phòng)</li>
            </ul>
          </section>

          <p className="room-type-dates">
            Thông tin đặt phòng:{" "}
            <strong>
              {checkIn} → {checkOut}
            </strong>
            · {adults} người lớn
            {Number(children) > 0 ? `, ${children} trẻ em` : ""}
          </p>

          <div className="room-type-actions">
            <button
              type="button"
              className="room-type-btn-primary"
              disabled={loadingBook}
              onClick={handleDatPhong}
              aria-label={`Đặt phòng ${room.name} — mở trang chi tiết phòng`}
            >
              {loadingBook ? "Đang tải…" : "Đặt phòng"}
            </button>
            <Link className="room-type-btn-ghost" to={`/?#phong`}>
              ← Các loại phòng khác
            </Link>
          </div>

          <p className="room-type-footnote">
            Giá và tình trạng còn phòng phụ thuộc ngày; khi đặt, hệ thống tính
            theo phòng cụ thể trong khách sạn.
          </p>
        </div>
      </article>
    </div>
  );
}
