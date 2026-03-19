import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import "../admin/components/List.css"; // hoặc đường dẫn CSS của bạn

function RoomsList() {
    const { id } = useParams();
    const [rooms, setRooms] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        axios
            .get(`http://localhost:3000/api/rooms/hotel/${id}`)
            .then((res) => {
                setRooms(res.data);
            })
            .catch((err) => {
                console.log(err);
                setRooms([]);
            });
    }, [id]);

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
                            alt={room.name}
                        />

                        <div className="hotel-info">
                            <h3>{room.name}</h3>

                            <p className="desc">{room.description}</p>

                            <p className="price">
                                💰 {room.price?.toLocaleString("vi-VN")} đ
                            </p>

                            <p className="capacity">
                                👤 {room.capacity}
                            </p>

                            <p
                                className={
                                    room.status === "available"
                                        ? "status available"
                                        : "status booked"
                                }
                            >
                                {room.status === "available" ? "Còn trống" : "Đã đặt"}
                            </p>

                            {/* 🔥 NÚT CHI TIẾT */}
                            <div className="admin-actions">
                                <button
                                    className="btn-edit"
                                    onClick={() =>
                                        navigate(`/phong/${room._id}`)
                                    }
                                >
                                    🔍 Chi tiết
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