import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import "./RoomTypeCardStructured.css";

const fallbackRoomImage =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

function resolveImage(img) {
  const raw = String(img || "").trim();
  if (!raw) return fallbackRoomImage;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  // support both "/uploads/xxx" and "xxx"
  if (raw.startsWith("/")) return raw;
  return `/uploads/${raw}`;
}

function RoomTypeCardStructured({
  room,
  imageSrc,
  ratingAvg = 0,
  ratingTotal = 0,
  availableCount = 0,
  description = "",
  complimentaryServices = [],
  priceOverride,
  capacityOverride,
  showBookButton = true,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSoldOut = Number(availableCount) <= 0;
  const roomTypeId = String(room?.roomType?._id ?? room?.roomType ?? room?.room_type_id ?? "");
  const canUseRoomType = Boolean(roomTypeId) && roomTypeId !== "undefined" && roomTypeId !== "null";
  const detailHref = canUseRoomType ? `/hang-phong/${roomTypeId}` : `/booking/${room._id}`;
  const bookHref = canUseRoomType ? `/book?room_type_id=${encodeURIComponent(roomTypeId)}` : `/book`;

  const cardImage = useMemo(() => {
    const base = imageSrc ? [imageSrc] : room?.image ? [room.image] : [];
    const arr = Array.isArray(room?.images) ? room.images : [];
    const merged = [...base, ...arr].map(resolveImage);
    const unique = Array.from(new Set(merged));
    return unique[0] || fallbackRoomImage;
  }, [imageSrc, room?.image, room?.images]);

  const displayPrice = Number(
    priceOverride ?? room?.price ?? room?.roomType?.price ?? 0,
  );
  const displayCapacity =
    capacityOverride ??
    room?.capacity ??
    room?.maxGuests ??
    room?.max_guests ??
    room?.roomType?.maxGuests ??
    room?.roomType?.max_guests;

  const ensureCanBook = () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        user = null;
      }
    }
    if (!token || !user?._id) {
      alert("Vui lòng đăng nhập để đặt phòng.");
      navigate("/login", { state: { from: location?.pathname + (location?.search || "") } });
      return false;
    }
    if (user?.role === "admin") {
      alert("Tài khoản admin không được phép đặt phòng.");
      return false;
    }
    return true;
  };

  return (
    <article className={`rt-structured-card${isSoldOut ? " is-sold-out" : ""}`}>
      <header className="rt-structured-header">{room.name}</header>
      <div className="rt-structured-body">
        <img
          className="rt-structured-image"
          src={cardImage}
          alt={room.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackRoomImage;
          }}
        />
        <div className="rt-structured-content">
          <div className="rt-structured-rating">
            <span className="rt-structured-rating-star">⭐</span>
            <strong>{ratingAvg}</strong>
            <span>/ 5</span>
            <small>({ratingTotal} đánh giá)</small>
          </div>

          <ul className="rt-structured-list">
            <li>
              <strong>Sức chứa:</strong> {displayCapacity ?? "Đang cập nhật"} người
            </li>
            <li>
              <strong>Giá:</strong> {displayPrice.toLocaleString("vi-VN")}đ/đêm
            </li>
            <li>
              <strong>{isSoldOut ? "Trạng thái:" : "Còn trống:"}</strong>{" "}
              {isSoldOut ? "Hết phòng" : `${availableCount} phòng`}
            </li>
          </ul>

          <p className="rt-structured-desc" title={description || "Mô tả đang cập nhật."}>
            {description || "Mô tả đang cập nhật."}
          </p>

          {Array.isArray(complimentaryServices) && complimentaryServices.length > 0 ? (
            <div className="rt-structured-free">
              <strong>Dịch vụ miễn phí:</strong>
              <div className="rt-structured-free-list">
                {complimentaryServices.slice(0, 4).map((item) => (
                  <span key={item} className="rt-structured-free-chip">{item}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rt-structured-actions">
            <Link to={detailHref} className="rt-structured-link">
              Xem chi tiết
            </Link>

            {showBookButton && (
              isSoldOut ? (
                <button type="button" className="rt-structured-book-btn is-disabled" disabled>
                  Hết phòng
                </button>
              ) : (
                <Link
                  to={bookHref}
                  className="rt-structured-book-btn"
                  onClick={(e) => {
                    if (!ensureCanBook()) e.preventDefault();
                  }}
                >
                  Đặt phòng
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default RoomTypeCardStructured;
