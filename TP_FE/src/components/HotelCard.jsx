import { Link } from "react-router-dom";

export default function HotelCard({ hotel }) {
    return (
        <Link to={`/khach-san/${hotel.id}`} className="card-a25">
            <img src={hotel.image} />
            <div className="info">
                <h4>{hotel.name}</h4>
                <p>Giá từ <strong>{hotel.price}</strong></p>
            </div>
        </Link>
    );
}
