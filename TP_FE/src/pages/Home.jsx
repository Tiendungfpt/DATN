import { useEffect, useState } from "react";
import SearchBar from "../components/SearchBar";
import HotelCard from "../components/HotelCard";

export default function Home() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/hotels");

        if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);

        const data = await res.json();

        // Hỗ trợ nhiều cấu trúc response
        const hotelList = Array.isArray(data)
          ? data
          : data?.data || data?.result || [];

        setHotels(hotelList);
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
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
                Khám phá các khách sạn được yêu thích nhất
              </p>
            </div>
            <a
              href="/khach-san"
              className="text-primary fw-medium text-decoration-none"
            >
              Xem tất cả →
            </a>
          </div>

          {hotels.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted fs-5">Hiện chưa có khách sạn nào.</p>
            </div>
          ) : (
            <div className="row g-4">
              {hotels.slice(0, 6).map((hotel) => (
                <div className="col-md-6 col-lg-4" key={hotel._id}>
                  <HotelCard hotel={hotel} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
