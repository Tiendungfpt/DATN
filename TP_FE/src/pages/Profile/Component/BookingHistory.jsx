import { useEffect, useState } from "react";
import axios from "axios";

function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/bookings/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookings(res.data);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message || "Không thể tải lịch sử đặt phòng",
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchBookings();
    } else {
      setError("Bạn chưa đăng nhập");
      setLoading(false);
    }
  }, [token]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đặt phòng này không?"))
      return;

    try {
      await axios.put(
        `http://localhost:3000/api/bookings/cancel/${bookingId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId ? { ...b, status: "cancelled" } : b,
        ),
      );

      alert("Đặt phòng đã được hủy thành công!");
    } catch (err) {
      alert(err.response?.data?.message || "Hủy đặt phòng thất bại");
    }
  };

  const getStatusBadge = (status, paymentStatus) => {
    if (status === "cancelled") {
      return (
        <span className="badge bg-danger px-4 py-2 fs-6 rounded-3 fw-medium">
          Đã hủy
        </span>
      );
    }
    if (status === "confirmed") {
      return paymentStatus === "paid" ? (
        <span className="badge bg-success px-4 py-2 fs-6 rounded-3 fw-medium d-flex align-items-center gap-1">
          <i className="bi bi-check-circle-fill"></i>
          Đã xác nhận & Thanh toán
        </span>
      ) : (
        <span className="badge bg-success px-4 py-2 fs-6 rounded-3 fw-medium">
          Đã xác nhận
        </span>
      );
    }
    return (
      <span className="badge bg-warning text-dark px-4 py-2 fs-6 rounded-3 fw-medium">
        Chờ xác nhận
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center py-5">
        <div
          className="spinner-border text-primary mb-4"
          style={{ width: "4rem", height: "4rem" }}
        ></div>
        <h5 className="text-muted fw-medium">Đang tải lịch sử đặt phòng...</h5>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="alert alert-danger text-center py-5 fs-5 mx-auto"
        style={{ maxWidth: "600px" }}
      >
        {error}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-calendar-x display-1 text-muted mb-4"></i>
        <h3 className="text-dark fw-semibold mb-3">
          Bạn chưa có đặt phòng nào
        </h3>
        <p className="text-muted mb-4">
          Hãy khám phá các khách sạn và đặt phòng ngay hôm nay
        </p>
        <a
          href="/dat-phong"
          className="btn btn-primary btn-lg px-5 py-3 rounded-4 shadow-sm fw-semibold"
        >
          Đặt phòng ngay
        </a>
      </div>
    );
  }

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
        <div>
          <h1 className="fw-bold text-dark mb-1">Lịch sử đặt phòng</h1>
          <p className="text-muted fs-5 mb-0">
            Quản lý tất cả các đặt phòng của bạn một cách dễ dàng
          </p>
        </div>
        <div className="text-md-end">
          <small className="text-muted">Tổng số đặt phòng</small>
          <h3 className="fw-bold text-primary mb-0">{bookings.length}</h3>
        </div>
      </div>

      <div className="row g-4">
        {bookings.map((booking) => {
          const checkIn = new Date(booking.checkInDate);
          const checkOut = new Date(booking.checkOutDate);
          const nights = Math.ceil((checkOut - checkIn) / (1000 * 3600 * 24));

          const isPending = booking.status === "pending";
          const isCancelled = booking.status === "cancelled";
          const isPaid = booking.paymentStatus === "paid";

          return (
            <div key={booking._id} className="col-12">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden hover-shadow transition-all duration-300">
                <div className="card-body p-4 p-lg-5">
                  <div className="row g-4 align-items-start">
                    {/* Left - Information */}
                    <div className="col-lg-8">
                      <div className="d-flex flex-wrap gap-2 mb-4">
                        <span className="badge bg-primary-subtle text-primary px-4 py-2 fs-6 rounded-3 fw-medium">
                          {nights} đêm
                        </span>
                        {getStatusBadge(booking.status, booking.paymentStatus)}
                        {isPaid && (
                          <span className="badge bg-info-subtle text-info px-4 py-2 fs-6 rounded-3 fw-medium d-flex align-items-center gap-1">
                            <i className="bi bi-credit-card"></i> Đã thanh toán
                          </span>
                        )}
                      </div>

                      <h4 className="fw-semibold text-dark mb-3">
                        Đặt phòng #{booking._id.slice(-8).toUpperCase()}
                      </h4>

                      <div className="row text-muted mb-4 g-3">
                        <div className="col-sm-6">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-calendar-check text-primary"></i>
                            <div>
                              <strong className="text-dark d-block">
                                Check-in
                              </strong>
                              <span>
                                {checkIn.toLocaleDateString("vi-VN", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="col-sm-6">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-calendar-x text-primary"></i>
                            <div>
                              <strong className="text-dark d-block">
                                Check-out
                              </strong>
                              <span>
                                {checkOut.toLocaleDateString("vi-VN", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <strong className="text-dark d-block mb-3">
                          Phòng đã đặt:
                        </strong>
                        <div className="d-flex flex-wrap gap-2">
                          {booking.roomsDetail?.length > 0 ? (
                            booking.roomsDetail.map((room, index) => (
                              <span
                                key={index}
                                className="badge bg-light text-dark border px-4 py-2 fs-6 fw-medium"
                              >
                                {room.name || room.type || `Phòng ${room}`}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">
                              Không có thông tin phòng
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right - Price & Action */}
                    <div className="col-lg-4 text-lg-end mt-lg-2">
                      <div className="mb-4">
                        <small className="text-muted">Tổng thanh toán</small>
                        <h3 className="fw-bold text-primary mb-1">
                          {booking.totalPrice.toLocaleString("vi-VN")} ₫
                        </h3>
                        <small className="text-muted">({nights} đêm)</small>
                      </div>

                      {isPending && !isCancelled && (
                        <button
                          onClick={() => handleCancel(booking._id)}
                          className="btn btn-outline-danger btn-lg px-5 py-3 rounded-4 w-100 w-lg-auto fw-medium transition-all hover-scale"
                        >
                          <i className="bi bi-x-circle me-2"></i>
                          Hủy đặt phòng
                        </button>
                      )}

                      {isCancelled && (
                        <div className="text-danger fw-semibold fs-5 py-3">
                          <i className="bi bi-x-circle-fill me-2"></i>
                          Đã hủy
                        </div>
                      )}

                      {booking.status === "confirmed" && isPaid && (
                        <div className="text-success fw-semibold fs-5 py-3">
                          <i className="bi bi-check-circle-fill me-2"></i>
                          Hoàn tất
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="card-footer bg-light border-0 py-3 px-5 small d-flex justify-content-between align-items-center text-muted">
                  <span>
                    Đặt ngày:{" "}
                    {new Date(booking.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                  <span>
                    Mã booking:{" "}
                    <strong className="text-dark">
                      #{booking._id.slice(-6).toUpperCase()}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BookingHistory;
