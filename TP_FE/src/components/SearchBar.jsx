import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar() {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const today = new Date().toISOString().split("T")[0];

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      alert("Vui lòng chọn ngày nhận và trả phòng.");
      return;
    }
    if (checkIn < today) {
      alert("Ngày nhận phòng không được là ngày trong quá khứ.");
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      alert("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }
    const totalGuests = Number(adults || 0) + Number(children || 0);
    if (totalGuests < 1) {
      alert("Vui lòng chọn ít nhất 1 khách.");
      return;
    }
    navigate(
      `/khach-san?check_in_date=${encodeURIComponent(checkIn)}&check_out_date=${encodeURIComponent(checkOut)}&capacity=${encodeURIComponent(totalGuests)}`,
    );
  };

  return (
    <div className="search-container mt-4">
      <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-lg-3">
              <label className="form-label fw-medium text-muted">
                Nhận phòng
              </label>
              <input
                type="date"
                className="form-control"
                value={checkIn}
                min={today}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>

            <div className="col-lg-3">
              <label className="form-label fw-medium text-muted">
                Trả phòng
              </label>
              <input
                type="date"
                className="form-control"
                value={checkOut}
                min={checkIn || today}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>

            <div className="col-lg-2">
              <label className="form-label fw-medium text-muted">
                Người lớn
              </label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value || 1))}
              />
            </div>

            <div className="col-lg-2">
              <label className="form-label fw-medium text-muted">
                Trẻ em
              </label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={children}
                onChange={(e) => setChildren(Number(e.target.value || 0))}
              />
            </div>

            <div className="col-lg-2">
              <button
                type="button"
                onClick={handleSearch}
                className="btn btn-primary w-100 py-3 fw-semibold rounded-3"
              >
                <i className="bi bi-search me-2"></i>
                Tìm phòng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
