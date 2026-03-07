import { Link, NavLink } from "react-router-dom";

export default function Header() {
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
                    </ul>
                </div>
            </header>
        </>
    );
}
