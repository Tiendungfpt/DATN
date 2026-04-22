import { useState } from "react";
import axios from "axios";

function ProfileInfo({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
        "/api/users/profile",
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsEditing(false);
      alert("✅ Cập nhật thông tin thành công!");
      const updated = res?.data?.user || null;
      if (updated) {
        localStorage.setItem("user", JSON.stringify(updated));
      }
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Cập nhật thất bại.");
    }
  };

  const handlePickAvatar = (e) => {
    const f = e.target.files?.[0] || null;
    setAvatarFile(f);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(f ? URL.createObjectURL(f) : "");
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      alert("Vui lòng chọn ảnh.");
      return;
    }
    const form = new FormData();
    form.append("avatar", avatarFile);
    try {
      setUploadingAvatar(true);
      const res = await axios.put("/api/users/avatar", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = res?.data?.user || null;
      if (updated) localStorage.setItem("user", JSON.stringify(updated));
      alert("✅ Đã cập nhật ảnh đại diện!");
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Không cập nhật được ảnh đại diện.");
    } finally {
      setUploadingAvatar(false);
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

      <div className="d-flex flex-column flex-md-row gap-4 align-items-start mb-5">
        <div style={{ minWidth: 220 }}>
          <label className="form-label fw-semibold text-muted">Ảnh đại diện</label>
          <div className="d-flex align-items-center gap-3">
            <img
              src={
                avatarPreview
                  ? avatarPreview
                  : user?.avatar
                    ? `/uploads/${user.avatar}`
                    : "https://ui-avatars.com/api/?background=111827&color=fff&name=User"
              }
              alt="Avatar"
              style={{
                width: 74,
                height: 74,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            />
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePickAvatar}
                disabled={uploadingAvatar}
              />
              <div className="d-flex gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleUploadAvatar}
                  disabled={uploadingAvatar || !avatarFile}
                >
                  {uploadingAvatar ? "Đang tải..." : "Cập nhật ảnh"}
                </button>
              </div>
              <small className="text-muted d-block mt-1">
                Khuyến nghị ảnh vuông, &lt; 2MB.
              </small>
            </div>
          </div>
        </div>
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