import { useOutletContext } from "react-router-dom";

export default function BookingCompletedPage() {
  const { bookings, total, loading, renderBookingCard } = useOutletContext();
  const items = Array.isArray(bookings) ? bookings : [];

  return (
    <section className="booking-admin-section">
      <div className="booking-admin-section-header">
        <h3>Đã check-out</h3>
        <span className="booking-admin-section-count">{total}</span>
      </div>
      <p className="booking-admin-section-subtitle">
        Booking đã hoàn tất sau khi khách trả phòng.
      </p>
      {loading && items.length === 0 ? (
        <div className="booking-admin-empty">Đang tải…</div>
      ) : items.length > 0 ? (
        <div className="booking-admin-grid">{items.map(renderBookingCard)}</div>
      ) : (
        <div className="booking-admin-empty">Không có booking trong nhánh này.</div>
      )}
    </section>
  );
}
