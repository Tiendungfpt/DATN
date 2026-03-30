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
        maxGuests: 2,
        capacity: "",
        status: "available",
    });

    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);

    useEffect(() => {
        axios.get(`http://localhost:3000/api/rooms/${id}`).then((res) => {
            const data = res.data;

            setRoom({
                name: data.name || "",
                image: data.image || "",
                description: data.description || "",
                price: data.price ?? 0,
                maxGuests: data.maxGuests ?? 2,
                capacity: data.capacity || "",
                status: data.status || "available",
            });

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
            [name]: name === "price" || name === "maxGuests" ? Number(value) : value,
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

            if (file) {
                formData.append("image", file);
            }

            for (let key in room) {
                if (key !== "image") {
                    formData.append(key, room[key]);
                }
            }

            await axios.put(`http://localhost:3000/api/rooms/${id}`, formData);

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
                <input
                    name="name"
                    value={room.name}
                    onChange={handleChange}
                    placeholder="Tên phòng"
                />

                <input type="file" onChange={handleFileChange} />

                {preview && <img src={preview} width="150" alt="" />}

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
                    name="maxGuests"
                    type="number"
                    min="1"
                    value={room.maxGuests}
                    onChange={handleChange}
                    placeholder="Số khách tối đa"
                />

                <input
                    name="capacity"
                    value={room.capacity}
                    onChange={handleChange}
                    placeholder="Ghi chú sức chứa (tuỳ chọn)"
                />

                <select name="status" value={room.status === "booked" ? "maintenance" : room.status} onChange={handleChange}>
                    <option value="available">Sẵn sàng cho đặt</option>
                    <option value="maintenance">Bảo trì</option>
                </select>

                <button type="submit">Cập nhật</button>
            </form>
        </div>
    );
}

export default RoomsEdit;
