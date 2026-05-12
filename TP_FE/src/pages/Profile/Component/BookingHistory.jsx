import { useEffect, useState, useCallback } from "react";
import axios from "axios";

import { Link } from "react-router-dom";
import RefundRequestModal from "../../../components/refund/RefundRequestModal.jsx";
import { resolveRefundOriginalAmountFromBooking } from "../../../utils/refundPolicy.js";

function isStayFinished(status) {
  return status === "checked_out" || status === "completed";
}

function primaryRoomId(booking) {
  const a = booking.assigned_room_ids;
  if (Array.isArray(a) && a.length > 0) {
    const f = a[0];
    return f?._id || f;
  }
  return booking.assigned_room_id?._id || booking.room_id?._id;
}

function depositStatusLabelVi(status) {
  switch (String(status || "").toLowerCase()) {
    case "paid":
      return "Đã nhận cọc";
    case "pending_refund":
      return "Chờ hoàn tiền";
    case "refunded":
      return "Đã hoàn tiền";
    case "partial_refunded":
      return "Hoàn một phần";
    case "forfeited":
      return "Mất cọc";
    default:
      return "Chưa thanh toán cọc";
  }
}

function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refundModalBooking, setRefundModalBooking] = useState(null);
  const [pageAlert, setPageAlert] = useState({ type: "", message: "" });
  const token = localStorage.getItem("token");

  const showAlert = useCallback((message, type = "info") => {
    const msg = String(message || "").trim();
    if (!msg) return;
    const payload = { type: type || "info", message: msg };
    setPageAlert(payload);
    try {
      sessionStorage.setItem("bookingHistoryAlert", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, []);

  const reloadBookings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("/api/bookings/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data);
    } catch {
      /* noop */
    }
  }, [token]);

  const handleDownloadInvoice = async (bookingId) => {
    try {
      const res = await axios.get(
        `/api/bookings/${bookingId}/invoice`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `hoa-don-${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể tải hóa đơn");
    }
  };

  const getRoomImageSrc = (booking) => {
    const firstAssigned = Array.isArray(booking?.assigned_room_ids)
      ? booking.assigned_room_ids[0]
      : null;
    const image =
      firstAssigned?.image ||
      booking?.assigned_room_id?.image ||
      booking?.room_id?.image;
    if (!image) return null;
    return image.startsWith("http")
      ? image
      : `/uploads/${image}`;
  };

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await axios.get("/api/bookings/user", {
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

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("bookingHistoryAlert");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.message) setPageAlert({ type: parsed.type || "info", message: String(parsed.message) });
      sessionStorage.removeItem("bookingHistoryAlert");
    } catch {
      /* ignore */
    }
  }, []);

  const handlePayDeposit = async (bookingId) => {
    try {
      const momoRes = await axios.post("/api/momo/create", {
        bookingId,
        requestType: "captureWallet",
        type: "deposit",
      });
      if (momoRes?.data?.success && momoRes?.data?.payUrl) {
        window.location.href = momoRes.data.payUrl;
        return;
      }
      alert(momoRes?.data?.message || "Không tạo được link thanh toán MoMo");
    } catch (err) {
      alert(err.response?.data?.message || "Không tạo được link thanh toán cọc");
    }
  };

  const handleCancelBooking = async (booking) => {
    const bookingId = booking?._id;
    if (!bookingId) return;
    const reason = window.prompt("Lý do hủy (tùy chọn):", "") || "";
    if (!window.confirm("Bạn có chắc muốn hủy booking này không?")) return;
    try {
      await axios.put(
        `/api/bookings/${bookingId}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: "cancelled", cancel_reason: reason } : b)),
      );
      showAlert("Đã hủy. Trường hợp này không tự hoàn tiền — liên hệ khách sạn nếu cần.", "warning");
    } catch (err) {
      showAlert(err.response?.data?.message || "Không hủy được booking", "danger");
    }
  };

  const getStatusBadge = (status) => {
    if (status === "cancelled") {
      return (
        <span className="badge bg-danger px-4 py-2 fs-6 rounded-3 fw-medium">
          Đã hủy
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="badge bg-warning text-dark px-4 py-2 fs-6 rounded-3 fw-medium">
          Chờ xác nhận
        </span>
      );
    }
    if (status === "confirmed") {
      return (
        <span className="badge bg-success px-4 py-2 fs-6 rounded-3 fw-medium">
          Đã xác nhận
        </span>
      );
    }
    if (status === "checked_in") {
      return (
        <span className="badge bg-primary px-4 py-2 fs-6 rounded-3 fw-medium">
          Đang ở (đã check-in)
        </span>
      );
    }
    if (isStayFinished(status)) {
      return (
        <span className="badge bg-dark px-4 py-2 fs-6 rounded-3 fw-medium">
          Đã trả phòng
        </span>
      );
    }
    return (
      <span className="badge bg-secondary px-4 py-2 fs-6 rounded-3 fw-medium">
        {status || "—"}
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

      {pageAlert?.message ? (
        <div className={`alert alert-${pageAlert.type || "info"} alert-dismissible fade show`} role="alert">
          {pageAlert.message}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setPageAlert({ type: "", message: "" })} />
        </div>
      ) : null}

      <div className="row g-4">
        {bookings.map((booking) => {
          const checkIn = new Date(booking.check_in_date);
          const checkOut = new Date(booking.check_out_date);
          const nights = Math.ceil((checkOut - checkIn) / (1000 * 3600 * 24));

          const isCancelled = booking.status === "cancelled";
          const paymentMode = String(booking.payment_mode || booking.paymentMode || "deposit").toLowerCase();
          const isFullPayment = paymentMode === "full";
          const totalPrice = Math.max(0, Number(booking.total_price ?? booking.totalPrice ?? 0) || 0);
          const prepaidAmount = Math.max(0, Number(booking.prepaid_amount ?? booking.prepaidAmount ?? 0) || 0);
          const isPaid = Boolean(booking.is_paid) || prepaidAmount + 1 >= totalPrice;
          const canPayDeposit =
            !isFullPayment &&
            booking.status === "pending" &&
            String(booking.deposit_status || "unpaid") !== "paid" &&
            (Number(booking.deposit_amount) || 0) > 0;
          const showPaidHint = isPaid;

          const firstAr = booking.assigned_room_ids?.[0];
          const showRoomNo =
            (firstAr?.room_no || booking.assigned_room_id?.room_no) &&
            ["confirmed", "checked_in", "checked_out", "completed"].includes(booking.status);

          const waitingForRoomAssign =
            !booking.assigned_room_id &&
            !isCancelled &&
            ["pending", "confirmed"].includes(booking.status);
          const canCancelByUser = ["pending", "confirmed"].includes(booking.status);
          const paidRefundBase = resolveRefundOriginalAmountFromBooking(booking);
          const refundState = String(booking.refund_status || "");
          const depositState = String(booking.deposit_status || "");
          const hasRefundInProgressOrDone = ["requested", "paid"].includes(refundState) ||
            ["pending_refund", "refunded", "partial_refunded", "forfeited"].includes(depositState);

          const canRefundPolicy =
            ["pending", "confirmed", "cancelled"].includes(String(booking.status || "")) &&
            paidRefundBase > 0 &&
            !hasRefundInProgressOrDone;
          const showLegacyCancel =
            canCancelByUser &&
            (booking.status !== "confirmed" || paidRefundBase <= 0);

          return (
            <div key={booking._id} className="col-12">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden hover-shadow transition-all duration-300">
                <div className="card-body p-4 p-lg-5">
                  <div className="row g-4 align-items-start">
                    {/* Left - Information */}
                    <div className="col-lg-8">
                      <div className="mb-4">
                        <img
                          src={
                            getRoomImageSrc(booking) ||
                            "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1200&auto=format&fit=crop"
                          }
                          alt={
                            booking?.room_type_id?.name ||
                            booking?.assigned_room_id?.name ||
                            booking?.room_id?.name ||
                            "Phòng đã đặt"
                          }
                          className="rounded-4 border"
                          style={{
                            width: "100%",
                            maxWidth: "360px",
                            height: "200px",
                            objectFit: "cover",
                          }}
                        />
                      </div>

                      <div className="d-flex flex-wrap gap-2 mb-4">
                        <span className="badge bg-primary-subtle text-primary px-4 py-2 fs-6 rounded-3 fw-medium">
                          {nights} đêm
                        </span>
                        {getStatusBadge(booking.status)}
                        {showPaidHint && (
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
                            {booking.room_type_id?.name ||
                            booking.assigned_room_id?.name ||
                            booking.room_id?.name ? (
                              <span className="badge bg-light text-dark border px-4 py-2 fs-6 fw-medium">
                                {booking.room_type_id?.name ||
                                  booking.assigned_room_id?.name ||
                                  booking.room_id?.name}
                                {showRoomNo
                                  ? ` - ${firstAr?.room_no || booking.assigned_room_id?.room_no}`
                                  : ""}
                              </span>
                            ) : (
                              <span className="text-muted">
                                Không có thông tin phòng
                              </span>
                            )}
                        </div>
                        {waitingForRoomAssign && (
                          <small className="text-muted d-block mt-2">
                            Loại phòng đã chọn; số phòng gán khi check-in.
                          </small>
                        )}
                      </div>
                    </div>

                    {/* Right - Price & Action */}
                    <div className="col-lg-4 text-lg-end mt-lg-2">
                      <div className="mb-4">
                        <small className="text-muted">Tổng thanh toán</small>
                        <h3 className="fw-bold text-primary mb-1">
                          {totalPrice.toLocaleString("vi-VN")} ₫
                        </h3>
                        <small className="text-muted">({nights} đêm)</small>
                      </div>

                      {!isFullPayment ? (
                        <div className="mb-3">
                          <small className="text-muted d-block">Tiền cọc</small>
                          <div className="fw-semibold">
                            {(Number(booking.deposit_paid_amount) || 0).toLocaleString("vi-VN")} ₫ /{" "}
                            {(Number(booking.deposit_amount) || 0).toLocaleString("vi-VN")} ₫{" "}
                            <small className="text-muted">({depositStatusLabelVi(booking.deposit_status)})</small>
                          </div>
                          {String(booking.deposit_status) === "pending_refund" ? (
                            <small className="text-warning d-block mt-1">
                              Đang chờ khách sạn xử lý hoàn:{" "}
                              {(Number(booking.refund_requested_amount) || 0).toLocaleString("vi-VN")} ₫
                            </small>
                          ) : null}
                          {String(booking.deposit_status) === "refunded" ||
                          String(booking.deposit_status) === "partial_refunded" ? (
                            <small className="text-success d-block mt-1">
                              Đã hoàn: {(Number(booking.refund_processed_amount) || 0).toLocaleString("vi-VN")} ₫
                            </small>
                          ) : null}
                          {String(booking.deposit_status) === "forfeited" && booking.refund_rejected_reason ? (
                            <small className="text-danger d-block mt-1">
                              Hoàn tiền bị từ chối: {booking.refund_rejected_reason}
                            </small>
                          ) : null}
                          {String(booking.refund_status || "") === "requested" ? (
                            <small className="text-muted d-block mt-1">
                              Đang chờ duyệt hoàn tiền.
                            </small>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mb-3">
                          <small className="text-muted d-block">Thanh toán</small>
                          <div className="fw-semibold">
                            {prepaidAmount.toLocaleString("vi-VN")} ₫ / {totalPrice.toLocaleString("vi-VN")} ₫{" "}
                            <small className="text-muted">
                              ({isPaid ? "Đã thanh toán" : "Chưa thanh toán"})
                            </small>
                          </div>
                          {!isPaid ? (
                            <small className="text-muted d-block mt-1">
                              Chưa thanh toán xong (đã đóng trang MoMo hoặc chưa trả).
                            </small>
                          ) : null}
                        </div>
                      )}

                      {canPayDeposit && !isCancelled && (
                        <button
                          onClick={() => handlePayDeposit(booking._id)}
                          className="btn btn-primary btn-lg px-5 py-3 rounded-4 w-100 w-lg-auto fw-medium"
                        >
                          Thanh toán tiền cọc
                        </button>
                      )}

                      {showLegacyCancel && (
                        <button
                          onClick={() => handleCancelBooking(booking)}
                          className="btn btn-outline-danger btn-lg px-5 py-3 rounded-4 w-100 w-lg-auto fw-medium mt-2"
                        >
                          Hủy booking
                        </button>
                      )}

                      {canRefundPolicy && (
                        <button
                          type="button"
                          onClick={() => setRefundModalBooking(booking)}
                          className="btn btn-danger btn-lg px-5 py-3 rounded-4 w-100 w-lg-auto fw-medium mt-2"
                        >
                          {isCancelled ? "Yêu cầu hoàn tiền" : "Hủy đặt & hoàn tiền"}
                        </button>
                      )}

                      {isCancelled && (
                        <div className="py-3">
                          <div className="text-danger fw-semibold fs-5">
                            <i className="bi bi-x-circle-fill me-2"></i>
                            Đã hủy
                          </div>
                          {(String(booking.deposit_status) === "pending_refund" ||
                            String(booking.refund_status || "") === "requested") &&
                          String(booking.refund_status || "") !== "rejected" ? (
                            <small className="text-warning d-block mt-1">
                              <i className="bi bi-arrow-repeat me-1"></i>
                              Đang xử lý hoàn tiền:{" "}
                              {(Number(booking.refund_requested_amount) || 0).toLocaleString("vi-VN")} ₫
                            </small>
                          ) : null}
                          {String(booking.deposit_status) === "refunded" ||
                          String(booking.deposit_status) === "partial_refunded" ||
                          String(booking.refund_status || "") === "paid" ? (
                            <small className="text-success d-block mt-1">
                              <i className="bi bi-check-circle me-1"></i>
                              Đã hoàn:{" "}
                              {(Number(booking.refund_processed_amount) || 0).toLocaleString("vi-VN")} ₫
                            </small>
                          ) : null}
                          {String(booking.deposit_status) === "forfeited" ? (
                            <small className="text-danger d-block mt-1">
                              <i className="bi bi-exclamation-triangle me-1"></i>
                              Không hoàn tiền (giữ cọc)
                            </small>
                          ) : null}
                          {String(booking.refund_status || "") === "rejected" && booking.refund_rejected_reason ? (
                            <small className="text-danger d-block mt-1">
                              <i className="bi bi-x-octagon me-1"></i>
                              Hoàn tiền thất bại: {booking.refund_rejected_reason}
                            </small>
                          ) : null}
                          {![
                            "pending_refund",
                            "refunded",
                            "partial_refunded",
                            "forfeited",
                          ].includes(String(booking.deposit_status || "")) &&
                          !["requested", "paid", "rejected"].includes(String(booking.refund_status || "")) ? (
                            <small className="text-muted d-block mt-1">
                              Chưa có thông tin hoàn tiền.
                            </small>
                          ) : null}
                        </div>
                      )}

                      {booking.status === "checked_in" && (
                        <div className="text-primary fw-semibold fs-5 py-3">
                          <i className="bi bi-house-door-fill me-2"></i>
                          Bạn đang lưu trú
                        </div>
                      )}

                      {isStayFinished(booking.status) && (
                        <div className="text-success fw-semibold fs-5 py-3">
                          <i className="bi bi-check-circle-fill me-2"></i>
                          Đã trả phòng
                        </div>
                      )}

                      {isStayFinished(booking.status) && primaryRoomId(booking) && (
                        <Link
                          to={`/review/${booking._id}?roomId=${primaryRoomId(booking)}`}
                          className="btn btn-primary mt-2"
                        >
                          ⭐ Đánh giá
                        </Link>
                      )}

                      {primaryRoomId(booking) ? (
                        <Link
                          to={`/phong/${primaryRoomId(booking)}`}
                          className="btn btn-primary mt-2"
                        >
                          Xem phòng
                        </Link>
                      ) : null}

                      {booking.status === "confirmed" && (
                        <div className="text-success fw-semibold fs-5 py-3">
                          <i className="bi bi-check-circle-fill me-2"></i>
                          Đã xác nhận — chờ nhận phòng
                        </div>
                      )}

                      {isStayFinished(booking.status) && booking.invoice_id ? (
                        <button
                          className="btn btn-outline-success mt-2"
                          onClick={() => handleDownloadInvoice(booking._id)}
                        >
                          <i className="bi bi-receipt me-2"></i>
                          Tải hóa đơn
                        </button>
                      ) : (
                        <div className="text-muted small mt-2">
                          Hóa đơn sau khi check-out.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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

      <RefundRequestModal
        booking={refundModalBooking}
        isOpen={Boolean(refundModalBooking)}
        onClose={() => setRefundModalBooking(null)}
        onSuccess={(message) => {
          const msg = String(message || "").trim();
          if (msg) {
            const lower = msg.toLowerCase();
            const type =
              lower.includes("thành công") || lower.includes("đã hủy") ? "success" : lower.includes("lỗi") || lower.includes("thất bại") ? "danger" : "info";
            showAlert(msg, type);
          } else {
            showAlert("Đã gửi yêu cầu.", "success");
          }
          reloadBookings();
        }}
      />
    </div>
  );
}

export default BookingHistory;
