import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hotelInfo, setHotelInfo] = useState(null); 

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    axios
      .get(`http://localhost:3000/api/bookings/${bookingId}`)
      .then((res) => {
        setBooking(res.data);
      })
      .catch((err) => {
        console.error("Lỗi load booking:", err);
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }}></div>
          <p className="text-muted">Đang tải thông tin đặt phòng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8 col-12">
            
            <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
              
              <div className="bg-success text-white text-center py-5">
                <div className="display-1 mb-3">🎉</div>
                <h1 className="display-6 fw-bold mb-2">Thanh toán thành công!</h1>
              </div>

              {/* Nội dung chính */}
              <div className="card-body p-5">
                {booking && (
                  <>
                    <div className="mb-5">
                      <h5 className="text-muted mb-3">THÔNG TIN ĐẶT PHÒNG</h5>
                      
                      <div className="row g-3">
                        <div className="col-12">
                          <div className="d-flex justify-content-between py-2 border-bottom">
                            <span className="text-muted">Mã booking:</span>
                            <strong className="text-dark">{booking._id}</strong>
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="d-flex justify-content-between py-2 border-bottom">
                            <span className="text-muted">Tổng thanh toán:</span>
                            <strong className="text-success fs-5">
                              {booking.totalPrice?.toLocaleString("vi-VN")} ₫
                            </strong>
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="d-flex justify-content-between py-2 border-bottom">
                            <span className="text-muted">Trạng thái:</span>
                            <span className="badge bg-success fs-6 px-3 py-2">
                              {booking.status === "confirmed" ? "ĐÃ XÁC NHẬN" : booking.status}
                            </span>
                          </div>
                        </div>

                        <div className="col-12">
                          <div className="d-flex justify-content-between py-2 border-bottom">
                            <span className="text-muted">Phương thức thanh toán:</span>
                            <strong>{booking.paymentMethod?.toUpperCase() || "VNPay/Momo"}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="alert alert-success border-0 shadow-sm mb-4">
                      <i className="bi bi-check-circle-fill me-2"></i>
                      Đặt phòng của bạn đã được xác nhận. Chúng tôi sẽ gửi email chi tiết đến bạn trong thời gian sớm nhất.
                    </div>
                  </>
                )}

                <div className="d-grid gap-3">
                  <button 
                    onClick={() => navigate("/")}
                    className="btn btn-primary btn-lg py-3 fw-semibold"
                  >
                    <i className="bi bi-house-door me-2"></i>
                    Về trang chủ
                  </button>

                  <button 
                    onClick={() => navigate("/lich-su-dat-phong")}
                    className="btn btn-outline-secondary btn-lg py-3 fw-semibold"
                  >
                    <i className="bi bi-clock-history me-2"></i>
                    Xem lịch sử đặt phòng
                  </button>
                </div>
              </div>

              <div className="card-footer bg-white border-0 text-center py-4 text-muted small">
                Cảm ơn bạn đã chọn dịch vụ của chúng tôi.<br />
                Chúc bạn có một chuyến nghỉ dưỡng tuyệt vời!
              </div>
            </div>

            <div className="text-center mt-4">
              <small className="text-muted">
                Cần hỗ trợ? Gọi hotline: <strong>1900 xxxx</strong> (24/7)
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;