import { useOutletContext } from "react-router-dom";

export default function BookingAllPage() {
  const { bookings, renderBookingCard } = useOutletContext();
  const items = Array.isArray(bookings) ? bookings : [];

  return (
    <section className="booking-admin-section">
      <div className="booking-admin-section-header">
        <h3>Tất cả booking</h3>
        <span className="booking-admin-section-count">{items.length}</span>
      </div>
      <p className="booking-admin-section-subtitle">
        Hiển thị toàn bộ booking (đã thanh toán) theo mọi trạng thái.
      </p>
      {items.length > 0 ? (
        <div className="booking-admin-grid">{items.map(renderBookingCard)}</div>
      ) : (
        <div className="booking-admin-empty">Không có booking.</div>
      )}
    </section>
  );
}

