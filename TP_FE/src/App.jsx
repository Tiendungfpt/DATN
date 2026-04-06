import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Contact from "./pages/Contact";
import AdminLayout from "./admin/AdminLayout";
import UserList from "./admin/pages/UserList";
import RoomList from "./admin/pages/RoomList";
import RoomCreat from "./admin/pages/RoomCreat";
import BookingAdmin from "./admin/pages/BookingAdmin";
import Booking from "./pages/Booking";
import RoomsEdit from "./admin/pages/RoomEdit";

import Register from "./auth/register";
import Login from "./auth/login";
import RoomsList from "./pages/RoomList";
import RoomDetail from "./pages/RoomDetail";
import HotelList from "./pages/HotelList";
import PaymentSuccess from "./pages/PaymentSuccess";
import UserProfile from "./pages/Profile/UserProfile";
import Review from "./pages/Review";
import AdminDashboard from "./admin/pages/DashboardAdmin";
import AdminReviews from "./admin/pages/AdminReview";

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
                <Route path="/khach-san" element={<HotelList />} />
                <Route path="/lien-he" element={<Contact />} />
                <Route path="/booking/:roomId" element={<Booking />} />
                <Route
                    path="/booking-list"
                    element={<Navigate to="/thong-tin-tai-khoan?tab=history" replace />}
                />
                <Route path="/phong/:id" element={<RoomDetail />} />
                <Route path="/khach-san/:id" element={<HotelList />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/thong-tin-tai-khoan" element={<UserProfile />}></Route>

                <Route path="/review/:bookingId" element={<Review />} />

                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="rooms" element={<RoomList />} />
                    <Route path="reviews" element={<AdminReviews />} />
                    <Route path="users-pagination" element={<UserList />} />
                    <Route path="bookings" element={<BookingAdmin />} />
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