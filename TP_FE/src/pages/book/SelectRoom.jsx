import { useEffect, useMemo, useRef, useState } from "react";
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

function computeNightlyPrice(base) {
  return Number(base) || 0;
}

export default function SelectRoom() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const checkIn = params.get("check_in_date") || "";
  const checkOut = params.get("check_out_date") || "";
  const preselectRoomTypeId = String(params.get("room_type_id") || "").trim();
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

  const buildBookListUrl = (ci, co, ad, ch) => {
    const totalGuestsDraft = Math.max(1, Number(ad || 0) + Number(ch || 0));
    const sp = new URLSearchParams();
    if (ci) sp.set("check_in_date", ci);
    if (co) sp.set("check_out_date", co);
    sp.set("adults", String(ad));
    sp.set("children", String(ch));
    sp.set("capacity", String(totalGuestsDraft));
    if (preselectRoomTypeId) sp.set("room_type_id", preselectRoomTypeId);
    return `/book?${sp.toString()}`;
  };

  const applySearchParams = () => {
    if (!checkInDraft || !checkOutDraft) {
      alert("Vui lòng chọn ngày nhận phòng và trả phòng.");
      return;
    }
    if (!isDraftValid) {
      alert("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }
    navigate(buildBookListUrl(checkInDraft, checkOutDraft, adultsDraft, childrenDraft), { replace: true });
  };

  // Auto-apply search params when dates are valid (better UX; avoids “Tổng = 0₫” confusion).
  useEffect(() => {
    if (!isDraftValid) return undefined;
    const t = setTimeout(() => {
      navigate(buildBookListUrl(checkInDraft, checkOutDraft, adultsDraft, childrenDraft), { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [
    isDraftValid,
    checkInDraft,
    checkOutDraft,
    adultsDraft,
    childrenDraft,
    navigate,
    preselectRoomTypeId,
  ]);

  const [roomTypes, setRoomTypes] = useState([]);
  const [availability, setAvailability] = useState([]);
  // Cart items: each item represents 1 room, with its selected room type.
  const [cartRooms, setCartRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("priceAsc");
  const [activeImageByTypeId, setActiveImageByTypeId] = useState({});
  const lastPreselectCartKeyRef = useRef("");

  const authState = useMemo(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        user = null;
      }
    }
    return { token, user };
  }, []);

  const ensureCanBook = () => {
    if (!authState?.token || !authState?.user?._id) {
      alert("Vui lòng đăng nhập để đặt phòng.");
      navigate("/login", {
        replace: false,
        state: { from: `${window.location.pathname}${window.location.search || ""}` },
      });
      return false;
    }
    if (authState?.user?.role === "admin") {
      alert("Tài khoản admin không được phép đặt phòng.");
      return false;
    }
    return true;
  };

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
    const byCapacity = list.filter(
      (rt) => Math.max(1, Number(rt?.maxGuests ?? rt?.max_guests) || 1) >= totalGuests,
    );
    // When dates are selected, only show types that still have rooms available
    if (checkIn && checkOut) {
      return byCapacity.filter((rt) => (availableByTypeId[String(rt._id)] ?? 0) > 0);
    }
    return byCapacity;
  }, [roomTypes, totalGuests, checkIn, checkOut, availableByTypeId]);

  const sortedRoomTypes = useMemo(() => {
    const list = [...visibleRoomTypes];
    if (sortKey === "priceDesc") {
      return list.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
    }
    if (sortKey === "capacityDesc") {
      return list.sort(
        (a, b) =>
          Number((b?.maxGuests ?? b?.max_guests) || 0) -
          Number((a?.maxGuests ?? a?.max_guests) || 0),
      );
    }
    return list.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
  }, [visibleRoomTypes, sortKey]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [checkIn, checkOut]);

  const lineItemsForApi = useMemo(() => {
    // aggregate cart rooms into line_items by room type
    const counts = new Map();
    for (const row of cartRooms) {
      const id = String(row?.room_type_id || "").trim();
      if (!id) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    const lines = [];
    for (const [id, qty] of counts.entries()) {
      const rt = roomTypes.find((x) => String(x._id) === String(id));
      if (!rt) continue;
      const base = Number(rt.price) || 0;
      const nightly = computeNightlyPrice(base);
      lines.push({
        room_type_id: String(rt._id),
        room_type_name: rt.name,
        rate_plan_key: "basic",
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

  const depositRequired = useMemo(
    () => lineItemsForApi.reduce((s, l) => s + (Number(l.deposit_amount) || 0) * (Number(l.quantity) || 0), 0),
    [lineItemsForApi],
  );

  const canNext = cartRooms.length > 0 && lineItemsForApi.length > 0 && total > 0 && checkIn && checkOut;

  // Prune cart when filters change (availability)
  useEffect(() => {
    const allowed = new Set(visibleRoomTypes.map((rt) => String(rt._id)));
    setCartRooms((prev) => (Array.isArray(prev) ? prev : []).filter((r) => allowed.has(String(r?.room_type_id || ""))));
  }, [visibleRoomTypes]);

  // ?room_type_id=... (Đặt phòng từ card hạng phòng): thêm 1 phòng loại đó vào giỏ khi đã có ngày, đủ sức chứa và còn phòng trống.
  useEffect(() => {
    const id = preselectRoomTypeId;
    if (!id || !checkIn || !checkOut || loading) return;
    const rt = roomTypes.find((x) => String(x._id) === id);
    if (!rt) return;
    const cap = Math.max(1, Number(rt?.maxGuests ?? rt?.max_guests) || 1);
    if (cap < totalGuests) return;
    if ((availableByTypeId[id] ?? 0) < 1) return;

    const key = `${id}|${checkIn}|${checkOut}|${totalGuests}`;
    if (lastPreselectCartKeyRef.current === key) return;
    lastPreselectCartKeyRef.current = key;

    setCartRooms((prev) => {
      if (prev.some((r) => String(r.room_type_id) === id)) return prev;
      return [...prev, { key: `preselect-${id}-${Date.now()}`, room_type_id: id }];
    });
  }, [preselectRoomTypeId, checkIn, checkOut, loading, roomTypes, availableByTypeId, totalGuests]);

  // Cuộn tới hạng phòng được chọn từ URL (nếu có trong danh sách).
  useEffect(() => {
    if (!preselectRoomTypeId) return;
    const el = document.getElementById(`be-rt-${String(preselectRoomTypeId)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [preselectRoomTypeId, visibleRoomTypes.length]);

  const hasAnyCapacityOption = useMemo(() => {
    return visibleRoomTypes.some(
      (rt) => Math.max(1, Number(rt?.maxGuests ?? rt?.max_guests) || 1) >= totalGuests,
    );
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
    if (!ensureCanBook()) return;
    const id = String(roomTypeId || "").trim();
    if (!id) return;
    setCartRooms((prev) => [...(prev || []), { key: `room-${Date.now()}`, room_type_id: id }]);
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

  const getComplimentaryServices = (rt) => {
    const list = Array.isArray(rt?.complimentary_services) ? rt.complimentary_services : [];
    const names = list
      .map((s) => String(s?.name || s || "").trim())
      .filter(Boolean);
    if (names.length > 0) return Array.from(new Set(names)).slice(0, 6);
    return ["Wifi miễn phí", "Nước suối mỗi ngày", "Dọn phòng hàng ngày"];
  };

  const stepGuest = (type, delta) => {
    if (type === "adult") {
      setAdultsDraft((v) => Math.min(6, Math.max(1, Number(v || 1) + delta)));
      return;
    }
    setChildrenDraft((v) => Math.min(4, Math.max(0, Number(v || 0) + delta)));
  };

  const setActiveImage = (roomTypeId, nextIndex, galleryLength) => {
    if (!galleryLength) return;
    const normalized = ((Number(nextIndex) || 0) + galleryLength) % galleryLength;
    setActiveImageByTypeId((prev) => ({ ...prev, [roomTypeId]: normalized }));
  };

  const shiftActiveImage = (roomTypeId, delta, galleryLength) => {
    if (!galleryLength) return;
    const current = Number(activeImageByTypeId?.[roomTypeId] || 0);
    setActiveImage(roomTypeId, current + delta, galleryLength);
  };

  return (
    <div className="be-shell">
      <main className="be-main">
        <div className="hh-container be-search-layout">
          <aside className="be-filter-panel">
            <div className="be-filter-card">
              <div className="be-filter-title">Tìm Kiếm Phòng Hoàn Hảo</div>
              <label className="hh-label">Thời gian lưu trú</label>
              <input
                type="date"
                className="hh-input"
                value={checkInDraft}
                min={today}
                onChange={(e) => setCheckInDraft(e.target.value)}
              />
              <input
                type="date"
                className="hh-input"
                value={checkOutDraft}
                min={checkInDraft || today}
                onChange={(e) => setCheckOutDraft(e.target.value)}
                style={{ marginTop: 8 }}
              />

              <label className="hh-label" style={{ marginTop: 12 }}>Số lượng khách</label>
              <div className="be-guest-row">
                <div className="be-guest-box">
                  <span>Người lớn</span>
                  <div className="be-guest-stepper">
                    <button type="button" onClick={() => stepGuest("adult", -1)}>−</button>
                    <strong>{adultsDraft}</strong>
                    <button type="button" onClick={() => stepGuest("adult", 1)}>+</button>
                  </div>
                </div>
                <div className="be-guest-box">
                  <span>Trẻ em</span>
                  <div className="be-guest-stepper">
                    <button type="button" onClick={() => stepGuest("child", -1)}>−</button>
                    <strong>{childrenDraft}</strong>
                    <button type="button" onClick={() => stepGuest("child", 1)}>+</button>
                  </div>
                </div>
              </div>
              <button type="button" className="be-search-btn" onClick={applySearchParams}>
                Tìm Kiếm Phòng
              </button>
            </div>
          </aside>

          <section className="be-results-panel">
            <div className="be-booking-hero">
              <p className="be-booking-hero-kicker">Booking Engine</p>
              <h1 className="be-title">Chọn phòng phù hợp cho chuyến đi của bạn</h1>
              <p className="be-booking-hero-desc">
                So sánh nhanh hạng phòng, kiểm tra phòng trống theo ngày và hoàn tất đặt phòng chỉ trong vài bước.
              </p>
            </div>

            <div className="be-results-head">
              <div>
                <h2 className="be-results-title">Phòng có sẵn ({sortedRoomTypes.length})</h2>
                <div className="be-subtitle">
                  {checkIn && checkOut ? `Từ ${checkIn} đến ${checkOut}` : "Vui lòng chọn ngày"} •{" "}
                  {adultsDraft} người lớn, {childrenDraft} trẻ em
                </div>
              </div>
              <div className="be-sort-box">
                <span>Sắp xếp theo:</span>
                <select className="hh-input" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                  <option value="priceAsc">Giá từ thấp đến cao</option>
                  <option value="priceDesc">Giá từ cao đến thấp</option>
                  <option value="capacityDesc">Sức chứa nhiều nhất</option>
                </select>
              </div>
            </div>
            {loading ? <p className="be-note">Đang tải danh sách phòng…</p> : null}
            {error ? <p className="be-note be-note--error">{error}</p> : null}

            {sortedRoomTypes.length === 0 && !loading && (
              <div className="be-note">
                Không còn phòng trống{checkIn && checkOut ? " trong khoảng ngày đã chọn" : ""}. Vui lòng đổi ngày để đặt lại.
              </div>
            )}
            {sortedRoomTypes.length > 0 && !hasAnyCapacityOption && !loading ? (
              <div className="be-note">
                Không có hạng phòng nào đủ sức chứa cho <strong>{totalGuests}</strong> khách. Vui lòng giảm số khách hoặc chọn ngày khác.
              </div>
            ) : null}

            <div className="be-inline-cart">
              <div className="be-sidebar-head">Phòng đã chọn</div>
              <div className="be-sidebar-body">
                <div className="be-sidebar-row">
                  <span>Số phòng</span>
                  <strong>{cartRooms.length}</strong>
                </div>
                <div className="be-sidebar-row">
                  <span>Tổng tạm tính</span>
                  <strong>{total > 0 ? `${total.toLocaleString("vi-VN")} ₫` : "0 ₫"}</strong>
                </div>
                <div className="be-sidebar-row">
                  <span>Tiền cọc (ước tính)</span>
                  <strong>{depositRequired > 0 ? `${depositRequired.toLocaleString("vi-VN")} ₫` : "—"}</strong>
                </div>
                {cartRooms.length > 0 ? (
                  <div className="be-summary-list">
                    {cartRooms.map((r, idx) => {
                      const rt = roomTypes.find((x) => String(x._id) === String(r.room_type_id));
                      const nightly = computeNightlyPrice(Number(rt?.price || 0));
                      const price = nightly * nights;
                      const deposit = Number(rt?.deposit_amount || 0);
                      return (
                        <div key={r.key} className="be-cart-room">
                          <div className="be-cart-room-left">
                            <div className="be-cart-room-title">Phòng {idx + 1}</div>
                            <div className="be-cart-room-sub">{rt?.name || "—"}</div>
                            <div className="be-cart-room-meta">
                              <span>Giá cơ bản</span>
                              <span>•</span>
                              <span>{nights} đêm</span>
                              {deposit > 0 ? (
                                <>
                                  <span>•</span>
                                  <span>Cọc {deposit.toLocaleString("vi-VN")}₫</span>
                                </>
                              ) : null}
                            </div>
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
                  </div>
                ) : (
                  <div className="be-empty-cart">
                    <div className="be-alert" style={{ marginTop: 0 }}>
                      Bạn chưa chọn phòng nào.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div id="be-roomtype-list" className="be-roomtype-list" style={{ marginTop: 14 }}>
              {sortedRoomTypes.map((rt) => {
                const id = String(rt._id);
                const maxAvail = availableByTypeId[id] ?? 0;
                const selectedCount = selectedCountByTypeId[id] ?? 0;
                const left = checkIn && checkOut ? Math.max(0, maxAvail - selectedCount) : maxAvail;
                const cap = Math.max(1, Number(rt?.maxGuests ?? rt?.max_guests) || 1);
                const area = Math.max(0, Number(rt?.area_sqm) || 0);
                const bed = String(rt?.bed_type || "").trim();
                const notEnoughCapacity = cap < totalGuests;
                const canAdd = Boolean(checkIn && checkOut) && !notEnoughCapacity && left > 0;
                const galleryRaw = getGallery(rt);
                const gallery = galleryRaw.length > 0 ? galleryRaw : [resolveImage(rt.image)];
                const complimentary = getComplimentaryServices(rt);
                const activeImageIndex = Math.min(
                  Math.max(0, Number(activeImageByTypeId?.[id] || 0)),
                  Math.max(0, gallery.length - 1),
                );
                const activeImg = gallery[activeImageIndex] || gallery[0];
                const base = Number(rt.price) || 0;
                return (
                  <article
                    id={`be-rt-${id}`}
                    key={id}
                    className="be-room-card be-roomtype-card be-roomtype-card--horizontal"
                    style={{ marginBottom: 18 }}
                  >
                    <div className="be-card-media">
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
                        <>
                          <button
                            type="button"
                            className="be-gallery-nav be-gallery-nav--prev"
                            onClick={() => shiftActiveImage(id, -1, gallery.length)}
                            aria-label="Ảnh trước"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            className="be-gallery-nav be-gallery-nav--next"
                            onClick={() => shiftActiveImage(id, 1, gallery.length)}
                            aria-label="Ảnh tiếp theo"
                          >
                            ›
                          </button>
                        </>
                      ) : null}
                      <span className="be-card-photo-count">{gallery.length} ảnh</span>
                      {gallery.length > 1 ? (
                        <div className="be-card-thumbs">
                          {gallery.map((img, index) => (
                            <button
                              key={`${id}-thumb-${index}`}
                              type="button"
                              className={`be-card-thumb${activeImageIndex === index ? " is-active" : ""}`}
                              onClick={() => setActiveImage(id, index, gallery.length)}
                              aria-label={`Xem ảnh ${index + 1}`}
                            >
                              <img src={img} alt={`${rt.name} ${index + 1}`} />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="be-card-content">
                      <div className="be-room-head">
                        <div className="be-room-head-title">{rt.name}</div>
                      </div>

                      <div className="be-amenities">
                        <div className="be-amenities-title">Tiện nghi</div>
                        <div className="be-amenities-list">
                          {complimentary.map((serviceName) => (
                            <span key={`${id}-${serviceName}`} className="be-amenity-chip">
                              {serviceName}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="be-room-foot">
                        <div className="be-room-meta">
                          <div className="be-room-price">
                            {base.toLocaleString("vi-VN")} ₫ <span>/đêm</span>
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
                        <div className="be-room-actions">
                          <button
                            type="button"
                            className="be-detail-btn"
                            onClick={() => navigate(`/hang-phong/${encodeURIComponent(id)}`)}
                          >
                            Chi tiết
                          </button>
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
                            Đặt ngay
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="be-bottom-sticky">
              <div className="be-sidebar-row">
                <span>Số phòng đã chọn</span>
                <strong>{cartRooms.length}</strong>
              </div>
              <div className="be-sidebar-row">
                <span>Tổng tạm tính</span>
                <strong>{total > 0 ? `${total.toLocaleString("vi-VN")} ₫` : "0 ₫"}</strong>
              </div>
              <button
                className="be-next-btn"
                type="button"
                disabled={!canNext}
                onClick={() => {
                  if (!ensureCanBook()) return;
                  navigate("/book/guest", {
                    state: { checkIn, checkOut, adults, children, nights, lines: lineItemsForApi, total },
                  });
                }}
              >
                Tiến hành thanh toán
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

