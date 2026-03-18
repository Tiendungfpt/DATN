import { Link, NavLink, useNavigate } from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login"); // về login
        window.location.reload(); // cập nhật UI
    };

    return (
        <>
            <div className="topbar-a25">
                Hotline đặt phòng: <strong>1900 6925</strong>
            </div>

            <header className="header-a25">
                <div className="header-inner-a25">
                    <Link to="/">
                        <img src="/logo-a25.png" className="logo-a25" />
                    </Link>

                    <ul className="menu-a25">
                        <li><NavLink to="/">Trang chủ</NavLink></li>
                        <li><NavLink to="/khach-san">Khách sạn</NavLink></li>
                        <li><NavLink to="/lien-he">Liên hệ</NavLink></li>

                        {/* 👇 kiểm tra login */}
                        {!token ? (
                            <>
                                <li><NavLink to="/register">Đăng ký</NavLink></li>
                                <li><NavLink to="/login">Đăng nhập</NavLink></li>
                            </>
                        ) : (
                            <>
                                <li><button onClick={handleLogout}>Đăng xuất</button></li>
                            </>
                        )}
                    </ul>
                </div>
            </header>
        </>
    );
}