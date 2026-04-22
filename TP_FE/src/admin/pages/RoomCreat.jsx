import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/Form.css";

function RoomsCreate() {
    const navigate = useNavigate();
    const [roomTypes, setRoomTypes] = useState([]);

    const [room, setRoom] = useState({
        name: "",
        room_type: "",
        roomType: "",
        room_no: "",
        image: "",
        price: 0,
        capacity: 2,
        status: "available",
    });

    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");

    useEffect(() => {
        const fetchRoomTypes = async () => {
            try {
                const res = await axios.get("http://localhost:3000/api/room-types");
                const items = Array.isArray(res.data) ? res.data : [];
                setRoomTypes(items);
                if (items.length > 0) {
                    const first = items[0];
                    setRoom((prev) => ({
                        ...prev,
                        roomType: String(first._id),
                        room_type: String(first.code || first.name || "").trim(),
                        price: Number(first.price) || prev.price,
                        capacity: Number(first.maxGuests) || prev.capacity,
                    }));
                }
            } catch (error) {
                console.log("Lỗi tải room types:", error);
                setRoomTypes([]);
            }
        };
        fetchRoomTypes();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "roomType") {
            const selected = roomTypes.find((rt) => String(rt._id) === String(value));
            setRoom({
                ...room,
                roomType: value,
                room_type: String(selected?.code || selected?.name || "").trim(),
                price: Number(selected?.price) || room.price,
                capacity: Number(selected?.maxGuests) || room.capacity,
            });
            return;
        }

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

                <select name="roomType" value={room.roomType} onChange={handleChange} required>
                    {roomTypes.length === 0 && <option value="">Chưa có loại phòng</option>}
                    {roomTypes.map((rt) => (
                        <option key={rt._id} value={rt._id}>
                            {rt.name}
                        </option>
                    ))}
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
