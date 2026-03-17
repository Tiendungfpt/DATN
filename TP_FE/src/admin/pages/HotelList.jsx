import { useEffect, useState } from "react";
import axios from "axios";
import "../components/List.css";

function HotelListAdmin() {
    const [hotels, setHotels] = useState([]);

    const fetchHotels = async () => {
        try {
            const res = await axios.get("http://localhost:3000/api/hotels");
            setHotels(res.data);
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        fetchHotels();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xoá?")) return;

        try {
            await axios.delete(`http://localhost:3000/api/hotels/${id}`);
            fetchHotels(); // reload list
        } catch (err) {
            console.log(err);
            alert("Xoá thất bại");
        }
    };

    return (
        <div className="hotel-list-container">
            <h2>Danh sách Hotel</h2>

            <table className="hotel-table">
                <thead>
                    <tr>
                        <th>Tên</th>
                        <th>Địa chỉ</th>
                        <th>Ảnh</th>
                        <th>Rating</th>
                        <th>Hotline</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {hotels.map((hotel) => (
                        <tr key={hotel._id}>
                            <td>{hotel.name}</td>
                            <td>{hotel.address}</td>
                            <td>
                                <img src={hotel.image} alt="" width="80" />
                            </td>
                            <td>{hotel.rating}</td>
                            <td>{hotel.hotline}</td>
                            <td>
                                <button
                                    className="btn btn-edit"
                                    onClick={() => console.log("edit", hotel._id)}
                                >
                                    Sửa
                                </button>

                                <button
                                    className="btn btn-delete"
                                    onClick={() => handleDelete(hotel._id)}
                                >
                                    Xoá
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default HotelListAdmin;