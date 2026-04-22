import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchRoomTypeAvailability, fetchRoomTypeCatalog } from "../../services/availabilityApi";
import "./BookEngine.css";

const fallbackImage =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80";

function resolveImage(img) {
  const raw = String(img || "").trim();
  if (!raw) return fallbackImage;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return `/uploads/${raw}`;
}

export default function SelectRoom() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const checkIn = params.get("check_in_date") || "";
  const checkOut = params.get("check_out_date") || "";
  const preselectRoomTypeId = params.get("room_type_id") || "";
  const adults = Math.max(1, Number(params.get("adults") || 2));
  const children = Math.max(0, Number(params.get("children") || 0));
  const today = new Date().toISOString().split("T")[0];
  const totalGuests = Math.max(1, adults + children);

  const [checkInDraft, setCheckInDraft] = useState(checkIn);
  const [checkOutDraft, setCheckOutDraft] = useState(checkOut);
  const [adultsDraft, setAdultsDraft] = useState(adults);
  const [childrenDraft, setChildrenDraft] = useState(children);

  useEffect(() => {
    setCheckInDraft(checkIn);
    setCheckOutDraft(checkOut);
    setAdultsDraft(adults);
    setChildrenDraft(children);
  }, [checkIn, checkOut, adults, children]);

  const isDraftValid = useMemo(() => {
    if (!checkInDraft || !checkOutDraft) return false;
    return new Date(checkInDraft) < new Date(checkOutDraft);
  }, [checkInDraft, checkOutDraft]);

  const applySearchParams = () => {
    if (!checkInDraft || !checkOutDraft) {
      alert("Vui lòng chọn ngày nhận phòng và trả phòng.");
      return;
    }
    if (!isDraftValid) {
      alert("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }
    navigate(
      `/book?check_in_date=${encodeURIComponent(checkInDraft)}&check_out_date=${encodeURIComponent(
        checkOutDraft,
      )}&adults=${encodeURIComponent(adultsDraft)}&children=${encodeURIComponent(childrenDraft)}`,
      { replace: true },
    );
  };

  // Auto-apply search params when dates are valid (better UX; avoids “Tổng = 0₫” confusion).
  useEffect(() => {
    if (!isDraftValid) return undefined;
    const t = setTimeout(() => {
      navigate(
        `/book?check_in_date=${encodeURIComponent(checkInDraft)}&check_out_date=${encodeURIComponent(
          checkOutDraft,
        )}&adults=${encodeURIComponent(adultsDraft)}&children=${encodeURIComponent(childrenDraft)}`,
        { replace: true },
      );
    }, 250);
    return () => clearTimeout(t);
  }, [isDraftValid, checkInDraft, checkOutDraft, adultsDraft, childrenDraft, navigate]);

  const [roomTypes, setRoomTypes] = useState([]);
  const [availability, setAvailability] = useState([]);
  // Cart items: each item represents 1 room, with its selected room type.
  const [cartRooms, setCartRooms] = useState([]);
  const [activeImgByType, setActiveImgByType] = useState({});
  const [planByTypeId, setPlanByTypeId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [types, avail] = await Promise.all([
          fetchRoomTypeCatalog(),
          fetchRoomTypeAvailability(checkIn && checkOut ? { check_in_date: checkIn, check_out_date: checkOut } : {}),
        ]);
        setRoomTypes(types);
        setAvailability(avail);
        // NOTE: room_type_id in query is only for focusing/highlighting UI.
        // Do NOT auto-add to cart; user must click "Chọn phòng" / "+ Thêm vào giỏ".
      } catch (e) {
        setRoomTypes([]);
        setAvailability([]);
        setError(e?.message || "Không tải được danh sách phòng.");
      } finally {
        setLoading(false);
      }
    })();
  }, [checkIn, checkOut, preselectRoomTypeId]);

  const availableByTypeId = useMemo(() => {
    const map = {};
    availability.forEach((a) => {
      map[String(a.room_type_id)] = Number(a.available_count) || 0;
    });
    return map;
  }, [availability]);

  const visibleRoomTypes = useMemo(() => {
    const list = Array.isArray(roomTypes) ? roomTypes : [];
    // When dates are selected, only show types that still have rooms available
    if (checkIn && checkOut) {
      return list.filter((rt) => (availableByTypeId[String(rt._id)] ?? 0) > 0);
    }
    return list;
  }, [roomTypes, totalGuests, checkIn, checkOut, availableByTypeId]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [checkIn, checkOut]);

  const lineItemsForApi = useMemo(() => {
    // aggregate cart rooms into line_items (quantity per room type + rate plan)
    const counts = new Map();
    for (const row of cartRooms) {
      const id = String(row?.room_type_id || "").trim();
      if (!id) continue;
      const planKey = String(row?.rate_plan_key || "basic");
      const k = `${id}::${planKey}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const lines = [];
    for (const [k, qty] of counts.entries()) {
      const [id, planKey] = String(k).split("::");
      const rt = roomTypes.find((x) => String(x._id) === String(id));
      if (!rt) continue;
      const base = Number(rt.price) || 0;
      const nightly =
        planKey === "breakfast"
          ? base + 250000
          : planKey === "non_refund"
            ? Math.max(0, Math.round(base * 0.88))
            : base;
      lines.push({
        room_type_id: String(rt._id),
        room_type_name: rt.name,
        rate_plan_key: planKey,
        quantity: qty,
        price: nightly,
        deposit_amount: Number(rt.deposit_amount) || 0,
        image: rt.image,
      });
    }
    return lines;
  }, [cartRooms, roomTypes]);

  const total = useMemo(
    () => lineItemsForApi.reduce((s, l) => s + l.price * nights * l.quantity, 0),
    [lineItemsForApi, nights],
  );

  const canNext = cartRooms.length > 0 && lineItemsForApi.length > 0 && total > 0 && checkIn && checkOut;

  // Prune cart when filters change (availability)
  useEffect(() => {
    const allowed = new Set(visibleRoomTypes.map((rt) => String(rt._id)));
    setCartRooms((prev) => (Array.isArray(prev) ? prev : []).filter((r) => allowed.has(String(r?.room_type_id || ""))));
  }, [visibleRoomTypes]);

  // If room_type_id is present, scroll to that room type (no auto-add).
  useEffect(() => {
    if (!preselectRoomTypeId) return;
    const el = document.getElementById(`be-rt-${String(preselectRoomTypeId)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [preselectRoomTypeId, visibleRoomTypes.length]);

  const hasAnyCapacityOption = useMemo(() => {
    return visibleRoomTypes.some((rt) => Math.max(1, Number(rt?.maxGuests) || 1) >= totalGuests);
  }, [visibleRoomTypes, totalGuests]);

  const selectedCountByTypeId = useMemo(() => {
    const counts = {};
    for (const row of cartRooms) {
      const id = String(row?.room_type_id || "");
      if (!id) continue;
      counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  }, [cartRooms]);

  const addRoomToCart = (roomTypeId) => {
    const id = String(roomTypeId || "").trim();
    if (!id) return;
    const planKey = planByTypeId[id] || "basic";
    setCartRooms((prev) => [...(prev || []), { key: `room-${Date.now()}`, room_type_id: id, rate_plan_key: planKey }]);
    // Keep UX: after adding, user can click "Thêm phòng" to focus list again.
    const el = document.getElementById("be-roomtype-list");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const removeCartRoom = (key) => {
    setCartRooms((prev) => (prev || []).filter((r) => r.key !== key));
  };

  const getGallery = (rt) => {
    const arr = Array.isArray(rt?.images) ? rt.images : [];
    const base = rt?.image ? [rt.image] : [];
    const merged = [...base, ...arr].map(resolveImage);
    // de-dupe
    return Array.from(new Set(merged)).slice(0, 6);
  };

  return (
    <div className="be-shell">
      <div className="be-topbar">
        <div className="hh-container be-topbar-inner">
          <div className="be-top-item">
            🗓
            <input
              type="date"
              className="hh-input"
              style={{ width: 150 }}
              value={checkInDraft}
              min={today}
              onChange={(e) => setCheckInDraft(e.target.value)}
            />
            <span>→</span>
            <input
              type="date"
              className="hh-input"
              style={{ width: 150 }}
              value={checkOutDraft}
              min={checkInDraft || today}
              onChange={(e) => setCheckOutDraft(e.target.value)}
            />
          </div>
          <div className="be-top-item">
            👤
            <select
              className="hh-input"
              style={{ width: 90 }}
              value={adultsDraft}
              onChange={(e) => setAdultsDraft(Number(e.target.value || 1))}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>người lớn</span>
          </div>
          <div className="be-top-item">
            🧒
            <select
              className="hh-input"
              style={{ width: 90 }}
              value={childrenDraft}
              onChange={(e) => setChildrenDraft(Number(e.target.value || 0))}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>trẻ em</span>
          </div>
          <div className="be-top-item">
            <button type="button" className="home-book-btn" style={{ width: 130 }} onClick={applySearchParams}>
              Đặt phòng
            </button>
          </div>
        </div>
      </div>

      <main className="be-main">
        <div className="hh-container be-grid">
          <section>
            <h1 className="be-title">Chọn phòng</h1>
            <div className="be-subtitle">Tự tin đặt phòng: bạn đang trên trang web của khách sạn.</div>
            {!checkIn || !checkOut ? (
              <div style={{ marginBottom: 12, color: "rgba(17,24,39,0.75)", fontSize: 13 }}>
                Vui lòng chọn <strong>ngày nhận phòng</strong> và <strong>ngày trả phòng</strong> để hệ thống tính tổng tiền.
              </div>
            ) : null}
            {loading ? <p>Đang tải…</p> : null}
            {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

            {visibleRoomTypes.length === 0 && !loading && (
              <div style={{ marginTop: 12, color: "rgba(17,24,39,0.75)", fontSize: 14 }}>
                Không còn phòng trống{checkIn && checkOut ? " trong khoảng ngày đã chọn" : ""}. Vui lòng đổi ngày để đặt lại.
              </div>
            )}
            {visibleRoomTypes.length > 0 && !hasAnyCapacityOption && !loading ? (
              <div style={{ marginTop: 12, color: "rgba(17,24,39,0.75)", fontSize: 14 }}>
                Không có hạng phòng nào đủ sức chứa cho <strong>{totalGuests}</strong> khách. Vui lòng giảm số khách hoặc chọn ngày khác.
              </div>
            ) : null}

            <div id="be-roomtype-list" className="be-roomtype-list" style={{ marginTop: 14 }}>
              {visibleRoomTypes.map((rt) => {
                const id = String(rt._id);
                const maxAvail = availableByTypeId[id] ?? 0;
                const selectedCount = selectedCountByTypeId[id] ?? 0;
                const left = checkIn && checkOut ? Math.max(0, maxAvail - selectedCount) : maxAvail;
                const cap = Math.max(1, Number(rt?.maxGuests) || 1);
                const area = Math.max(0, Number(rt?.area_sqm) || 0);
                const bed = String(rt?.bed_type || "").trim();
                const notEnoughCapacity = cap < totalGuests;
                const canAdd = Boolean(checkIn && checkOut) && !notEnoughCapacity && left > 0;
                const gallery = getGallery(rt);
                const activeImg = activeImgByType[id] || gallery[0] || resolveImage(rt.image);
                const base = Number(rt.price) || 0;
                const breakfastPrice = base + 250000;
                const nonRefundPrice = Math.max(0, Math.round(base * 0.88));
                const selectedPlan = planByTypeId[id] || "basic";
                return (
                  <article
                    id={`be-rt-${id}`}
                    key={id}
                    className="be-room-card be-roomtype-card"
                    style={{ marginBottom: 18 }}
                  >
                    <div className="be-room-head">
                      <div className="be-room-head-title">{rt.name}</div>
                      <div className="be-room-head-actions">
                        <button
                          type="button"
                          className="be-link"
                          onClick={() => navigate(`/hang-phong/${encodeURIComponent(id)}`)}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>

                    <div className="be-room-body">
                      <div className="be-gallery">
                        <img
                          className="be-room-img"
                          src={activeImg}
                          alt={rt.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = fallbackImage;
                          }}
                        />
                        {gallery.length > 1 ? (
                          <div className="be-thumbs" aria-label="Ảnh phòng">
                            {gallery.map((src) => {
                              const active = src === activeImg;
                              return (
                                <button
                                  key={src}
                                  type="button"
                                  className={`be-thumb${active ? " is-active" : ""}`}
                                  onClick={() => setActiveImgByType((p) => ({ ...(p || {}), [id]: src }))}
                                  title="Xem ảnh"
                                >
                                  <img src={src} alt="thumb" />
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="be-rate">
                      <div className="be-rate-head">Chọn gói giá</div>
                      <div className="be-rate-list">
                        <label className={`be-rate-item${selectedPlan === "basic" ? " is-selected" : ""}`}>
                          <input
                            type="radio"
                            name={`plan-${id}`}
                            checked={selectedPlan === "basic"}
                            onChange={() => setPlanByTypeId((p) => ({ ...(p || {}), [id]: "basic" }))}
                          />
                          <div className="be-rate-main">
                            <div className="be-rate-title">Giá cơ bản</div>
                            <div className="be-rate-tags">
                              <span className="be-tag be-tag--ok">✓ Hoàn tiền</span>
                              <span className="be-tag">Không ăn sáng</span>
                            </div>
                          </div>
                          <div className="be-rate-price">
                            <div className="be-rate-now">{base.toLocaleString("vi-VN")}đ</div>
                            <div className="be-rate-sub">/đêm</div>
                          </div>
                        </label>

                        <label className={`be-rate-item${selectedPlan === "breakfast" ? " is-selected" : ""}`}>
                          <input
                            type="radio"
                            name={`plan-${id}`}
                            checked={selectedPlan === "breakfast"}
                            onChange={() => setPlanByTypeId((p) => ({ ...(p || {}), [id]: "breakfast" }))}
                          />
                          <div className="be-rate-main">
                            <div className="be-rate-title">Có ăn sáng</div>
                            <div className="be-rate-tags">
                              <span className="be-tag be-tag--ok">✓ Hoàn tiền</span>
                              <span className="be-tag be-tag--pill">🍳 Ăn sáng 2 người</span>
                            </div>
                          </div>
                          <div className="be-rate-price">
                            <div className="be-rate-was">{base.toLocaleString("vi-VN")}đ</div>
                            <div className="be-rate-now">{breakfastPrice.toLocaleString("vi-VN")}đ</div>
                            <div className="be-rate-sub">/đêm</div>
                          </div>
                        </label>

                        <label className={`be-rate-item${selectedPlan === "non_refund" ? " is-selected" : ""}`}>
                          <input
                            type="radio"
                            name={`plan-${id}`}
                            checked={selectedPlan === "non_refund"}
                            onChange={() => setPlanByTypeId((p) => ({ ...(p || {}), [id]: "non_refund" }))}
                          />
                          <div className="be-rate-main">
                            <div className="be-rate-title">Giá không hoàn tiền</div>
                            <div className="be-rate-tags">
                              <span className="be-tag be-tag--no">✗ Không hoàn tiền</span>
                              <span className="be-tag">Không ăn sáng</span>
                            </div>
                          </div>
                          <div className="be-rate-price">
                            <div className="be-rate-now be-rate-now--save">{nonRefundPrice.toLocaleString("vi-VN")}đ</div>
                            <div className="be-rate-sub">/đêm · Tiết kiệm 12%</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="be-room-foot">
                      <div className="be-room-meta">
                        <div className="be-room-price">
                          {Number(rt.price || 0).toLocaleString("vi-VN")} ₫{" "}
                          <span style={{ opacity: 0.7, fontWeight: 700 }}>/đêm</span>
                        </div>
                        <div className="be-room-badges">
                          <span className="be-badge">Tối đa {cap} khách</span>
                          {area > 0 ? <span className="be-badge">{area}m²</span> : null}
                          {bed ? <span className="be-badge">{bed}</span> : null}
                          {checkIn && checkOut ? (
                            <span className={`be-badge${left <= 2 ? " be-badge--warn" : ""}`}>
                              Còn {left}/{maxAvail} phòng
                            </span>
                          ) : (
                            <span className="be-badge be-badge--muted">Chọn ngày để xem phòng trống</span>
                          )}
                          {notEnoughCapacity ? <span className="be-badge be-badge--danger">Không đủ sức chứa</span> : null}
                        </div>
                      </div>
                      <div className="be-qty">
                        <button
                          type="button"
                          className="be-add-to-cart-btn"
                          disabled={!canAdd}
                          title={
                            !checkIn || !checkOut
                              ? "Vui lòng chọn ngày trước"
                              : notEnoughCapacity
                                ? "Không đủ sức chứa"
                                : left <= 0
                                  ? "Hết phòng"
                                  : ""
                          }
                          onClick={() => addRoomToCart(id)}
                        >
                          Chọn phòng
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="be-sidebar">
            <div className="be-sidebar-head">Giỏ hàng</div>
            <div className="be-sidebar-body">
              <div className="be-sidebar-row">
                <span>Số phòng</span>
                <strong>{cartRooms.length}</strong>
              </div>
              <div className="be-sidebar-row">
                <span>Tổng</span>
                <strong>{total > 0 ? `${total.toLocaleString("vi-VN")} ₫` : "0 ₫"}</strong>
              </div>
              {cartRooms.length > 0 ? (
                <div className="be-summary-list">
                  {cartRooms.map((r, idx) => {
                    const rt = roomTypes.find((x) => String(x._id) === String(r.room_type_id));
                    const price = Number(rt?.price || 0) * nights;
                    return (
                      <div key={r.key} className="be-cart-room">
                        <div className="be-cart-room-left">
                          <div className="be-cart-room-title">Phòng {idx + 1}</div>
                          <div className="be-cart-room-sub">{rt?.name || "—"}</div>
                        </div>
                        <div className="be-cart-room-right">
                          <div className="be-cart-room-price">{price > 0 ? `${price.toLocaleString("vi-VN")} ₫` : "—"}</div>
                          <button type="button" className="be-cart-remove" onClick={() => removeCartRoom(r.key)}>
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="be-add-room-btn"
                    onClick={() => {
                      const el = document.getElementById("be-roomtype-list");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    Thêm phòng
                  </button>
                </div>
              ) : (
                <div className="be-empty-cart">
                  <div className="be-alert" style={{ marginTop: 0 }}>
                    <strong>Chưa có phòng nào được giữ chỗ.</strong>
                    <div style={{ marginTop: 6 }}>
                      Chọn <strong>ngày</strong> → chọn <strong>phòng</strong> → bấm <strong>Kế tiếp</strong> để nhập thông tin khách.
                    </div>
                  </div>
                  <div className="be-tip">
                    Mẹo: nếu đặt nhiều phòng, hãy bấm <strong>Chọn phòng</strong> nhiều lần (mỗi lần thêm 1 phòng).
                  </div>
                </div>
              )}
              <button
                className="be-next-btn"
                type="button"
                disabled={!canNext}
                onClick={() =>
                  navigate("/book/guest", {
                    state: { checkIn, checkOut, adults, children, nights, lines: lineItemsForApi, total },
                  })
                }
              >
                Kế tiếp
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

