import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import "./Style/Roomdetail.css"; // nhớ đúng path

function RoomDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios
            .get(`http://localhost:3000/api/rooms/${id}`)
            .then((res) => {
                setRoom(res.data);
            })
            .catch((err) => {
                console.error("Lỗi load phòng:", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return <h1>Đang tải...</h1>;
    }

    if (!room) {
        return <h1>Không tìm thấy phòng</h1>;
    }

    return (
        <div className="room-detail">

            {/* LEFT */}
            <div className="room-left">
                <img
                    src={
                        room.image?.startsWith("http")
                            ? room.image
                            : `http://localhost:3000/uploads/${room.image}`
                    }
                    alt={room.name}
                />

                <div className="room-left-content">
                    <h2>{room.name}</h2>

                    <p className="room-size">
                        🛏 {room.capacity} người
                    </p>

                    <p className="desc">{room.description}</p>

                    <h4>Tiện ích</h4>
                    <ul className="amenities">
                        <li>✔ Điều hòa</li>
                        <li>✔ Wifi miễn phí</li>
                        <li>✔ Phòng tắm riêng</li>
                    </ul>

                    <button className="btn-more">
                        Xem thêm thông tin phòng
                    </button>
                </div>
            </div>

            {/* RIGHT */}
            <div className="room-right">
                <p className="free-cancel">
                    ✔ Hủy miễn phí trước ngày nhận phòng
                </p>

                <p className="deal">🔥 Ưu đãi đặc biệt</p>

                <p className="old-price">
                    {(room.price * 1.1)?.toLocaleString("vi-VN")} đ
                </p>

                <p className="new-price">
                    {room.price?.toLocaleString("vi-VN")} đ
                </p>

                <p className="per-night">/ đêm</p>

                <button
                    className="btn-book"
                    onClick={() => navigate(`/booking/${room._id}`)}
                >
                    🛎️ Đặt phòng
                </button>
            </div>
        </div>
    );
}

export default RoomDetail;