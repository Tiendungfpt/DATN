import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";

export default function Home() {
  const fallbackRoomImage =
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

  const featuredRoomNames = [
    "Phòng Tiêu Chuẩn",
    "Phòng Cao cấp-2 giường đơn",
    "Phòng Cao cấp-1 giường Queen",
    "Phòng Sang Trọng",
    "Family Suite",
  ];

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      setIsAdmin(user?.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/rooms");

        if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);

        const data = await res.json();

        const roomList = Array.isArray(data)
          ? data
          : data?.data || data?.result || [];

        const normalizeName = (value) =>
          String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();

        const selected = [];
        featuredRoomNames.forEach((name) => {
          const found = roomList.find(
            (r) => normalizeName(r.name) === normalizeName(name),
          );
          if (found) selected.push(found);
        });

        setRooms(selected.slice(0, 5));
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center py-5"
        style={{ minHeight: "60vh" }}
      >
        <div
          className="spinner-border text-primary"
          role="status"
          style={{ width: "3rem", height: "3rem" }}
        >
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center mx-5 my-5 py-4 fs-5">
        ❌ {error}
      </div>
    );
  }

  return (
    <>
      <section
        className="position-relative d-flex align-items-center justify-content-center text-white"
        style={{
          height: "85vh",
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), 
            url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="text-center px-4">
          <h1 className="display-4 fw-bold mb-3">Chào mừng đến với</h1>
          <h2 className="display-3 fw-bold text-warning mb-4">
            Thịnh Phát Hotel
          </h2>
          <p className="lead mb-5 fs-4">
            Trải nghiệm nghỉ dưỡng đẳng cấp – Không gian sang trọng và dịch vụ
            tận tâm
          </p>
        </div>

        <div className="container position-absolute bottom-0 start-50 translate-middle-x pb-5">
          <SearchBar />
        </div>
      </section>

      <section className="py-5 bg-light">
        <div className="container">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <h3 className="fw-bold mb-1">Ưu đãi nổi bật</h3>
              <p className="text-muted">
                Khám phá 5 loại phòng nổi bật
              </p>
            </div>
            <Link to="/khach-san" className="text-primary fw-medium text-decoration-none">
              Xem tất cả →
            </Link>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted fs-5">Hiện chưa có phòng nào.</p>
            </div>
          ) : (
            <div className="row g-4">
              {rooms.map((room) => (
                <div className="col-md-6 col-lg-4" key={room._id}>
                  <div className="card h-100 border-0 shadow-sm overflow-hidden">
                    <img
                      src={
                        room.image?.startsWith("http")
                          ? room.image
                          : room.image
                            ? `http://localhost:3000/uploads/${room.image}`
                            : fallbackRoomImage
                      }
                      alt={room.name}
                      style={{ height: "220px", objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.src = fallbackRoomImage;
                      }}
                    />
                    <div className="card-body d-flex flex-column">
                      <h5 className="fw-bold">{room.name}</h5>
                      <p className="text-muted mb-2">
                        Sức chứa: {room.capacity ?? room.maxGuests ?? "Đang cập nhật"} người
                      </p>
                      <p className="mb-3">
                        Giá:{" "}
                        <strong>
                          {room.price
                            ? `${Number(room.price).toLocaleString("vi-VN")}đ/đêm`
                            : "Liên hệ"}
                        </strong>
                      </p>
                      {!isAdmin && (
                        <Link
                          to={`/booking/${room._id}`}
                          className="btn btn-primary mt-auto"
                        >
                          Đặt phòng
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
