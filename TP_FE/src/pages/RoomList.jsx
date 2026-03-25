import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import "../admin/components/List.css";

function RoomsList() {
    const { id } = useParams(); // hotelId
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true); // ✅ thêm loading
    const navigate = useNavigate();

    useEffect(() => {
        console.log("Hotel ID:", id); // debug

        axios
            .get(`http://localhost:3000/api/rooms/hotel/${id}`)
            .then((res) => {
                setRooms(Array.isArray(res.data) ? res.data : []);
            })
            .catch((err) => {
                console.error("Error fetching rooms:", err);
                setRooms([]);
            })
            .finally(() => setLoading(false)); // ✅ kết thúc loading
    }, [id]);

    // ✅ trạng thái loading
    if (loading) {
        return <div className="hotel-container"><h1>Đang tải...</h1></div>;
    }

    // ✅ không có dữ liệu
    if (!rooms.length) {
        return <div className="hotel-container"><h1>Không có phòng nào</h1></div>;
    }

    return (
        <div className="hotel-container">
            <h1>Danh sách phòng</h1>

            <div className="hotel-grid">
                {rooms.map((room) => {
                    const hotelName = room.hotelId?.name || "Khách sạn";

                    return (
                        <div className="hotel-card" key={room._id}>
                            <img
                                src={
                                    room.image?.startsWith("http")
                                        ? room.image
                                        : `http://localhost:3000/uploads/${room.image}`
                                }
                                alt={room.name}
                            />

                            <div className="hotel-info">
                                <h3>{room.name}</h3>
                                <p className="hotel-name">🏨 {hotelName}</p>

                                <p className="desc">{room.description}</p>

                                <p className="price">
                                    💰 {room.price?.toLocaleString("vi-VN")} đ
                                </p>

                                <p className="capacity">👤 {room.capacity}</p>

                                <p
                                    className={
                                        room.status === "available"
                                            ? "status available"
                                            : "status booked"
                                    }
                                >
                                    {room.status === "available"
                                        ? "Còn trống"
                                        : "Đã đặt"}
                                </p>

                                <div className="admin-actions">
                                    <button
                                        className="btn-edit"
                                        onClick={() => navigate(`/phong/${room._id}`)}
                                    >
                                        🔍 Chi tiết
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default RoomsList;