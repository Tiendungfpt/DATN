    import { useState } from "react";
    import { useNavigate } from "react-router-dom";

    export default function SearchBar() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        minPrice: "",
        maxPrice: "",
        capacity: "",
        sort: "",
    });

    const handleChange = (e) => {
        setForm({
        ...form,
        [e.target.name]: e.target.value,
        });
    };

    const handleSearch = () => {
        // 🔥 chuyển trang + truyền query
        navigate(
        `/rooms?minPrice=${form.minPrice}&maxPrice=${form.maxPrice}&capacity=${form.capacity}&sort=${form.sort}`
        );
    };

    return (
        <div className="search-a25">
        <input name="minPrice" placeholder="Giá từ" onChange={handleChange} />
        <input name="maxPrice" placeholder="Đến" onChange={handleChange} />

        <select name="capacity" onChange={handleChange}>
            <option value="">Số người</option>
            <option value="1">1 người</option>
            <option value="2">2 người</option>
            <option value="3">3 người</option>
        </select>

        <select name="sort" onChange={handleChange}>
            <option value="">Sắp xếp</option>
            <option value="asc">Giá tăng</option>
            <option value="desc">Giá giảm</option>
        </select>

        <button onClick={handleSearch}>Tìm phòng</button>
        </div>
    );
    }