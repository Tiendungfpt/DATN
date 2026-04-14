import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/Form.css";

function RoomsCreate() {
    const navigate = useNavigate();

    const [room, setRoom] = useState({
        name: "",
        room_type: "standard",
        room_no: "",
        image: "",
        price: 0,
        capacity: 2,
        status: "available",
    });

    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setRoom({
            ...room,
            [name]: name === "price" || name === "capacity" ? Number(value) : value,
        });

        if (name === "image") {
            setPreview(value);
            setFile(null);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];

        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));

            setRoom({
                ...room,
                image: "",
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData();

            if (file) {
                formData.append("image", file);
            } else {
                formData.append("image", room.image);
            }

            for (let key in room) {
                if (key !== "image") {
                    formData.append(key, room[key]);
                }
            }

            const token = localStorage.getItem("token");
            await axios.post("http://localhost:3000/api/admin/rooms", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
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
            <h2 className="hotel-create-title">Thêm phòng (Thịnh Phát)</h2>

            <form className="hotel-form" onSubmit={handleSubmit}>
                <input name="name" placeholder="Tên phòng" onChange={handleChange} required />

                <select name="room_type" value={room.room_type} onChange={handleChange} required>
                    <option value="standard">standard</option>
                    <option value="deluxe_twin">deluxe_twin</option>
                    <option value="deluxe_queen">deluxe_queen</option>
                    <option value="luxury">luxury</option>
                    <option value="family_suite">family_suite</option>
                </select>

                <input
                    name="room_no"
                    placeholder="Số phòng (vd: A101)"
                    onChange={handleChange}
                    required
                />

                <div className="upload-box">
                    <input type="file" onChange={handleFileChange} />
                </div>

                <p className="or-text">Hoặc nhập link ảnh</p>

                <input
                    name="image"
                    placeholder="https://..."
                    onChange={handleChange}
                />

                {preview && (
                    <div className="preview-box">
                        <img src={preview} alt="preview" />
                    </div>
                )}

                <input name="price" type="number" min="0" placeholder="Giá / đêm" onChange={handleChange} />

                <input
                    name="capacity"
                    type="number"
                    min="1"
                    placeholder="Số khách tối đa (bắt buộc)"
                    value={room.capacity}
                    onChange={handleChange}
                    required
                />

                <select name="status" value={room.status} onChange={handleChange}>
                    <option value="available">Sẵn sàng cho đặt</option>
                    <option value="occupied">occupied</option>
                    <option value="maintenance">maintenance</option>
                </select>

                <button type="submit">Thêm phòng</button>
            </form>
        </div>
    );
}

export default RoomsCreate;
