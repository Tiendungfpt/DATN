import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../components/BookingAdmin.css";
import "../components/Folio.css";

function formatDateVi(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

function formatMoney(v) {
  return `${Number(v || 0).toLocaleString("vi-VN")} ₫`;
}

export default function ServiceManager() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId") || "";
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [folio, setFolio] = useState(null);
  const [guests, setGuests] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [addMode, setAddMode] = useState("catalog"); // catalog | charge
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const firstFieldRef = useRef(null);

  // catalog form
  const [service_id, setServiceId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  // charge form
  const [chargeCategory, setChargeCategory] = useState("other");
  const [chargeName, setChargeName] = useState("");
  const [chargeQty, setChargeQty] = useState(1);
  const [chargeUnit, setChargeUnit] = useState(0);
  const [chargeNote, setChargeNote] = useState("");
  const [chargeAt, setChargeAt] = useState(() => new Date().toISOString().slice(0, 16));

  const token = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const loadAll = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setErr("");
      const [b, f, svc, g] = await Promise.all([
        axios.get(`/api/bookings/${bookingId}`, { headers: token() }),
        axios.get(`/api/bookings/${bookingId}/folio`, { headers: token() }),
        axios.get("/api/services-catalog", { headers: token() }),
        axios.get(`/api/bookings/${bookingId}/guests`, { headers: token() }),
      ]);
      setBooking(b.data || null);
      setFolio(f.data || null);
      const list = Array.isArray(svc.data) ? svc.data : [];
      setCatalog(list);
      if (!service_id && list?.[0]?._id) setServiceId(String(list[0]._id));
      setGuests(Array.isArray(g.data?.items) ? g.data.items : []);
    } catch (e) {
      const status = Number(e?.response?.status || 0);
      if (status === 404) {
        setErr("Backend chưa cập nhật route folio. Vui lòng restart server backend (TP_BE) rồi thử lại.");
      } else if (status === 401) {
        setErr("Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.");
      } else {
        setErr(e.response?.data?.message || "Không tải được folio.");
      }
      setBooking(null);
      setFolio(null);
      setGuests([]);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFolioOnly = async () => {
    if (!bookingId) return;
    try {
      const res = await axios.get(`/api/bookings/${bookingId}/folio`, { headers: token() });
      setFolio(res.data || null);
    } catch {
      // ignore
    }
  };

  const loadCatalogOnly = async () => {
    try {
      const svc = await axios.get("/api/services-catalog", { headers: token() });
      const list = Array.isArray(svc.data) ? svc.data : [];
      setCatalog(list);
      if (!service_id && list?.[0]?._id) setServiceId(String(list[0]._id));
      return list;
    } catch (e) {
      const status = Number(e?.response?.status || 0);
      if (status === 401) setErr("Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.");
      else if (status === 403) setErr("Bạn không có quyền truy cập catalog dịch vụ.");
      else setErr(e.response?.data?.message || "Không tải được catalog dịch vụ.");
      setCatalog([]);
      return [];
    }
  };

  useEffect(() => {
    loadAll();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return undefined;
    const t = setInterval(() => {
      loadFolioOnly();
    }, 5000);
    return () => clearInterval(t);
  }, [bookingId]);

  const headerRooms = useMemo(() => {
    const arr = Array.isArray(booking?.assigned_room_ids) ? booking.assigned_room_ids : [];
    const list = arr
      .map((r) => `${r?.room_no || ""}`.trim())
      .filter(Boolean);
    return list.length ? list.join(" + ") : "—";
  }, [booking?.assigned_room_ids]);

  const guestName = booking?.guest_name || booking?.user_id?.name || "Guest";
  const statusLabel =
    booking?.status === "checked_in"
      ? "ĐANG Ở"
      : booking?.status === "confirmed"
        ? "ĐÃ XÁC NHẬN"
        : booking?.status === "pending"
          ? "CHỜ XÁC NHẬN"
          : String(booking?.status || "—").toUpperCase();

  const roomTypeSummary = useMemo(() => {
    const lines = Array.isArray(booking?.line_items) ? booking.line_items : [];
    if (!lines.length) return [];
    return lines.map((li) => ({
      key: String(li?._id || li?.room_type_id?._id || li?.room_type_id),
      name: li?.room_type_id?.name || "Hạng phòng",
      qty: Math.max(1, Number(li?.quantity) || 1),
    }));
  }, [booking?.line_items]);

  const partyCount = useMemo(() => {
    if (Array.isArray(guests) && guests.length > 0) return guests.length;
    return booking?.checkin_guest_snapshot ? 1 : 1;
  }, [guests, booking?.checkin_guest_snapshot]);

  const chargeRows = useMemo(() => {
    const charges = Array.isArray(folio?.charges) ? folio.charges : [];
    return charges.map((c) => ({
      key: `charge-${c._id}`,
      label: c.service_name || "Charge",
      when: c.charged_at || c.createdAt,
      amount: Number(c.total_price || 0),
      meta: c.note || "",
      kind: "charge",
    }));
  }, [folio?.charges]);

  const serviceRows = useMemo(() => {
    const lines = Array.isArray(folio?.service_lines) ? folio.service_lines : [];
    return lines.map((l) => ({
      key: `svc-${l._id}`,
      label: l?.service_id?.name || "Service",
      when: l.createdAt,
      amount: Number(l.line_total || 0),
      meta: l.note || "",
      kind: "service",
    }));
  }, [folio?.service_lines]);

  const mergedExtras = useMemo(() => {
    const all = [...chargeRows, ...serviceRows];
    all.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
    return all;
  }, [chargeRows, serviceRows]);

  const balanceDue = Math.max(0, Number(folio?.balance_due || 0));

  const openAdd = () => {
    setModalOpen(true);
    setErr("");
    loadCatalogOnly();
  };

  const closeAdd = () => {
    setModalOpen(false);
    setErr("");
  };

  const showToast = (text) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => {
    if (!modalOpen) return;
    const t = setTimeout(() => {
      if (firstFieldRef.current && typeof firstFieldRef.current.focus === "function") {
        firstFieldRef.current.focus();
      }
    }, 0);
    return () => clearTimeout(t);
  }, [modalOpen, addMode]);

  const selectedService = useMemo(() => {
    return (catalog || []).find((s) => String(s?._id) === String(service_id)) || null;
  }, [catalog, service_id]);

  const catalogUnit = Math.max(0, Number(selectedService?.defaultPrice || 0));
  const catalogQty = Math.max(1, Number(quantity) || 1);
  const catalogLineTotal = catalogQty * catalogUnit;

  const chargeQtyNum = Math.max(1, Number(chargeQty) || 1);
  const chargeUnitNum = Math.max(0, Number(chargeUnit) || 0);
  const chargeLineTotal = chargeQtyNum * chargeUnitNum;

  const recentExtras = useMemo(() => {
    return (mergedExtras || []).slice(0, 6);
  }, [mergedExtras]);

  const quickSeedCatalog = async () => {
    setErr("");
    setToast("");
    try {
      const existingCatsRes = await axios.get("/api/service-categories?active=0", { headers: token() });
      const existingCats = Array.isArray(existingCatsRes.data) ? existingCatsRes.data : [];

      const ensureCat = async (code, name) => {
        const found = existingCats.find((c) => String(c?.code || "").toLowerCase() === String(code).toLowerCase());
        if (found?._id) return found;
        const created = await axios.post(
          "/api/service-categories",
          { code, name, isActive: true },
          { headers: token() },
        );
        return created.data;
      };

      const catFood = await ensureCat("FOOD", "Ăn uống");
      const catLaundry = await ensureCat("LAUNDRY", "Giặt là");
      const catMinibar = await ensureCat("MINIBAR", "Mini bar");
      const catDamage = await ensureCat("DAMAGE", "Đền bù");

      const presets = [
        { name: "Nước suối", defaultPrice: 20000, category_id: catMinibar?._id || null, unit: "chai", description: "1 chai nước suối" },
        { name: "Ăn sáng", defaultPrice: 80000, category_id: catFood?._id || null, unit: "suất", description: "01 suất ăn sáng" },
        { name: "Giặt áo (1 cái)", defaultPrice: 30000, category_id: catLaundry?._id || null, unit: "cái", description: "Giặt/là trong ngày" },
        { name: "Đền bù hư hại", defaultPrice: 200000, category_id: catDamage?._id || null, unit: "lần", description: "Chi phí đền bù theo thực tế" },
      ];
      await Promise.all(presets.map((p) => axios.post("/api/services-catalog", p, { headers: token() })));
      showToast("✅ Đã tạo dịch vụ mẫu");
      await loadCatalogOnly();
    } catch (e) {
      const status = Number(e?.response?.status || 0);
      if (status === 401) setErr("Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.");
      else if (status === 403) setErr("Bạn không có quyền tạo dịch vụ (cần admin).");
      else setErr(e.response?.data?.message || "Tạo dịch vụ mẫu thất bại");
    }
  };

  const addCatalogLine = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (!service_id) return setErr("Vui lòng chọn dịch vụ");
      await axios.post(
        `/api/bookings/${bookingId}/services`,
        { service_id, quantity: catalogQty, note },
        { headers: token() },
      );
      setNote("");
      await loadFolioOnly();
      showToast("✅ Đã thêm dịch vụ");
      closeAdd();
    } catch (e2) {
      setErr(e2.response?.data?.message || "Không thêm được dịch vụ.");
    }
  };

  const addCharge = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const name = String(chargeName || "").trim();
      if (!name) return setErr("Tên không được trống");
      if (chargeUnitNum <= 0) return setErr("Đơn giá phải > 0");
      await axios.post(
        `/api/bookings/${bookingId}/charges`,
        {
          category: chargeCategory,
          service_name: name,
          quantity: chargeQtyNum,
          unit_price: chargeUnitNum,
          charged_at: chargeAt ? new Date(chargeAt).toISOString() : undefined,
          note: chargeNote,
        },
        { headers: token() },
      );
      setChargeName("");
      setChargeQty(1);
      setChargeUnit(0);
      setChargeNote("");
      await loadFolioOnly();
      showToast("✅ Đã thêm phát sinh");
      closeAdd();
    } catch (e2) {
      setErr(e2.response?.data?.message || "Không thêm được phát sinh.");
    }
  };

  if (!bookingId) return <p>Missing bookingId</p>;

  return (
    <section className="folio-shell booking-admin-section">
      <div className="folio-header">
        <div>
          <div className="folio-title">
            Booking #{String(bookingId).slice(-6).toUpperCase()} — {guestName}
          </div>
          <div className="folio-sub">
            Phòng {headerRooms} | {formatDateVi(booking?.check_in_date)} → {formatDateVi(booking?.check_out_date)}
          </div>
        </div>
        <div className="folio-actions">
          <button
            type="button"
            className="folio-add-btn folio-add-btn--ghost"
            onClick={() => navigate(`/admin/check-in?bookingId=${encodeURIComponent(bookingId)}`)}
            disabled={!bookingId}
          >
            Sửa đoàn khách
          </button>
          <button type="button" className="folio-add-btn" onClick={openAdd} disabled={!folio}>
            + Thêm
          </button>
        </div>
      </div>

      {loading ? <div className="booking-admin-empty">Đang tải folio...</div> : null}
      {err ? <div className="folio-alert folio-alert--danger">{err}</div> : null}

      {folio ? (
        <div className="folio-grid">
          <div className="folio-card">
            <div className="folio-card-head">Chi phí phát sinh</div>
            <div className="folio-card-body">
              <div className="folio-row">
                <span>Trạng thái</span>
                <strong>{statusLabel}</strong>
              </div>
              <div className="folio-row">
                <span>Đoàn khách</span>
                <strong>{partyCount} người</strong>
              </div>
              {roomTypeSummary.length ? (
                <div className="folio-row">
                  <span>Hạng phòng</span>
                  <strong>
                    {roomTypeSummary.map((x) => `${x.name} × ${x.qty}`).join(" · ")}
                  </strong>
                </div>
              ) : null}
              <div className="folio-row">
                <span>Tiền phòng</span>
                <strong>{formatMoney(folio.room_subtotal)}</strong>
              </div>

              {mergedExtras.length ? (
                <div className="folio-lines">
                  {mergedExtras.map((x) => (
                    <div key={x.key} className="folio-line">
                      <div className="folio-line-left">
                        <div className="folio-line-title">{x.label}</div>
                        <div className="folio-line-meta">
                          {formatDateVi(x.when)}
                          {x.meta ? ` · ${x.meta}` : ""}
                        </div>
                      </div>
                      <div className="folio-line-amount">{formatMoney(x.amount)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="folio-empty">Chưa có phát sinh.</div>
              )}

              <div className="folio-divider" />
              <div className="folio-row folio-row--total">
                <span>Tổng</span>
                <strong>{formatMoney(folio.grand_total)}</strong>
              </div>
              <div className="folio-row">
                <span>Đã cọc/đã trả trước</span>
                <strong className="folio-minus">- {formatMoney(folio.prepaid_amount)}</strong>
              </div>
              <div className="folio-row">
                <span>Tiền cọc (đã trả / cần)</span>
                <strong>
                  {formatMoney(folio.deposit_paid_amount)} / {formatMoney(folio.deposit_amount)}
                </strong>
              </div>
              <div className="folio-row folio-row--due">
                <span>Còn lại (thu khi checkout)</span>
                <strong className="folio-due">{formatMoney(balanceDue)}</strong>
              </div>
            </div>
          </div>

          <aside className="folio-card folio-card--sticky">
            <div className="folio-card-head">Realtime</div>
            <div className="folio-card-body">
              <div className="folio-kpi">
                <div className="folio-kpi-k">Tổng</div>
                <div className="folio-kpi-v">{formatMoney(folio.grand_total)}</div>
              </div>
              <div className="folio-kpi">
                <div className="folio-kpi-k">Đã trả</div>
                <div className="folio-kpi-v">{formatMoney(folio.prepaid_amount)}</div>
              </div>
              <div className="folio-kpi folio-kpi--due">
                <div className="folio-kpi-k">Còn lại</div>
                <div className="folio-kpi-v">{formatMoney(balanceDue)}</div>
              </div>
              <div className="folio-help">
                Folio tự cập nhật mỗi 5 giây. Thêm phát sinh sẽ phản ánh ngay vào số dư.
              </div>
              {Array.isArray(guests) && guests.length > 0 ? (
                <>
                  <div className="folio-divider" />
                  <div style={{ fontWeight: 900, fontSize: 12, color: "#0f172a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Danh sách khách
                  </div>
                  <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                    {guests.slice(0, 6).map((g) => (
                      <div key={g._id} className="folio-line" style={{ background: "#fff" }}>
                        <div className="folio-line-left">
                          <div className="folio-line-title">
                            {g.full_name} {g.is_primary ? "(Chính)" : ""}
                          </div>
                          <div className="folio-line-meta">
                            {g.id_card ? `ID: ${g.id_card}` : "—"} {g.nationality ? ` · ${g.nationality}` : ""}{g.relationship ? ` · ${g.relationship}` : ""}
                          </div>
                        </div>
                        <div className="folio-line-amount" style={{ fontWeight: 800 }}>
                          {g.date_of_birth ? formatDateVi(g.date_of_birth) : "—"}
                        </div>
                      </div>
                    ))}
                    {guests.length > 6 ? (
                      <div className="folio-empty">+ {guests.length - 6} khách khác</div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {modalOpen ? (
        <div className="folio-modal-backdrop" role="dialog" aria-modal="true">
          <div className="folio-modal">
            <div className="folio-modal-head">
              <strong>Thêm chi phí phát sinh</strong>
              <button type="button" className="folio-x" onClick={closeAdd}>
                ×
              </button>
            </div>
            <div className="folio-modal-body">
              <div className="folio-tabs">
                <button
                  type="button"
                  className={addMode === "catalog" ? "active" : ""}
                  onClick={() => setAddMode("catalog")}
                >
                  Dịch vụ (catalog)
                </button>
                <button
                  type="button"
                  className={addMode === "charge" ? "active" : ""}
                  onClick={() => setAddMode("charge")}
                >
                  Phát sinh tự nhập
                </button>
              </div>

              {addMode === "catalog" ? (
                <form onSubmit={addCatalogLine} className="folio-form">
                  <label>
                    Dịch vụ
                    <select
                      ref={firstFieldRef}
                      value={service_id}
                      onChange={(e) => setServiceId(e.target.value)}
                      disabled={!Array.isArray(catalog) || catalog.length === 0}
                    >
                      {Array.isArray(catalog) && catalog.length > 0 ? (
                        catalog.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                            {s?.unit ? ` / ${s.unit}` : ""} — {Number(s.defaultPrice || 0).toLocaleString("vi-VN")} ₫
                            {s?.category_id?.name ? ` (${s.category_id.name})` : ""}
                          </option>
                        ))
                      ) : (
                        <option value="">Chưa có dịch vụ trong catalog</option>
                      )}
                    </select>
                  </label>
                  {(!Array.isArray(catalog) || catalog.length === 0) && (
                    <div className="folio-alert folio-alert--danger" style={{ marginTop: -4 }}>
                      Chưa có dịch vụ nào trong catalog. Vui lòng thêm dịch vụ ở trang quản lý dịch vụ trước hoặc bấm tạo nhanh.
                      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" className="folio-btn-primary" onClick={quickSeedCatalog}>
                          Tạo nhanh dịch vụ mẫu
                        </button>
                        <button
                          type="button"
                          className="folio-btn-ghost"
                          onClick={() => navigate("/admin/services-catalog")}
                        >
                          Mở quản lý dịch vụ
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedService ? (
                    <div className="folio-service-preview">
                      <div className="folio-preview-row">
                        <span>Đơn giá</span>
                        <strong>{Number(catalogUnit).toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div className="folio-preview-row">
                        <span>Loại</span>
                        <strong>{selectedService?.category_id?.name || "Chưa phân loại"}</strong>
                      </div>
                      <div className="folio-preview-row">
                        <span>Đơn vị</span>
                        <strong>{selectedService?.unit || "—"}</strong>
                      </div>
                      {selectedService.description ? (
                        <div className="folio-preview-desc">{selectedService.description}</div>
                      ) : (
                        <div className="folio-preview-desc folio-preview-desc--muted">Không có mô tả</div>
                      )}
                    </div>
                  ) : null}
                  <label>
                    Số lượng
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </label>
                  <div className="folio-inline-total">
                    <span>Thành tiền</span>
                    <strong>{Number(catalogLineTotal).toLocaleString("vi-VN")} ₫</strong>
                  </div>
                  <label>
                    Ghi chú
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Minibar (22/4)" />
                  </label>
                  <div className="folio-actions">
                    <button type="button" className="folio-btn-ghost" onClick={closeAdd}>
                      Hủy
                    </button>
                    <button type="submit" className="folio-btn-primary" disabled={!service_id || !Array.isArray(catalog) || catalog.length === 0}>
                      Thêm
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={addCharge} className="folio-form">
                  <label>
                    Loại phát sinh
                    <select value={chargeCategory} onChange={(e) => setChargeCategory(e.target.value)}>
                      <option value="food">Ăn uống</option>
                      <option value="laundry">Giặt là</option>
                      <option value="minibar">Mini bar</option>
                      <option value="other">Khác</option>
                    </select>
                  </label>
                  <label>
                    Tên
                    <input
                      ref={firstFieldRef}
                      value={chargeName}
                      onChange={(e) => setChargeName(e.target.value)}
                      placeholder="VD: Mini bar"
                      list="folio-suggest"
                      required
                    />
                    <datalist id="folio-suggest">
                      {(catalog || [])
                        .filter((s) => {
                          const q = String(chargeName || "").trim().toLowerCase();
                          if (!q) return false;
                          return String(s?.name || "").toLowerCase().includes(q);
                        })
                        .slice(0, 8)
                        .map((s) => (
                          <option key={s._id} value={s.name} />
                        ))}
                    </datalist>
                  </label>
                  <div className="folio-form-grid">
                    <label>
                      SL
                      <input type="number" min={1} value={chargeQty} onChange={(e) => setChargeQty(e.target.value)} />
                    </label>
                    <label>
                      Đơn giá
                      <input type="number" min={0} value={chargeUnit} onChange={(e) => setChargeUnit(e.target.value)} />
                    </label>
                  </div>
                  <div className="folio-inline-total">
                    <span>Thành tiền</span>
                    <strong>{Number(chargeLineTotal).toLocaleString("vi-VN")} ₫</strong>
                  </div>
                  <label>
                    Thời điểm
                    <div className="folio-datetime">
                      <input type="datetime-local" value={chargeAt} onChange={(e) => setChargeAt(e.target.value)} />
                      <button
                        type="button"
                        className="folio-btn-ghost"
                        onClick={() => setChargeAt(new Date().toISOString().slice(0, 16))}
                      >
                        Dùng hiện tại
                      </button>
                    </div>
                  </label>
                  <label>
                    Ghi chú
                    <input value={chargeNote} onChange={(e) => setChargeNote(e.target.value)} placeholder="Ghi chú" />
                  </label>
                  <div className="folio-actions">
                    <button type="button" className="folio-btn-ghost" onClick={closeAdd}>
                      Hủy
                    </button>
                    <button type="submit" className="folio-btn-primary">
                      Thêm
                    </button>
                  </div>
                </form>
              )}

              <div className="folio-mini">
                <div className="folio-mini-head">Vừa thêm gần đây</div>
                {recentExtras.length ? (
                  <div className="folio-mini-list">
                    {recentExtras.map((x) => (
                      <div key={x.key} className="folio-mini-row">
                        <div className="folio-mini-left">
                          <div className="folio-mini-title">{x.label}</div>
                          <div className="folio-mini-meta">{formatDateVi(x.when)}</div>
                        </div>
                        <div className="folio-mini-amt">{formatMoney(x.amount)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="folio-empty">Chưa có phát sinh.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="folio-toast">{toast}</div> : null}
    </section>
  );
}
