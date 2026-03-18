import { useEffect, useState } from "react";
import RoomCard from "../components/RoomCard";

const API_URL = "http://localhost:3000/api/rooms";

export default function RoomList() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`Lỗi mạng: ${res.status}`);
        const data = await res.json();
        setRooms(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRooms();
  }, []);

  if (loading) return <p>Đang tải danh sách phòng...</p>;
  if (error) return <p className="error">Lỗi: {error}</p>;
  if (!rooms.length) return <p>Chưa có phòng nào.</p>;

  return (
    <section className="section-a25">
      <h2 className="section-title-a25">Danh sách phòng</h2>
      <div className="cards-a25">
        {rooms.map((room) => (
          <RoomCard key={room._id || room.id} room={room} onDetail={setSelectedRoom} />
        ))}
      </div>

      {selectedRoom && (
        <div className="modal-backdrop" onClick={() => setSelectedRoom(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedRoom(null)}>
              ✕
            </button>
            <img
              src={selectedRoom.image || "/placeholder-room.jpg"}
              alt={selectedRoom.name}
              className="modal-image"
            />
            <div className="modal-body">
              <h3>{selectedRoom.name}</h3>
              <p>{selectedRoom.description || "Chưa có mô tả"}</p>
              <p>
                Giá: <strong>{selectedRoom.price?.toLocaleString()} VND</strong>
              </p>
              <p>Sức chứa: {selectedRoom.capacity}</p>
              <p>Trạng thái: <strong>{selectedRoom.status}</strong></p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
