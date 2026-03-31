import { useState } from "react";
import axios from "axios";

function ProfileInfo({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const token = localStorage.getItem("token");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const res = await axios.put(
        "http://localhost:3000/api/users/profile",
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsEditing(false);
      alert("✅ Cập nhật thông tin thành công!");
      window.location.reload(); 
    } catch (err) {
      alert(err.response?.data?.message || "Cập nhật thất bại.");
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-5">
        <h3 className="fw-bold">Thông tin cá nhân</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary px-4 py-2 rounded-3"
          >
            <i className="bi bi-pencil-square me-2"></i>
            Chỉnh sửa
          </button>
        )}
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Họ và tên</label>
          {isEditing ? (
            <input
              type="text"
              name="name"
              className="form-control form-control-lg"
              value={formData.name}
              onChange={handleInputChange}
            />
          ) : (
            <p className="form-control form-control-lg bg-light border-0 py-3">{user?.name}</p>
          )}
        </div>

        <div className="col-md-6">
          <label className="form-label fw-semibold text-muted">Email</label>
          {isEditing ? (
            <input
              type="email"
              name="email"
              className="form-control form-control-lg"
              value={formData.email}
              onChange={handleInputChange}
            />
          ) : (
            <p className="form-control form-control-lg bg-light border-0 py-3">{user?.email}</p>
          )}
        </div>

        <div className="col-12">
          <label className="form-label fw-semibold text-muted">Ngày tham gia</label>
          <p className="form-control form-control-lg bg-light border-0 py-3">
            {new Date(user?.createdAt).toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {isEditing && (
        <div className="d-flex gap-3 mt-5">
          <button onClick={handleSave} className="btn btn-success btn-lg px-5">
            Lưu thay đổi
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="btn btn-outline-secondary btn-lg px-5"
          >
            Hủy
          </button>
        </div>
      )}
    </>
  );
}

export default ProfileInfo;