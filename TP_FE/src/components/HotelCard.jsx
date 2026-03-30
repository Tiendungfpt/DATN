import { Link } from "react-router-dom";

export default function HotelCard({ hotel }) {
  return (
    <Link to={`/khach-san/${hotel.id}`} className="text-decoration-none">
      <div className="card h-100 shadow border-0 overflow-hidden hover-card">
        <div className="position-relative">
          <img
            src={hotel.image}
            className="card-img-top"
            alt={hotel.name}
            style={{ height: "260px", objectFit: "cover" }}
          />

          <div className="position-absolute top-0 end-0 m-3">
            <span className="badge bg-danger px-3 py-2 fw-bold">HOT</span>
          </div>
        </div>

        <div className="card-body d-flex flex-column p-4">
          <h5 className="card-title fw-bold mb-2">{hotel.name}</h5>

          <p className="text-muted mb-3 d-flex align-items-center gap-1">
            <i className="bi bi-geo-alt-fill text-primary"></i>
            Hà Nội, Việt Nam
          </p>

          <div className="mt-auto">
            <div className="border-top pt-3">
              <div className="d-flex justify-content-between align-items-end">
                <div>
                  <small className="text-muted d-block">Giá từ</small>
                  <h5 className="text-primary fw-bold mb-0 fs-4">
                    {hotel.price}
                  </h5>
                </div>

                <button className="btn btn-outline-primary px-4 py-2 fw-medium">
                  Xem chi tiết
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
