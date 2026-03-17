import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "../components/Form.css";

function RoomsEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [room, setRoom] = useState({
        name: "",
        image: "",
        description: "",
        price: 0,
        capacity: "",
        status: "available",
        hotelId: ""
    });

    const [hotels, setHotels] = useState([]);
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);

    // lấy hotel
    useEffect(() => {
        axios.get("http://localhost:3000/api/hotels")
            .then(res => setHotels(res.data));
    }, []);

    // 🔥 FIX CHÍNH Ở ĐÂY
    useEffect(() => {
        axios.get(`http://localhost:3000/api/rooms/${id}`)
            .then(res => {
                const data = res.data;

                setRoom({
                    ...data,
                    // 🔥 fix hotelId (object → string)
                    hotelId: data.hotelId?._id || data.hotelId
                });

                // preview ảnh
                if (data.image?.startsWith("http")) {
                    setPreview(data.image);
                } else {
                    setPreview(`http://localhost:3000/uploads/${data.image}`);
                }
            });
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setRoom({
            ...room,
            [name]: name === "price" ? Number(value) : value
        });
    };

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

            // 🔥 nếu có file mới
            if (file) {
                formData.append("image", file);
            }

            // append field khác
            for (let key in room) {
                if (key !== "image") {
                    formData.append(key, room[key]);
                }
            }

            await axios.put(
                `http://localhost:3000/api/rooms/${id}`,
                formData
            );

            alert("Cập nhật thành công");
            navigate("/admin/rooms");

        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="hotel-create-container">
            <h2 className="hotel-create-title">Sửa phòng</h2>

            <form className="hotel-form" onSubmit={handleSubmit}>

                {/* 🔥 select sẽ hoạt động đúng */}
                <select
                    name="hotelId"
                    value={room.hotelId}
                    onChange={handleChange}
                >
                    <option value="">-- Chọn khách sạn --</option>
                    {hotels.map(h => (
                        <option key={h._id} value={h._id}>
                            {h.name}
                        </option>
                    ))}
                </select>

                <input
                    name="name"
                    value={room.name}
                    onChange={handleChange}
                    placeholder="Tên phòng"
                />

                <input type="file" onChange={handleFileChange} />

                {preview && <img src={preview} width="150" />}

                <textarea
                    name="description"
                    value={room.description}
                    onChange={handleChange}
                    placeholder="Mô tả"
                />

                <input
                    name="price"
                    type="number"
                    value={room.price}
                    onChange={handleChange}
                    placeholder="Giá"
                />

                <input
                    name="capacity"
                    value={room.capacity}
                    onChange={handleChange}
                    placeholder="Sức chứa"
                />

                <select
                    name="status"
                    value={room.status}
                    onChange={handleChange}
                >
                    <option value="available">Còn trống</option>
                    <option value="booked">Đã đặt</option>
                </select>

                <button type="submit">Cập nhật</button>

            </form>
        </div>
    );
}

export default RoomsEdit;