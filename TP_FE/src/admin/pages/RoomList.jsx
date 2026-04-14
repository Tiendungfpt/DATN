import { useEffect, useState } from "react";
import axios from "axios";
import "../components/List.css";
import { useNavigate } from "react-router-dom";

function RoomsList() {
    const [rooms, setRooms] = useState([]);
    const navigate = useNavigate();
    const fallbackImage =
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

    const resolveImage = (imageValue) => {
        const raw = String(imageValue || "").trim();
        if (!raw) return fallbackImage;
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        if (raw.startsWith("//")) return `https:${raw}`;
        return `http://localhost:3000/uploads/${raw}`;
    };

    const fetchRooms = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("http://localhost:3000/api/admin/rooms", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRooms(res.data);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xoá phòng này?")) return;

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`http://localhost:3000/api/admin/rooms/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchRooms();
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="hotel-container">
            <h1>Danh sách phòng</h1>

            <div className="hotel-grid">
                {rooms.map((room) => (
                    <div className="hotel-card" key={room._id}>
                        <img
                            src={resolveImage(room.image)}
                            alt=""
                            width="80"
                            onError={(e) => {
                                e.currentTarget.src = fallbackImage;
                            }}
                        />

                        <div className="hotel-info">
                            <h3>{room.name}</h3>
                            <p className="desc">
                                <strong>Loại:</strong> {room.room_type || "—"} ·{" "}
                                <strong>Số phòng:</strong> {room.room_no || "—"}
                            </p>

                            <p className="price">
                                💰 {room.price.toLocaleString("vi-VN")} đ
                            </p>

                            <p className="capacity">
                                👤 Tối đa {room.capacity ?? room.maxGuests ?? "—"} người
                            </p>

                            <p className={`status ${room.status || "unknown"}`}>
                                {room.status === "available"
                                    ? "Trống"
                                    : room.status === "occupied"
                                      ? "Đang có khách"
                                      : room.status === "maintenance"
                                        ? "Bảo trì"
                                        : room.status || "—"}
                            </p>

                            <div className="admin-actions">
                                <button
                                    className="btn-edit"
                                    onClick={() => navigate(`/admin/rooms/edit/${room._id}`)}
                                >
                                    ✏️ Sửa
                                </button>

                                <button
                                    className="btn-delete"
                                    onClick={() => handleDelete(room._id)}
                                >
                                    🗑️ Xoá
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default RoomsList;