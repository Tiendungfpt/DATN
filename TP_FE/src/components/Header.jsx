import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Header() {
    const [logo, setLogo] = useState("");
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    // load logo từ API (nhánh fixbug-booking)
    useEffect(() => {
        fetch("http://localhost:3000/api/logo")
            .then(res => res.json())
            .then(data => {
                setLogo(data.logo);
            })
            .catch(err => {
                console.error("Lỗi load logo:", err);
            });
    }, []);

    // logout (nhánh main)
    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
        window.location.reload();
    };

    return (
        <>
            <div className="topbar-a25">
                Hotline đặt phòng: <strong>1900 6925</strong>
            </div>

            <header className="header-a25">
                <div className="header-inner-a25">
                    <Link to="/">
                        <img
                            src={
                                logo
                                    ? `http://localhost:3000/uploads/${logo}`
                                    : "http://localhost:3000/uploads/Logo.jpg"
                            }
                            className="logo-a25"
                            alt="logo"
                        />
                    </Link>

                    <ul className="menu-a25">
                        <li><NavLink to="/">Trang chủ</NavLink></li>
                        <li><NavLink to="/khach-san">Khách sạn</NavLink></li>
                        <li><NavLink to="/lien-he">Liên hệ</NavLink></li>

                        {!token ? (
                            <>
                                <li><NavLink to="/register">Đăng ký</NavLink></li>
                                <li><NavLink to="/login">Đăng nhập</NavLink></li>
                            </>
                        ) : (
                            <li>
                                <button onClick={handleLogout}>
                                    Đăng xuất
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            </header>
        </>
    );
}