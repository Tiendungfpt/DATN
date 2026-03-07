import { useEffect, useState } from "react";

export default function RoomList() {
    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        const data = [
            { id: 1, name: "Phòng 101", price: 200 },
            { id: 2, name: "Phòng 102", price: 250 },
            { id: 3, name: "Phòng 103", price: 300 },
        ];
        setRooms(data);
    }, []);

    return (
        <div>
            <h2>Danh sách phòng</h2>

            <table border="1">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tên phòng</th>
                        <th>Giá</th>
                    </tr>
                </thead>

                <tbody>
                    {rooms.map((room) => (
                        <tr key={room.id}>
                            <td>{room.id}</td>
                            <td>{room.name}</td>
                            <td>{room.price}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}