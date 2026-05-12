import { useOutletContext } from "react-router-dom";

export default function BookingCancelledPage() {
  const { bookings, total, loading, renderBookingCard } = useOutletContext();
  const items = Array.isArray(bookings) ? bookings : [];

  return (
    <section className="booking-admin-section">
      <div className="booking-admin-section-header">
        <h3>Đã hủy</h3>
        <span className="booking-admin-section-count">{total}</span>
      </div>
      <p className="booking-admin-section-subtitle">
        Booking đã bị hủy theo yêu cầu khách hoặc xử lý từ admin.
      </p>
      {loading && items.length === 0 ? (
        <div className="booking-admin-empty">Đang tải…</div>
      ) : items.length > 0 ? (
        <div className="booking-admin-grid">{items.map(renderBookingCard)}</div>
      ) : (
        <div className="booking-admin-empty">Không có booking đã hủy.</div>
      )}
    </section>
  );
}