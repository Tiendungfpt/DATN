import { useEffect, useState } from "react";
import axios from "axios";

export default function RoomAdmin() {
    const [rooms, setRooms] = useState([]);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");

    const fetchRooms = async () => {
        const res = await axios.get("http://localhost:8080/api/rooms");
        setRooms(res.data);
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const addRoom = async () => {
        await axios.post("http://localhost:8080/api/rooms", {
            name,
            price
        });
        setName("");
        setPrice("");
        fetchRooms();
    };

    const deleteRoom = async (id) => {
        await axios.delete(`http://localhost:8080/api/rooms/${id}`);
        fetchRooms();
    };

    return (
        <div>
            <h1>Quản lý phòng</h1>

            <div style={{ marginBottom: 20 }}>
                <input
                    placeholder="Tên phòng"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    placeholder="Giá"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                />
                <button onClick={addRoom}>Thêm phòng</button>
            </div>

            <table border="1" cellPadding="10">
                <thead>
                    <tr>
                        <th>Tên phòng</th>
                        <th>Giá</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {rooms.map((room) => (
                        <tr key={room.id}>
                            <td>{room.name}</td>
                            <td>{room.price}</td>
                            <td>
                                <button onClick={() => deleteRoom(room.id)}>Xóa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
