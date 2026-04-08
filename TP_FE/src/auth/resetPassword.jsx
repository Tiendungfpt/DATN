import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3000/api/auth/reset-password/${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Không thể đặt lại mật khẩu");
        return;
      }

      setMessage("Đặt lại mật khẩu thành công. Đang chuyển đến trang đăng nhập...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError("Lỗi kết nối với server. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.background} />

      <div style={styles.card}>
        <h1 style={styles.title}>Đặt lại mật khẩu</h1>
        <p style={styles.subtitle}>Nhập mật khẩu mới cho tài khoản của bạn</p>

        {error && <p style={styles.error}>{error}</p>}
        {message && <p style={styles.success}>{message}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="Mật khẩu mới"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Xác nhận mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
        </form>

        <p style={styles.back}>
          Quay lại{" "}
          <Link to="/login" style={styles.link}>
            đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  background: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "brightness(0.75) contrast(1.1)",
    zIndex: -1,
  },
  card: {
    background: "rgba(255, 255, 255, 0.15)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    padding: "36px 32px",
    borderRadius: "18px",
    width: "100%",
    maxWidth: "400px",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "white",
    textAlign: "center",
  },
  title: { margin: 0, fontSize: "30px" },
  subtitle: { marginTop: "8px", marginBottom: "20px", opacity: 0.9 },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.4)",
    background: "rgba(255,255,255,0.25)",
    color: "white",
    outline: "none",
  },
  button: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
    color: "white",
    fontWeight: "700",
    cursor: "pointer",
  },
  error: {
    background: "rgba(255, 107, 107, 0.2)",
    color: "#ff6b6b",
    borderRadius: "8px",
    padding: "10px",
  },
  success: {
    background: "rgba(34, 197, 94, 0.2)",
    color: "#86efac",
    borderRadius: "8px",
    padding: "10px",
  },
  back: { marginTop: "16px", fontSize: "14px" },
  link: { color: "#fde047", textDecoration: "none" },
};
