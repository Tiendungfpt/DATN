import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";

function HotelList() {
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
  const [searchParams] = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);

  const getCapacityLabel = (room) => {
    const byCapacity = Number(room?.capacity);
    if (Number.isFinite(byCapacity) && byCapacity > 0) {
      return `${byCapacity} người`;
    }

    const byMaxGuests = Number(room?.maxGuests);
    if (Number.isFinite(byMaxGuests) && byMaxGuests > 0) {
      return `${byMaxGuests} người`;
    }

    const text = String(room?.maxGuests || "").trim();
    const matched = text.match(/\d+/);
    if (matched) {
      return `${matched[0]} người`;
    }
    return text || "Đang cập nhật";
  };

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      setIsAdmin(user?.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const checkIn = searchParams.get("check_in_date");
    const checkOut = searchParams.get("check_out_date");
    const capacity = searchParams.get("capacity");
    const isSearching = Boolean(checkIn && checkOut && capacity);

    axios
      .get(
        isSearching
          ? "http://localhost:3000/api/rooms/search"
          : "http://localhost:3000/api/rooms",
        {
          params: isSearching
            ? {
                check_in_date: checkIn,
                check_out_date: checkOut,
                capacity,
              }
            : undefined,
        },
      )
      .then((res) => {
        const roomList = Array.isArray(res.data) ? res.data : [];

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

        // User site chỉ hiển thị tối đa 5 loại phòng cố định.
        setRooms(selected.slice(0, 5));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Không thể tải danh sách phòng. Vui lòng thử lại sau.");
        setLoading(false);
      });
  }, [searchParams]);

  const defaultImage =
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center py-5"
        style={{ minHeight: "70vh" }}
      >
        <div
          className="spinner-border text-primary"
          style={{ width: "3rem", height: "3rem" }}
        ></div>
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
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h1 className="fw-bold display-5">Danh sách phòng</h1>
          <p className="text-muted fs-5">
            {searchParams.get("check_in_date")
              ? "Kết quả phòng phù hợp theo ngày và sức chứa"
              : "Chọn phòng phù hợp và đặt ngay"}
          </p>
        </div>
        <span className="text-muted">{rooms.length} phòng</span>
      </div>

      <div className="row g-4">
        {rooms.map((room) => (
          <div className="col-md-6 col-lg-4" key={room._id}>
            <Link
              to={isAdmin ? "#" : `/booking/${room._id}`}
              className="text-decoration-none"
              onClick={(e) => {
                if (isAdmin) e.preventDefault();
              }}
            >
              <div className="card h-100 shadow border-0 overflow-hidden hotel-card hover-lift">
                <div className="position-relative">
                  <img
                    src={
                      room.image?.startsWith("http")
                        ? room.image
                        : `http://localhost:3000/uploads/${room.image}`
                    }
                    className="card-img-top"
                    alt={room.name}
                    style={{ height: "260px", objectFit: "cover" }}
                    onError={(e) => {
                      e.target.src = defaultImage;
                    }}
                  />

                  <div className="position-absolute top-0 end-0 m-3">
                    <span
                      className={`badge px-3 py-2 fw-bold shadow-sm ${
                        room.status === "available" ? "bg-success" : "bg-danger"
                      }`}
                    >
                      {room.status === "available" ? "Còn trống" : "Đã đặt"}
                    </span>
                  </div>
                </div>

                <div className="card-body d-flex flex-column p-4">
                  <h5 className="card-title fw-bold mb-2">{room.name}</h5>
                  <p className="text-muted mb-4">
                    <i className="bi bi-people-fill text-primary me-1"></i>
                    Sức chứa: {getCapacityLabel(room)}
                  </p>

                  <div className="mt-auto">
                    <div className="border-top pt-3">
                      <div className="d-flex justify-content-between align-items-end">
                        <div>
                          <small className="text-muted d-block">Giá / đêm</small>
                          <h5 className="text-primary fw-bold mb-0 fs-4">
                            {(room.price || 0).toLocaleString("vi-VN")}đ
                          </h5>
                        </div>

                        {!isAdmin && (
                          <button className="btn btn-primary px-4 py-2 fw-medium">
                            Đặt phòng
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="text-center py-5">
          <h4 className="text-muted">Hiện chưa có phòng nào.</h4>
        </div>
      )}
    </div>
  );
}

export default HotelList;
