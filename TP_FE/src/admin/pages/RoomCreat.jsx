import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/Form.css";

function RoomsCreate() {
    const navigate = useNavigate();

    const [hotels, setHotels] = useState([]);

    const [room, setRoom] = useState({
        name: "",
        image: "",
        description: "",
        price: 0,
        capacity: "",
        status: "available",
        hotelId: ""
    });

    const [file, setFile] = useState(null); // 🔥 file
    const [preview, setPreview] = useState(""); // 🔥 preview

    // lấy hotel
    useEffect(() => {
        axios.get("http://localhost:3000/api/hotels")
            .then(res => setHotels(res.data));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setRoom({
            ...room,
            [name]: name === "price" ? Number(value) : value
        });

        // 🔥 nếu nhập link thì preview luôn
        if (name === "image") {
            setPreview(value);
            setFile(null); // bỏ file nếu dùng link
        }
    };

    // 🔥 chọn file
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];

        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));

            setRoom({
                ...room,
                image: "" // clear link
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData();

            // 🔥 nếu có file → dùng file
            if (file) {
                formData.append("image", file);
            } else {
                formData.append("image", room.image); // link
            }

            // append các field khác
            for (let key in room) {
                if (key !== "image") {
                    formData.append(key, room[key]);
                }
            }

            await axios.post("http://localhost:3000/api/rooms", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            alert("Thêm phòng thành công");
            navigate("/admin/rooms");

        } catch (error) {
            console.log(error);
            alert("Lỗi");
        }
    };

    return (
        <div className="hotel-create-container">
            <h2 className="hotel-create-title">Thêm phòng</h2>

            <form className="hotel-form" onSubmit={handleSubmit}>

                {/* chọn hotel */}
                <select name="hotelId" onChange={handleChange}>
                    <option value="">-- Chọn khách sạn --</option>
                    {hotels.map(h => (
                        <option key={h._id} value={h._id}>{h.name}</option>
                    ))}
                </select>

                <input name="name" placeholder="Tên phòng" onChange={handleChange} />

                {/* 🔥 upload file */}
                <div className="upload-box">
                    <input type="file" onChange={handleFileChange} />
                </div>

                <p className="or-text">Hoặc nhập link ảnh</p>

                {/* 🔥 nhập link */}
                <input
                    name="image"
                    placeholder="https://..."
                    onChange={handleChange}
                />

                {/* 🔥 preview */}
                {preview && (
                    <div className="preview-box">
                        <img src={preview} alt="preview" />
                    </div>
                )}

                <textarea name="description" placeholder="Mô tả" onChange={handleChange} />

                <input name="price" type="number" placeholder="Giá" onChange={handleChange} />

                <input name="capacity" placeholder="Sức chứa" onChange={handleChange} />

                <select name="status" onChange={handleChange}>
                    <option value="available">Còn trống</option>
                    <option value="booked">Đã đặt</option>
                </select>

                <button type="submit">Thêm phòng</button>

            </form>
        </div>
    );
}

export default RoomsCreate;