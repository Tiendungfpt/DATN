import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiPlus } from "react-icons/fi";
import "../components/List.css";
import "./DiscountCodeAdmin.css";

const API = "/api/discount-codes";

const emptyForm = {
  id: "",
  code: "",
  name: "",
  discount_type: "percent",
  discount_value: 10,
  min_order_value: "",
  max_discount_amount: "",
  usage_limit: "",
  start_at: "",
  end_at: "",
  is_active: true,
};

function authHeaders() {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export default function DiscountCodeAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setErr("");
    try {
      setLoading(true);
      const res = await axios.get(API, { headers: authHeaders() });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.message || "Không tải được mã giảm giá.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const k = String(q || "").trim().toLowerCase();
    if (!k) return items;
    return items.filter(
      (x) =>
        String(x.code || "").toLowerCase().includes(k) ||
        String(x.name || "").toLowerCase().includes(k),
    );
  }, [items, q]);

  const resetForm = () => setForm(emptyForm);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setErr("");
    resetForm();
  }, []);

  const openCreate = () => {
    setErr("");
    setMsg("");
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setErr("");
    setMsg("");
    setForm({
      id: String(row?._id || ""),
      code: String(row?.code || ""),
      name: String(row?.name || ""),
      discount_type: String(row?.discount_type || "percent"),
      discount_value: Number(row?.discount_value || 0),
      min_order_value: Number(row?.min_order_value || 0),
      max_discount_amount: Number(row?.max_discount_amount || 0),
      usage_limit: Number(row?.usage_limit || 0),
      start_at: row?.start_at
        ? new Date(row.start_at).toISOString().slice(0, 16)
        : "",
      end_at: row?.end_at ? new Date(row.end_at).toISOString().slice(0, 16) : "",
      is_active: Boolean(row?.is_active ?? true),
    });
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;
    const onEsc = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [modalOpen, closeModal]);

  const setNumeric = (key, raw) => {
    const cleaned = String(raw || "").replace(/[^0-9]/g, "");
    setForm((p) => ({ ...p, [key]: cleaned }));
  };

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    const payload = {
      code: String(form.code || "").trim().toUpperCase(),
      name: String(form.name || "").trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
      min_order_value: Number(form.min_order_value) || 0,
      max_discount_amount: Number(form.max_discount_amount) || 0,
      usage_limit: Number(form.usage_limit) || 0,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      is_active: Boolean(form.is_active),
    };
    if (!payload.code) {
      setErr("Vui lòng nhập mã.");
      return;
    }
    try {
      setSaving(true);
      if (form.id) {
        await axios.put(`${API}/${encodeURIComponent(form.id)}`, payload, {
          headers: authHeaders(),
        });
        setMsg("Đã cập nhật mã giảm giá.");
      } else {
        await axios.post(API, payload, { headers: authHeaders() });
        setMsg("Đã tạo mã giảm giá.");
      }
      closeModal();
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Lưu mã giảm giá thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const removeCode = async (id) => {
    if (!id) return;
    if (!window.confirm("Bạn chắc chắn muốn xóa mã giảm giá này?")) return;
    try {
      await axios.delete(`${API}/${encodeURIComponent(id)}`, {
        headers: authHeaders(),
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Xóa mã thất bại.");
    }
  };

  const isEditing = Boolean(form.id);
  const modalTitle = isEditing ? "Sửa mã giảm giá" : "Thêm mã giảm giá";
  const modalSub = isEditing
    ? `Chỉnh sửa mã "${String(form.code || "").trim().toUpperCase() || "—"}".`
    : "Điền thông tin để tạo mã áp dụng khi đặt phòng.";

  return (
    <div className="hotel-container">
      <div className="discount-admin-header">
        <div>
          <h1>Quản lý mã giảm giá</h1>
          <p className="desc" style={{ margin: 0 }}>
            Tạo và chỉnh sửa mã giảm giá áp dụng khi khách đặt phòng.
          </p>
        </div>
        <button type="button" className="btn-dc-add" onClick={openCreate}>
          <FiPlus aria-hidden strokeWidth={2.5} size={18} />
          Thêm mã giảm giá
        </button>
      </div>

      {!modalOpen && err ? (
        <div
          className="hotel-card dc-page-alert dc-page-alert--error"
          role="alert"
        >
          <p>{err}</p>
        </div>
      ) : null}
      {!modalOpen && msg ? (
        <div className="hotel-card dc-page-alert dc-page-alert--success">
          <p>{msg}</p>
        </div>
      ) : null}

      <div className="hotel-card">
        <div className="discount-admin-toolbar">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã hoặc tên chương trình…"
          />
          <button
            type="button"
            className="btn-edit"
            onClick={load}
            disabled={loading}
          >
            Làm mới
          </button>
        </div>
        {loading ? (
          <p className="desc" style={{ marginTop: 12 }}>
            Đang tải...
          </p>
        ) : null}
        <div className="discount-admin-list" style={{ marginTop: 14 }}>
          {filtered.map((row) => (
            <div key={row._id} className="hotel-card" style={{ padding: 14 }}>
              <div className="discount-admin-row">
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: "1.05rem" }}>
                    {row.code}
                    {!row.is_active ? (
                      <span style={{ fontWeight: 600, opacity: 0.65 }}>
                        {" "}
                        · Đã tắt
                      </span>
                    ) : null}
                  </p>
                  {row.name ? (
                    <p className="desc" style={{ margin: "6px 0 4px" }}>
                      {row.name}
                    </p>
                  ) : null}
                  <p className="desc" style={{ margin: "4px 0" }}>
                    {row.discount_type === "percent"
                      ? `Giảm ${Number(row.discount_value || 0)}%`
                      : `Giảm ${Number(row.discount_value || 0).toLocaleString("vi-VN")}đ`}
                    {" • "}
                    Đơn tối thiểu{" "}
                    {Number(row.min_order_value || 0).toLocaleString("vi-VN")}đ
                  </p>
                  <p
                    className="desc"
                    style={{ margin: 0, fontSize: 12, opacity: 0.92 }}
                  >
                    Đã dùng {Number(row.used_count || 0)} /{" "}
                    {Number(row.usage_limit || 0) || "∞"} lượt
                  </p>
                </div>
                <div className="discount-admin-row-actions">
                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => openEdit(row)}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => removeCode(row._id)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 ? (
            <p className="desc" style={{ margin: "8px 0 4px", textAlign: "center" }}>
              Chưa có mã nào. Nhấn &quot;Thêm mã giảm giá&quot; để tạo.
            </p>
          ) : null}
        </div>
      </div>

      {modalOpen ? (
        <div
          className="dc-modal-overlay"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="dc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dc-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dc-modal-head">
              <div>
                <h2 id="dc-modal-title">{modalTitle}</h2>
                <p className="dc-modal-sub">{modalSub}</p>
              </div>
              <button
                type="button"
                className="dc-modal-close"
                onClick={closeModal}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <form className="dc-modal-form hotel-form" onSubmit={save}>
              <div className="dc-modal-body">
                {err ? (
                  <div className="dc-form-alert dc-form-alert--error" role="alert">
                    {err}
                  </div>
                ) : null}

                <div className="dc-form-stack">
                  <section className="dc-form-section" aria-labelledby="dc-sec-code">
                    <h3 id="dc-sec-code" className="dc-form-section-title">
                      Thông tin mã
                    </h3>
                    <div className="dc-form-row dc-form-row-2">
                      <label className="dc-field">
                        <span className="dc-field-label">
                          Mã voucher <abbr title="bắt buộc">*</abbr>
                        </span>
                        <input
                          className="dc-input"
                          placeholder="VD: SUMMER25"
                          value={form.code}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              code: e.target.value.toUpperCase(),
                            }))
                          }
                          autoComplete="off"
                          spellCheck={false}
                          required
                        />
                        <span className="dc-field-hint">
                          Viết không dấu, thường dùng chữ và số in hoa.
                        </span>
                      </label>
                      <label className="dc-field">
                        <span className="dc-field-label">Tên hiển thị</span>
                        <input
                          className="dc-input"
                          placeholder="vd: Ưu đãi hè 2026"
                          value={form.name}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, name: e.target.value }))
                          }
                        />
                        <span className="dc-field-hint">
                          Tuỳ chọn — chỉ để nhận diện trong admin.
                        </span>
                      </label>
                    </div>
                  </section>

                  <section className="dc-form-section" aria-labelledby="dc-sec-discount">
                    <h3 id="dc-sec-discount" className="dc-form-section-title">
                      Cách áp dụng giảm
                    </h3>
                    <div className="dc-form-row dc-form-row-2">
                      <label className="dc-field">
                        <span className="dc-field-label">Loại giảm</span>
                        <select
                          className="dc-select"
                          value={form.discount_type}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              discount_type: e.target.value,
                            }))
                          }
                        >
                          <option value="percent">Giảm theo %</option>
                          <option value="fixed">Giảm số tiền cố định</option>
                        </select>
                      </label>
                      <label className="dc-field">
                        <span className="dc-field-label">
                          Giá trị giảm
                          <span className="dc-field-suffix">
                            {form.discount_type === "percent"
                              ? "%"
                              : " ₫"}
                          </span>
                        </span>
                        <input
                          className="dc-input dc-input-num"
                          type="number"
                          min={0}
                          placeholder={
                            form.discount_type === "percent" ? "10" : "500000"
                          }
                          value={form.discount_value}
                          onChange={(e) => setNumeric("discount_value", e.target.value)}
                        />
                      </label>
                    </div>
                    {form.discount_type === "percent" ? (
                      <label className="dc-field dc-field-mt">
                        <span className="dc-field-label">
                          Trần tiền giảm (₫)
                        </span>
                        <input
                          className="dc-input dc-input-num"
                          type="number"
                          min={0}
                          placeholder="Để trống hoặc 0 — không giới hạn tiền"
                          value={form.max_discount_amount}
                          onChange={(e) => setNumeric("max_discount_amount", e.target.value)}
                        />
                      </label>
                    ) : null}
                  </section>

                  <section className="dc-form-section" aria-labelledby="dc-sec-rules">
                    <h3 id="dc-sec-rules" className="dc-form-section-title">
                      Điều kiện & lượt dùng
                    </h3>
                    <div className="dc-form-row dc-form-row-2">
                      <label className="dc-field">
                        <span className="dc-field-label">Đơn tối thiểu</span>
                        <input
                          className="dc-input dc-input-num"
                          type="number"
                          min={0}
                          placeholder="0"
                          value={form.min_order_value}
                          onChange={(e) => setNumeric("min_order_value", e.target.value)}
                        />
                        <span className="dc-field-hint">Giá trị tính theo ₫.</span>
                      </label>
                      <label className="dc-field">
                        <span className="dc-field-label">Giới hạn lượt</span>
                        <input
                          className="dc-input dc-input-num"
                          type="number"
                          min={0}
                          placeholder="0 = không giới hạn"
                          value={form.usage_limit}
                          onChange={(e) => setNumeric("usage_limit", e.target.value)}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="dc-form-section" aria-labelledby="dc-sec-time">
                    <h3 id="dc-sec-time" className="dc-form-section-title">
                      Hiệu lực
                    </h3>
                    <div className="dc-form-row dc-form-row-2">
                      <label className="dc-field">
                        <span className="dc-field-label">Bắt đầu</span>
                        <input
                          className="dc-input dc-input-date"
                          type="datetime-local"
                          value={form.start_at}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              start_at: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="dc-field">
                        <span className="dc-field-label">Kết thúc</span>
                        <input
                          className="dc-input dc-input-date"
                          type="datetime-local"
                          value={form.end_at}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, end_at: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                  </section>

                  <section
                    className="dc-form-section dc-form-section--inline"
                    aria-labelledby="dc-sec-status"
                  >
                    <h3 id="dc-sec-status" className="dc-form-section-title">
                      Trạng thái
                    </h3>
                    <label className="dc-switch-label">
                      <input
                        type="checkbox"
                        className="dc-switch-input"
                        checked={form.is_active}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            is_active: e.target.checked,
                          }))
                        }
                      />
                      <span className="dc-switch-ui" aria-hidden />
                      <span className="dc-switch-text">
                        <strong>Đang hoạt động</strong>
                        <small>Tắt nếu bạn không muốn khách nhập được mã này.</small>
                      </span>
                    </label>
                  </section>
                </div>
              </div>

              <div className="dc-modal-foot">
                <button
                  type="button"
                  className="dc-btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Hủy
                </button>
                <button type="submit" className="dc-btn-primary" disabled={saving}>
                  {saving
                    ? "Đang lưu…"
                    : isEditing
                      ? "Lưu thay đổi"
                      : "Tạo mã"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
