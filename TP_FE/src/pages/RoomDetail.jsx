import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./style/Roomdetail.css";

function RoomDetail() {
    const { roomId } = useParams();
    const [room, setRoom] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        axios
            .get(`http://localhost:3000/api/rooms/${roomId}`)
            .then((res) => setRoom(res.data))
            .catch((err) => console.log(err));
    }, [roomId]);

    if (!room) return <h2>Đang tải...</h2>;

    return (
        <div className="room-detail-container">
            {/* LEFT IMAGE */}
            <div className="room-image">
                <img
                    src={
                        room.image?.startsWith("http")
                            ? room.image
                            : `http://localhost:3000/uploads/${room.image}`
                    }
                    alt={room.name}
                />
            </div>

            {/* RIGHT INFO */}
            <div className="room-info">
                <h2>{room.name}</h2>

                <p className="cancel">
                    ✅ Hủy miễn phí trước ngày nhận phòng
                </p>

                <p className="deal">🔥 Ưu đãi tuần 10%</p>

                <h1 className="price">
                    {room.price?.toLocaleString("vi-VN")} đ
                    <span>/ đêm</span>
                </h1>

                <p className="desc">{room.description}</p>

                <div className="features">
                    <h3>Tiện ích</h3>
                    <ul>
                        <li>✔ Điều hòa</li>
                        <li>✔ Ban công</li>
                        <li>✔ Phòng tắm riêng</li>
                        <li>✔ WiFi miễn phí</li>
                    </ul>
                </div>

                <button
                    className="book-btn"
                    onClick={() => navigate(`/booking/${room._id}`)}
                >
                    Đặt phòng ngay
                </button>
            </div>
        </div>
    );
}

export default RoomDetail;