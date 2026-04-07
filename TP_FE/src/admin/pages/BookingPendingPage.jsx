import { useOutletContext } from "react-router-dom";

export default function BookingPendingPage() {
  const { groupedBookings, renderBookingCard } = useOutletContext();
  const items = groupedBookings.pending || [];

  return (
    <section className="booking-admin-section">
      <div className="booking-admin-section-header">
        <h3>Phòng chờ xác nhận</h3>
        <span className="booking-admin-section-count">{items.length}</span>
      </div>
      <p className="booking-admin-section-subtitle">
        Booking mới hoặc đã chọn phòng nhưng chưa check-in.
      </p>
      {items.length > 0 ? (
        <div className="booking-admin-grid">{items.map(renderBookingCard)}</div>
      ) : (
        <div className="booking-admin-empty">Không có booking trong nhánh này.</div>
      )}
    </section>
  );
}
