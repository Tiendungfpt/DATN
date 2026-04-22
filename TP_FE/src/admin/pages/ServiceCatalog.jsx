import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components/BookingAdmin.css";
import "../components/ServiceCatalog.css";

export default function ServiceCatalog() {
  const navigate = useNavigate();
  const token = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const rawToken = () => String(localStorage.getItem("token") || "").trim();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    defaultPrice: 0,
    category_id: "",
    unit: "",
    description: "",
    isActive: true,
  });

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      if (!rawToken()) {
        setCategories([]);
        setItems([]);
        setErr("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }

      // Load categories (non-blocking)
      try {
        const catsRes = await axios.get(`/api/service-categories?active=${showInactive ? "0" : "1"}`, {
          headers: token(),
        });
        setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
      } catch (eCats) {
        const status = Number(eCats?.response?.status || 0);
        if (status === 401) {
          setErr("Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.");
        } else if (status === 404) {
          setErr("Backend chưa cập nhật route /api/service-categories. Vui lòng restart backend.");
        } else {
          setErr(eCats?.response?.data?.message || "Không tải được nhóm dịch vụ.");
        }
        setCategories([]);
      }

      // Load services (blocking for page)
      const svcRes = await axios.get(`/api/services-catalog?active=${showInactive ? "0" : "1"}`, { headers: token() });
      setItems(Array.isArray(svcRes.data) ? svcRes.data : []);
    } catch (e) {
      const status = Number(e?.response?.status || 0);
      if (status === 401) {
        setErr("Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.");
      } else {
        setErr(e.response?.data?.message || "Không tải được catalog dịch vụ");
      }
      setCategories([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  useEffect(() => {
    if (!err) return;
    if (err.toLowerCase().includes("đăng nhập")) {
      const t = setTimeout(() => navigate("/login", { replace: true, state: { from: "/admin/services-catalog" } }), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [err, navigate]);

  const filtered = useMemo(() => {
    const keyword = String(q || "").trim().toLowerCase();
    if (!keyword) return items;
    return (items || []).filter((x) => String(x?.name || "").toLowerCase().includes(keyword));
  }, [items, q]);

  const resetForm = () => {
    setForm({ id: "", name: "", defaultPrice: 0, category_id: "", unit: "", description: "", isActive: true });
  };

  const pickEdit = (s) => {
    setMsg("");
    setErr("");
    setForm({
      id: String(s?._id || ""),
      name: String(s?.name || ""),
      defaultPrice: Number(s?.defaultPrice || 0),
      category_id: String(s?.category_id?._id || s?.category_id || ""),
      unit: String(s?.unit || ""),
      description: String(s?.description || ""),
      isActive: Boolean(s?.isActive ?? true),
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    const name = String(form.name || "").trim();
    const price = Math.max(0, Number(form.defaultPrice) || 0);
    if (!name) return setErr("Tên dịch vụ không được trống");
    if (price <= 0) return setErr("Giá mặc định phải > 0");
    try {
      if (form.id) {
        await axios.put(
          `/api/services-catalog/${encodeURIComponent(form.id)}`,
          {
            name,
            defaultPrice: price,
            category_id: form.category_id || null,
            unit: String(form.unit || "").trim(),
            description: String(form.description || ""),
            isActive: Boolean(form.isActive),
          },
          { headers: token() },
        );
        setMsg("✅ Đã cập nhật dịch vụ");
      } else {
        await axios.post(
          `/api/services-catalog`,
          {
            name,
            defaultPrice: price,
            category_id: form.category_id || null,
            unit: String(form.unit || "").trim(),
            description: String(form.description || ""),
            isActive: true,
          },
          { headers: token() },
        );
        setMsg("✅ Đã tạo dịch vụ");
      }
      resetForm();
      await load();
    } catch (e2) {
      setErr(e2.response?.data?.message || "Lưu dịch vụ thất bại");
    }
  };

  const toggleActive = async (s) => {
    setMsg("");
    setErr("");
    try {
      await axios.put(
        `/api/services-catalog/${encodeURIComponent(String(s._id))}`,
        { isActive: !Boolean(s?.isActive) },
        { headers: token() },
      );
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || "Không cập nhật trạng thái");
    }
  };

  return (
    <section className="sc-shell booking-admin-section">
      <div className="booking-admin-section-header">
        <h3>Quản lý dịch vụ (Catalog)</h3>
        <div className="sc-actions">
          <label className="sc-toggle">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            <span>Hiện dịch vụ đã tắt</span>
          </label>
          <button type="button" className="sc-ghost" onClick={resetForm}>
            + Thêm mới
          </button>
        </div>
      </div>

      <div className="sc-grid">
        <div className="sc-card">
          <div className="sc-card-head">Danh sách</div>
          <div className="sc-card-body">
            <div className="sc-search">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên dịch vụ..." />
              <button type="button" className="sc-ghost" onClick={load} disabled={loading}>
                Làm mới
              </button>
            </div>

            {loading ? <div className="booking-admin-empty">Đang tải...</div> : null}
            {filtered.length ? (
              <div className="sc-list">
                {filtered.map((s) => (
                  <div key={s._id} className={`sc-row${s.isActive ? "" : " is-inactive"}`}>
                    <button type="button" className="sc-row-main" onClick={() => pickEdit(s)}>
                      <div className="sc-row-title">{s.name}</div>
                      <div className="sc-row-meta">
                        <span className="sc-chip">{s?.category_id?.name || "Chưa phân loại"}</span>
                        {s?.unit ? <span className="sc-chip">ĐVT: {s.unit}</span> : null}
                        <span className="sc-money">{Number(s.defaultPrice || 0).toLocaleString("vi-VN")} ₫</span>
                        {!s.isActive ? <span className="sc-off">Đã tắt</span> : null}
                      </div>
                    </button>
                    <button type="button" className="sc-mini" onClick={() => toggleActive(s)}>
                      {s.isActive ? "Tắt" : "Bật"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="booking-admin-empty">Chưa có dịch vụ. Hãy tạo dịch vụ mới ở panel bên phải.</div>
            )}
          </div>
        </div>

        <div className="sc-card">
          <div className="sc-card-head">{form.id ? "Sửa dịch vụ" : "Thêm dịch vụ"}</div>
          <div className="sc-card-body">
            <form className="sc-form" onSubmit={save}>
              <label>
                Tên dịch vụ *
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <div className="sc-form-grid">
                <label>
                  Giá mặc định (₫) *
                  <input
                    type="number"
                    min={0}
                    value={form.defaultPrice}
                    onChange={(e) => setForm((p) => ({ ...p, defaultPrice: e.target.value }))}
                  />
                </label>
                <label>
                  Nhóm dịch vụ
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                  >
                    <option value="">— Chọn nhóm —</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Đơn vị tính (ĐVT)
                <input
                  value={form.unit}
                  onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  placeholder="VD: chai / lần / người / giờ"
                />
              </label>
              <label>
                Mô tả
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="VD: Giặt áo sơ mi, trả trong ngày..."
                />
              </label>
              {form.id ? (
                <label className="sc-toggle">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  />
                  <span>Đang hoạt động</span>
                </label>
              ) : null}

              {err ? <div className="sc-alert sc-alert--danger">{err}</div> : null}
              {msg ? <div className="sc-alert sc-alert--ok">{msg}</div> : null}

              <div className="sc-form-actions">
                <button type="button" className="sc-ghost" onClick={resetForm}>
                  Hủy
                </button>
                <button type="submit" className="sc-primary">
                  {form.id ? "Lưu" : "Tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

