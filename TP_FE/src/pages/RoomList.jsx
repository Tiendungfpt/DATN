import { useEffect, useState } from "react";
import axios from "axios";
import SearchBar from "../components/SearchBar"; // ✅ đúng path
import "../admin/components/List.css";
import { useLocation } from "react-router-dom";

function RoomsList() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const location = useLocation();

  // ✅ LOAD DATA khi query thay đổi
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    const capacity = params.get("capacity");
    const sort = params.get("sort");

    fetchSearch(minPrice, maxPrice, capacity, sort);
  }, [location.search]);

  // ✅ API SEARCH
  const fetchSearch = async (minPrice, maxPrice, capacity, sort) => {
    setLoading(true);
    try {
      const res = await axios.get(
        "http://localhost:3000/api/rooms/search",
        {
          params: {
            minPrice,
            maxPrice,
            capacity,
            sort,
          },
        }
      );

      console.log("DATA:", res.data);

      // ✅ fix setRooms
      setRooms(res.data.data || []);

    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      
      {/* ✅ SIDEBAR */}
      <SearchBar />

      {/* ✅ LIST */}
      <div className="hotel-container">
        <h1>Danh sách phòng</h1>

        {loading && <p>⏳ Đang tìm...</p>}

        <div className="hotel-grid">
          {rooms.length === 0 && !loading && (
            <p>❌ Không có phòng phù hợp</p>
          )}

          {rooms.map((room) => (
            <div className="hotel-card" key={room._id}>
              <img
                src={`http://localhost:3000/uploads/${room.image}`}
                alt=""
              />
              <div className="hotel-info">
                <h3>{room.name}</h3>
                <p>💰 {room.price?.toLocaleString()} đ</p>
                <p>👤 {room.capacity} người</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RoomsList;