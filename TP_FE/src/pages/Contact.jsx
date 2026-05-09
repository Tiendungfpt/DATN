import { useEffect, useState } from "react";
import axios from "axios";
import "./style/Contact.css";

export default function Contact() {
  const contactAddress = "123 Đường Nguyễn Trãi, Quận Thanh Xuân, Hà Nội, Việt Nam";
  const mapQuery = encodeURIComponent(contactAddress);
  const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&z=16&output=embed`;
  const mapOpenUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setFormData((prev) => ({
          ...prev,
          name: prev.name || String(user?.name || ""),
          email: prev.email || String(user?.email || ""),
        }));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await axios.post("/api/contact-messages", formData);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      }, 3000);
    } catch (err) {
      // Hiển thị rõ lỗi từ backend để dễ debug (validation/network).
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
      const netMsg = err?.message;
      const msg =
        backendMsg ||
        (status ? `Lỗi HTTP ${status}. ` : "") +
          netMsg ||
          "Không gửi được liên hệ. Vui lòng thử lại.";

      console.error("Contact submit failed:", err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-5 bg-light contact-page">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold text-dark">Liên Hệ Với Chúng Tôi</h2>
          <p className="lead text-muted">
            Chúng tôi luôn sẵn sàng phục vụ và hỗ trợ bạn 24/7
          </p>
        </div>

        <div className="row g-5">
          <div className="col-lg-5">
            <div className="bg-white rounded-4 shadow p-5 h-100 contact-card contact-card--left">
              <h4 className="fw-bold mb-4">Thông tin liên hệ</h4>

              <div className="d-flex align-items-start gap-3 mb-4">
                <div className="bg-primary bg-opacity-10 p-3 rounded-3">
                  <i className="bi bi-telephone-fill fs-3 text-primary"></i>
                </div>
                <div>
                  <h6 className="fw-bold">Hotline</h6>
                  <p className="fs-4 fw-bold text-primary mb-0">1900 6925</p>
                  <small className="text-muted">Hỗ trợ 24/7</small>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3 mb-4">
                <div className="bg-primary bg-opacity-10 p-3 rounded-3">
                  <i className="bi bi-envelope-fill fs-3 text-primary"></i>
                </div>
                <div>
                  <h6 className="fw-bold">Email</h6>
                  <p className="mb-0 fs-5">info@a25hotel.com</p>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3 mb-4">
                <div className="bg-primary bg-opacity-10 p-3 rounded-3">
                  <i className="bi bi-geo-alt-fill fs-3 text-primary"></i>
                </div>
                <div>
                  <h6 className="fw-bold">Địa chỉ</h6>
                  <p className="mb-0">
                    123 Đường Nguyễn Trãi, Quận Thanh Xuân
                    <br />
                    Hà Nội, Việt Nam
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3">
                <div className="bg-primary bg-opacity-10 p-3 rounded-3">
                  <i className="bi bi-clock-fill fs-3 text-primary"></i>
                </div>
                <div>
                  <h6 className="fw-bold">Giờ làm việc</h6>
                  <p className="mb-0">24/7 - Hỗ trợ mọi lúc</p>
                </div>
              </div>

              <div className="mt-4 border rounded-3 overflow-hidden">
                <iframe
                  title="Bản đồ khách sạn"
                  src={mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ width: "100%", height: 220, border: 0, display: "block" }}
                />
                <a
                  href={mapOpenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="d-inline-block px-3 py-2 text-decoration-none fw-semibold"
                >
                  Mở Google Maps ↗
                </a>
              </div>
            </div>
          </div>

          {/* Form liên hệ */}
          <div className="col-lg-7">
            <div className="bg-white rounded-4 shadow p-5 contact-card contact-card--form">
              <h4 className="fw-bold mb-4">Gửi tin nhắn cho chúng tôi</h4>

              {submitted ? (
                <div className="alert alert-success text-center py-5">
                  <i className="bi bi-check-circle-fill fs-1 mb-3 text-success"></i>
                  <h5>Cảm ơn bạn!</h5>
                  <p>
                    Chúng tôi đã nhận được tin nhắn và sẽ phản hồi sớm nhất qua email bạn đã cung cấp.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error ? <div className="alert alert-danger contact-error">{error}</div> : null}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Họ và tên</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="form-control form-control-lg contact-input"
                        required
                        placeholder="Họ và tên"
                        autoComplete="name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-control form-control-lg contact-input"
                        required
                        placeholder="Email"
                        autoComplete="email"
                      />
                      <small className="text-muted d-block mt-1 contact-email-note">
                        Chúng tôi sẽ gửi phản hồi qua email bạn nhập.
                      </small>
                    </div>
                  </div>

                  <div className="row g-3 mt-2">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="form-control form-control-lg contact-input"
                        placeholder="Số điện thoại"
                        autoComplete="tel"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Chủ đề</label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="form-control form-control-lg contact-input"
                        required
                        placeholder="Chủ đề"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="form-label fw-medium">
                      Nội dung tin nhắn
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows="6"
                      className="form-control form-control-lg contact-input contact-textarea"
                      required
                      placeholder="Nội dung tin nhắn"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 mt-4 py-3 fw-bold"
                    disabled={submitting}
                  >
                    {submitting ? "ĐANG GỬI..." : "GỬI TIN NHẮN"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
