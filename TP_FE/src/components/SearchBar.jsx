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
    // Redirect-like booking engine entry (HanoiHotel style)
    navigate(
      `/book?check_in_date=${encodeURIComponent(checkIn)}&check_out_date=${encodeURIComponent(checkOut)}&adults=${encodeURIComponent(adults)}&children=${encodeURIComponent(children)}`,
    );
  };

  return (
    <div className="home-book-strip" aria-label="Đặt phòng nhanh">
      <div className="home-book-grid">
        <div>
          <label className="hh-label">Nhận phòng *</label>
          <input
            type="date"
            className="hh-input"
            value={checkIn}
            min={today}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </div>
        <div>
          <label className="hh-label">Trả phòng *</label>
          <input
            type="date"
            className="hh-input"
            value={checkOut}
            min={checkIn || today}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>
        <div>
          <label className="hh-label">Người lớn *</label>
          <select
            className="hh-input"
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value || 1))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="hh-label">Trẻ em</label>
          <select
            className="hh-input"
            value={children}
            onChange={(e) => setChildren(Number(e.target.value || 0))}
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="hh-label" style={{ visibility: "hidden" }}>
            action
          </label>
          <button type="button" className="home-book-btn" onClick={handleSearch}>
            Đặt phòng
          </button>
        </div>
      </div>
    </div>
  );
}
