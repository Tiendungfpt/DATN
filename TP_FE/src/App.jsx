import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import HotelList from "./pages/HotelList";
import HotelDetail from "./pages/HotelDetail";
import Contact from "./pages/Contact";
import AdminLayout from "./admin/AdminLayout";

function Layout() {
    const location = useLocation();
    const isAdmin = location.pathname.startsWith("/admin");

    return (
        <>
            {!isAdmin && <Header />}

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/khach-san" element={<HotelList />} />
                <Route path="/khach-san/:id" element={<HotelDetail />} />
                <Route path="/lien-he" element={<Contact />} />
                <Route path="/admin/*" element={<AdminLayout />} />
            </Routes>

            {!isAdmin && <Footer />}
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Layout />
        </BrowserRouter>
    );
}
