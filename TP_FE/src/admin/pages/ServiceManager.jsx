import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import "../components/BookingAdmin.css";

/**
 * POST /api/booking/:id/service — add line items only while checked_in.
 */
export default function ServiceManager() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId") || "";
  const [catalog, setCatalog] = useState([]);
  const [lines, setLines] = useState([]);
  const [service_id, setServiceId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const token = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const load = async () => {
    if (!bookingId) return;
    try {
      const [svc, ln] = await Promise.all([
        axios.get("http://localhost:3000/api/services-catalog", { headers: token() }),
        axios.get(`http://localhost:3000/api/bookings/${bookingId}/services`, {
          headers: token(),
        }),
      ]);
      setCatalog(Array.isArray(svc.data) ? svc.data : []);
      setLines(Array.isArray(ln.data) ? ln.data : []);
      if (svc.data?.[0]?._id) setServiceId(svc.data[0]._id);
    } catch (e) {
      setErr(e.response?.data?.message || "Load failed");
    }
  };

  useEffect(() => {
    load();
  }, [bookingId]);

  const addLine = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await axios.post(
        `http://localhost:3000/api/booking/${bookingId}/service`,
        { service_id, quantity: Number(quantity) || 1, note },
        { headers: token() },
      );
      setNote("");
      load();
    } catch (e) {
      setErr(e.response?.data?.message || "Add failed");
    }
  };

  if (!bookingId) return <p>Missing bookingId</p>;

  return (
    <section style={{ maxWidth: 640 }} className="booking-admin-section">
      <h3>Incidental services</h3>
      <form onSubmit={addLine}>
        <select value={service_id} onChange={(e) => setServiceId(e.target.value)}>
          {catalog.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} — {s.defaultPrice?.toLocaleString("vi-VN")} đ ({s.category})
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input placeholder="note" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <h4>Lines</h4>
      <ul>
        {lines.map((l) => (
          <li key={l._id}>
            {l.service_id?.name} x{l.quantity} = {l.line_total?.toLocaleString("vi-VN")} đ{" "}
            {l.note ? `(${l.note})` : ""}
          </li>
        ))}
      </ul>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </section>
  );
}
