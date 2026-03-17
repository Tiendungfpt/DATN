import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/Form.css";

function HotelCreate() {
    const navigate = useNavigate();

    const [hotel, setHotel] = useState({
        name: "",
        address: "",
        description: "",
        rating: 0,
        reviewCount: 0,
        locationNote: "",
        hotline: ""
    });

    const [file, setFile] = useState(null); // 🔥 file ảnh
    const [preview, setPreview] = useState(null); // 🔥 preview

    const handleChange = (e) => {
        const { name, value } = e.target;

        setHotel({
            ...hotel,
            [name]: name === "rating" || name === "reviewCount"
                ? Number(value)
                : value
        });
    };

    // 🔥 chọn ảnh
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];

        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData();

            // 🔥 thêm file
            if (file) {
                formData.append("image", file);
            }

            // 🔥 thêm data
            for (let key in hotel) {
                formData.append(key, hotel[key]);
            }

            await axios.post(
                "http://localhost:3000/api/hotels",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            alert("Thêm hotel thành công");
            navigate("/admin/hotels");

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

                {/* 🔥 upload ảnh */}
                <input type="file" onChange={handleFileChange} />

                {/* 🔥 preview */}
                {preview && (
                    <img src={preview} alt="" width="150" />
                )}

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