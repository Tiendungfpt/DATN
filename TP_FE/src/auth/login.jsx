import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      // ✅ check đúng theo backend của bạn
      if (res.ok && data.user && data.token) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        console.log("Đăng nhập thành công:", data.user);

        alert("Đăng nhập thành công!");
        navigate(from, { replace: true }); // quay lại trang trước đó
      } else {
        const errorMsg = data.message || "Email hoặc mật khẩu không đúng";
        setError(errorMsg);
        alert(errorMsg);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Lỗi kết nối với server. Vui lòng thử lại sau.");
      alert("Lỗi kết nối với server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Chào mừng trở lại</h1>
          <p style={styles.subtitle}>Đăng nhập để khám phá thiên đường biển</p>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mật khẩu</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập ngay"}
          </button>
        </form>

        <p style={styles.register}>
          Chưa có tài khoản?{" "}
          <Link to="/register" style={styles.link}>
            Đăng ký miễn phí
          </Link>
        </p>
        <p style={styles.forgotWrap}>
          <Link to="/forgot-password" style={styles.forgotLink}>
            Quên mật khẩu?
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
    boxShadow: "0 16px 34px rgba(15,23,42,0.10)",
    width: "100%",
    maxWidth: "460px",
    border: "1px solid rgba(15,23,42,0.10)",
    textAlign: "center",
    color: "#0f172a",
  },

  header: {
    marginBottom: "35px",
  },

  title: {
    fontSize: "32px",
    fontWeight: "900",
    margin: "0 0 8px 0",
    color: "#0f172a",
  },

  subtitle: {
    fontSize: "15px",
    color: "rgba(15,23,42,0.68)",
    margin: 0,
  },

  error: {
    color: "#b91c1c",
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "center",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  inputGroup: {
    textAlign: "left",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },

  input: {
    width: "100%",
    padding: "14px 16px",
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.18)",
    borderRadius: "11px",
    fontSize: "15px",
    color: "#0f172a",
    outline: "none",
  },

  button: {
    marginTop: "10px",
    padding: "15px",
    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
    color: "white",
    border: "none",
    borderRadius: "11px",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(234,88,12,0.28)",
  },

  register: {
    marginTop: "20px",
    fontSize: "14px",
    color: "rgba(15,23,42,0.72)",
  },
  forgotWrap: {
    marginTop: "10px",
  },
  forgotLink: {
    color: "#1d4ed8",
    fontWeight: "700",
    textDecoration: "none",
    fontSize: "14px",
  },

  link: {
    color: "#1d4ed8",
    fontWeight: "700",
    textDecoration: "none",
  },
};
