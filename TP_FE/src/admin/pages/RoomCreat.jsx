import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/Form.css";

function RoomsCreate() {
    const navigate = useNavigate();

    const [room, setRoom] = useState({
        name: "",
        image: "",
        description: "",
        price: 0,
        maxGuests: 2,
        capacity: "",
        status: "available",
    });

    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setRoom({
            ...room,
            [name]: name === "price" || name === "maxGuests" ? Number(value) : value,
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

            await axios.post("http://localhost:3000/api/rooms", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
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

                <textarea name="description" placeholder="Mô tả" onChange={handleChange} />

                <input name="price" type="number" min="0" placeholder="Giá / đêm" onChange={handleChange} />

                <input
                    name="maxGuests"
                    type="number"
                    min="1"
                    placeholder="Số khách tối đa (bắt buộc)"
                    value={room.maxGuests}
                    onChange={handleChange}
                    required
                />

                <input
                    name="capacity"
                    placeholder="Ghi chú sức chứa (tuỳ chọn, vd: 2 người lớn + 1 trẻ)"
                    onChange={handleChange}
                />

                <select name="status" value={room.status} onChange={handleChange}>
                    <option value="available">Sẵn sàng cho đặt</option>
                    <option value="maintenance">Bảo trì (ẩn khỏi tìm phòng)</option>
                </select>

                <button type="submit">Thêm phòng</button>
            </form>
        </div>
    );
}

export default RoomsCreate;
