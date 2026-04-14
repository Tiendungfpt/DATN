import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../components/BookingAdmin.css";

/**
 * Form: CCCD, phone, guest name + assign room_ids (count = room_quantity).
 * POST /api/checkin/:bookingId
 */
export default function CheckIn() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId") || "";
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [guest_name, setGuestName] = useState("");
  const [guest_phone, setGuestPhone] = useState("");
  const [guest_id_number, setGuestId] = useState("");
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const token = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const b = await axios.get(`http://localhost:3000/api/bookings/${bookingId}`, {
          headers: token(),
        });
        setBooking(b.data);
        setGuestName(b.data.guest_name || "");
        setGuestPhone(b.data.guest_phone || "");
        const ar = await axios.get(
          `http://localhost:3000/api/bookings/${bookingId}/assignable-rooms`,
          { headers: token() },
        );
        setRooms(ar.data?.rooms || []);
      } catch (e) {
        setErr(e.response?.data?.message || "Cannot load booking");
      }
    })();
  }, [bookingId]);

  const toggleRoom = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await axios.post(
        `http://localhost:3000/api/checkin/${bookingId}`,
        {
          guest_name,
          guest_phone,
          guest_id_number,
          assigned_room_ids: selected,
        },
        { headers: token() },
      );
      setMsg("Check-in OK");
      navigate("/admin/bookings/checked-in");
    } catch (e) {
      setErr(e.response?.data?.message || "Check-in failed");
    }
  };

  const qty = booking?.room_quantity || 1;

  if (!bookingId) return <p>Missing bookingId in URL</p>;

  return (
    <section style={{ maxWidth: 560 }} className="booking-admin-section">
      <h3>Check-in</h3>
      {booking && (
        <p>
          Booking {String(booking._id).slice(-6)} — need <strong>{qty}</strong> room(s)
        </p>
      )}
      <form onSubmit={submit}>
        <p>
          <label>
            Full name
            <input
              value={guest_name}
              onChange={(e) => setGuestName(e.target.value)}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </p>
        <p>
          <label>
            Phone
            <input
              value={guest_phone}
              onChange={(e) => setGuestPhone(e.target.value)}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </p>
        <p>
          <label>
            National ID (CCCD)
            <input
              value={guest_id_number}
              onChange={(e) => setGuestId(e.target.value)}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </p>
        <p>Select exactly {qty} room(s):</p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {rooms.map((r) => (
            <li key={r._id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(r._id)}
                  onChange={() => toggleRoom(r._id)}
                />{" "}
                {r.name} {r.room_no ? `(${r.room_no})` : ""}
              </label>
            </li>
          ))}
        </ul>
        <button type="submit" disabled={selected.length !== qty}>
          Confirm check-in
        </button>
      </form>
      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </section>
  );
}
