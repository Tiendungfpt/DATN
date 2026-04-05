import { useEffect, useState } from "react";
import axios from "axios";
import "../components/List.css";

function ServiceAdmin() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    icon: "star",
  });

  const fetchServices = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/services");
      setServices(res.data);
    } catch (error) {
      console.error("Lỗi tải dịch vụ:", error);
      alert("Lỗi tải dịch vụ");
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "price" ? Number(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (editingId) {
        await axios.put(
          `http://localhost:3000/api/services/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Cập nhật dịch vụ thành công");
      } else {
        await axios.post("http://localhost:3000/api/services", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Thêm dịch vụ thành công");
      }
      fetchServices();
      resetForm();
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi!");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditingId(service._id);
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price,
      icon: service.icon,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc muốn xóa dịch vụ này?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3000/api/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Xóa dịch vụ thành công");
      fetchServices();
    } catch (error) {
      console.error("Lỗi xóa:", error);
      alert("Lỗi xóa dịch vụ");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", price: 0, icon: "star" });
  };

  return (
    <div className="hotel-container">
      <h1>Quản lý dịch vụ</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: "30px" }}>
        <input
          name="name"
          placeholder="Tên dịch vụ"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          name="description"
          placeholder="Mô tả"
          value={formData.description}
          onChange={handleChange}
        />
        <input
          name="price"
          type="number"
          placeholder="Giá"
          value={formData.price}
          onChange={handleChange}
          required
        />
        <input
          name="icon"
          placeholder="Icon (e.g., star)"
          value={formData.icon}
          onChange={handleChange}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : editingId ? "Cập nhật" : "Thêm dịch vụ"}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} style={{ marginLeft: "10px" }}>
            Hủy
          </button>
        )}
      </form>

      <div className="hotel-grid">
        {services.map((service) => (
          <div className="hotel-card" key={service._id}>
            <div style={{ padding: "20px" }}>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p style={{ fontSize: "20px", fontWeight: "bold" }}>
                {service.price.toLocaleString("vi-VN")} ₫
              </p>
              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <button
                  className="btn-edit"
                  onClick={() => handleEdit(service)}
                >
                  ✏️ Sửa
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(service._id)}
                >
                  🗑️ Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServiceAdmin;
