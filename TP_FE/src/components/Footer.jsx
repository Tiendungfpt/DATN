export default function Footer() {
  return (
    <footer className="bg-dark text-white py-5 mt-5">
      <div className="container">
        <div className="row gy-5">
          <div className="col-lg-5">
            <div className="d-flex align-items-center gap-3 mb-3">
              <img
                src="/uploads/Logo.jpg"
                alt="Thịnh Phát Hotel"
                style={{ width: 54, height: 54, objectFit: "contain", borderRadius: 10, background: "rgba(255,255,255,0.06)" }}
              />
              <div>
                <h4 className="fw-bold text-warning mb-0">Thịnh Phát Hotel</h4>
                <div className="text-light-emphasis small">Khách sạn · Đặt phòng trực tuyến</div>
              </div>
            </div>

            <div className="text-light-emphasis small" style={{ lineHeight: 1.7 }}>
              <div>
                <strong className="text-white">Địa chỉ:</strong> 123 Đường Nguyễn Trãi, Quận Thanh Xuân
                <br />
                Hà Nội, Việt Nam
              </div>
              <div><strong className="text-white">MST:</strong> 0XXXXXXXXX</div>
              <div><strong className="text-white">GPKD:</strong> 0XXXXXXXXX (cấp ngày 01/01/2026)</div>
            </div>

            <div className="d-flex gap-3 mt-3">
              <a className="text-light" href="#" aria-label="Facebook"><i className="bi bi-facebook fs-4"></i></a>
              <a className="text-light" href="#" aria-label="Instagram"><i className="bi bi-instagram fs-4"></i></a>
              <a className="text-light" href="#" aria-label="YouTube"><i className="bi bi-youtube fs-4"></i></a>
              <a className="text-light" href="#" aria-label="TikTok"><i className="bi bi-tiktok fs-4"></i></a>
            </div>
          </div>

          <div className="col-lg-3">
            <h5 className="fw-semibold mb-4 text-white">Liên hệ</h5>
            <ul className="list-unstyled text-light-emphasis">
              <li className="mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-telephone-fill text-warning"></i>
                Hotline: <span className="fw-medium text-white">1900 6925</span>
              </li>
              <li className="mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-envelope-fill text-warning"></i>
                Email:{" "}
                <span className="fw-medium text-white">
                  info@thinhphathotel.com
                </span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-geo-alt-fill text-warning"></i>
                123 Đường Nguyễn Trãi, Quận Thanh Xuân, Hà Nội, Việt Nam
              </li>
            </ul>

            <div className="mt-4">
              <div className="fw-semibold mb-2 text-white">Hỗ trợ thanh toán</div>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge rounded-pill text-bg-light">MoMo</span>
                <span className="badge rounded-pill text-bg-light">VISA</span>
                <span className="badge rounded-pill text-bg-light">Mastercard</span>
              </div>
            </div>
          </div>

          <div className="col-lg-2">
            <h5 className="fw-semibold mb-4 text-white">Khám phá</h5>
            <ul className="list-unstyled text-light-emphasis">
              <li className="mb-2">
                <a
                  href="#"
                  className="text-light text-decoration-none hover-link"
                >
                  Trang chủ
                </a>
              </li>
              <li className="mb-2">
                <a
                  href="#"
                  className="text-light text-decoration-none hover-link"
                >
                  Khách sạn
                </a>
              </li>
              <li className="mb-2">
                <a
                  href="#"
                  className="text-light text-decoration-none hover-link"
                >
                  Ưu đãi
                </a>
              </li>
              <li className="mb-2">
                <a
                  href="#"
                  className="text-light text-decoration-none hover-link"
                >
                  Tin tức
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-light text-decoration-none hover-link"
                >
                  Liên hệ
                </a>
              </li>
            </ul>
          </div>

          <div className="col-lg-2">
            <h5 className="fw-semibold mb-4 text-white">Chính sách</h5>
            <ul className="list-unstyled text-light-emphasis">
              <li className="mb-2">
                <a
                  href="#"
                  className="text-light text-decoration-none hover-link"
                >
                  Điều khoản sử dụng
                </a>
              </li>
              <li className="mb-2">
                <a
                  href="#"
                  className="text-light text-decoration-none hover-link"
                >
                  Chính sách bảo mật
                </a>
              </li>
              <li className="mb-2">
                <a
                  href="#"
                  className="text-light text-decoration-none hover-link"
                >
                  Hướng dẫn thanh toán
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-light text-decoration-none hover-link"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>

        <hr className="my-5 border-secondary" />

        <div className="row align-items-center">
          <div className="col-md-6">
            <p className="mb-0 text-light-emphasis small">
              © 2026 Thịnh Phát Hotel. All rights reserved.
            </p>
          </div>
          <div className="col-md-6 text-md-end mt-3 mt-md-0">
            <p className="mb-0 text-light-emphasis small">
              Hotline: <span className="text-white fw-semibold">1900 6925</span> · Email:{" "}
              <span className="text-white fw-semibold">info@thinhphathotel.com</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
