import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import { addDaysLocal, localISODate } from "../utils/dateLocal";
import "./style/Home.css";

const today = localISODate();
const tomorrow = addDaysLocal(1);

const ROOM_TYPES = [
  {
    key: "standard",
    name: "Phòng tiêu chuẩn",
    price: 520000,
    image:
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=900&q=80",
    desc: "Không gian gọn gàng, đầy đủ tiện nghi cơ bản cho công tác và nghỉ ngắn ngày.",
  },
  {
    key: "deluxe",
    name: "Phòng Deluxe",
    price: 720000,
    image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    desc: "Thiết kế hiện đại, cửa sổ sáng — phù hợp cặp đôi và khách công tác.",
  },
  {
    key: "suite",
    name: "Phòng Suite",
    price: 1150000,
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
    desc: "Không gian rộng, khu vực tiếp khách — trải nghiệm nghỉ dưỡng cao cấp.",
  },
];

export default function Home() {
  const [search, setSearch] = useState({
    checkIn: today,
    checkOut: tomorrow,
    adults: "2",
    children: "0",
  });

  const listQuery = useMemo(() => {
    return new URLSearchParams({
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      adults: String(search.adults ?? "2"),
      children: String(search.children ?? "0"),
    }).toString();
  }, [search]);

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-bg" aria-hidden="true" />
        <div className="home-hero-inner">
          <p className="home-hero-kicker">Thịnh Phát Hotel</p>
          <h1 className="home-hero-title">
            Nghỉ dưỡng tinh tế — đặt phòng trong vài giây
          </h1>
          <p className="home-hero-sub">
            Chọn ngày, số khách và tìm phòng phù hợp. Giá minh bạch, xác nhận nhanh.
          </p>
        </div>
        <SearchBar search={search} setSearch={setSearch} />
      </section>

      <section className="home-rooms-section" id="phong">
        <h2 className="home-rooms-heading">Phòng</h2>
        <p className="home-rooms-lead">
          Các hạng phòng tại Thịnh Phát — chọn ngày ở form trên rồi tìm phòng trống
        </p>

        <div className="home-rooms-grid">
          {ROOM_TYPES.map((room) => (
            <article key={room.key} className="home-room-card">
              <div className="home-room-card-img">
                <img src={room.image} alt={room.name} loading="lazy" />
              </div>
              <div className="home-room-card-body">
                <h3>{room.name}</h3>
                <p className="home-room-card-desc">{room.desc}</p>
                <p className="home-room-card-price">
                  {room.price.toLocaleString("vi-VN")} đ / đêm
                </p>
                <div className="home-room-card-footer">
                  <span className="home-room-card-tag">Thịnh Phát</span>
                  <Link
                    to={`/dat-phong?${listQuery}&roomType=${room.key}`}
                    className="home-room-card-link"
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
