import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSearchParams } from "react-router-dom";


function Review() {
  //his
  const { bookingId } = useParams();

  const navigate = useNavigate();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  //his
  const [searchParams] = useSearchParams();
const roomId = searchParams.get("roomId");

  // 👉 gửi review
  const handleSubmit = async () => {
    if (!comment) {
      alert("Vui lòng nhập nhận xét");
      return;
    }

    try {

      setLoading(true);
console.log("TOKEN SEND:", localStorage.getItem("token"));
//his
    await axios.post("http://localhost:3000/api/reviews", {
   booking_id: bookingId,
   room_id: roomId,  
   rating,
   comment,
}, {
  headers: {
    Authorization: "Bearer " + localStorage.getItem("token")
  }
});

      alert("Đánh giá thành công 🎉");

      // quay lại lịch sử đặt phòng
      navigate("/thong-tin-tai-khoan?tab=history");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi gửi đánh giá");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div style={styles.container}>
    <div style={styles.card}>
      <h2 style={styles.title}>Đánh giá phòng</h2>

      <p style={styles.bookingId}>
        Mã đơn: <strong>{bookingId}</strong>
      </p>

      {/* ⭐ Rating */}
      <div style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => setRating(star)}
            style={{
              ...styles.star,
              color: star <= rating ? "#facc15" : "#d1d5db",
            }}
          >
            ★
          </span>
        ))}
      </div>

      {/* textarea */}
      <textarea
        placeholder="Chia sẻ trải nghiệm của bạn về phòng..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={5}
        style={styles.textarea}
      />
 {/* 🔙 Nút quay lại */}
  <button
    onClick={() => navigate(-1)}
    style={{
      width: "100%",
      padding: "14px",
      borderRadius: "10px",
      border: "none",
      background: "#6c757d",
      color: "#fff",
      fontWeight: "700",
      fontSize: "16px",
      cursor: "pointer",
      marginBottom: "12px",
    }}
  >
    ← Quay lại
  </button>
      {/* button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={styles.button}
      >
        {loading ? "Đang gửi..." : "Gửi đánh giá"}
      </button>
    </div>
  </div>
);
}
const styles = {
  container: {
    minHeight: "80vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f8fafc",
    padding: "40px 20px",
  },

  card: {
    width: "100%",
    maxWidth: "600px",
    background: "#fff",
    padding: "30px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },

  title: {
    fontSize: "26px",
    fontWeight: "700",
    marginBottom: "10px",
    color: "#1e293b",
  },

  bookingId: {
    color: "#64748b",
    marginBottom: "20px",
  },

  stars: {
    marginBottom: "20px",
  },

  star: {
    fontSize: "32px",
    cursor: "pointer",
    transition: "0.2s",
    marginRight: "5px",
  },

  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    marginBottom: "20px",
    fontSize: "15px",
    outline: "none",
  },

  button: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
    color: "#fff",
    fontWeight: "700",
    fontSize: "16px",
    cursor: "pointer",
    transition: "0.3s",
  },
};
export default Review;
