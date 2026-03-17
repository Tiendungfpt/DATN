import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/Form.css";

function HotelCreate() {
    const navigate = useNavigate();

    const [hotel, setHotel] = useState({
        name: "",
        address: "",
        image: "",
        description: "",
        rating: 0,
        reviewCount: 0,
        locationNote: "",
        hotline: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setHotel({
            ...hotel,
            [name]: name === "rating" || name === "reviewCount"
                ? Number(value)
                : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await axios.post("http://localhost:3000/api/hotels", hotel);

            alert("Thêm hotel thành công");

            navigate("/admin/hotels"); // 🔥 redirect

        } catch (error) {
            console.log(error);
            alert("Lỗi khi thêm hotel");
        }
    };

    return (
        <div className="hotel-create-container">
            <h2 className="hotel-create-title">Thêm Hotel</h2>

            <form className="hotel-form" onSubmit={handleSubmit}>
                <input name="name" placeholder="Tên khách sạn" onChange={handleChange} />
                <input name="address" placeholder="Địa chỉ" onChange={handleChange} />
                <input name="image" placeholder="Link ảnh" onChange={handleChange} />
                <textarea name="description" placeholder="Mô tả" onChange={handleChange} />
                <input name="rating" type="number" placeholder="Rating" onChange={handleChange} />
                <input name="reviewCount" type="number" placeholder="Số review" onChange={handleChange} />
                <input name="locationNote" placeholder="Ghi chú vị trí" onChange={handleChange} />
                <input name="hotline" placeholder="Hotline" onChange={handleChange} />

                <button type="submit">Thêm Hotel</button>
            </form>
        </div>
    );
}

export default HotelCreate;