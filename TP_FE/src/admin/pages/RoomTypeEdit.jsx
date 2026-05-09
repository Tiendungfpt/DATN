import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "../components/List.css";

const API = "/api/room-types";

function authHeaders() {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

const fallbackImage =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop";

function resolveImage(imageValue) {
  const raw = String(imageValue || "").trim();
  if (!raw) return fallbackImage;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `/uploads/${raw}`;
}

const emptyForm = {
  code: "",
  name: "",
  price: "",
  deposit_amount: "",
  description: "",
  maxGuests: 2,
  image: "",
  images: [],
  complimentary_services: [],
};

export default function RoomTypeEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(emptyForm);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  const handleAuthError = (ex) => {
    const status = ex?.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setErr("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      navigate("/login", { replace: true, state: { from: `/admin/room-types/edit/${id}` } });
      return true;
    }
    if (status === 403) {
      setErr("Bạn không có quyền admin.");
      return true;
    }
    return false;
  };

  useEffect(() => {
    const loadDetail = async () => {
      setErr("");
      try {
        const res = await axios.get(`${API}/${id}`);
        const data = res.data || {};
        setForm({
          code: data.code || "",
          name: data.name || "",
          price: Number(data.price || 0),
          deposit_amount: Number(data.deposit_amount || 0),
          description: data.description || "",
          maxGuests: Number(data.maxGuests ?? data.max_guests ?? 2),
          image: data.image || "",
          images: Array.isArray(data.images) ? data.images.map((x) => String(x || "").trim()).filter(Boolean) : [],
          complimentary_services: Array.isArray(data.complimentary_services)
            ? data.complimentary_services.map((s) => String(s?._id || s)).filter(Boolean)
            : [],
        });
        const imgList = Array.isArray(data.images) ? data.images : [];
        setGalleryPreviews(
          imgList.map((name) => resolveImage(name)).filter(Boolean),
        );
      } catch (e) {
        if (handleAuthError(e)) return;
        setErr(e.response?.data?.message || "Không tải được chi tiết loại phòng.");
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [id]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await axios.get("/api/services-catalog?active=1&kind=complimentary", {
          headers: authHeaders(),
        });
        setServices(Array.isArray(res.data) ? res.data : []);
      } catch {
        setServices([]);
      }
    };
    loadServices();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const toggleService = (key, serviceId) => {
    const sid = String(serviceId || "").trim();
    if (!sid) return;
    setForm((prev) => {
      const list = Array.isArray(prev[key]) ? prev[key] : [];
      const has = list.includes(sid);
      return {
        ...prev,
        [key]: has ? list.filter((x) => x !== sid) : [...list, sid],
      };
    });
  };

  const onPickImage = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setErr("");
    try {
      const fd = new FormData();
      for (const file of files) fd.append("images", file);
      const res = await axios.post(`${API}/upload-images`, fd, {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });
      const filenames = Array.isArray(res.data?.filenames) ? res.data.filenames : [];
      if (filenames.length) {
        setForm((f) => ({
          ...f,
          image: String(filenames[0] || ""),
          images: filenames,
        }));
        setGalleryPreviews(filenames.map((name) => resolveImage(name)));
      }
    } catch (ex) {
      if (handleAuthError(ex)) return;
      setErr(ex.response?.data?.message || "Upload ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const payload = {
      code: String(form.code || "").trim(),
      name: String(form.name || "").trim(),
      price: Number(form.price),
      deposit_amount: Number(form.deposit_amount || 0),
      description: String(form.description || "").trim(),
      maxGuests: Math.max(1, Number.parseInt(String(form.maxGuests), 10) || 1),
      max_guests: Math.max(1, Number.parseInt(String(form.maxGuests), 10) || 1),
      image: String(form.image || "").trim(),
      images: Array.isArray(form.images) ? form.images : [],
      complimentary_services: Array.isArray(form.complimentary_services) ? form.complimentary_services : [],
    };
    if (!payload.name) {
      setErr("Vui lòng nhập tên hiển thị (tiếng Việt).");
      return;
    }
    if (Number.isNaN(payload.price) || payload.price < 0) {
      setErr("Giá phải là số >= 0.");
      return;
    }
    if (Number.isNaN(payload.deposit_amount) || payload.deposit_amount < 0) {
      setErr("Tiền cọc phải là số >= 0.");
      return;
    }

    try {
      setSaving(true);
      await axios.put(`${API}/${id}`, payload, { headers: authHeaders() });
      alert("Cập nhật loại phòng thành công");
      navigate("/admin/room-types");
    } catch (ex) {
      if (handleAuthError(ex)) return;
      setErr(ex.response?.data?.message || "Cập nhật loại phòng thất bại.");
    } finally {
      setSaving(false);
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
      <h1>Sửa loại phòng</h1>
      <p className="desc" style={{ marginTop: "-8px" }}>
        Cập nhật thông tin loại phòng để hiển thị đúng trên website và luồng đặt phòng.
      </p>

      <div
        className="hotel-card"
        style={{
          maxWidth: "760px",
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.25)",
          boxShadow: "0 18px 34px rgba(15, 23, 42, 0.14)",
          background: "linear-gradient(180deg, rgba(15,23,42,0.02) 0%, #ffffff 38%)",
        }}
      >
        <form
          onSubmit={submit}
          className="hotel-form"
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#e2e8f0" }}>
            Mã nội bộ
            <input
              name="code"
              placeholder="vd: deluxe_queen"
              value={form.code}
              onChange={onChange}
              style={{ borderRadius: 10, minHeight: 42 }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#e2e8f0" }}>
            Tên hiển thị
            <input
              name="name"
              placeholder="Tên hiển thị (tiếng Việt)"
              value={form.name}
              onChange={onChange}
              required
              style={{ borderRadius: 10, minHeight: 42 }}
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#e2e8f0" }}>
            Giá mỗi đêm (VND)
            <input
              name="price"
              type="number"
              min={0}
              step={1000}
              placeholder="Giá / đêm"
              value={form.price}
              onChange={onChange}
              required
              style={{ borderRadius: 10, minHeight: 42 }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#e2e8f0" }}>
            Tiền cọc mỗi phòng (VND)
            <input
              name="deposit_amount"
              type="number"
              min={0}
              step={1000}
              placeholder="Tiền cọc cố định / phòng"
              value={form.deposit_amount}
              onChange={onChange}
              style={{ borderRadius: 10, minHeight: 42 }}
            />
          </label>
          </div>
          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#e2e8f0" }}>
            Số khách tối đa
            <input
              name="maxGuests"
              type="number"
              min={1}
              placeholder="Số khách tối đa"
              value={form.maxGuests}
              onChange={onChange}
              required
              style={{ borderRadius: 10, minHeight: 42, maxWidth: 220 }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontWeight: 700, color: "#e2e8f0" }}>
            Mô tả
            <textarea
              name="description"
              placeholder="Mô tả ngắn (tùy chọn)"
              value={form.description}
              onChange={onChange}
              rows={3}
              style={{ borderRadius: 10 }}
            />
          </label>

          <div style={{ border: "1px solid rgba(148, 163, 184, 0.22)", borderRadius: 12, padding: 10 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 800, color: "#f8fafc" }}>Dịch vụ miễn phí đi kèm</p>
            {services.length === 0 ? (
              <p className="desc" style={{ marginBottom: 0 }}>
                Chưa có dịch vụ trong catalog.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "8px", maxHeight: 180, overflow: "auto", paddingRight: 4 }}>
                {services.map((s) => {
                  const sid = String(s._id);
                  const checked = form.complimentary_services.includes(sid);
                  return (
                    <label key={sid} style={{ display: "flex", alignItems: "center", gap: 8, color: "#e2e8f0" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleService("complimentary_services", sid)}
                      />
                      <span>
                        {s.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              alignItems: "end",
              border: "1px solid rgba(148, 163, 184, 0.22)",
              borderRadius: 12,
              padding: 10,
            }}
          >
            <label style={{ flex: "1 1 220px", display: "grid", gap: 6, fontWeight: 700, color: "#e2e8f0" }}>
              Ảnh đại diện
              <input
                name="image"
                placeholder="Tên file trong uploads hoặc URL đầy đủ"
                value={form.image}
                onChange={onChange}
                style={{ width: "100%" }}
              />
            </label>
            <label style={{ cursor: uploading ? "wait" : "pointer", fontSize: "14px" }}>
              <input type="file" accept="image/*" multiple hidden onChange={onPickImage} disabled={uploading} />
              <span className="btn-edit" style={{ display: "inline-block", padding: "10px 14px", borderRadius: 10 }}>
                {uploading ? "Đang tải..." : "Upload nhiều ảnh"}
              </span>
            </label>
          </div>
          {galleryPreviews.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {galleryPreviews.map((src) => (
                <img key={src} src={src} alt="gallery-preview" style={{ width: "100%", borderRadius: 8 }} />
              ))}
            </div>
          ) : null}
          {form.image ? (
            <img
              src={resolveImage(form.image)}
              alt=""
              style={{ maxHeight: 140, objectFit: "cover", borderRadius: 8 }}
              onError={(ev) => {
                ev.currentTarget.src = fallbackImage;
              }}
            />
          ) : null}

          {err ? (
            <div
              className="hotel-card"
              style={{ borderColor: "#fecaca", background: "#fef2f2", marginBottom: "4px", padding: "10px" }}
            >
              <p style={{ margin: 0, color: "#991b1b" }}>{err}</p>
            </div>
          ) : null}

          <div className="admin-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn-delete"
              onClick={() => navigate("/admin/room-types")}
              disabled={saving}
            >
              Quay lại danh sách
            </button>
            <button type="submit" className="btn-edit" style={{ background: "#16a34a" }} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
