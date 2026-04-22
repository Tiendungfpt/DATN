import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../components/BookingAdmin.css";
import "../components/CheckIn.css";

/**
 * Form: CCCD, phone, guest name + assign room_ids (count = room_quantity).
 * PUT /api/bookings/:id/check-in
 */
export default function CheckIn() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId") || "";
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [assignable, setAssignable] = useState(null);
  const [guest_name, setGuestName] = useState("");
  const [guest_phone, setGuestPhone] = useState("");
  const [guest_id_number, setGuestId] = useState("");
  const [guest_email, setGuestEmail] = useState("");
  const [extraGuests, setExtraGuests] = useState([]);
  const [selectedByType, setSelectedByType] = useState({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const token = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const b = await axios.get(`/api/bookings/${bookingId}`, {
          headers: token(),
        });
        setBooking(b.data);
        setGuestName(b.data.guest_name || "");
        setGuestPhone(b.data.guest_phone || "");
        setGuestEmail(b.data.guest_email || "");

        // Prefill guest roster (primary + extras) if captured
        try {
          const g = await axios.get(`/api/bookings/${bookingId}/guests`, { headers: token() });
          const items = Array.isArray(g.data?.items) ? g.data.items : [];
          const primary = items.find((x) => x?.is_primary) || items[0] || null;
          if (primary?.full_name) setGuestName(primary.full_name);
          if (primary?.id_card) setGuestId(primary.id_card);
          const extras = items
            .filter((x) => !x?.is_primary)
            .map((x) => ({
              key: String(x?._id || `${Date.now()}-${Math.random()}`),
              full_name: String(x?.full_name || ""),
              id_card: String(x?.id_card || ""),
              nationality: String(x?.nationality || ""),
              date_of_birth: x?.date_of_birth ? new Date(x.date_of_birth).toISOString().slice(0, 10) : "",
              relationship: String(x?.relationship || ""),
            }));
          setExtraGuests(extras);
        } catch {
          // ignore: roster may not exist yet
          setExtraGuests([]);
        }

        const ar = await axios.get(
          `/api/bookings/${bookingId}/assignable-rooms`,
          { headers: token() },
        );
        setAssignable(ar.data || null);
        // If booking already has assigned rooms, prefill selection
        const assigned = Array.isArray(b.data?.assigned_room_ids) ? b.data.assigned_room_ids : [];
        const assignedIds = assigned.map((x) => String(x?._id ?? x)).filter(Boolean);
        if (assignedIds.length > 0) {
          const byType = {};
          const allRooms = Array.isArray(ar.data?.rooms) ? ar.data.rooms : [];
          const roomTypeById = {};
          allRooms.forEach((r) => {
            roomTypeById[String(r._id)] = String(r.roomType || "");
          });
          assignedIds.forEach((rid) => {
            const tid = roomTypeById[String(rid)] || "unknown";
            if (!byType[tid]) byType[tid] = [];
            byType[tid].push(String(rid));
          });
          setSelectedByType(byType);
        } else {
          setSelectedByType({});
        }
      } catch (e) {
        setErr(e.response?.data?.message || "Cannot load booking");
      }
    })();
  }, [bookingId]);

  const lines = Array.isArray(assignable?.lines) ? assignable.lines : [];
  const isMulti = Boolean(assignable?.multi) && lines.length > 0;
  const requiredTotal = isMulti
    ? lines.reduce((s, l) => s + Math.max(1, Number(l.quantity) || 1), 0)
    : booking?.room_quantity || 1;

  const selectedIds = Object.values(selectedByType).flatMap((arr) => (Array.isArray(arr) ? arr : []));
  const selectedCount = selectedIds.length;
  const isAlreadyCheckedIn = booking?.status === "checked_in";

  const toggleRoomForType = (typeId, roomId, maxForType) => {
    const tid = String(typeId || "");
    const rid = String(roomId || "");
    setSelectedByType((prev) => {
      const next = { ...(prev || {}) };
      const arr = Array.isArray(next[tid]) ? [...next[tid]] : [];
      const exists = arr.includes(rid);
      if (exists) {
        next[tid] = arr.filter((x) => x !== rid);
        return next;
      }
      if (arr.length >= maxForType) {
        return prev;
      }
      next[tid] = [...arr, rid];
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      const partyGuests = [
        {
          full_name: guest_name,
          id_card: guest_id_number,
          nationality: "",
          date_of_birth: "",
          relationship: "primary",
          is_primary: true,
        },
        ...(extraGuests || [])
          .map((g) => ({
            full_name: String(g.full_name || "").trim(),
            id_card: String(g.id_card || "").trim(),
            nationality: String(g.nationality || "").trim(),
            date_of_birth: String(g.date_of_birth || "").trim(),
            relationship: String(g.relationship || "").trim(),
            is_primary: false,
          }))
          .filter((g) => g.full_name),
      ];

      if (isAlreadyCheckedIn) {
        await axios.put(
          `/api/bookings/${bookingId}/guests`,
          { party_guests: partyGuests },
          { headers: token() },
        );
        setMsg("Đã cập nhật đoàn khách");
        navigate(`/admin/service-manager?bookingId=${encodeURIComponent(bookingId)}`);
      } else {
        await axios.put(
          `/api/bookings/${bookingId}/check-in`,
          {
            guest_name,
            guest_phone,
            guest_id_number,
            guest_email,
            assigned_room_ids: selectedIds,
            party_guests: partyGuests,
            override_time_window: true,
          },
          { headers: token() },
        );
        setMsg("Check-in OK");
        navigate("/admin/bookings/checked-in");
      }
    } catch (e) {
      setErr(e.response?.data?.message || "Check-in failed");
    }
  };

  const qty = requiredTotal;
  const partySize = 1 + (extraGuests || []).filter((g) => String(g.full_name || "").trim()).length;

  if (!bookingId) return <p>Missing bookingId in URL</p>;

  return (
    <section className="ci-shell booking-admin-section">
      <div className="booking-admin-section-header">
        <h3>Check-in</h3>
        {booking ? (
          <span className="booking-admin-section-count">
            #{String(booking._id).slice(-6).toUpperCase()}
          </span>
        ) : null}
      </div>
      {booking ? (
        <div className="booking-admin-section-subtitle">
          Cần chọn <strong>{qty}</strong> phòng. {isMulti ? "Booking có nhiều loại phòng — chọn đúng số lượng theo từng loại." : null}
        </div>
      ) : null}

      <div className="ci-grid">
        <form className="ci-panel" onSubmit={submit}>
          <div className="ci-panel-head">Thông tin khách</div>
          <div className="ci-panel-body">
            <div className="ci-kpi-row">
              <div className="ci-kpi">
                <div className="ci-kpi-k">Tổng số khách</div>
                <div className="ci-kpi-v">{partySize}</div>
              </div>
              <div className="ci-kpi">
                <div className="ci-kpi-k">Số phòng</div>
                <div className="ci-kpi-v">{qty}</div>
              </div>
            </div>

            <div className="ci-field">
              <label className="ci-label">Họ và tên *</label>
              <input className="ci-input" value={guest_name} onChange={(e) => setGuestName(e.target.value)} required />
            </div>
            <div className="ci-field">
              <label className="ci-label">Số điện thoại *</label>
              <input className="ci-input" value={guest_phone} onChange={(e) => setGuestPhone(e.target.value)} required />
            </div>
            <div className="ci-field">
              <label className="ci-label">Email</label>
              <input className="ci-input" value={guest_email} onChange={(e) => setGuestEmail(e.target.value)} />
            </div>
            <div className="ci-field">
              <label className="ci-label">CCCD *</label>
              <input className="ci-input" value={guest_id_number} onChange={(e) => setGuestId(e.target.value)} required />
            </div>

            <div className="ci-divider" />
            <div className="ci-subhead">
              <div>
                <div className="ci-subtitle">Thành viên thêm</div>
                <div className="ci-subnote">
                  Bắt buộc khai báo đầy đủ người lưu trú theo quy định. Nhập họ tên để thêm thành viên vào đoàn.
                </div>
              </div>
              <button
                type="button"
                className="ci-secondary"
                onClick={() =>
                  setExtraGuests((prev) => [
                    ...(prev || []),
                    { key: String(Date.now()), full_name: "", id_card: "", nationality: "", date_of_birth: "", relationship: "" },
                  ])
                }
              >
                + Thêm thành viên
              </button>
            </div>

            <div className="ci-guest-list">
              {(extraGuests || []).map((g, idx) => (
                <div key={g.key} className="ci-guest-card">
                  <div className="ci-guest-card-head">
                    <strong>Thành viên {idx + 1}</strong>
                    <button
                      type="button"
                      className="ci-icon-btn"
                      onClick={() => setExtraGuests((prev) => (prev || []).filter((x) => x.key !== g.key))}
                      title="Xóa thành viên"
                    >
                      ×
                    </button>
                  </div>
                  <div className="ci-guest-grid">
                    <div className="ci-field" style={{ marginBottom: 0 }}>
                      <label className="ci-label">Họ tên</label>
                      <input
                        className="ci-input"
                        value={g.full_name}
                        onChange={(e) =>
                          setExtraGuests((prev) =>
                            (prev || []).map((x) => (x.key === g.key ? { ...x, full_name: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                    <div className="ci-field" style={{ marginBottom: 0 }}>
                      <label className="ci-label">CCCD / Passport</label>
                      <input
                        className="ci-input"
                        value={g.id_card}
                        onChange={(e) =>
                          setExtraGuests((prev) =>
                            (prev || []).map((x) => (x.key === g.key ? { ...x, id_card: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                    <div className="ci-field" style={{ marginBottom: 0 }}>
                      <label className="ci-label">Quốc tịch</label>
                      <input
                        className="ci-input"
                        value={g.nationality}
                        onChange={(e) =>
                          setExtraGuests((prev) =>
                            (prev || []).map((x) => (x.key === g.key ? { ...x, nationality: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                    <div className="ci-field" style={{ marginBottom: 0 }}>
                      <label className="ci-label">Ngày sinh</label>
                      <input
                        type="date"
                        className="ci-input"
                        value={g.date_of_birth}
                        onChange={(e) =>
                          setExtraGuests((prev) =>
                            (prev || []).map((x) => (x.key === g.key ? { ...x, date_of_birth: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                    <div className="ci-field" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
                      <label className="ci-label">Quan hệ (vợ/chồng, con...)</label>
                      <input
                        className="ci-input"
                        value={g.relationship}
                        onChange={(e) =>
                          setExtraGuests((prev) =>
                            (prev || []).map((x) => (x.key === g.key ? { ...x, relationship: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {err ? <div className="ci-alert ci-alert--danger">{err}</div> : null}
            {msg ? <div className="ci-alert ci-alert--ok">{msg}</div> : null}
          </div>

          <div className="ci-panel-foot">
            <button
              type="submit"
              className="ci-primary"
              disabled={isAlreadyCheckedIn ? !String(guest_name || "").trim() : selectedCount !== qty}
            >
              {isAlreadyCheckedIn ? "Cập nhật đoàn khách" : "Xác nhận check-in"}
            </button>
          </div>
        </form>

        <div className={`ci-panel${isAlreadyCheckedIn ? " is-disabled" : ""}`}>
          <div className="ci-panel-head">Chọn phòng</div>
          <div className="ci-panel-body">
            {isAlreadyCheckedIn ? (
              <div className="booking-admin-empty">
                Booking đã check-in. Phòng đã gán sẽ giữ nguyên (chỉ cập nhật đoàn khách).
              </div>
            ) : null}
            {!assignable ? <div className="booking-admin-empty">Đang tải danh sách phòng...</div> : null}

            {assignable && !isMulti ? (
              <div className="ci-room-group">
                <div className="ci-room-group-head">
                  <div className="ci-room-group-title">Danh sách phòng khả dụng</div>
                  <div className="ci-room-group-meta">
                    Đã chọn <strong>{selectedCount}</strong> / {qty}
                  </div>
                </div>
                <div className="ci-room-grid">
                  {(Array.isArray(assignable?.rooms) ? assignable.rooms : []).map((r) => {
                    const rid = String(r._id);
                    const tid = String(r.roomType || "single");
                    const picked = (selectedByType[tid] || []).includes(rid);
                    const disabled = !picked && selectedCount >= qty;
                    return (
                      <label key={rid} className={`ci-room-pill${disabled ? " is-disabled" : ""}`}>
                        <input
                          type="checkbox"
                          checked={picked}
                          disabled={isAlreadyCheckedIn || disabled}
                          onChange={() => toggleRoomForType(tid, rid, qty)}
                        />
                        <span>
                          {r.name} {r.room_no ? `(${r.room_no})` : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {assignable && isMulti ? (
              <div className="ci-room-groups">
                {lines.map((line) => {
                  const tid = String(line.room_type_id);
                  const need = Math.max(1, Number(line.quantity) || 1);
                  const pickedIds = Array.isArray(selectedByType[tid]) ? selectedByType[tid] : [];
                  const pickedCount = pickedIds.length;
                  const rooms = Array.isArray(line.rooms) ? line.rooms : [];
                  return (
                    <div key={tid} className="ci-room-group">
                      <div className="ci-room-group-head">
                        <div className="ci-room-group-title">{line.room_type_name || "Loại phòng"}</div>
                        <div className="ci-room-group-meta">
                          Chọn <strong>{pickedCount}</strong> / {need}
                        </div>
                      </div>
                      <div className="ci-room-grid">
                        {rooms.map((r) => {
                          const rid = String(r._id);
                          const picked = pickedIds.includes(rid);
                          const disabled = !picked && pickedCount >= need;
                          return (
                            <label key={rid} className={`ci-room-pill${disabled ? " is-disabled" : ""}`}>
                              <input
                                type="checkbox"
                                checked={picked}
                                disabled={isAlreadyCheckedIn || disabled}
                                onChange={() => toggleRoomForType(tid, rid, need)}
                              />
                              <span>
                                {r.name} {r.room_no ? `(${r.room_no})` : ""}
                              </span>
                            </label>
                          );
                        })}
                        {rooms.length === 0 ? (
                          <div className="booking-admin-empty">
                            Không còn phòng trống cho loại này trong khoảng ngày đã chọn.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="ci-panel ci-panel--sticky">
          <div className="ci-panel-head">Tóm tắt</div>
          <div className="ci-panel-body">
            <div className="ci-kv">
              <span>Đã chọn</span>
              <strong>{selectedCount} / {qty}</strong>
            </div>
            {isMulti ? (
              <div className="ci-summary">
                {lines.map((l) => {
                  const tid = String(l.room_type_id);
                  const need = Math.max(1, Number(l.quantity) || 1);
                  const picked = (selectedByType[tid] || []).length;
                  return (
                    <div key={tid} className="ci-kv ci-kv--sub">
                      <span>{l.room_type_name}</span>
                      <strong>{picked}/{need}</strong>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="ci-divider" />
            <div className="ci-help">
              Tip: hệ thống sẽ tự kiểm tra loại phòng và số lượng đúng với đơn đặt phòng.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
