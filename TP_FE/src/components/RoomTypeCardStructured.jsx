import { Link } from "react-router-dom";
import "./RoomTypeCardStructured.css";

const fallbackRoomImage =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

function RoomTypeCardStructured({
  room,
  imageSrc,
  ratingAvg = 0,
  ratingTotal = 0,
  availableCount = 0,
  description = "",
  showBookButton = true,
}) {
  const isSoldOut = Number(availableCount) <= 0;

  return (
    <article className={`rt-structured-card${isSoldOut ? " is-sold-out" : ""}`}>
      <header className="rt-structured-header">{room.name}</header>
      <div className="rt-structured-body">
        <img
          src={imageSrc || fallbackRoomImage}
          alt={room.name}
          className="rt-structured-image"
          onError={(e) => {
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
              <strong>Sức chứa:</strong> {room.capacity ?? room.maxGuests ?? "Đang cập nhật"} người
            </li>
            <li>
              <strong>Giá:</strong> {Number(room.price || 0).toLocaleString("vi-VN")}đ/đêm
            </li>
            <li>
              <strong>{isSoldOut ? "Trạng thái:" : "Còn trống:"}</strong>{" "}
              {isSoldOut ? "Hết phòng" : `${availableCount} phòng`}
            </li>
          </ul>

          <p className="rt-structured-desc" title={description || "Mô tả đang cập nhật."}>
            {description || "Mô tả đang cập nhật."}
          </p>

          <div className="rt-structured-actions">
            <Link to={`/booking/${room._id}`} className="rt-structured-link">
              Xem chi tiết phòng
            </Link>

            {showBookButton && (
              isSoldOut ? (
                <button type="button" className="rt-structured-book-btn is-disabled" disabled>
                  Hết phòng
                </button>
              ) : (
                <Link to={`/booking/${room._id}`} className="rt-structured-book-btn">
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
