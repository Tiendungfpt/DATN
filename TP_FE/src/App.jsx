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
import BookingPendingPage from "./admin/pages/BookingPendingPage";
import BookingConfirmedPage from "./admin/pages/BookingConfirmedPage";
import BookingCheckedInPage from "./admin/pages/BookingCheckedInPage";
import BookingCompletedPage from "./admin/pages/BookingCompletedPage";
import BookingList from "./admin/pages/BookingList";
import CheckIn from "./admin/pages/CheckIn";
import CheckOut from "./admin/pages/CheckOut";
import ServiceManager from "./admin/pages/ServiceManager";
import BookingAllPage from "./admin/pages/BookingAllPage";
import Booking from "./pages/Booking";
import RoomsEdit from "./admin/pages/RoomEdit";

import Register from "./auth/register";
import Login from "./auth/login";
import ForgotPassword from "./auth/forgotPassword";
import ResetPassword from "./auth/resetPassword";
import RoomsList from "./pages/RoomList";
import RoomDetail from "./pages/RoomDetail";
import HotelList from "./pages/HotelList";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import BookingCheckout from "./pages/BookingCheckout";
import UserProfile from "./pages/Profile/UserProfile";
import Review from "./pages/Review";
import AdminDashboard from "./admin/pages/DashboardAdmin";
import AdminReviews from "./admin/pages/AdminReview";
import RoomTypeManager from "./admin/pages/RoomTypeManager";

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
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                <Route path="/dat-phong" element={<RoomsList />} />
                <Route path="/khach-san" element={<HotelList />} />
                <Route path="/lien-he" element={<Contact />} />
                <Route path="/booking/checkout" element={<BookingCheckout />} />
                <Route path="/booking/:roomId" element={<Booking />} />
                <Route
                    path="/booking-list"
                    element={<Navigate to="/thong-tin-tai-khoan?tab=history" replace />}
                />
                <Route path="/phong/:id" element={<RoomDetail />} />
                <Route path="/khach-san/:id" element={<HotelList />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-failed" element={<PaymentFailed />} />
                <Route path="/thong-tin-tai-khoan" element={<UserProfile />}></Route>

                <Route path="/review/:bookingId" element={<Review />} />

                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="rooms" element={<RoomList />} />
                    <Route path="room-types" element={<RoomTypeManager />} />
                    <Route path="reviews" element={<AdminReviews />} />
                    <Route path="users-pagination" element={<UserList />} />
                    <Route path="bookings" element={<BookingAdmin />}>
                        <Route index element={<Navigate to="all" replace />} />
                        <Route path="all" element={<BookingAllPage />} />
                        <Route path="pending" element={<BookingPendingPage />} />
                        <Route path="confirmed" element={<BookingConfirmedPage />} />
                        <Route path="checked-in" element={<BookingCheckedInPage />} />
                        <Route path="completed" element={<BookingCompletedPage />} />
                    </Route>
                    <Route path="rooms/create" element={<RoomCreat />} />
                    <Route path="rooms/edit/:id" element={<RoomsEdit />} />
                    <Route path="booking-list" element={<BookingList />} />
                    <Route path="check-in" element={<CheckIn />} />
                    <Route path="check-out" element={<CheckOut />} />
                    <Route path="service-manager" element={<ServiceManager />} />
                </Route>
            </Routes>

            {!isAdmin && <Footer />}
        </>
    );
}

export default function App() {
    return <Layout />;
}