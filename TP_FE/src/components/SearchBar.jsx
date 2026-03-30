import { useNavigate } from "react-router-dom";
import { addDaysLocal, localISODate } from "../utils/dateLocal";

export default function SearchBar({ search, setSearch }) {
  const navigate = useNavigate();
  const today = localISODate();
  const tomorrow = addDaysLocal(1);

  const checkIn = search.checkIn || today;
  const checkOut = search.checkOut || tomorrow;

  const handleChange = (field, value) => {
    setSearch((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      checkIn,
      checkOut,
      adults: String(search.adults ?? "2"),
      children: String(search.children ?? "0"),
    });
    navigate(`/dat-phong?${params.toString()}`);
  };

  return (
    <form className="home-search-card" onSubmit={handleSubmit}>
      <h2 className="home-search-title">Tìm phòng</h2>
      <div className="home-search-grid">
        <div className="home-search-field">
          <label htmlFor="home-checkin">Ngày nhận phòng</label>
          <input
            id="home-checkin"
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => handleChange("checkIn", e.target.value)}
          />
        </div>
        <div className="home-search-field">
          <label htmlFor="home-checkout">Ngày trả phòng</label>
          <input
            id="home-checkout"
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => handleChange("checkOut", e.target.value)}
          />
        </div>
        <div className="home-search-field">
          <label htmlFor="home-adults">Người lớn</label>
          <select
            id="home-adults"
            value={search.adults ?? "2"}
            onChange={(e) => handleChange("adults", e.target.value)}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="home-search-field">
          <label htmlFor="home-children">Trẻ em</label>
          <select
            id="home-children"
            value={search.children ?? "0"}
            onChange={(e) => handleChange("children", e.target.value)}
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="home-search-action">
          <button type="submit" className="home-search-btn">
            Tìm phòng
          </button>
        </div>
      </div>
    </form>
  );
}
