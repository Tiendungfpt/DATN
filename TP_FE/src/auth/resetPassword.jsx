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
    minHeight: "calc(100vh - 180px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    background:
      "radial-gradient(circle at 10% 10%, rgba(37,99,235,0.10), transparent 35%), radial-gradient(circle at 90% 0%, rgba(124,58,237,0.10), transparent 32%), #f8fafc",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: "#ffffff",
    padding: "30px 26px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "460px",
    border: "1px solid rgba(15,23,42,0.10)",
    boxShadow: "0 16px 34px rgba(15,23,42,0.10)",
    color: "#0f172a",
    textAlign: "center",
  },
  title: { margin: 0, fontSize: "30px", fontWeight: 900, color: "#0f172a" },
  subtitle: { marginTop: "8px", marginBottom: "20px", color: "rgba(15,23,42,0.68)" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "11px",
    border: "1px solid rgba(15,23,42,0.18)",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
    fontSize: "15px",
  },
  button: {
    padding: "14px",
    borderRadius: "11px",
    border: "none",
    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
    color: "white",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(234,88,12,0.28)",
  },
  error: {
    background: "rgba(239, 68, 68, 0.08)",
    color: "#b91c1c",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    borderRadius: "8px",
    padding: "10px",
  },
  success: {
    background: "rgba(34, 197, 94, 0.09)",
    color: "#166534",
    border: "1px solid rgba(34, 197, 94, 0.22)",
    borderRadius: "8px",
    padding: "10px",
  },
  back: { marginTop: "16px", fontSize: "14px", color: "rgba(15,23,42,0.72)" },
  link: { color: "#1d4ed8", textDecoration: "none", fontWeight: 700 },
};
