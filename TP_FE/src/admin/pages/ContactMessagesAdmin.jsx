import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "../components/ContactMessagesAdmin.css";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN");
}

export default function ContactMessagesAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  // UI tabs: all / new / processing / replied / closed
  const [tab, setTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit: 20 });
  const [busyId, setBusyId] = useState("");
  const [draftReplyById, setDraftReplyById] = useState({});
  const [selectedId, setSelectedId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStatus, setDrawerStatus] = useState("pending");
  const replyTextRef = useRef(null);

  const [toasts, setToasts] = useState([]);

  const showToast = (msg, type = "success") => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, msg, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    // Map tabs to existing backend status filters.
    // Note: "processing" and "replied" are derived from replied + user_read_reply_at.
    let mapped = "";
    if (tab === "new") mapped = "new";
    if (tab === "processing" || tab === "replied") mapped = "replied";
    if (tab === "closed") mapped = "closed";
    setStatusFilter(mapped);
    setPage(1);
  }, [tab]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/contact-messages", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(searchText ? { search: searchText } : {}),
          ...(unreadOnly ? { unread_only: 1 } : {}),
          page,
          limit,
        },
      });
      const nextItems = Array.isArray(res.data?.items) ? res.data.items : [];
      setItems(nextItems);
      setPagination(
        res.data?.pagination || { total: nextItems.length, totalPages: 1, page: 1, limit: limit },
      );
      if (!selectedId && nextItems[0]?._id) {
        setSelectedId(nextItems[0]._id);
      }
      if (selectedId && !nextItems.some((it) => it._id === selectedId)) {
        setSelectedId(nextItems[0]?._id || "");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách liên hệ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, searchText, unreadOnly, page, limit]);

  const itemsForTab = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    if (tab === "all") return list;
    if (tab === "new") return list.filter((it) => String(it.status) === "new");
    if (tab === "closed") return list.filter((it) => String(it.status) === "closed");
    if (tab === "processing")
      return list.filter((it) => String(it.status) === "replied" && !it.user_read_reply_at);
    if (tab === "replied")
      return list.filter((it) => String(it.status) === "replied" && Boolean(it.user_read_reply_at));
    return list;
  }, [items, tab]);

  function formatRelativeTime(d) {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return "—";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  }

  function deriveStatus(it) {
    const s = String(it?.status || "");
    if (s === "new") return { label: "MỚI", kind: "new" };
    if (s === "closed") return { label: "ĐÃ ĐÓNG", kind: "closed" };
    if (s === "replied") {
      return { label: "ĐÃ PHẢN HỒI", kind: "replied" };
    }
    return { label: s || "—", kind: s || "unknown" };
  }

  const avgReplyHours = useMemo(() => {
    const repliedItems = (itemsForTab || []).filter(
      (it) => it?.replied_at && it?.createdAt,
    );
    if (repliedItems.length === 0) return 0;
    const sum = repliedItems.reduce((acc, it) => {
      const c = new Date(it.createdAt).getTime();
      const r = new Date(it.replied_at).getTime();
      if (Number.isNaN(c) || Number.isNaN(r)) return acc;
      return acc + Math.max(0, (r - c) / (1000 * 60 * 60));
    }, 0);
    return sum / repliedItems.length;
  }, [itemsForTab]);

  const tabsMeta = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const countAll = pagination.total || list.length;
    const countNew = list.filter((it) => String(it.status) === "new").length;
    const countProcessing = list.filter(
      (it) => String(it.status) === "replied" && !it.user_read_reply_at,
    ).length;
    const countReplied = list.filter((it) => String(it.status) === "replied" && it.user_read_reply_at).length;
    const countClosed = list.filter((it) => String(it.status) === "closed").length;
    return {
      all: countAll,
      new: countNew,
      processing: countProcessing,
      replied: countReplied,
      closed: countClosed,
    };
  }, [items, pagination.total]);

  const selectedItem = useMemo(
    () => items.find((it) => it._id === selectedId) || null,
    [items, selectedId],
  );

  const exportCSV = () => {
    const list = Array.isArray(itemsForTab) ? itemsForTab : [];
    const headers = ["id", "name", "email", "phone", "subject", "status", "createdAt", "admin_reply"];
    const escape = (v) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(","),
      ...list.map((it) =>
        [
          escape(it._id),
          escape(it.name),
          escape(it.email),
          escape(it.phone),
          escape(it.subject),
          escape(deriveStatus(it).label),
          escape(it.createdAt),
          escape(it.admin_reply),
        ].join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contact-messages-${tab}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const replyMessage = async (item) => {
    const reply = String(draftReplyById[item._id] ?? item?.admin_reply ?? "").trim();
    if (!reply.trim()) return;
    try {
      setBusyId(item._id);
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/contact-messages/${item._id}/reply`,
        { reply, status: drawerStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDraftReplyById((prev) => ({ ...prev, [item._id]: "" }));
      showToast("Đã gửi phản hồi thành công", "success");
      await load();
      setDrawerOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Không lưu được phản hồi.", "error");
    } finally {
      setBusyId("");
    }
  };

  const closeTicket = async (item) => {
    if (!item?._id) return;
    try {
      setBusyId(item._id);
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/contact-messages/${item._id}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast("Đã đóng liên hệ.", "success");
      await load();
      if (drawerOpen && selectedId === item._id) setDrawerOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Không đóng được liên hệ.", "error");
    } finally {
      setBusyId("");
    }
  };

  const currentPage = pagination.page || page;
  const totalPages = pagination.totalPages || 1;
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  if (loading) return <p>Đang tải liên hệ...</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <div className="booking-admin-page cm-contact-admin cm-contact-admin--dark">
      <div className="cm-contact-header">
        <div>
          <h2>Quản lý Liên hệ</h2>
          <p>Quản lý dạng bảng: lọc nhanh, xem trạng thái và phản hồi ngay.</p>
        </div>

        <div className="cm-contact-header-right">
          <div className="cm-contact-search">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm liên hệ..."
            />
            <button
              type="button"
              className="cm-contact-search-btn"
              onClick={() => {
                setSearchText(searchInput.trim());
                setPage(1);
              }}
            >
              Tìm
            </button>
          </div>

          <button type="button" className="cm-contact-export" onClick={exportCSV}>
            Xuất CSV
          </button>
        </div>
      </div>

      <div className="cm-contact-stats">
        <div className="cm-contact-stat cm-contact-stat--total">
          <div className="cm-contact-stat-top">
            <span className="cm-contact-stat-label">TỔNG LIÊN HỆ</span>
            <span className="cm-contact-stat-ic" aria-hidden="true">
              💬
            </span>
          </div>
          <div className="cm-contact-stat-value">{tabsMeta.all}</div>
          <div className="cm-contact-stat-sub">Theo dõi tổng quan</div>
        </div>

        <div className="cm-contact-stat cm-contact-stat--new">
          <div className="cm-contact-stat-top">
            <span className="cm-contact-stat-label">CHƯA ĐỌC</span>
            <span className="cm-contact-stat-ic" aria-hidden="true">
              ✉️
            </span>
          </div>
          <div className="cm-contact-stat-value">{tabsMeta.new}</div>
          <div className="cm-contact-stat-sub">Cần xử lý</div>
        </div>

        <div className="cm-contact-stat cm-contact-stat--replied">
          <div className="cm-contact-stat-top">
            <span className="cm-contact-stat-label">ĐÃ PHẢN HỒI</span>
            <span className="cm-contact-stat-ic" aria-hidden="true">
              ✅
            </span>
          </div>
          <div className="cm-contact-stat-value">{tabsMeta.replied + tabsMeta.processing}</div>
          <div className="cm-contact-stat-sub">Tỷ lệ phản hồi</div>
        </div>

        <div className="cm-contact-stat cm-contact-stat--time">
          <div className="cm-contact-stat-top">
            <span className="cm-contact-stat-label">THỜI GIAN TB</span>
            <span className="cm-contact-stat-ic" aria-hidden="true">
              ⏱️
            </span>
          </div>
          <div className="cm-contact-stat-value">{avgReplyHours.toFixed(1)}h</div>
          <div className="cm-contact-stat-sub">Trung bình theo trang</div>
        </div>
      </div>

      <div className="cm-contact-tabs">
        <button type="button" className={`cm-contact-tab ${tab === "all" ? "is-active" : ""}`} onClick={() => setTab("all")}>
          Tất cả ({tabsMeta.all})
        </button>
        <button type="button" className={`cm-contact-tab ${tab === "new" ? "is-active" : ""}`} onClick={() => setTab("new")}>
          Mới ({tabsMeta.new})
        </button>
        <button
          type="button"
          className={`cm-contact-tab ${tab === "processing" ? "is-active" : ""}`}
          onClick={() => setTab("processing")}
        >
          Đang xử lý ({tabsMeta.processing})
        </button>
        <button
          type="button"
          className={`cm-contact-tab ${tab === "replied" ? "is-active" : ""}`}
          onClick={() => setTab("replied")}
        >
          Đã phản hồi ({tabsMeta.replied})
        </button>
        <button
          type="button"
          className={`cm-contact-tab ${tab === "closed" ? "is-active" : ""}`}
          onClick={() => setTab("closed")}
        >
          Đã đóng ({tabsMeta.closed})
        </button>
      </div>

      {itemsForTab.length === 0 ? (
        <div className="cm-contact-empty">Không có liên hệ nào.</div>
      ) : (
        <>
          <div className="cm-contact-table-wrap">
            <table className="cm-contact-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" aria-label="Chọn tất cả" />
                  </th>
                  <th style={{ width: 110 }}>ID</th>
                  <th>NGƯỜI GỬI</th>
                  <th style={{ width: 360 }}>CHỦ ĐỀ / LOẠI</th>
                  <th style={{ width: 160 }}>TRẠNG THÁI</th>
                  <th style={{ width: 120 }}>ƯU TIÊN</th>
                  <th style={{ width: 160 }}>THỜI GIAN</th>
                </tr>
              </thead>
              <tbody>
                {itemsForTab.map((it) => {
                  const st = deriveStatus(it);
                  const active = selectedItem?._id === it._id;
                  const dotClass =
                    st.kind === "new"
                      ? "cm-dot--red"
                      : st.kind === "processing"
                        ? "cm-dot--orange"
                        : st.kind === "replied"
                          ? "cm-dot--green"
                          : st.kind === "closed"
                            ? "cm-dot--gray"
                            : "cm-dot--gray";
                  const initial = String(it.name || "?").trim().charAt(0).toUpperCase();

                  return (
                    <tr
                      key={it._id}
                      className={`cm-contact-row ${active ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelectedId(it._id);
                        setDrawerOpen(true);
                        const nextStatus = st.kind === "closed" ? "closed" : "replied";
                        setDrawerStatus(nextStatus);
                        window.setTimeout(() => {
                          replyTextRef.current?.focus?.();
                        }, 0);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <td>
                        <input type="checkbox" aria-label={`Chọn ${it._id}`} onClick={(e) => e.stopPropagation()} />
                      </td>
                      <td className="cm-col-id">{`#${String(it._id || "").slice(-4)}`}</td>
                      <td>
                        <div className="cm-sender">
                          <div className={`cm-avatar cm-avatar--${st.kind}`} aria-hidden="true">
                            {initial}
                          </div>
                          <div className="cm-sender-meta">
                            <div className="cm-sender-name">{it.name || "—"}</div>
                            <div className="cm-sender-email">{it.email || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cm-subject-cell">
                          <div className="cm-subject">{it.subject || "—"}</div>
                          <div className="cm-type">
                            {it.phone ? `${it.phone} • ` : ""}
                            {it.status}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`cm-status-chip cm-status-chip--${st.kind}`}>{st.label}</span>
                      </td>
                      <td>
                        <span className={`cm-dot ${dotClass}`} aria-hidden="true" />
                      </td>
                      <td className="cm-col-time">{formatRelativeTime(it.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="cm-contact-pagination">
            <button type="button" className="cm-contact-page-btn" disabled={!hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Trước
            </button>
            <span className="cm-contact-page-meta">
              Trang {currentPage}/{totalPages}
            </span>
            <button type="button" className="cm-contact-page-btn" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
              Sau
            </button>
          </div>

          {drawerOpen && selectedItem ? (
            <>
              <div
                className="cm-contact-drawer-overlay"
                onClick={() => setDrawerOpen(false)}
                role="presentation"
              />

              <aside
                className="cm-contact-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Chi tiết liên hệ"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="cm-contact-drawer-header">
                  <div className="cm-contact-drawer-title">
                    <div className="cm-contact-detail-name">{selectedItem.subject || "Chi tiết liên hệ"}</div>
                    <div className="cm-contact-detail-sub">
                      {selectedItem.email || "—"} • {selectedItem.phone || "—"}
                    </div>
                  </div>

                  <div className="cm-contact-drawer-actions-top">
                    <button
                      type="button"
                      className="cm-contact-drawer-reply-icon"
                      onClick={() => replyTextRef.current?.focus?.()}
                      title="Trả lời"
                    >
                      ↩
                    </button>
                    <button
                      type="button"
                      className="cm-contact-drawer-close"
                      onClick={() => setDrawerOpen(false)}
                      aria-label="Đóng"
                    >
                      ×
                    </button>
                  </div>
                </header>

                <div className="cm-contact-drawer-body">
                  <div className="cm-contact-drawer-section-title">Thông tin người gửi</div>
                  <div className="cm-contact-meta-grid">
                    <div className="cm-kv">
                      <div className="cm-k">Họ tên</div>
                      <div className="cm-v">{selectedItem.name || "—"}</div>
                    </div>
                    <div className="cm-kv">
                      <div className="cm-k">Email</div>
                      <div className="cm-v">{selectedItem.email || "—"}</div>
                    </div>
                    <div className="cm-kv">
                      <div className="cm-k">Mã ticket</div>
                      <div className="cm-v" style={{ fontFamily: "var(--hh-font-sans)" }}>
                        #{String(selectedItem._id || "").slice(-6).toUpperCase()}
                      </div>
                    </div>
                    <div className="cm-kv">
                      <div className="cm-k">Thời gian</div>
                      <div className="cm-v">{formatRelativeTime(selectedItem.createdAt)}</div>
                    </div>
                  </div>

                  <div className="cm-contact-drawer-section-title" style={{ marginTop: 14 }}>
                    Nội dung tin nhắn
                  </div>
                  <div className="cm-msg-body">{selectedItem.message || "—"}</div>

                  <div className="cm-contact-drawer-section-title" style={{ marginTop: 14 }}>
                    Lịch sử xử lý
                  </div>
                  <div className="cm-timeline">
                    <div className="cm-tl-item">
                      <div className="cm-tl-dot cm-tl-dot--created" aria-hidden="true">
                        ✦
                      </div>
                      <div>
                        <div className="cm-tl-action">Ticket được tạo — khách hàng gửi liên hệ</div>
                        <div className="cm-tl-time">{formatRelativeTime(selectedItem.createdAt)}</div>
                      </div>
                    </div>

                    {selectedItem.user_read_reply_at ? (
                      <div className="cm-tl-item">
                        <div className="cm-tl-dot cm-tl-dot--viewed" aria-hidden="true">
                          ◉
                        </div>
                        <div>
                          <div className="cm-tl-action">Khách đã đọc</div>
                          <div className="cm-tl-time">{formatRelativeTime(selectedItem.user_read_reply_at)}</div>
                        </div>
                      </div>
                    ) : null}

                    {selectedItem.admin_reply ? (
                      <div className="cm-tl-item">
                        <div className="cm-tl-dot cm-tl-dot--replied" aria-hidden="true">
                          ✓
                        </div>
                        <div>
                          <div className="cm-tl-action">Đã gửi email phản hồi đến khách hàng</div>
                          <div className="cm-tl-time">{formatRelativeTime(selectedItem.replied_at)}</div>
                        </div>
                      </div>
                    ) : null}

                    {String(selectedItem.status) === "closed" ? (
                      <div className="cm-tl-item">
                        <div className="cm-tl-dot cm-tl-dot--closed" aria-hidden="true">
                          ■
                        </div>
                        <div>
                          <div className="cm-tl-action">Ticket đã được đóng</div>
                          <div className="cm-tl-time">{formatRelativeTime(selectedItem.replied_at || selectedItem.createdAt)}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <footer className="cm-contact-drawer-footer">
                  <div className="cm-reply-label">Soạn phản hồi</div>
                  <div className="reply-box">
                    <textarea
                      ref={replyTextRef}
                      rows={5}
                      className="cm-reply-input"
                      value={draftReplyById[selectedItem._id] ?? selectedItem.admin_reply ?? ""}
                      onChange={(e) =>
                        setDraftReplyById((prev) => ({ ...prev, [selectedItem._id]: e.target.value }))
                      }
                      placeholder="Nhập nội dung phản hồi gửi đến khách hàng..."
                    />
                  </div>

                  <div className="cm-contact-drawer-footer-actions">
                    <div className="cm-status-picker" role="radiogroup" aria-label="Chọn trạng thái">
                      <button
                        type="button"
                        className={`cm-status-picker-btn cm-status-picker-btn--replied ${
                          drawerStatus === "replied" ? "is-active" : ""
                        }`}
                        aria-checked={drawerStatus === "replied"}
                        onClick={() => setDrawerStatus("replied")}
                      >
                        Đã phản hồi
                      </button>
                      <button
                        type="button"
                        className={`cm-status-picker-btn cm-status-picker-btn--closed ${
                          drawerStatus === "closed" ? "is-active" : ""
                        }`}
                        aria-checked={drawerStatus === "closed"}
                        onClick={() => setDrawerStatus("closed")}
                      >
                        Đánh dấu hoàn tất
                      </button>
                    </div>

                    <button
                      type="button"
                      className="cm-contact-page-btn cm-contact-page-btn--ghost"
                      onClick={() => showToast("Đã lưu nháp", "info")}
                    >
                      Lưu nháp
                    </button>

                    <button
                      type="button"
                      className="cm-contact-reply-btn"
                      disabled={busyId === selectedItem._id}
                      onClick={() => replyMessage(selectedItem)}
                    >
                      Gửi phản hồi
                    </button>
                  </div>

                </footer>
              </aside>
            </>
          ) : null}

          {toasts.length > 0 ? (
            <div className="cm-toast-wrap" role="status" aria-live="polite">
              {toasts.map((t) => (
                <div key={t.id} className={`cm-toast cm-toast--${t.type}`}>
                  <span className="cm-toast-ic" aria-hidden="true">
                    {t.type === "success" ? "✓" : t.type === "error" ? "!" : "i"}
                  </span>
                  <span className="cm-toast-msg">{t.msg}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
