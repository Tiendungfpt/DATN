import { useOutletContext } from "react-router-dom";

export default function BookingConfirmedPage() {
  const { groupedBookings, renderBookingCard } = useOutletContext();
  const items = groupedBookings.confirmed || [];

  return (
    <section className="booking-admin-section">
      <div className="booking-admin-section-header">
        <h3>Phòng đã xác nhận</h3>
        <span className="booking-admin-section-count">{items.length}</span>
      </div>
      <p className="booking-admin-section-subtitle">
        Booking đã được chọn phòng và xác nhận, chờ check-in.
      </p>
      {items.length > 0 ? (
        <div className="booking-admin-grid">{items.map(renderBookingCard)}</div>
      ) : (
        <div className="booking-admin-empty">Không có booking trong nhánh này.</div>
      )}
    </section>
  );
}
