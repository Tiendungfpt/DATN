import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function HotelList() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/hotels")
      .then((res) => {
        setHotels(Array.isArray(res.data) ? res.data : res.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Không thể tải danh sách khách sạn. Vui lòng thử lại sau.");
        setLoading(false);
      });
  }, []);

  // Ảnh mặc định khi không load được
  const defaultImage =
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80";

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
          <h1 className="fw-bold display-5">Danh sách khách sạn</h1>
          <p className="text-muted fs-5">
            Khám phá các khách sạn chất lượng tại Việt Nam
          </p>
        </div>
        <span className="text-muted">{hotels.length} khách sạn</span>
      </div>

      <div className="row g-4">
        {hotels.map((hotel) => (
          <div className="col-md-6 col-lg-4" key={hotel._id}>
            <Link
              to={`/khach-san/${hotel._id}`}
              className="text-decoration-none"
            >
              <div className="card h-100 shadow border-0 overflow-hidden hotel-card hover-lift">
                <div className="position-relative">
                  <img
                    src={
                      hotel.image?.startsWith("http")
                        ? hotel.image
                        : `http://localhost:3000/uploads/${hotel.image}`
                    }
                    className="card-img-top"
                    alt={hotel.name}
                    style={{ height: "260px", objectFit: "cover" }}
                    onError={(e) => {
                      e.target.src = defaultImage;
                    }}
                  />

                  {/* Badge HOT */}
                  <div className="position-absolute top-0 end-0 m-3">
                    <span className="badge bg-danger px-3 py-2 fw-bold shadow-sm">
                      HOT
                    </span>
                  </div>

                  {/* Rating */}
                  <div className="position-absolute bottom-0 start-0 m-3">
                    <div className="bg-white px-3 py-1 rounded shadow-sm d-flex align-items-center gap-1">
                      <i className="bi bi-star-fill text-warning"></i>
                      <span className="fw-bold">{hotel.rating || 0}</span>
                      <small className="text-muted">
                        ({hotel.reviewCount || 0})
                      </small>
                    </div>
                  </div>
                </div>

                <div className="card-body d-flex flex-column p-4">
                  <h5 className="card-title fw-bold mb-2">{hotel.name}</h5>

                  <p className="text-muted mb-3 d-flex align-items-center gap-1">
                    <i className="bi bi-geo-alt-fill text-primary"></i>
                    {hotel.address}
                  </p>

                  {hotel.locationNote && (
                    <p className="text-muted small mb-3">
                      <i className="bi bi-info-circle"></i> {hotel.locationNote}
                    </p>
                  )}

                  {hotel.description && (
                    <p
                      className="text-muted mb-4"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {hotel.description}
                    </p>
                  )}

                  <div className="mt-auto">
                    <div className="border-top pt-3">
                      <div className="d-flex justify-content-between align-items-end">
                        <div>
                          <small className="text-muted d-block">Giá từ</small>
                          <h5 className="text-primary fw-bold mb-0 fs-4">
                            {hotel.cheapestPrice
                              ? hotel.cheapestPrice.toLocaleString("vi-VN") +
                                "đ"
                              : "Liên hệ"}
                          </h5>
                        </div>

                        <button className="btn btn-primary px-4 py-2 fw-medium">
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {hotels.length === 0 && (
        <div className="text-center py-5">
          <h4 className="text-muted">Không tìm thấy khách sạn nào</h4>
        </div>
      )}
    </div>
  );
}

export default HotelList;
