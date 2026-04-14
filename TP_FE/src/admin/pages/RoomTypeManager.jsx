import { useEffect, useState } from "react";
import axios from "axios";
import "../components/List.css";

const API = "http://localhost:3000/api/room-types";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

const fallbackImage =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

function resolveImage(imageValue) {
  const raw = String(imageValue || "").trim();
  if (!raw) return fallbackImage;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `http://localhost:3000/uploads/${raw}`;
}

const emptyForm = {
  code: "",
  name: "",
  price: "",
  description: "",
  maxGuests: 2,
  image: "",
};

export default function RoomTypeManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setErr("");
    try {
      const res = await axios.get(API);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErr(e.response?.data?.message || "Không tải được danh sách loại phòng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(`${API}/upload-image`, fd, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });
      const filename = res.data?.filename;
      if (filename) setForm((f) => ({ ...f, image: filename }));
    } catch (ex) {
      setErr(ex.response?.data?.message || "Upload anh that bai.");
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row._id);
    setForm({
      code: row.code ?? "",
      name: row.name || "",
      price: row.price ?? "",
      description: row.description || "",
      maxGuests: row.maxGuests ?? 2,
      image: row.image || "",
    });
    setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErr("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const payload = {
      code: String(form.code || "").trim(),
      name: String(form.name || "").trim(),
      price: Number(form.price),
      description: String(form.description || "").trim(),
      maxGuests: Math.max(1, Number.parseInt(String(form.maxGuests), 10) || 1),
      image: String(form.image || "").trim(),
    };
    if (!payload.name) {
      setErr("Vui l\u00f2ng nh\u1eadp t\u00ean hi\u1ec3n th\u1ecb (ti\u1ebfng Vi\u1ec7t).");
      return;
    }
    if (Number.isNaN(payload.price) || payload.price < 0) {
      setErr("Giá phải là số ≥ 0.");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${API}/${editingId}`, payload, { headers: authHeaders() });
      } else {
        await axios.post(API, payload, { headers: authHeaders() });
      }
      cancelEdit();
      load();
    } catch (ex) {
      setErr(ex.response?.data?.message || "Lưu thất bại.");
    }
  };

  const remove = async (id) => {
    if (
      !window.confirm(
        "X\u00f3a lo\u1ea1i ph\u00f2ng n\u00e0y? Ch\u1ec9 x\u00f3a \u0111\u01b0\u1ee3c khi kh\u00f4ng c\u00f2n ph\u00f2ng/booking g\u1eafn lo\u1ea1i.",
      )
    )
      return;
    setErr("");
    try {
      await axios.delete(`${API}/${id}`, { headers: authHeaders() });
      if (editingId === id) cancelEdit();
      load();
    } catch (ex) {
      setErr(ex.response?.data?.message || "Xóa thất bại.");
    }
  };

  if (loading) {
    return (
      <div className="hotel-container">
        <p>Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="hotel-container">
      <h1>Quản lý loại phòng</h1>
      <p className="desc" style={{ marginTop: "-8px" }}>
        {
          "T\u00ean hi\u1ec3n th\u1ecb l\u00e0 text ti\u1ebfng Vi\u1ec7t (vd: Ph\u00f2ng Deluxe). M\u00e3 n\u1ed9i b\u1ed9 (vd: deluxe_queen) t\u00f9y ch\u1ecdn, d\u00f9ng kh\u1edbp rooms.room_type. \u1ea2nh: upload ho\u1eb7c nh\u1eadp t\u00ean file trong uploads."
        }
      </p>

      <div
        className="hotel-card"
        style={{ marginBottom: "20px", maxWidth: "560px" }}
      >
        <h3 style={{ marginTop: 0, fontSize: "1.1rem" }}>
          {editingId ? "Sửa loại phòng" : "Thêm loại phòng"}
        </h3>
        <form
          onSubmit={submit}
          className="hotel-form"
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <input
            name="code"
            placeholder="Mã nội bộ (tùy chọn, vd: deluxe_queen)"
            value={form.code}
            onChange={onChange}
          />
          <input
            name="name"
            placeholder="Tên hiển thị (tiếng Việt)"
            value={form.name}
            onChange={onChange}
            required
          />
          <input
            name="price"
            type="number"
            min={0}
            step={1000}
            placeholder="Giá / đêm (VND)"
            value={form.price}
            onChange={onChange}
            required
          />
          <input
            name="maxGuests"
            type="number"
            min={1}
            placeholder="Số khách tối đa"
            value={form.maxGuests}
            onChange={onChange}
            required
          />
          <textarea
            name="description"
            placeholder={"M\u00f4 t\u1ea3 ng\u1eafn (t\u00f9y ch\u1ecdn)"}
            value={form.description}
            onChange={onChange}
            rows={3}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            <input
              name="image"
              placeholder={"Ten file trong uploads hoac URL day du"}
              value={form.image}
              onChange={onChange}
              style={{ flex: "1 1 200px" }}
            />
            <label style={{ cursor: uploading ? "wait" : "pointer", fontSize: "14px" }}>
              <input type="file" accept="image/*" hidden onChange={onPickImage} disabled={uploading} />
              <span className="btn-edit" style={{ display: "inline-block", padding: "8px 12px" }}>
                {uploading ? "Đang tải…" : "Upload anh"}
              </span>
            </label>
          </div>
          {form.image ? (
            <img
              src={resolveImage(form.image)}
              alt=""
              style={{ maxHeight: 120, objectFit: "cover", borderRadius: 8 }}
              onError={(ev) => {
                ev.currentTarget.src = fallbackImage;
              }}
            />
          ) : null}
          <div className="admin-actions" style={{ marginTop: 0 }}>
            <button type="submit" className="btn-edit" style={{ background: "#16a34a" }}>
              {editingId ? "Cập nhật" : "Thêm mới"}
            </button>
            {editingId ? (
              <button type="button" className="btn-delete" onClick={cancelEdit}>
                {"H\u1ee7y s\u1eeda"}
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {err ? (
        <div className="hotel-card" style={{ borderColor: "#fecaca", background: "#fef2f2", marginBottom: "14px" }}>
          <p style={{ margin: 0, color: "#991b1b" }}>{err}</p>
        </div>
      ) : null}

      <h2 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>Danh sách ({items.length})</h2>
      <div className="hotel-grid">
        {items.map((row) => (
          <div className="hotel-card" key={row._id}>
            <img
              src={resolveImage(row.image)}
              alt=""
              onError={(ev) => {
                ev.currentTarget.src = fallbackImage;
              }}
            />
            <div className="hotel-info">
              <h3>{row.name}</h3>
              {row.code ? (
                <p className="desc" style={{ fontSize: "0.85rem", marginTop: "-6px" }}>
                  Mã: <code>{row.code}</code>
                </p>
              ) : null}
              <p className="price">
                <strong>{Number(row.price || 0).toLocaleString("vi-VN")} đ</strong> / đêm
              </p>
              <p className="capacity">Tối đa {row.maxGuests ?? 2} khách</p>
              {row.description ? <p className="desc">{row.description}</p> : null}
            </div>
            <div className="admin-actions">
              <button type="button" className="btn-edit" onClick={() => startEdit(row)}>
                Sửa
              </button>
              <button type="button" className="btn-delete" onClick={() => remove(row._id)}>
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
