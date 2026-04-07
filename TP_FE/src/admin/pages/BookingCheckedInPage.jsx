import { useOutletContext } from "react-router-dom";

export default function BookingCheckedInPage() {
  const { groupedBookings, renderBookingCard } = useOutletContext();
  const items = groupedBookings.checked_in || [];

  return (
    <section className="booking-admin-section">
      <div className="booking-admin-section-header">
        <h3>Đang check-in</h3>
        <span className="booking-admin-section-count">{items.length}</span>
      </div>
      <p className="booking-admin-section-subtitle">
        Khách đã check-in và đang lưu trú.
      </p>
      {items.length > 0 ? (
        <div className="booking-admin-grid">{items.map(renderBookingCard)}</div>
      ) : (
        <div className="booking-admin-empty">Không có booking trong nhánh này.</div>
      )}
    </section>
  );
}
