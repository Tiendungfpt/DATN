import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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

export default function RoomTypeManager() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const handleAuthError = (ex) => {
    const status = ex?.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setErr("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      navigate("/login", { replace: true, state: { from: "/admin/room/types" } });
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
    try {
      const res = await axios.get(API);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      if (handleAuthError(e)) return;
      setErr(e.response?.data?.message || "Không tải được danh sách loại phòng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const removeRoomType = async (row) => {
    if (!row?._id) return;
    const ok = window.confirm(
      `Xóa loại phòng "${row.name}"?\n\nLưu ý: nếu đã có phòng vật lý hoặc booking gắn loại này thì hệ thống sẽ chặn xóa.`,
    );
    if (!ok) return;
    setErr("");
    try {
      setDeletingId(row._id);
      await axios.delete(`${API}/${row._id}`, { headers: authHeaders() });
      setItems((prev) => prev.filter((it) => it._id !== row._id));
    } catch (e) {
      if (handleAuthError(e)) return;
      setErr(e.response?.data?.message || "Xóa loại phòng thất bại.");
    } finally {
      setDeletingId("");
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
      <h1>Quản lý loại phòng</h1>
      <div className="admin-actions" style={{ marginTop: "8px", marginBottom: "16px" }}>
        <button
          type="button"
          className="btn-edit"
          style={{ background: "#16a34a" }}
          onClick={() => navigate("/admin/room-types/create")}
        >
          + Thêm loại phòng
        </button>
      </div>

      {err ? (
        <div className="hotel-card" style={{ borderColor: "#fecaca", background: "#fef2f2", marginBottom: "14px" }}>
          <p style={{ margin: 0, color: "#991b1b" }}>{err}</p>
        </div>
      ) : null}

      <h2 style={{ fontSize: "1.25rem", marginBottom: "12px" }}>Danh sách ({items.length})</h2>
      <div className="hotel-grid">
        {items.map((row) => (
          <div className="hotel-card" key={row._id}>
            <img
              src={resolveImage(row.image)}
              alt=""
              onError={(ev) => {
                ev.currentTarget.src = fallbackImage;
              }}
            />
            <div className="hotel-info">
              <h3>{row.name}</h3>
              {row.code ? (
                <p className="desc" style={{ fontSize: "0.85rem", marginTop: "-6px" }}>
                  Mã: <code>{row.code}</code>
                </p>
              ) : null}
              <p className="price">
                <strong>{Number(row.price || 0).toLocaleString("vi-VN")} đ</strong> / đêm
              </p>
              <p className="price" style={{ marginTop: "-4px" }}>
                <strong>{Number(row.deposit_amount || 0).toLocaleString("vi-VN")} đ</strong> / cọc mỗi phòng
              </p>
              <p className="capacity">Tối đa {row.maxGuests ?? row.max_guests ?? 2} khách</p>
              {row.description ? <p className="desc">{row.description}</p> : null}
              <div className="admin-actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-edit"
                  onClick={() => navigate(`/admin/room-types/edit/${row._id}`)}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  className="btn-delete"
                  disabled={deletingId === row._id}
                  onClick={() => removeRoomType(row)}
                >
                  {deletingId === row._id ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
