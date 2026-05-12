import { useOutletContext } from "react-router-dom";

export default function BookingCheckedInPage() {
  const { bookings, total, loading, renderBookingCard } = useOutletContext();
  const items = Array.isArray(bookings) ? bookings : [];

  return (
    <section className="booking-admin-section">
      <div className="booking-admin-section-header">
        <h3>Đang check-in</h3>
        <span className="booking-admin-section-count">{total}</span>
      </div>
      <p className="booking-admin-section-subtitle">
        Khách đã check-in và đang lưu trú.
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
