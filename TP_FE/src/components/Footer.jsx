export default function Footer() {
  return (
    <footer className="bg-dark text-white py-5 mt-5">
      <div className="container">
        <div className="row gy-5">
          <div className="col-lg-5">
            <h4 className="fw-bold text-warning mb-3">Thịnh Phát Hotel</h4>
            <p className="text-light-emphasis mb-4">
              Chuỗi khách sạn cao cấp hàng đầu Việt Nam, mang đến trải nghiệm
              nghỉ dưỡng đẳng cấp với dịch vụ tận tâm và không gian sang trọng.
            </p>
            <div className="d-flex gap-3">
              <i className="bi bi-facebook fs-4 text-light"></i>
              <i className="bi bi-instagram fs-4 text-light"></i>
              <i className="bi bi-youtube fs-4 text-light"></i>
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
                123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh
              </li>
            </ul>
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
        </div>
      </div>
    </footer>
  );
}
