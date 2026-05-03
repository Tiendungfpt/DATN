import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiSearch, FiUsers } from "react-icons/fi";

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
      `/book?check_in_date=${encodeURIComponent(checkIn)}&check_out_date=${encodeURIComponent(checkOut)}&adults=${encodeURIComponent(adults)}&children=${encodeURIComponent(children)}&capacity=${encodeURIComponent(totalGuests)}`,
    );
  };

  return (
    <div className="home-book-strip" aria-label="Đặt phòng nhanh">
      <div className="home-book-strip-glow" aria-hidden />
      <div className="home-book-grid">
        <div className="home-book-field">
          <label className="hh-label" htmlFor="home-check-in">
            Nhận phòng *
          </label>
          <div className="home-book-control">
            <FiCalendar className="home-book-field-icon" aria-hidden />
            <input
              id="home-check-in"
              type="date"
              className="hh-input home-book-input"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>
        </div>
        <div className="home-book-field">
          <label className="hh-label" htmlFor="home-check-out">
            Trả phòng *
          </label>
          <div className="home-book-control">
            <FiCalendar className="home-book-field-icon" aria-hidden />
            <input
              id="home-check-out"
              type="date"
              className="hh-input home-book-input"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>
        <div className="home-book-field">
          <label className="hh-label" htmlFor="home-adults">
            Người lớn *
          </label>
          <div className="home-book-control">
            <FiUsers className="home-book-field-icon" aria-hidden />
            <select
              id="home-adults"
              className="hh-input home-book-input home-book-select"
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
        </div>
        <div className="home-book-field">
          <label className="hh-label" htmlFor="home-children">
            Trẻ em
          </label>
          <div className="home-book-control">
            <FiUsers className="home-book-field-icon" aria-hidden />
            <select
              id="home-children"
              className="hh-input home-book-input home-book-select"
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
        </div>
        <div className="home-book-actions">
          <span className="home-book-actions-spacer" aria-hidden="true">
            {"\u00A0"}
          </span>
          <button
            type="button"
            className="home-book-btn"
            onClick={handleSearch}
          >
            <FiSearch className="home-book-btn-icon" aria-hidden />
            <span>Tìm kiếm</span>
          </button>
        </div>
      </div>
    </div>
  );
}
