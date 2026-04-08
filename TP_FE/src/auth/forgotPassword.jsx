import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResetUrl("");

    try {
      const res = await fetch("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Không thể xử lý yêu cầu.");
        return;
      }

      setMessage(data.message || "Vui lòng kiểm tra email để đặt lại mật khẩu.");
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
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
        <h1 style={styles.title}>Quên mật khẩu</h1>
        <p style={styles.subtitle}>Nhập email để nhận liên kết đặt lại mật khẩu</p>

        {error && <p style={styles.error}>{error}</p>}
        {message && <p style={styles.success}>{message}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi liên kết"}
          </button>
        </form>

        {resetUrl && (
          <p style={styles.devHint}>
            Link test:{" "}
            <a href={resetUrl} style={styles.link}>
              {resetUrl}
            </a>
          </p>
        )}

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
  devHint: {
    marginTop: "14px",
    fontSize: "13px",
    wordBreak: "break-all",
  },
  back: { marginTop: "16px", fontSize: "14px" },
  link: { color: "#fde047", textDecoration: "none" },
};
