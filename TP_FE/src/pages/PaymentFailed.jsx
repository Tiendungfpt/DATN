import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  const message = useMemo(
    () =>
      searchParams.get("message") ||
      "Giao dịch chưa thành công. Vui lòng thử lại.",
    [searchParams],
  );
  const resultCode = searchParams.get("resultCode");
  const orderId = searchParams.get("orderId");
  const transId = searchParams.get("transId");
  const isLikelyAtmIssuerDecline =
    message.toLowerCase().includes("nhà phát hành") ||
    message.toLowerCase().includes("issuer");
  const bookingIdFromOrderId = useMemo(() => {
    const match = String(orderId || "").match(/^BOOK_([a-fA-F0-9]{24})_/);
    return match?.[1] || "";
  }, [orderId]);

  const handleRetryMoMo = async (requestType) => {
    if (!bookingIdFromOrderId) {
      navigate(-1);
      return;
    }
    try {
      setRetrying(true);
      const res = await axios.post("/api/momo/create", {
        bookingId: bookingIdFromOrderId,
        requestType,
        type: "deposit",
      });
      if (res?.data?.success && res?.data?.payUrl) {
        window.location.href = res.data.payUrl;
        return;
      }
      throw new Error(res?.data?.message || "Không tạo được link thanh toán");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error.message ||
          "Không thể tạo lại link thanh toán",
      );
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8 col-12">
            <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
              <div className="bg-danger text-white text-center py-5">
                <div className="display-1 mb-3">⚠️</div>
                <h1 className="display-6 fw-bold mb-2">Thanh toán thất bại</h1>
              </div>

              <div className="card-body p-5">
                <div className="alert alert-danger border-0 shadow-sm mb-4">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {message}
                </div>
                {isLikelyAtmIssuerDecline && (
                  <div className="alert alert-warning border-0 shadow-sm mb-4">
                    <i className="bi bi-lightbulb-fill me-2"></i>
                    Kênh thẻ Napas trên sandbox MoMo thường báo &quot;từ chối nhà phát
                    hành&quot; dù đúng thẻ test. Nên thử lại bằng{" "}
                    <strong>ví MoMo (quét QR)</strong> — cài MoMo Test App theo tài
                    liệu MoMo; hoặc thử <strong>thẻ quốc tế (CC)</strong>.
                  </div>
                )}

                <div className="mb-4">
                  <h6 className="text-muted mb-3">Thông tin giao dịch</h6>
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted">Mã lỗi MoMo:</span>
                    <strong>{resultCode || "N/A"}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted">Order ID:</span>
                    <strong>{orderId || "N/A"}</strong>
                  </div>
                  <div className="d-flex justify-content-between py-2 border-bottom">
                    <span className="text-muted">Trans ID:</span>
                    <strong>{transId || "N/A"}</strong>
                  </div>
                </div>

                <div className="d-grid gap-3">
                  <button
                    type="button"
                    onClick={() => handleRetryMoMo("captureWallet")}
                    className="btn btn-success btn-lg py-3 fw-semibold"
                    disabled={retrying}
                  >
                    {retrying
                      ? "Đang tạo link..."
                      : "Thanh toán lại bằng ví MoMo (QR — khuyến nghị)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRetryMoMo("payWithCC")}
                    className="btn btn-warning btn-lg py-3 fw-semibold"
                    disabled={retrying}
                  >
                    {retrying
                      ? "Đang tạo link..."
                      : "Thử thẻ quốc tế (CC)"}
                  </button>

                  <button
                    onClick={() => navigate("/thong-tin-tai-khoan?tab=history")}
                    className="btn btn-primary btn-lg py-3 fw-semibold"
                  >
                    Kiểm tra lịch sử đặt phòng
                  </button>

                  <button
                    onClick={() => navigate("/")}
                    className="btn btn-outline-secondary btn-lg py-3 fw-semibold"
                  >
                    Về trang chủ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentFailed;
