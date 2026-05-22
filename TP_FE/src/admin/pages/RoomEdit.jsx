import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "../components/Form.css";

function RoomsEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [roomTypes, setRoomTypes] = useState([]);

    const [room, setRoom] = useState({
        name: "",
        room_type: "",
        roomType: "",
        room_no: "",
        image: "",
        images: [],
        price: 0,
        capacity: 2,
        status: "available",
    });

    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const [galleryFiles, setGalleryFiles] = useState([]);
    const [galleryPreviews, setGalleryPreviews] = useState([]);

    useEffect(() => {
        const fetchRoomTypes = async () => {
            try {
                const res = await axios.get("http://localhost:3000/api/room-types");
                const items = Array.isArray(res.data) ? res.data : [];
                setRoomTypes(items);
            } catch (error) {
                console.log("Lỗi tải room types:", error);
                setRoomTypes([]);
            }
        };
        fetchRoomTypes();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        axios.get(`http://localhost:3000/api/admin/rooms/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then((res) => {
            const data = res.data;

            setRoom({
                name: data.name || "",
                room_type: data.room_type || "",
                roomType: String(data.roomType?._id || data.roomType || ""),
                room_no: data.room_no || "",
                image: data.image || "",
                images: Array.isArray(data.images) ? data.images : [],
                price: data.price ?? 0,
                capacity: data.capacity ?? data.maxGuests ?? data.max_guests ?? 2,
                status: data.status || "available",
            });

            if (data.image?.startsWith("http")) {
                setPreview(data.image);
            } else {
                setPreview(`http://localhost:3000/uploads/${data.image}`);
            }
            const gallery = Array.isArray(data.images) ? data.images : [];
            setGalleryPreviews(
                gallery.map((img) =>
                    String(img || "").startsWith("http")
                        ? String(img)
                        : `http://localhost:3000/uploads/${img}`,
                ),
            );
        });
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "roomType") {
            const selected = roomTypes.find((rt) => String(rt._id) === String(value));
            setRoom({
                ...room,
                roomType: value,
                room_type: String(selected?.code || selected?.name || "").trim(),
                price: Number(selected?.price) || room.price,
                capacity: Number(selected?.maxGuests ?? selected?.max_guests) || room.capacity,
            });
            return;
        }

        if (name === "price" || name === "capacity") {
            const cleaned = String(value).replace(/[^0-9]/g, "");
            setRoom({
                ...room,
                [name]: Number(cleaned || 0),
            });
        } else {
            setRoom({
                ...room,
                [name]: value,
            });
        }
    };

    const handleBatchImagesChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const [cover, ...gallery] = files;
        setFile(cover || null);
        setPreview(cover ? URL.createObjectURL(cover) : preview);
        setGalleryFiles(gallery);
        setGalleryPreviews(gallery.map((f) => URL.createObjectURL(f)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData();

            if (file) {
                formData.append("image", file);
            }
            for (const imgFile of galleryFiles) {
                formData.append("images", imgFile);
            }

            for (let key in room) {
                if (key !== "image" && key !== "images") {
                    formData.append(key, room[key]);
                }
            }
            formData.append("images", (room.images || []).join(","));

            const token = localStorage.getItem("token");
            await axios.put(`http://localhost:3000/api/admin/rooms/${id}`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

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
                    value={room.room_no}
                    onChange={handleChange}
                    placeholder="Số phòng"
                />

                <div className="upload-box">
                    <input type="file" multiple accept="image/*" onChange={handleBatchImagesChange} />
                    <small style={{ display: "block", marginTop: 6, opacity: 0.8 }}>
                        Chọn nhiều ảnh một lần (ảnh đầu tiên sẽ làm ảnh đại diện).
                    </small>
                </div>

                {preview && <img src={preview} width="150" alt="" />}
                {galleryPreviews.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                        {galleryPreviews.map((src) => (
                            <img key={src} src={src} alt="gallery-preview" style={{ width: "100%", borderRadius: 8 }} />
                        ))}
                    </div>
                ) : null}

                <input
                    name="price"
                    type="number"
                    value={room.price}
                    onChange={handleChange}
                    placeholder="Giá"
                />

                <input
                    name="capacity"
                    type="number"
                    min="1"
                    value={room.capacity}
                    onChange={handleChange}
                    placeholder="Số khách tối đa"
                />

                <select name="status" value={room.status} onChange={handleChange}>
                    <option value="available">Sẵn sàng cho đặt</option>
                    <option value="occupied">occupied</option>
                    <option value="maintenance">maintenance</option>
                </select>

                <button type="submit">Cập nhật</button>
            </form>
        </div>
    );
}

export default RoomsEdit;
