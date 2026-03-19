import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import HotelList from "./pages/HotelList";
import Contact from "./pages/Contact";
import RoomsList from "./pages/RoomList"; // ✅ thêm

import AdminLayout from "./admin/AdminLayout";
import UserList from "./admin/pages/UserList";
import RoomList from "./admin/pages/RoomList";
import RoomCreat from "./admin/pages/RoomCreat";
import Booking from "./pages/Booking";
import BookingList from "./pages/BookingList";
import HotelCreate from "./admin/pages/HotelCreat";
import HotelListAdmin from "./admin/pages/HotelList";
import RoomsEdit from "./admin/pages/RoomEdit";

import Register from "./auth/register";
import Login from "./auth/login";

function Layout() {
    const location = useLocation();
    const isAdmin = location.pathname.startsWith("/admin");

    return (
        <>
            {!isAdmin && <Header />}

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />

                <Route path="/khach-san" element={<HotelList />} />
                <Route path="/lien-he" element={<Contact />} />

                {/* ✅ FIX: thêm route search */}
                <Route path="/rooms" element={<RoomsList />} />

                <Route path="/booking/:roomId" element={<Booking />} />
                <Route path="/booking-list" element={<BookingList />} />

                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="rooms" element={<RoomList />} />
                    <Route path="users-pagination" element={<UserList />} />
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
    return <Layout />;
}