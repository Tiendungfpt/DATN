import { useEffect, useState } from "react";
import axios from "axios";
import "../components/List.css";

function HotelList() {
    const [hotels, setHotels] = useState([]);

    useEffect(() => {
        axios
            .get("http://localhost:3000/api/hotels")
            .then((res) => {
                setHotels(res.data);
            })
            .catch((err) => {
                console.log(err);
            });
    }, []);

    return (
        <div className="hotel-container">
            <h1>Danh sách khách sạn</h1>

            <div className="hotel-grid">
                {hotels.map((hotel) => (
                    <div className="hotel-card" key={hotel._id}>
                        <img
                            src={
                                hotel.image?.startsWith("http")
                                    ? hotel.image
                                    : `http://localhost:3000/uploads/${hotel.image}`
                            }
                            alt={hotel.name}
                        />
                        <div className="hotel-info">
                            <h3>{hotel.name}</h3>

                            <p className="address">{hotel.address}</p>

                            <p className="desc">{hotel.description}</p>

                            <p className="rating">⭐ {hotel.rating}</p>

                            <p className="phone">📞 {hotel.hotline}</p>

                            {/* 🔥 THÊM DÒNG NÀY */}
                            <p className="room-count">
                                🛏️ {hotel.roomCount || 0} phòng
                            </p>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default HotelList;