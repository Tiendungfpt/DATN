import { useEffect, useId, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiCalendar, FiUsers } from "react-icons/fi";
import axios from "axios";
import { fetchRoomTypeAvailability, fetchRoomTypeCatalog } from "../../services/availabilityApi";
import "./BookEngine.css";

const VI_BOOKING_MONTHS = [
  "Một",
  "Hai",
  "Ba",
  "Tư",
  "Năm",
  "Sáu",
  "Bảy",
  "Tám",
  "Chín",
  "Mười",
  "Mười Một",
  "Mười Hai",
];

/** dd Tháng Tên_tháng yyyy — giống thẻ xác nhận hotel */
function formatBookingDateVi(ymd) {
  const s = String(ymd || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s || "—";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const day = String(d).padStart(2, "0");
  const monthName = VI_BOOKING_MONTHS[mo - 1] || String(mo);
  return `${day} Tháng ${monthName} ${y}`;
}

/** "03 Tháng Năm" — không năm, dùng thanh search */
function formatStripDateNoYear(ymd) {
  const s = String(ymd || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s || "—";
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const day = String(d).padStart(2, "0");
  const monthName = VI_BOOKING_MONTHS[mo - 1] || String(mo);
  return `${day} Tháng ${monthName}`;
}

function countBookingNights(checkInStr, checkOutStr) {
  const a = new Date(String(checkInStr || "").slice(0, 10));
  const b = new Date(String(checkOutStr || "").slice(0, 10));
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
}

function recomputeBookingTotal(lines, nights) {
  const n = Number(nights) || 0;
  const ls = Array.isArray(lines) ? lines : [];
  return ls.reduce((s, l) => s + n * Number(l.price || 0) * Number(l.quantity || 0), 0);
}

function computeGuestCapacity(lines, catalog) {
  const ls = Array.isArray(lines) ? lines : [];
  const byId = new Map((Array.isArray(catalog) ? catalog : []).map((rt) => [String(rt._id), rt]));
  let sum = 0;
  for (const l of ls) {
    const rt = byId.get(String(l.room_type_id));
    const cap = Math.max(1, Number(rt?.maxGuests ?? rt?.max_guests) || 1);
    sum += cap * Math.max(1, Number(l.quantity || 1));
  }
  return Math.max(1, sum);
}

/** Trả về danh sách loại phòng không đủ phòng trống */
async function findAvailabilityProblems(lines, checkIn, checkOut) {
  const rows = Array.isArray(lines) ? lines : [];
  const items = await fetchRoomTypeAvailability({
    check_in_date: checkIn,
    check_out_date: checkOut,
  });
  const byId = new Map(
    items.map((i) => [String(i.room_type_id), Math.max(0, Number(i.available_count) || 0)]),
  );
  const problems = [];
  for (const row of rows) {
    const id = String(row.room_type_id || "");
    const need = Number(row.quantity) || 0;
    const have = Number(byId.get(id) ?? 0);
    if (need > have)
      problems.push({
        name: String(row.room_type_name || "").trim() || id,
        need,
        have,
      });
  }
  return problems;
}

/** Biểu tượng ví MoMo kiểu bong bóng (gradient nhận diện thương hiệu) */
function MomoBubbleIcon({ className = "" }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `${uid}-momo-grad`;

  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 72 72"
      width="44"
      height="44"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="18%" y1="6%" x2="86%" y2="94%">
          <stop offset="0%" stopColor="#8f005a" />
          <stop offset="45%" stopColor="#d7338f" />
          <stop offset="100%" stopColor="#f078b7" />
        </linearGradient>
      </defs>
      <rect
        x="11"
        y="11"
        width="50"
        height="50"
        rx="19"
        ry="19"
        fill={`url(#${gradId})`}
      />
      <ellipse cx="28" cy="36" rx="6.75" ry="8" fill="#fff" fillOpacity={0.95} />
      <ellipse cx="44" cy="36" rx="6.75" ry="8" fill="#fff" fillOpacity={0.95} />
      <path
        d="M31 52c5 5 12 7 21 4"
        fill="none"
        stroke="#fff"
        strokeWidth="3.75"
        strokeLinecap="round"
        strokeOpacity={0.92}
      />
    </svg>
  );
}

export default function GuestInfo() {
  const location = useLocation();
  const navigate = useNavigate();
  const engineState = location.state || null;
  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [patch, setPatch] = useState({});
  const [roomCatalog, setRoomCatalog] = useState([]);
  const [stripPanel, setStripPanel] = useState(null);
  const [stripError, setStripError] = useState("");
  const [stripBusy, setStripBusy] = useState(false);
  const [dateInDraft, setDateInDraft] = useState("");
  const [dateOutDraft, setDateOutDraft] = useState("");
  const [guestAdultsDraft, setGuestAdultsDraft] = useState(2);
  const [guestChildrenDraft, setGuestChildrenDraft] = useState(0);

  const [guestEmail, setGuestEmail] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [momoType, setMomoType] = useState("captureWallet");
  const [payMode, setPayMode] = useState("deposit"); // deposit | full
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountMsg, setDiscountMsg] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [hotelMeta, setHotelMeta] = useState({
    name: "Thịnh Phát Hotel",
    address: "123 Đường Nguyễn Trãi, Quận Thanh Xuân, Hà Nội, Việt Nam",
    phone: "1900 6925",
  });

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    try {
      const u = JSON.parse(userStr);
      const name = String(u?.name || "").trim();
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        setGuestLastName(parts.slice(0, -1).join(" "));
        setGuestFirstName(parts.slice(-1).join(" "));
      } else {
        setGuestFirstName(name);
      }
      setGuestEmail(String(u?.email || "").trim());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/discount-codes/public");
        setAvailableDiscounts(Array.isArray(res.data) ? res.data : []);
      } catch {
        setAvailableDiscounts([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/site/location?limit=1");
        const loc = await res.json();
        const addr = loc?.map?.address || loc?.map?.query;
        if (addr && String(addr).trim())
          setHotelMeta((prev) => ({ ...prev, address: String(addr).trim() }));
      } catch {
        /* giữ fallback */
      }
    })();
  }, []);

  const engineSig = useMemo(() => {
    if (!engineState?.checkIn || !engineState?.checkOut || !Array.isArray(engineState?.lines))
      return "";
    const lineSig = engineState.lines
      .map((l) => `${String(l.room_type_id)}:${Number(l.quantity) || 0}:${Number(l.price) || 0}`)
      .join("|");
    return `${engineState.checkIn}|${engineState.checkOut}|${lineSig}`;
  }, [engineState]);

  useEffect(() => {
    setPatch({});
  }, [engineSig]);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchRoomTypeCatalog();
        setRoomCatalog(Array.isArray(list) ? list : []);
      } catch {
        setRoomCatalog([]);
      }
    })();
  }, []);

  const booking = useMemo(() => {
    if (
      !engineState?.checkIn ||
      !engineState?.checkOut ||
      !Array.isArray(engineState?.lines)
    )
      return null;
    const baseAdults = Math.max(1, Number(engineState.adults ?? 2) || 2);
    const baseChildren = Math.max(0, Number(engineState.children ?? 0) || 0);
    return {
      ...engineState,
      adults: baseAdults,
      children: baseChildren,
      ...patch,
    };
  }, [engineState, patch]);

  useEffect(() => {
    if (stripPanel !== "dates" || !booking) return;
    setDateInDraft(booking.checkIn);
    setDateOutDraft(booking.checkOut);
  }, [stripPanel, booking?.checkIn, booking?.checkOut]);

  useEffect(() => {
    if (stripPanel !== "guests" || !booking) return;
    setGuestAdultsDraft(Math.min(16, Math.max(1, Number(booking.adults ?? 1) || 1)));
    setGuestChildrenDraft(Math.min(10, Math.max(0, Number(booking.children ?? 0) || 0)));
  }, [stripPanel, booking?.adults, booking?.children]);

  const depositRequired = useMemo(() => {
    const lines = Array.isArray(booking?.lines) ? booking.lines : [];
    return lines.reduce((s, l) => s + (Number(l.deposit_amount) || 0) * (Number(l.quantity) || 0), 0);
  }, [booking]);

  const discountedTotal = useMemo(
    () => Math.max(0, Number(booking?.total || 0) - Number(discountAmount || 0)),
    [booking?.total, discountAmount],
  );
  const payableDeposit = useMemo(
    () => Math.min(depositRequired, discountedTotal),
    [depositRequired, discountedTotal],
  );

  const discountCodesPublic = useMemo(
    () =>
      availableDiscounts
        .map((d) => ({
          ...d,
          codeNorm: String(d?.code || "").trim().toUpperCase(),
        }))
        .filter((d) => d.codeNorm.length > 0),
    [availableDiscounts],
  );

  const discountSelectValue = useMemo(() => {
    const c = String(discountCode || "").trim().toUpperCase();
    if (!c || !discountCodesPublic.some((d) => d.codeNorm === c)) return "";
    return c;
  }, [discountCode, discountCodesPublic]);

  const guestParty = useMemo(() => {
    if (!booking) return { sum: 1, label: "1 khách" };
    const adults = Math.max(0, Number(booking.adults ?? 0));
    const children = Math.max(0, Number(booking.children ?? 0));
    const sum = adults + children;
    if (sum > 0) {
      const bits = [];
      if (adults > 0) bits.push(`${adults} người lớn`);
      if (children > 0) bits.push(`${children} trẻ em`);
      return { sum, label: bits.join(", ") };
    }
    const cap = Math.max(0, Number(booking.capacity ?? 0));
    if (cap > 0) return { sum: cap, label: `${cap} khách` };
    return { sum: 1, label: "1 khách" };
  }, [booking]);

  const roomGuestStripLabel = useMemo(() => {
    if (!booking) return "";
    const rooms = Array.isArray(booking.lines)
      ? booking.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0)
      : 0;
    const r = Math.max(1, rooms);
    const adults = Math.max(0, Number(booking.adults ?? 0));
    const children = Math.max(0, Number(booking.children ?? 0));
    let out = `${r} phòng`;
    if (adults > 0) out += `, ${adults} người lớn`;
    if (children > 0) out += `, ${children} trẻ em`;
    if (adults === 0 && children === 0) out += `, ${guestParty.sum} khách`;
    return out;
  }, [booking?.lines, booking?.adults, booking?.children, guestParty.sum]);

  const stripDateLabel = useMemo(() => {
    if (!booking?.checkIn || !booking?.checkOut) return "";
    return `${formatStripDateNoYear(booking.checkIn)} - ${formatStripDateNoYear(booking.checkOut)}`;
  }, [booking?.checkIn, booking?.checkOut]);

  const stayNightsDisplay = useMemo(() => {
    if (!booking?.checkIn || !booking?.checkOut) return null;
    const n = countBookingNights(booking.checkIn, booking.checkOut);
    return n > 0 ? n : null;
  }, [booking?.checkIn, booking?.checkOut]);

  if (!booking) {
    return (
      <div className="hh-container" style={{ padding: "26px 0" }}>
        <p>Thiếu dữ liệu đặt phòng. Vui lòng quay lại.</p>
        <Link to="/book">Quay lại chọn phòng</Link>
      </div>
    );
  }

  const applyStripDates = async () => {
    setStripError("");
    const ci = String(dateInDraft || "").trim();
    const co = String(dateOutDraft || "").trim();
    if (!ci || !co) {
      setStripError("Vui lòng chọn đủ ngày nhận và ngày trả.");
      return;
    }
    if (ci < todayIso) {
      setStripError("Ngày nhận phòng không được trong quá khứ.");
      return;
    }
    if (new Date(ci) >= new Date(co)) {
      setStripError("Ngày trả phòng phải sau ngày nhận phòng.");
      return;
    }
    try {
      setStripBusy(true);
      const probs = await findAvailabilityProblems(booking.lines, ci, co);
      if (probs.length > 0) {
        const msg = probs
          .map((p) => `${p.name}: cần ${p.need} phòng nhưng chỉ còn ${p.have} phòng trống`)
          .join("; ");
        setStripError(`Không đủ phòng cho khoảng ngày đã chọn. ${msg}. Vui lòng chọn ngày khác.`);
        return;
      }
      const nights = countBookingNights(ci, co);
      const nextTotal = recomputeBookingTotal(booking.lines, nights);
      setPatch((prev) => ({
        ...prev,
        checkIn: ci,
        checkOut: co,
        nights,
        total: nextTotal,
      }));
      setDiscountAmount(0);
      setDiscountCode("");
      setDiscountMsg("Đã cập nhật ngày — vui lòng chọn lại mã giảm giá nếu cần.");
      setStripPanel(null);
    } catch {
      setStripError("Không kiểm tra được phòng trống. Vui lòng thử lại.");
    } finally {
      setStripBusy(false);
    }
  };

  const applyStripGuests = () => {
    setStripError("");
    if (!Array.isArray(roomCatalog) || roomCatalog.length === 0) {
      setStripError("Đang tải thông tin hạng phòng. Vui lòng thử lại sau vài giây.");
      return;
    }
    const adults = Number(guestAdultsDraft) || 1;
    const children = Number(guestChildrenDraft) || 0;
    if (adults < 1) {
      setStripError("Cần ít nhất một người lớn.");
      return;
    }
    const cap = computeGuestCapacity(booking.lines, roomCatalog);
    const totalGuests = adults + children;
    if (totalGuests < 1) {
      setStripError("Số khách không hợp lệ.");
      return;
    }
    if (totalGuests > cap) {
      setStripError(
        `Với các phòng đã chọn, tối đa ${cap} khách (theo hạng phòng). Vui lòng giảm số khách hoặc quay lại chọn phòng.`,
      );
      return;
    }
    setPatch((prev) => ({ ...prev, adults, children }));
    setStripPanel(null);
  };

  const submitAndPay = async () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    let currentUser = null;
    if (userStr) {
      try {
        currentUser = JSON.parse(userStr);
      } catch {
        currentUser = null;
      }
    }
    if (!token) {
      alert("Vui lòng đăng nhập để đặt phòng.");
      navigate("/login", { replace: true, state: { from: "/book" } });
      return;
    }
    if (currentUser?.role === "admin") {
      alert("Tài khoản admin không được phép đặt phòng.");
      return;
    }
    const fullName = `${guestLastName} ${guestFirstName}`.trim();
    if (!guestEmail.trim() || !guestPhone.trim() || !fullName) {
      setError("Vui lòng nhập đầy đủ email, họ tên và số điện thoại.");
      return;
    }
    if (payMode === "deposit" && depositRequired <= 0) {
      setError("Loại phòng chưa được cấu hình tiền cọc. Vui lòng liên hệ khách sạn.");
      return;
    }
    try {
      setLoading(true);
      setError("");

      const payload = {
        line_items: booking.lines.map((l) => ({
          room_type_id: l.room_type_id,
          quantity: l.quantity,
          rate_plan_key: "basic",
        })),
        guest_name: fullName,
        guest_phone: guestPhone.trim(),
        guest_email: guestEmail.trim().toLowerCase(),
        booking_type: "overnight",
        check_in_date: booking.checkIn,
        check_out_date: booking.checkOut,
        payment_mode: payMode === "full" ? "full" : "deposit",
        prepaid_amount: 0,
        discount_code: String(discountCode || "").trim().toUpperCase(),
      };

      const bookingRes = await axios.post("/api/bookings", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookingId = bookingRes?.data?.booking?._id;
      if (!bookingId) throw new Error("Không tạo được booking.");

      const payType = payMode === "full" ? "balance" : "deposit";

      const momoRes = await axios.post("/api/momo/create", {
        bookingId,
        requestType: momoType,
        type: payType,
      });
      if (momoRes?.data?.success && momoRes?.data?.payUrl) {
        window.location.href = momoRes.data.payUrl;
        return;
      }
      throw new Error(momoRes?.data?.message || "Không tạo được link MoMo.");
    } catch (e) {
      const status = e?.response?.status;
      const rawMsg = e?.response?.data?.message || e?.message || "Đặt phòng thất bại.";
      const msg =
        String(rawMsg || "").length > 220
          ? "Không tạo được link thanh toán. Vui lòng thử lại hoặc đăng nhập lại."
          : rawMsg;
      if (status === 401) {
        // Token expired/invalid → force re-login and return to this step
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để thanh toán cọc.");
        navigate("/login", {
          replace: true,
          state: { from: "/book/guest", bookingEngineState: { ...booking } },
        });
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const applyDiscount = async (codeInput) => {
    const code = String((codeInput ?? discountCode) || "").trim().toUpperCase();
    if (!code) {
      setDiscountAmount(0);
      setDiscountMsg("");
      return;
    }
    try {
      setDiscountLoading(true);
      setDiscountMsg("");
      const res = await axios.get("/api/discount-codes/validate", {
        params: { code, order_total: Number(booking.total || 0) },
      });
      const amount = Math.max(0, Number(res?.data?.discount_amount) || 0);
      setDiscountAmount(amount);
      setDiscountCode(code);
      setDiscountMsg(`Áp dụng thành công: giảm ${amount.toLocaleString("vi-VN")} ₫`);
    } catch (e) {
      setDiscountAmount(0);
      setDiscountCode("");
      setDiscountMsg(e?.response?.data?.message || "Mã giảm giá không hợp lệ.");
    } finally {
      setDiscountLoading(false);
    }
  };

  return (
    <div className="be-shell">
      <main className="be-main">
        <div className="hh-container be-guest-wrap">
          <div className="be-guest-search-strip-wrap">
            <div className="be-guest-strip-card">
              <div className="be-guest-search-strip" role="group" aria-label="Tóm tắt lịch và khách">
                <button
                  type="button"
                  className={`be-guest-strip-segment be-guest-strip-hit ${stripPanel === "dates" ? "is-active" : ""}`}
                  aria-expanded={stripPanel === "dates"}
                  onClick={() => {
                    setStripError("");
                    setStripPanel((p) => (p === "dates" ? null : "dates"));
                  }}
                >
                  <FiCalendar className="be-guest-strip-ico" aria-hidden />
                  <span className="be-guest-strip-text">{stripDateLabel}</span>
                </button>
                <div className="be-guest-strip-divider" aria-hidden="true" />
                <button
                  type="button"
                  className={`be-guest-strip-segment be-guest-strip-hit ${stripPanel === "guests" ? "is-active" : ""}`}
                  aria-expanded={stripPanel === "guests"}
                  onClick={() => {
                    setStripError("");
                    setStripPanel((p) => (p === "guests" ? null : "guests"));
                  }}
                >
                  <FiUsers className="be-guest-strip-ico" aria-hidden />
                  <span className="be-guest-strip-text">
                    {roomGuestStripLabel}
                    {stayNightsDisplay != null ? ` · ${stayNightsDisplay} đêm` : ""}
                  </span>
                </button>
              </div>
              {stripError ? (
                <div className="be-guest-strip-alert" role="alert">
                  {stripError}
                </div>
              ) : null}
              {stripPanel === "dates" ? (
                <div className="be-guest-strip-panel">
                  <div className="be-guest-strip-panel-grid">
                    <div className="be-guest-strip-field">
                      <label className="hh-label" htmlFor="strip-ci">
                        Nhận phòng
                      </label>
                      <input
                        id="strip-ci"
                        type="date"
                        className="hh-input"
                        min={todayIso}
                        value={dateInDraft}
                        onChange={(e) => setDateInDraft(e.target.value)}
                      />
                    </div>
                    <div className="be-guest-strip-field">
                      <label className="hh-label" htmlFor="strip-co">
                        Trả phòng
                      </label>
                      <input
                        id="strip-co"
                        type="date"
                        className="hh-input"
                        min={dateInDraft || todayIso}
                        value={dateOutDraft}
                        onChange={(e) => setDateOutDraft(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="be-guest-strip-panel-actions">
                    <button
                      type="button"
                      className="be-guest-strip-btn-secondary"
                      onClick={() => setStripPanel(null)}
                      disabled={stripBusy}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="be-guest-strip-btn-primary"
                      onClick={applyStripDates}
                      disabled={stripBusy}
                    >
                      {stripBusy ? "Đang kiểm tra…" : "Áp dụng ngày"}
                    </button>
                  </div>
                </div>
              ) : null}
              {stripPanel === "guests" ? (
                <div className="be-guest-strip-panel">
                  <div className="be-guest-strip-panel-guests">
                    <div>
                      <span className="hh-label">Người lớn</span>
                      <div className="be-guest-stepper">
                        <button
                          type="button"
                          onClick={() =>
                            setGuestAdultsDraft((v) => Math.min(16, Math.max(1, Number(v) - 1)))
                          }
                        >
                          −
                        </button>
                        <strong>{guestAdultsDraft}</strong>
                        <button
                          type="button"
                          onClick={() =>
                            setGuestAdultsDraft((v) => Math.min(16, Math.max(1, Number(v) + 1)))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="hh-label">Trẻ em</span>
                      <div className="be-guest-stepper">
                        <button
                          type="button"
                          onClick={() =>
                            setGuestChildrenDraft((v) => Math.min(10, Math.max(0, Number(v) - 1)))
                          }
                        >
                          −
                        </button>
                        <strong>{guestChildrenDraft}</strong>
                        <button
                          type="button"
                          onClick={() =>
                            setGuestChildrenDraft((v) => Math.min(10, Math.max(0, Number(v) + 1)))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="be-guest-strip-cap-hint">
                    Sức chứa tối đa theo phòng đã chọn:{" "}
                    <strong>{computeGuestCapacity(booking.lines, roomCatalog)} khách</strong>
                    {roomCatalog.length === 0 ? " (đang tải hạng phòng…)" : ""}
                  </p>
                  <div className="be-guest-strip-panel-actions">
                    <button
                      type="button"
                      className="be-guest-strip-btn-secondary"
                      onClick={() => setStripPanel(null)}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="be-guest-strip-btn-primary"
                      onClick={applyStripGuests}
                      disabled={roomCatalog.length === 0}
                      title={
                        roomCatalog.length === 0
                          ? "Đang tải hạng phòng để kiểm tra sức chứa"
                          : undefined
                      }
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <p className="be-guest-strip-footnote">
              Tự tin đặt phòng: bạn đang trên trang web của khách sạn.
            </p>
          </div>

          <header className="be-guest-header">
            <h1>Hoàn tất thông tin đặt phòng</h1>
            <p>
              Nhập thông tin liên hệ của khách lưu trú và chọn phương thức thanh toán để hoàn tất giữ chỗ.
            </p>
          </header>

          <section className="be-booking-trust" aria-labelledby="booking-trust-title">
            <h2 id="booking-trust-title" className="be-booking-trust-title">
              Kết thúc kỳ nghỉ của bạn
            </h2>
            <article className="be-summary-card">
              <div className="be-summary-head">
                Đặt phòng của bạn — từ {formatBookingDateVi(booking.checkIn)} đến{" "}
                {formatBookingDateVi(booking.checkOut)}
              </div>
              <div className="be-summary-body">
                <h3>{hotelMeta.name}</h3>
                <dl className="be-summary-dl">
                  <div className="be-summary-row">
                    <dt>Địa chỉ</dt>
                    <dd>{hotelMeta.address}</dd>
                  </div>
                  <div className="be-summary-row">
                    <dt>Lễ tân mở</dt>
                    <dd>Hoạt động 24/24</dd>
                  </div>
                  <div className="be-summary-row">
                    <dt>Nhận phòng từ</dt>
                    <dd>14:00 (sau 2 giờ chiều)</dd>
                  </div>
                  <div className="be-summary-row">
                    <dt>Trả phòng trước</dt>
                    <dd>12:00 (trước 12 giờ trưa)</dd>
                  </div>
                  <div className="be-summary-row">
                    <dt>Ngôn ngữ sử dụng</dt>
                    <dd>Tiếng Anh, Tiếng Việt, Tiếng Trung</dd>
                  </div>
                  <div className="be-summary-row">
                    <dt>Liên hệ</dt>
                    <dd>
                      <a
                        className="be-summary-phone"
                        href={`tel:${String(hotelMeta.phone).replace(/\s+/g, "")}`}
                      >
                        +84 {String(hotelMeta.phone).replace(/^\+?84\s*/i, "").trim()}
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          </section>

          <div className="be-form-grid">
            <section className="be-panel be-panel--guest">
              <h3>Thông tin khách hàng</h3>
              <p>Thông tin này được dùng để xác nhận booking và gửi email thanh toán.</p>

              <label className="hh-label">Địa chỉ email *</label>
              <input className="hh-input" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <div>
                  <label className="hh-label">Họ *</label>
                  <input className="hh-input" value={guestLastName} onChange={(e) => setGuestLastName(e.target.value)} />
                </div>
                <div>
                  <label className="hh-label">Tên *</label>
                  <input className="hh-input" value={guestFirstName} onChange={(e) => setGuestFirstName(e.target.value)} />
                </div>
              </div>

              <label className="hh-label" style={{ marginTop: 10 }}>
                Số điện thoại *
              </label>
              <input className="hh-input" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />

              <div className="be-guest-note">
                Vui lòng nhập đúng số điện thoại để khách sạn liên hệ trước giờ nhận phòng.
              </div>
            </section>

            <section className="be-panel be-panel--pay">
              <h3>Thanh toán</h3>
              <p>
                Quý khách có thể thanh toán tiền cọc (trả trước) hoặc thanh toán toàn bộ. Tiền cọc không vượt quá tổng tiền.
              </p>
              <div className="be-sidebar-row">
                <span>Tổng tiền phòng</span>
                <strong>{Number(booking.total || 0).toLocaleString("vi-VN")} ₫</strong>
              </div>
              <div className="be-sidebar-row">
                <span>Giảm giá</span>
                <strong>- {Number(discountAmount || 0).toLocaleString("vi-VN")} ₫</strong>
              </div>
              <div className="be-sidebar-row">
                <span>Sau giảm giá</span>
                <strong>{discountedTotal.toLocaleString("vi-VN")} ₫</strong>
              </div>
              <div className="be-sidebar-row be-sidebar-total">
                <span>{payMode === "full" ? "Thanh toán ngay" : "Tiền cọc cần thanh toán"}</span>
                <strong>
                  {(payMode === "full" ? discountedTotal : payableDeposit).toLocaleString("vi-VN")} ₫
                </strong>
              </div>

              <div className="be-pay-box">
                <label className="hh-label" htmlFor="guest-discount-select">
                  Mã giảm giá
                </label>
                <select
                  id="guest-discount-select"
                  className="hh-input"
                  aria-busy={discountLoading}
                  disabled={discountLoading || discountCodesPublic.length === 0}
                  value={discountSelectValue}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setDiscountMsg("");
                    setDiscountCode(raw);
                    if (!raw) {
                      setDiscountAmount(0);
                      return;
                    }
                    applyDiscount(raw);
                  }}
                >
                  <option value="">
                    {discountCodesPublic.length === 0
                      ? "Hiện không có mã khả dụng"
                      : "Không áp dụng mã"}
                  </option>
                  {discountCodesPublic.map((dc) => {
                    const suffix =
                      dc.discount_type === "percent"
                        ? `Giảm ${Number(dc.discount_value || 0)}%`
                        : `Giảm ${Number(dc.discount_value || 0).toLocaleString("vi-VN")} ₫`;
                    return (
                      <option key={dc._id || dc.codeNorm} value={dc.codeNorm}>
                        {dc.codeNorm} — {suffix}
                      </option>
                    );
                  })}
                </select>
                {discountCodesPublic.length === 0 ? (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
                    Khách sạn chưa công bố mã giảm giá cho đơn này.
                  </p>
                ) : null}
                {discountMsg ? (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: discountAmount > 0 ? "#166534" : "#b91c1c",
                    }}
                  >
                    {discountMsg}
                  </div>
                ) : null}
              </div>

              <div className="be-pay-box">
                <label className="hh-label">Hình thức</label>
                <select className="hh-input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                  <option value="deposit">Trả trước (tiền cọc)</option>
                  <option value="full">Trả tất (toàn bộ)</option>
                </select>
              </div>

              <div className="be-pay-box">
                <label className="hh-label">MoMo</label>
                <div className="be-momo-brand">
                  <div className="be-momo-brand-icons" aria-hidden="true">
                    <MomoBubbleIcon className="be-momo-brand-svg" />
                    <img
                      className="be-momo-brand-img"
                      src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                      alt=""
                      width="44"
                      height="44"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  </div>
                  <div className="be-momo-brand-text">
                    <strong>Ví điện tử MoMo</strong>
                    <span>Thanh toán bảo mật qua cổng MoMo (sandbox).</span>
                  </div>
                </div>
                <select className="hh-input" value={momoType} onChange={(e) => setMomoType(e.target.value)}>
                  <option value="captureWallet">Ví MoMo — quét QR (khuyến nghị sandbox)</option>
                  <option value="payWithATM">Thẻ ATM / Napas</option>
                  <option value="payWithCC">Thẻ quốc tế (Visa/Master/JCB)</option>
                </select>
                {momoType === "captureWallet" ? (
                  <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                    Luồng ổn định nhất trên môi trường test: cài{" "}
                    <strong>MoMo Test App</strong> theo{" "}
                    <a
                      href="https://developers.momo.vn/v3/docs/payment/onboarding/test-instructions"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      test instructions
                    </a>
                    , mở ví test, trên trang thanh toán chọn quét QR hoặc làm theo hướng dẫn trên cổng.
                    Tài khoản test thường mật khẩu / OTP: <strong>000000</strong>.
                  </p>
                ) : (
                  <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                    ATM/Napas hay báo &quot;từ chối nhà phát hành&quot; trên sandbox — bắt buộc nhập{" "}
                    <strong>SĐT VN đủ 10 số</strong> trên form MoMo và OTP theo tài liệu. Thử thẻ:{" "}
                    <strong>9704000000000018</strong>, NGUYEN VAN A, 03/07. Xem{" "}
                    <a
                      href="https://developers.momo.vn/v3/docs/payment/onboarding/test-instructions"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      chi tiết MoMo
                    </a>
                    .
                  </p>
                )}
              </div>

              <div className="be-pay-highlight">
                <span>{payMode === "full" ? "Thanh toán ngay" : "Tiền cọc cần thanh toán"}</span>
                <strong>
                  {(payMode === "full" ? discountedTotal : payableDeposit).toLocaleString("vi-VN")} ₫
                </strong>
              </div>

              {error ? <p className="be-pay-error">{error}</p> : null}

              <div className="be-actions-row">
                <button className="be-pay-btn" type="button" onClick={submitAndPay} disabled={loading}>
                  {loading
                    ? "Đang xử lý…"
                    : payMode === "full"
                      ? "Thanh toán toàn bộ (MoMo)"
                      : "Thanh toán cọc (MoMo)"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

