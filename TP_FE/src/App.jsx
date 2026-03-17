import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import HotelList from "./pages/HotelList";
import HotelDetail from "./pages/HotelDetail";
import Contact from "./pages/Contact";
import AdminLayout from "./admin/AdminLayout";
import RoomList from "./admin/pages/RoomList";
import RoomCreat from "./admin/pages/RoomCreat";
import Booking from "./pages/Booking";
import BookingList from "./pages/BookingList";
import HotelCreate from "./admin/pages/HotelCreat";
import HotelListAdmin from "./admin/pages/HotelList";
import RoomsEdit from "./admin/pages/RoomEdit";

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
                <Route path="/booking" element={<Booking />} />
                <Route path="/booking-list" element={<BookingList />} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="rooms" element={<RoomList />} />
                    <Route path="rooms/create" element={<RoomCreat />} />
                    <Route path="hotels/create" element={<HotelCreate />} />
                    <Route path="hotels" element={<HotelListAdmin />} />
                    <Route path="rooms/edit/:id" element={<RoomsEdit />} />
                </Route>
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
