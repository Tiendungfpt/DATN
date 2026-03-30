import { useEffect, useState } from "react";
import axios from "axios";
import "../components/List.css";
import { useNavigate } from "react-router-dom";

function RoomsList() {
    const [rooms, setRooms] = useState([]);
    const navigate = useNavigate();

    const fetchRooms = async () => {
        try {
            const res = await axios.get("http://localhost:3000/api/rooms");
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
            await axios.delete(`http://localhost:3000/api/rooms/${id}`);
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
                            src={
                                room.image?.startsWith("http")
                                    ? room.image
                                    : `http://localhost:3000/uploads/${room.image}`
                            }
                            alt=""
                            width="80"
                        />

                        <div className="hotel-info">
                            <h3>{room.name}</h3>

                            <p className="desc">{room.description}</p>

                            <p className="price">
                                💰 {room.price.toLocaleString("vi-VN")} đ
                            </p>

                            <p className="capacity">
                                👤 Tối đa {room.maxGuests ?? "—"} người
                                {room.capacity ? ` · ${room.capacity}` : ""}
                            </p>

                            <p className={
                                room.status === "available"
                                    ? "status available"
                                    : "status booked"
                            }>
                                {room.status === "available"
                                    ? "available"
                                    : room.status === "maintenance"
                                      ? "maintenance (bảo trì)"
                                      : room.status}
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