import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Header() {
  const [logo, setLogo] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        setUser({ name: "Khách hàng" });
      }
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
    window.location.reload();
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow sticky-top py-3">
        <div className="container">
          {/* Logo */}
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <img
              src={
                logo
                  ? `http://localhost:3000/uploads/${logo}`
                  : "http://localhost:3000/uploads/Logo.jpg"
              }
              alt="Thịnh Phát Hotel"
              style={{ height: "55px", objectFit: "contain" }}
            />
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-center gap-1">
              <li className="nav-item">
                <NavLink className="nav-link fw-medium px-3" to="/">
                  Trang chủ
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link fw-medium px-3" to="/khach-san">
                  Khách sạn
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link fw-medium px-3" to="/lien-he">
                  Liên hệ
                </NavLink>
              </li>

              {!token ? (
                <>
                  <li className="nav-item ms-3">
                    <NavLink
                      className="btn btn-outline-primary px-4 fw-medium"
                      to="/register"
                    >
                      Đăng ký
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink
                      className="btn btn-primary px-4 fw-medium"
                      to="/login"
                    >
                      Đăng nhập
                    </NavLink>
                  </li>
                </>
              ) : (
                /* === Phần Dropdown khi đã đăng nhập === */
                <li className="nav-item ms-3 dropdown">
                  <a
                    className="nav-link dropdown-toggle fw-medium d-flex align-items-center gap-2"
                    href="#"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="bi bi-person-circle fs-5"></i>
                    Xin chào, <span className="fw-semibold">{user?.name}</span>
                  </a>

                  <ul className="dropdown-menu dropdown-menu-end shadow">
                    <li>
                      <a className="dropdown-item" href="/thong-tin-tai-khoan">
                        <i className="bi bi-person me-2"></i>Thông tin tài khoản
                      </a>
                    </li>
                    <li>
                      <a
                        className="dropdown-item"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = "/thong-tin-tai-khoan?tab=history";
                        }}
                      >
                        <i className="bi bi-bookmark me-2"></i>
                        Lịch sử đặt phòng
                      </a>
                    </li>
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className="dropdown-item text-danger fw-medium"
                      >
                        <i className="bi bi-box-arrow-right me-2"></i>Đăng xuất
                      </button>
                    </li>
                  </ul>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
