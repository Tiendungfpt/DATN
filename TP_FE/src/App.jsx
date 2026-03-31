import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Contact from "./pages/Contact";
import AdminLayout from "./admin/AdminLayout";
import UserList from "./admin/pages/UserList";
import RoomList from "./admin/pages/RoomList";
import RoomCreat from "./admin/pages/RoomCreat";
import Booking from "./pages/Booking";
import BookingList from "./pages/BookingList";
import RoomsEdit from "./admin/pages/RoomEdit";

import Register from "./auth/register";
import Login from "./auth/login";
import RoomsList from "./pages/RoomList";
import RoomDetail from "./pages/RoomDetail";
import RoomTypeDetail from "./pages/RoomTypeDetail";
import Payment from "./pages/Payment";
import HotelList from "./pages/HotelList";
import PaymentSuccess from "./pages/PaymentSuccess";

function RedirectToDatPhong() {
    const { search } = useLocation();
    return <Navigate to={`/dat-phong${search}`} replace />;
}

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

                <Route path="/dat-phong" element={<RoomsList />} />
                <Route path="/loai-phong/:roomTypeKey" element={<RoomTypeDetail />} />
                <Route path="/khach-san" element={<HotelList />} />
                <Route path="/lien-he" element={<Contact />} />
                <Route path="/booking/:roomId" element={<Booking />} />
                <Route path="/booking-list" element={<BookingList />} />
                <Route path="/phong/:id" element={<RoomDetail />} />
                <Route path="/khach-san/:id" element={<RoomsList />} />
                <Route path="/payment/:bookingId" element={<Payment />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />

                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="rooms" element={<RoomList />} />
                    <Route path="users-pagination" element={<UserList />} />
                    <Route path="rooms/create" element={<RoomCreat />} />
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