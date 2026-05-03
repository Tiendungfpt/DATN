import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/List.css";

const API = "/api/posts";

const emptyForm = {
  id: "",
  title: "",
  content: "",
  image: "",
  isPublished: false,
};

function authHeaders() {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export default function PostManager() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(emptyForm);

  const handleAuthError = (ex) => {
    const status = Number(ex?.response?.status || 0);
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setErr("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      navigate("/login", { replace: true, state: { from: "/admin/posts" } });
      return true;
    }
    if (status === 403) {
      setErr("Bạn không có quyền admin.");
      return true;
    }
    return false;
  };

  const load = async () => {
    setErr("");
    setMsg("");
    try {
      setLoading(true);
      const res = await axios.get(API, { headers: authHeaders() });
      const data = Array.isArray(res.data) ? res.data : [];
      setItems(data);
    } catch (e) {
      if (handleAuthError(e)) return;
      setErr(e?.response?.data?.message || e?.response?.data?.error || "Không tải được danh sách bài viết.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const keyword = String(q || "").trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((it) => {
      const title = String(it?.title || "").toLowerCase();
      const content = String(it?.content || "").toLowerCase();
      return title.includes(keyword) || content.includes(keyword);
    });
  }, [items, q]);

  const pickEdit = (it) => {
    setErr("");
    setMsg("");
    setForm({
      id: String(it?._id || ""),
      title: String(it?.title || ""),
      content: String(it?.content || ""),
      image: String(it?.image || ""),
      isPublished: Boolean(it?.isPublished),
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const payload = {
      title: String(form.title || "").trim(),
      content: String(form.content || "").trim(),
      image: String(form.image || "").trim(),
      isPublished: Boolean(form.isPublished),
    };

    if (!payload.title) {
      setErr("Vui lòng nhập tiêu đề bài viết.");
      return;
    }
    if (!payload.content) {
      setErr("Vui lòng nhập nội dung bài viết.");
      return;
    }

    try {
      setSaving(true);
      if (form.id) {
        await axios.put(`${API}/${encodeURIComponent(form.id)}`, payload, { headers: authHeaders() });
        setMsg("Đã cập nhật bài viết.");
      } else {
        await axios.post(API, payload, { headers: authHeaders() });
        setMsg("Đã tạo bài viết mới.");
      }
      resetForm();
      await load();
    } catch (e) {
      if (handleAuthError(e)) return;
      setErr(e?.response?.data?.message || e?.response?.data?.error || "Lưu bài viết thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const removePost = async (id) => {
    if (!id) return;
    const ok = window.confirm("Bạn chắc chắn muốn xóa bài viết này?");
    if (!ok) return;
    setErr("");
    setMsg("");
    try {
      setDeletingId(id);
      await axios.delete(`${API}/${encodeURIComponent(id)}`, { headers: authHeaders() });
      setMsg("Đã xóa bài viết.");
      setItems((prev) => prev.filter((x) => String(x?._id) !== String(id)));
      if (String(form.id) === String(id)) resetForm();
    } catch (e) {
      if (handleAuthError(e)) return;
      setErr(e?.response?.data?.message || e?.response?.data?.error || "Xóa bài viết thất bại.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="hotel-container">
      <h1>Quản lý bài viết</h1>
      <p className="desc" style={{ marginTop: "-8px", marginBottom: "14px" }}>
        Thêm, sửa, xóa và bật/tắt xuất bản bài viết hiển thị trên website.
      </p>

      {err ? (
        <div className="hotel-card" style={{ borderColor: "#fecaca", background: "#fef2f2", marginBottom: 12 }}>
          <p style={{ margin: 0, color: "#991b1b" }}>{err}</p>
        </div>
      ) : null}
      {msg ? (
        <div className="hotel-card" style={{ borderColor: "#bbf7d0", background: "#f0fdf4", marginBottom: 12 }}>
          <p style={{ margin: 0, color: "#166534" }}>{msg}</p>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, alignItems: "start" }}>
        <div className="hotel-card">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tiêu đề / nội dung..."
              style={{ flex: 1 }}
            />
            <button type="button" className="btn-edit" onClick={load} disabled={loading}>
              Làm mới
            </button>
          </div>

          {loading ? <p className="desc">Đang tải bài viết...</p> : null}
          {!loading && filtered.length === 0 ? <p className="desc">Chưa có bài viết nào.</p> : null}

          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((it) => (
              <div key={it._id} className="hotel-card" style={{ padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 6px" }}>{it.title}</h3>
                    <p className="desc" style={{ marginBottom: 6 }}>
                      {String(it.content || "").slice(0, 160)}
                      {String(it.content || "").length > 160 ? "..." : ""}
                    </p>
                    <p className="desc" style={{ marginBottom: 0, fontSize: 12 }}>
                      Trạng thái: {it.isPublished ? "Đã xuất bản" : "Nháp"} • Lượt xem: {Number(it.viewCount || 0)}
                    </p>
                  </div>
                  <img
                    src={String(it?.image || "").trim() || "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&q=80"}
                    alt={it.title}
                    style={{ width: 96, height: 70, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                </div>

                <div className="admin-actions" style={{ justifyContent: "flex-start", marginTop: 10 }}>
                  <button type="button" className="btn-edit" onClick={() => pickEdit(it)}>
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => removePost(String(it._id))}
                    disabled={deletingId === String(it._id)}
                  >
                    {deletingId === String(it._id) ? "Đang xóa..." : "Xóa"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hotel-card">
          <h3 style={{ marginTop: 0 }}>{form.id ? "Sửa bài viết" : "Thêm bài viết"}</h3>
          <form className="hotel-form" onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            <input
              placeholder="Tiêu đề bài viết"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
            <textarea
              rows={12}
              placeholder="Nội dung bài viết"
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              required
            />
            <input
              placeholder="Ảnh bài viết (URL)"
              value={form.image}
              onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
            />
            {form.image ? (
              <img
                src={form.image}
                alt="preview"
                style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
              />
              <span>Xuất bản ngay</span>
            </label>

            <div className="admin-actions" style={{ marginTop: 2 }}>
              <button type="button" className="btn-delete" onClick={resetForm} disabled={saving}>
                Hủy
              </button>
              <button type="submit" className="btn-edit" style={{ background: "#16a34a" }} disabled={saving}>
                {saving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Tạo bài viết"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
