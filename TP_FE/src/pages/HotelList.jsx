import hotels from "../data/hotels";
import HotelCard from "../components/HotelCard";

export default function HotelList() {
    return (
        <section className="section-a25">
            <h2 className="section-title-a25">Danh sách khách sạn</h2>

            <div className="cards-a25">
                {hotels.map(hotel => (
                    <HotelCard key={hotel.id} hotel={hotel} />
                ))}
            </div>
        </section>
    );
}
