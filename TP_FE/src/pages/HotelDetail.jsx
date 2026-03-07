import { useParams } from "react-router-dom";
import hotels from "../data/hotels";

export default function HotelDetail() {
    const { id } = useParams();
    const hotel = hotels.find(h => h.id === id);

    if (!hotel) return <p>Không tìm thấy khách sạn</p>;

    return (
        <section className="section-a25">
            <h2>{hotel.name}</h2>
            <img src={hotel.image} style={{ width: "100%", maxWidth: 600 }} />
            <p>Giá: {hotel.price}</p>
            <p>{hotel.description}</p>
        </section>
    );
}
