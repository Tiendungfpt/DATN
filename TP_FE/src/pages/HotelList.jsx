import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

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
          <Link
            key={hotel._id}   // dùng _id
            to={`/khach-san/${hotel._id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="hotel-card">
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
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default HotelList;